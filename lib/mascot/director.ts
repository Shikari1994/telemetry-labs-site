import { ScrollTrigger } from "gsap/ScrollTrigger";
import { pace as follow } from "@/lib/motion/pace";
import { clamp, easeInOut, easeOutCubic, mix } from "@/lib/mascot/math";
import { GLASS_WIDE } from "@/lib/mascot/hd";
import { createAct, type Act, type Sense } from "@/lib/mascot/acts";
import { HEAD_CENTER_Y, PEEK_DEPTH } from "@/lib/mascot/model";
import { boxPoly, type Poly } from "@/lib/mascot/occlude";
import type { Spot } from "@/lib/mascot/parcel";
import type { Hands } from "@/lib/mascot/rig";
import type { AimDef, CameoDef, PerchDef, Pose, RouteDef, StationDef } from "@/lib/mascot/route";

/**
 * Maps the scroll position to where the mascot is and what it is doing.
 *
 * ScrollTrigger owns every measurement (it re-measures on refresh, pins and
 * breakpoint rebuilds); per frame the director only reads trigger start/end
 * numbers and the live box of at most one element, so the mascot stays glued
 * to its card while the page scrolls under it.
 *
 * A station marked `opening` opens the page: the intro first holds a close-up
 * of the robot (the close-up model, hd.ts: its head filling the screen and
 * room beside it for the waving hand), pulls back to the whole mascot in the
 * middle of the viewport, about half its height, then flies it in an arc
 * down onto its spot, shrinking as it goes.
 *
 * Once the intro has played it is never off screen: with no station, cameo
 * or ride wanting it, it sits on its perch (route.ts), kept inside the
 * viewport, and every station and cameo flies it over from the perch and
 * back. Anything this cannot join up (a station dropped mid-flight, a ride
 * starting) the mascot flies over itself (components/mascot).
 *
 * While it holds a station the placement carries the station's aim, which
 * the mascot resolves against the cursor and the section's current item.
 * A station with an act (lib/mascot/acts.ts) is a part it plays in the
 * section: the act says where it is from moment to moment and what it is
 * behind, and the flights in and out land on and leave from that.
 *
 * A `screen` station is a close-up of its own: it flies over from its perch,
 * growing until its glass covers the station's element exactly (the element
 * is as wide as the glass), squares up to the camera and holds there; it
 * powers the screen down before it shrinks back to its perch.
 *
 * Must be created inside a gsap.matchMedia callback so its triggers are
 * reverted when the breakpoint changes.
 */

export type Placement =
  | { visible: false }
  | {
      visible: true;
      key: string;
      x: number;
      y: number;
      scale: number;
      pose: Pose;
      fly: number;
      tilt?: number;
      /** Fully arrived and holding the station pose. */
      settled: boolean;
      wave: boolean;
      /** Polygons the mascot is behind, viewport px (lib/mascot/occlude.ts). */
      masks: Poly[] | null;
      /** Body tipped to a side, radians. */
      lean?: number;
      /** Where its hands reach (lib/mascot/rig.ts). */
      hands?: Hands | null;
      /** What it works on while settled. */
      aim: AimDef | null;
      /** At the station where the page powers off. */
      halts?: boolean;
      /** The opening close-up: 1 held … 0 pulled back. */
      zoom?: number;
      /** Draw the close-up model whatever the zoom (a screen station). */
      hd?: boolean;
      /** 0 free … 1 square on to the camera and still (lib/mascot/rig.ts). */
      lock?: number;
      /** A screen station's element, and whether the glass covers it now
          (`aligned`) and is staying (`live`: not on its way out). */
      screen?: { el: HTMLElement; aligned: boolean; live: boolean };
    };

type Range = { start: number; end: number };

/** Opening shot: hidden until shown; `zoom` 1 holds the close-up … 0 the
    whole robot, then `p` 0 holds the whole robot … 1 landed. `typed` counts
    the glyphs of the greeting typed out on its screen. */
