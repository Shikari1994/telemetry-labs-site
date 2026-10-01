import { chain, clamp, easeInOut, easeOutCubic, mix, rotateX, rotateY, scale, translate, viewportOrtho } from "@/lib/mascot/math";
import { PARCEL_HALF } from "@/lib/mascot/model";
import type { PartDraw } from "@/lib/mascot/renderer";
import type { Hold, Point3, Side } from "@/lib/mascot/rig";

/**
 * The parcel the mascot carries down the page: the visit's one through-line.
 *
 * When it touches down on the hero pad, the pad hands it a parcel. It holds
 * it through every station and seam, throwing it to the other hand whenever
 * the holding hand is wanted for pointing or waving. At the request it sets
 * the parcel down on the terminal window beside it, where it waits, light
 * pulsing; when the request is sent the parcel drops into the window and
 * is gone. That is the end of its errand for this visit.
 *
 * Positions are viewport px with z toward the viewer, the same space the rig
 * reports its grips in. Every move is measured against live targets (a hand,
 * the window), so the page can scroll under a throw without tearing it.
 */

export type Stage = "waiting" | "rising" | "held" | "thrown" | "setting" | "parked" | "sending" | "sent";

/** Where it is set down and what it is sent into; null when not on the page. */
export type Spot = {
  /** Point on the top edge it stands on, viewport px. */
  x: number;
  y: number;
  scale: number;
  /** The confirmation it drops into once the request is sent. */
  done: Element | null;
};

export type ParcelInput = {
  /** The rig's report for this frame, or null while the mascot is away. */
  hold: Hold | null;
  /** It may set the parcel down now: settled at the request station. */
  setDown: boolean;
  spot: Spot | null;
  width: number;
  height: number;
  pixel: number;
};

/** Parcel size relative to its model, in voxels. */
const SIZE = 1.15;
/** The pad issues it this long after touchdown. */
const RISE_DELAY = 0.5;
const RISE_SECONDS = 0.55;
const THROW_SECONDS = 0.38;
const SET_SECONDS = 0.6;
const SEND_SECONDS = 0.65;
/** Resting pose on the window: turned enough that the box reads as a box. */
const PARKED_YAW = 0.55;
const PARKED_TILT = 0.22;
/** Where on the pad it comes up from, character space. */
const RISE_FROM: [number, number, number] = [0, 0.5, 4.5];

type Flight = {
  from: () => Point3;
  to: () => Point3;
  t: number;
  seconds: number;
  /** Peak of the arc, voxels. */
  arc: number;
  yaw: [number, number];
  size: [number, number];
};

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number };

const apply = (m: Float32Array, [x, y, z]: readonly number[]): Point3 => ({
  x: m[0] * x + m[4] * y + m[8] * z + m[12],
  y: m[1] * x + m[5] * y + m[9] * z + m[13],
  z: m[2] * x + m[6] * y + m[10] * z + m[14],
});

const centre = (el: Element): Point3 => {
  const box = el.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2, z: 0 };
};

/** Holds a start point fixed relative to a moving target. */
function pinned(start: Point3, target: () => Point3) {
  const t0 = target();
  const d = { x: start.x - t0.x, y: start.y - t0.y, z: start.z - t0.z };
  return () => {
    const t = target();
    return { x: t.x + d.x, y: t.y + d.y, z: t.z + d.z };
  };
}

export type Parcel = ReturnType<typeof createParcel>;