export type Intro = { shown: boolean; p: number; zoom: number; typed: number };

/** Model height from the ground point to the antenna tip, and the height of
    its middle, in voxels; the arms spread a little wider than this. */
const ROBOT_TALL = 28;
const ROBOT_MID = 14;
const ROBOT_WIDE = 16;

/** CSS px per voxel for the opening shot: the whole robot, half the viewport tall. */
export function openingScale(width: number, height: number) {
  return Math.min((height * 0.5) / ROBOT_TALL, (width * 0.6) / ROBOT_WIDE);
}

/** Below this the close-up has pulled back far enough to swap to the voxel robot. */
export const CLOSEUP_HD = 0.15;

/** A screen station: CSS px per voxel above which the close-up model is
    drawn, and the share of its way out it holds still, the screen powering
    down, before it leaves. */
const SCREEN_HD = 22;
const SCREEN_HOLD = 0.2;

/**
 * The close-up framing: CSS px per voxel and where the head centre goes. On
 * a wide screen the head fills most of the height, set right so the waving
 * hand comes up on its left; on a tall one the whole robot fits the width,
 * the hand raised beside its head.
 */
function closeup(width: number, height: number) {
  if (width > height) {
    const k = Math.min((height * 0.68) / 10, (width * 0.62) / 15.5);
    return { k, x: width * 0.57, y: height * 0.6 };
  }
  const k = Math.min((height * 0.62) / ROBOT_TALL, (width * 0.86) / 21);
  return { k, x: width * 0.5 + k * 1.2, y: height * 0.3 };
}

/**
 * Scroll says where a station's flights should be; time says how fast they
 * may get there. Each station keeps its own `enter` and `leave` progress that
 * follow the scroll's, no faster than a flight takes (`ENTER_SECONDS`,
 * `LEAVE_SECONDS`), so a flick of the wheel does not make it flash by. The
 * station on stage keeps it until it is off, then the next one takes it.
 * The opening hero is the intro's, and it leaves as the first transit comes
 * up to take it, so it follows the scroll as it is.
 */
const ENTER_SECONDS = 1.25;
const LEAVE_SECONDS = 0.95;

type Pace = { enter: number; leave: number };
type ResolvedStation = {
  def: StationDef;
  el: HTMLElement;
  enter: ScrollTrigger | null;
  leave: ScrollTrigger | null;
  pace: Pace;
  paced: boolean;
  act: Act | null;
  /** A peek's climb onto its edge (`rise`): 0 peeking … 1 up. */
  risen: number;
};

/** Share of the way to an act's spot from which its masks apply. */
const ACT_MASKED = 0.55;
/** A peek climbs up onto its edge over this long. */
const RISE_SECONDS = 0.5;

const onStage = ({ pace }: ResolvedStation) => pace.enter > 0 && pace.leave < 1;

type Shown = Placement & { visible: true };

/** A hop between two spots: the arc's height for the distance. */
const arc = (ax: number, ay: number, bx: number, by: number) => 40 + Math.hypot(bx - ax, by - ay) * 0.12;
/** Voxel sizes are mixed by ratio, so growing and shrinking read evenly. */
const mixScale = (a: number, b: number, t: number) => Math.exp(mix(Math.log(a), Math.log(b), t));

/* A station whose element has scrolled out of the screen is not seen leaving. */
function inView(el: HTMLElement, height: number) {
  const box = el.getBoundingClientRect();
  return box.bottom > -200 && box.top < height + 200;
}
type ResolvedCameo = { def: CameoDef; range: ScrollTrigger; along: HTMLElement };

const progress = (scroll: number, range: Range) =>
  clamp((scroll - range.start) / Math.max(1, range.end - range.start), 0, 1);

function measure(trigger: HTMLElement, [start, end]: [string, string]) {
  return ScrollTrigger.create({ trigger, start, end });
}