export function createParcel(events: { caught: (side: Side) => void; released: (side: Side) => void; sent: () => void }) {
  let stage: Stage = "waiting";
  let side: Side = -1;
  let delay = 0;
  let flight: Flight | null = null;
  let time = 0;
  /** The latest grips; replaced every frame the mascot is drawn. */
  let grips: Record<Side, Point3> | null = null;
  /** Last drawn state, so a landing burst starts where the parcel was. */
  let at: Point3 = { x: 0, y: 0, z: 0 };
  let k = 6;
  const sparks: Spark[] = [];

  /** Centre of the box standing on the window. */
  const parkedAt = (spot: Spot): Point3 => ({ x: spot.x, y: spot.y - PARCEL_HALF * SIZE * spot.scale, z: 0 });
  const grip = (s: Side) => () => grips?.[s] ?? at;

  const fly = (next: Stage, f: Omit<Flight, "t">) => {
    stage = next;
    flight = { ...f, t: 0 };
  };

  const burst = (p: Point3) => {
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const speed = (8 + Math.random() * 9) * k;
      const max = 0.3 + Math.random() * 0.35;
      sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 8 * k, life: max, max });
    }
  };

  /** Lands the current move. */
  const finish = () => {
    const was = stage;
    flight = null;
    if (was === "rising" || was === "thrown") {
      stage = "held";
      events.caught(side);
    } else if (was === "setting") {
      stage = "parked";
    } else if (was === "sending") {
      stage = "sent";
      burst(at);
      events.sent();
    }
  };

  return {
    get stage() {
      return stage;
    },
    /** The hand the rig should close round it; a catching hand gets ready. */
    get carry(): Side | 0 {
      return stage === "held" || stage === "thrown" || stage === "rising" ? side : 0;
    },
    /** The pad issues it; `now` skips the rise (the hero was never seen). */
    give(now = false) {
      if (stage !== "waiting" || delay > 0) return;
      if (now) stage = "held";
      else delay = RISE_DELAY;
    },

    update(dt: number, input: ParcelInput): PartDraw[] {
      time += dt;
      const { hold, spot } = input;
      const done = spot?.done ?? null;
      if (hold) grips = hold.grips;

      /* Decide what it is doing this frame. */
      if (stage === "waiting" && delay > 0) {
        delay -= dt;
        if (delay <= 0) {
          if (!hold) stage = "held";
          else
            fly("rising", {
              from: pinned(apply(hold.screen, RISE_FROM), grip(side)),
              to: grip(side),
              seconds: RISE_SECONDS,
              arc: 3,
              yaw: [hold.yaw - Math.PI * 2, hold.yaw],
              size: [0, 1],
            });
        }
      } else if (stage === "held" && hold) {
        if (done && spot) {
          // Sent before it was ever set down: straight from the hand.
          const to = () => centre(done);
          fly("sending", {
            from: pinned(hold.grips[side], to),
            to,
            seconds: SEND_SECONDS,
            arc: 6,
            yaw: [hold.yaw, hold.yaw + Math.PI * 2],
            size: [1, 0.25],
          });
          events.released(side);
        } else if (input.setDown && spot) {
          const to = () => parkedAt(spot);
          fly("setting", {
            from: pinned(hold.grips[side], to),
            to,
            seconds: SET_SECONDS,
            arc: 5,
            yaw: [hold.yaw, PARKED_YAW],
            size: [1, 1],
          });
          events.released(side);
        } else if (hold.reach === side) {
          const from = side;
          side = -side as Side;
          fly("thrown", {
            from: grip(from),
            to: grip(side),
            seconds: THROW_SECONDS,
            arc: 5,
            yaw: [hold.yaw, hold.yaw + Math.PI],
            size: [1, 1],
          });
        }
      } else if (stage === "thrown" && flight && hold?.reach === side) {
        // Wanted back where it came from: it turns round mid-air (the
        // easing is symmetric, so the position carries over).
        side = -side as Side;
        const f = flight;
        flight = { ...f, from: f.to, to: f.from, t: 1 - f.t, yaw: [f.yaw[1], f.yaw[0]] };
      } else if (stage === "parked" && done && spot) {
        const to = () => centre(done);
        fly("sending", {
          from: pinned(parkedAt(spot), to),
          to,
          seconds: SEND_SECONDS,
          arc: 4,
          yaw: [PARKED_YAW, PARKED_YAW + Math.PI * 2],
          size: [1, 0.25],
        });
      }

      /* A move that loses its mascot or its window lands at once. */
      if (flight && (stage === "rising" || stage === "thrown") && !hold) finish();
      if (flight && (stage === "setting" || stage === "sending") && !spot) finish();
      if (flight) {
        flight.t += dt / flight.seconds;
        if (flight.t >= 1) finish();
      }

      /* Place it. */
      k = hold?.scale ?? spot?.scale ?? k;
      let tilt = hold?.tilt ?? PARKED_TILT;
      let yaw = PARKED_YAW;
      let size = 1;
      let visible = false;

      if (flight) {
        const t = flight.t;
        const e = stage === "rising" || stage === "sending" ? easeOutCubic(t) : easeInOut(t);
        const a = flight.from();
        const b = flight.to();
        if (spot && (stage === "setting" || stage === "sending")) {
          k = mix(hold?.scale ?? spot.scale, spot.scale, e);
          tilt = mix(hold?.tilt ?? PARKED_TILT, PARKED_TILT, e);
        }
        at = {
          x: mix(a.x, b.x, e),
          y: mix(a.y, b.y, e) - Math.sin(Math.PI * t) * flight.arc * k,
          z: mix(a.z, b.z, e),
        };
        yaw = mix(flight.yaw[0], flight.yaw[1], e);
        // Rising, it grows in four steps, as if the pad were printing it.
        size = stage === "rising" ? Math.ceil(clamp(t * 1.6, 0, 1) * 4) / 4 : mix(flight.size[0], flight.size[1], e);
        visible = true;
      } else if (stage === "held" && hold) {
        at = hold.grips[side];
        yaw = hold.yaw;
        visible = true;
      } else if (stage === "parked" && spot) {
        // It waits with a slow bob, a pixel step at a time; off screen it
        // is left out so the canvas can rest.
        const p = parkedAt(spot);
        k = spot.scale;
        tilt = PARKED_TILT;
        at = { ...p, y: p.y - Math.round((0.5 + 0.5 * Math.sin(time * 2.2)) * 0.6 * k) };
        visible = at.y > -4 * k && at.y < input.height + 4 * k;
      }

      const parts: PartDraw[] = [];
      const ortho = viewportOrtho(input.width, input.height, hold?.depth ?? Math.max(800, k * 40));
      if (visible && size > 0) {
        const px = input.pixel;
        const s = k * SIZE * size;
        const rot = chain(rotateX(tilt), rotateY(yaw));
        const x = Math.round(at.x / px) * px;
        const y = Math.round(at.y / px) * px;
        parts.push({ id: "parcel", mvp: chain(ortho, translate(x, y, at.z), scale(s, -s, s), rot), rot });
      }

      /* Embers where it went in, in screen space. */
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const p = sparks[i];
        p.life -= dt;
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        p.vy += 48 * k * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const s = 0.55 * k * (p.life / p.max);
        parts.push({ id: "spark", mvp: chain(ortho, translate(p.x, p.y, 40), scale(s, -s, s)), rot: rotateY(0) });
      }
      return parts;
    },
  };
}