export function createDirector(route: RouteDef) {
  const stations: ResolvedStation[] = route.stations.flatMap((def) => {
    const el = document.querySelectorAll<HTMLElement>(def.select)[def.index ?? 0];
    const enterOn = def.enterOn ? document.querySelector<HTMLElement>(def.enterOn) : el;
    const leaveOn = def.leaveOn ? document.querySelector<HTMLElement>(def.leaveOn) : el;
    if (!el || !enterOn || !leaveOn) return [];
    return [
      {
        def,
        el,
        enter: def.enter ? measure(enterOn, def.enter) : null,
        leave: def.leave ? measure(leaveOn, def.leave) : null,
        pace: { enter: 0, leave: 0 },
        paced: Boolean(def.enter),
        act: def.act ? createAct(def.act, el, def.scale ?? 5) : null,
        risen: 0,
      },
    ];
  });

  const cameos: ResolvedCameo[] = route.cameos.flatMap((def) => {
    const trigger = document.querySelectorAll<HTMLElement>(def.trigger)[def.index ?? 0];
    const along = trigger?.querySelector<HTMLElement>(def.along);
    if (!trigger || !along) return [];
    return [{ def, range: measure(trigger, [def.start, def.end]), along }];
  });

  const perches = route.perch.flatMap((def) => {
    const el = document.querySelector<HTMLElement>(def.select);
    return el ? [{ def, el }] : [];
  });
  const header = document.querySelector<HTMLElement>("[data-site-header]");

  let seeded = false;
  let holder = -1;
  /* This frame's clock and what the visitor is doing, for acts. */
  let frameDt = 0;
  let sense: Sense = { poke: null, target: null, now: 0 };

  /** A spot kept on screen: under the header, clear of the other edges. A
      station's element that has scrolled away holds it at the edge rather
      than taking it along. */
  function onScreen(x: number, y: number, k: number, width: number, height: number) {
    const top = (header?.getBoundingClientRect().bottom ?? 0) + (ROBOT_TALL + 2) * k;
    return { x: clamp(x, 10 * k, width - 10 * k), y: clamp(y, top, Math.max(top, height - 3 * k)) };
  }

  /** Its seat between stations: on the perch laid out now, kept on screen
      (it rides in with the panel and stays when the panel has scrolled away). */
  function placePerch(width: number, height: number): Shown {
    const perch = perches.find(({ el }) => el.offsetWidth > 0);
    const def: PerchDef = perch?.def ?? { select: "", ax: 0.9, pose: "hover", scale: 4 };
    const k = def.scale;
    let x = width * def.ax;
    let y = height;
    if (perch) {
      const box = perch.el.getBoundingClientRect();
      x = box.left + def.ax * box.width;
      y = def.pose === "sit" ? box.top : box.bottom + (ROBOT_TALL + 2) * k;
    }
    return {
      visible: true,
      key: "perch",
      ...onScreen(x, y, k, width, height),
      scale: k,
      pose: def.pose,
      fly: def.pose === "hover" ? 0.15 : 0,
      settled: true,
      wave: false,
      masks: null,
      aim: def.aim ?? null,
    };
  }

  function placeOpening(station: ResolvedStation, intro: Intro, width: number, height: number, perch: Shown): Placement {
    const spot = placeStation(station, 1, 0, width, height, perch);
    if (!spot.visible) return spot;
    const { p, zoom } = intro;
    const ko = openingScale(width, height);
    // The size falls away first (the pull-back), then the glide catches up.
    let k = Math.exp(mix(Math.log(ko), Math.log(spot.scale), easeOutCubic(clamp(p * 1.25, 0, 1))));
    const s = easeInOut(p);
    let headX = mix(width / 2, spot.x, s);
    const headY0 = height / 2 - (HEAD_CENTER_Y - ROBOT_MID) * ko;
    let headY = mix(headY0, spot.y - HEAD_CENTER_Y * spot.scale, s) - Math.sin(Math.PI * s) * height * 0.16;
    let tilt = mix(0.04, spot.tilt ?? 0.22, s);
    if (zoom > 0) {
      // Before that, the camera dollies back out of the close-up.
      const near = closeup(width, height);
      k = Math.exp(mix(Math.log(k), Math.log(near.k), zoom));
      headX = mix(headX, near.x, zoom);
      headY = mix(headY, near.y, zoom);
      tilt = mix(tilt, 0.02, zoom);
    }
    return {
      ...spot,
      x: headX,
      y: headY + HEAD_CENTER_Y * k,
      scale: k,
      pose: "hover",
      fly: Math.sin(Math.PI * Math.min(1, p * 1.08)),
      tilt,
      settled: false,
      masks: null,
      aim: null,
      zoom,
    };
  }

  /** A close-up whose glass covers the element: over from its perch, growing
      as it comes; back to its perch, shrinking. */
  function placeScreen(station: ResolvedStation, enter: number, leave: number, width: number, height: number, perch: Shown): Placement {
    const { def, el } = station;
    const box = el.getBoundingClientRect();
    const near = Math.max(1, el.offsetWidth / GLASS_WIDE);
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const px = perch.x;
    const py = perch.y - HEAD_CENTER_Y * perch.scale;
    // Flights aim at the part of the slot on screen, so a slot scrolling
    // away does not take it off screen.
    const fx = clamp(cx, 0, width);
    const fy = clamp(cy, 0, height);
    let hx = cx;
    let hy = cy;
    let k = near;
    let fly = 0;
    let lock = 1;
    if (leave > SCREEN_HOLD) {
      const t = easeInOut((leave - SCREEN_HOLD) / (1 - SCREEN_HOLD));
      k = mixScale(near, perch.scale, Math.sqrt(t));
      hx = mix(fx, px, t);
      hy = mix(fy, py, t) - Math.sin(Math.PI * t) * arc(fx, fy, px, py);
      fly = Math.min(1, Math.sin(Math.PI * t) * 1.6);
      lock = 1 - Math.min(1, t * 4);
    } else if (enter < 1) {
      const t = easeInOut(enter);
      k = mixScale(perch.scale, near, t * t);
      hx = mix(px, fx, t);
      hy = mix(py, fy, t) - Math.sin(Math.PI * t) * arc(px, py, fx, fy);
      fly = Math.min(1, Math.sin(Math.PI * t) * 1.6);
      lock = t * t;
    }
    const aligned = enter >= 1 && leave <= SCREEN_HOLD;
    return {
      visible: true,
      key: def.id,
      x: hx,
      y: hy + HEAD_CENTER_Y * k,
      scale: k,
      pose: "hover",
      fly,
      tilt: mix(0.22, 0, lock),
      settled: enter >= 1 && leave <= 0,
      wave: false,
      masks: null,
      aim: null,
      hd: k > SCREEN_HD,
      lock,
      screen: { el, aligned, live: aligned && leave <= 0 },
    };
  }

  function placeStation(station: ResolvedStation, enter: number, leave: number, width: number, height: number, perch: Shown): Placement {
    const { def, el } = station;
    if (def.screen) return placeScreen(station, enter, leave, width, height, perch);
    const box = el.getBoundingClientRect();
    // An act says where it is and what it is behind; otherwise it holds its
    // pose on the element.
    const act = station.act?.(frameDt, sense) ?? null;
    let k = def.scaleFromElement ? Math.max(1, el.offsetWidth) : (def.scale ?? perch.scale);
    let x = box.left + def.ax * box.width;
    let pose = def.pose;
    // Peek hides the body below the edge so only the eye pods show; one
    // that rises climbs up onto the edge.
    let lift = 0;
    if (def.rise) {
      station.risen = follow(station.risen, el.querySelector(def.rise) ? 1 : 0, frameDt, RISE_SECONDS);
      lift = easeInOut(station.risen);
      if (lift > 0.5) pose = "sit";
    }
    let y =
      def.pose === "hover"
        ? box.top + (def.ay ?? 0.5) * box.height
        : def.pose === "peek"
          ? box.top + PEEK_DEPTH * (1 - lift) * k
          : box.top + (def.ay ?? 0) * box.height;
    let fly = def.pose === "hover" ? 0.15 : 0;
    let masks: Poly[] | null = def.occlude ? [boxPoly(box)] : null;
    if (act) {
      ({ x, y, pose, fly } = act);
      k = act.scale;
      masks = act.masks;
    }

    let px = x;
    let py = y;
    let scale = k;

    // Between the perch and the spot: a hop, the size changing on the way.
    // A peek lands on the edge first and sinks behind it, and leaves the
    // same way round. An act's spot is flown to as it is: what it is behind
    // takes it in.
    const travel = enter < 1 ? enter : leave > 0 ? 1 - leave : 1;
    if (travel < 1) {
      const sink = def.pose === "peek" && !act ? 0.3 : 0;
      const t = easeInOut(clamp(travel / (1 - sink), 0, 1));
      const landY = sink ? box.top : y;
      px = mix(perch.x, x, t);
      py = mix(perch.y, landY, t) - Math.sin(Math.PI * t) * arc(perch.x, perch.y, x, landY);
      if (sink && travel > 1 - sink) py = mix(landY, y, easeInOut((travel - (1 - sink)) / sink));
      scale = mixScale(perch.scale, k, t);
      fly = Math.max(fly, Math.min(1, Math.sin(Math.PI * t) * 1.6));
      // What it hides behind takes it in only near its spot, never on the
      // way past (its perch can sit over the same cards).
      if (act && travel < ACT_MASKED) masks = null;
    }

    const settled = enter >= 1 && leave <= 0;
    // An act's own spot is on its scene, which is on screen; only the way
    // there is kept inside the viewport.
    const kept = onScreen(px, py, scale, width, height);
    return {
      visible: true,
      key: def.id,
      x: kept.x,
      y: act && travel >= 1 ? py : kept.y,
      scale,
      pose,
      fly,
      tilt: def.tilt,
      settled,
      wave: Boolean(def.wave),
      masks,
      lean: act && travel >= 1 ? act.lean : undefined,
      hands: act && travel >= 1 ? act.hands : undefined,
      aim: settled ? (def.aim ?? null) : null,
      halts: def.halts,
    };
  }

  /** Waits at the start of the bar, rides its filling edge, waits at the
      end; the mascot flies it on and off (its hop takes time, not scroll,
      so a short seam is not a dash). */
  function placeCameo(cameo: ResolvedCameo, p: number, width: number, height: number): Placement {
    const { def } = cameo;
    const k = def.scale;
    const bar = cameo.along.getBoundingClientRect();
    const [a, b] = def.span;
    return {
      visible: true,
      key: def.id,
      ...onScreen(mix(bar.left, bar.right, clamp((p - a) / (b - a), 0, 1)), bar.top - k, k, width, height),
      scale: k,
      pose: "hover",
      fly: 0.45,
      settled: false,
      wave: false,
      masks: null,
      aim: null,
    };
  }

  /* The station that takes the parcel, if this route has one. */
  const drop = stations.find((station) => station.def.parcel);

  return {
    /** Elements screen stations show through the glass. */
    screens: stations.filter((station) => station.def.screen).map((station) => station.el),
    /** Station that takes the parcel, to tell when it has settled there. */
    dropKey: drop?.def.id ?? null,
    /** The element the parcel is set down on. */
    dropElement: drop?.el ?? null,
    /** Where the parcel stands on its station, live, whether or not the
        mascot is there. */
    parcelSpot(width: number, height: number): Spot | null {
      const parcel = drop?.def.parcel;
      if (!drop || !parcel) return null;
      const { def, el } = drop;
      const box = el.getBoundingClientRect();
      const scale = def.scale ?? placePerch(width, height).scale;
      return {
        x: box.left + def.ax * box.width + parcel.dx * scale,
        y: box.top,
        scale,
        done: el.querySelector(parcel.done),
      };
    },
    /** The intro stands in for the enter range of stations without one. `dt`
        (seconds) paces the flights: see `Pace`; acts react to `now`, the
        visitor. Hidden only until the intro shows it. */
    evaluate(scroll: number, width: number, height: number, intro: Intro, dt = 0, now: Sense = sense): Placement {
      frameDt = dt;
      sense = now;
      const goals = stations.map((station) => {
        const enter = station.enter ? progress(scroll, station.enter) : intro.shown ? intro.p : 0;
        const leave = station.leave ? progress(scroll, station.leave) : 0;
        const opening = !station.enter && Boolean(station.def.opening) && intro.shown && intro.p < 1;
        return { enter, leave, opening, wants: opening || (enter > 0 && leave < 1) };
      });
      // The later station wins while two overlap, so the hand-off moves forward.
      const wanted = goals.map((goal) => goal.wants).lastIndexOf(true);

      if (!seeded) {
        // First frame (or a rebuilt route): stand where the scroll says, no flight.
        seeded = true;
        stations.forEach((station, i) => {
          station.pace.enter = goals[i].enter;
          station.pace.leave = goals[i].leave;
        });
        holder = wanted;
      }

      // The station on stage keeps it until it is off, so a flick of the wheel
      // cannot cut a flight in half; the one that wants it waits its turn.
      if (holder >= 0 && holder !== wanted && !(stations[holder].paced && onStage(stations[holder]) && inView(stations[holder].el, height)))
        holder = -1;
      // A seam's cameo takes the stage as soon as no station wants it: it is
      // scrubbed on the bar and must not wait for a flight's long tail.
      const cameo = wanted < 0 ? cameos.find((c) => progress(scroll, c.range) > 0 && progress(scroll, c.range) < 1) : undefined;
      if (cameo) holder = -1;
      if (holder < 0) holder = wanted;

      stations.forEach((station, i) => {
        const goal = goals[i];
        const { pace } = station;
        if (!station.paced) {
          pace.enter = goal.enter;
          pace.leave = goal.leave;
        } else if (i !== holder) {
          // Off stage it stands where the scroll would put it.
          pace.leave = goal.leave >= 1 ? 1 : 0;
          pace.enter = goal.leave > 0 ? 1 : 0;
        } else {
          const away = wanted > holder;
          let enterGoal = goal.enter;
          let leaveGoal = goal.leave;
          if (away) {
            // Another station is next: finish the flight in progress and go.
            enterGoal = 1;
            leaveGoal = 1;
          }
          // Missed before it got there: back out the way it came in.
          if (leaveGoal >= 1 && pace.enter < 1 && pace.leave <= 0) {
            enterGoal = 0;
            leaveGoal = 0;
          }
          const arriving = pace.enter < 1;
          pace.enter = follow(pace.enter, pace.leave > 0 ? 1 : enterGoal, dt, ENTER_SECONDS);
          pace.leave = follow(pace.leave, arriving ? 0 : leaveGoal, dt, LEAVE_SECONDS);
        }
      });

      const perch = placePerch(width, height);
      if (holder >= 0) {
        const station = stations[holder];
        if (goals[holder].opening && holder === wanted) return placeOpening(station, intro, width, height, perch);
        if (onStage(station)) return placeStation(station, station.pace.enter, station.pace.leave, width, height, perch);
      }
      if (cameo) return placeCameo(cameo, progress(scroll, cameo.range), width, height);
      return intro.shown ? perch : { visible: false };
    },
  };
}

export type Director = ReturnType<typeof createDirector>;
