import { clamp, easeInOut, mix } from "@/lib/mascot/math";
import { PEEK_DEPTH, PEEK_HIDE } from "@/lib/mascot/model";
import { boxPoly, clipPoly, markAt, silhouette, type Point, type Poly } from "@/lib/mascot/occlude";
import type { Hands } from "@/lib/mascot/rig";
import type { Pose } from "@/lib/mascot/route";
import { HOP, SEAT, STOMPS, STOMP_FROM, deck } from "@/lib/deck/state";
import { showcase } from "@/lib/showcase/state";
import { viewer } from "@/lib/viewer/state";

/**
 * What the mascot does inside a section, instead of standing on it and
 * pointing: it takes part in the scene or hides behind it. Each act reads
 * the section's own state (the DOM, the ring's and the viewer's scrubs) and
 * says where the robot is, how it holds itself and what it is behind
 * (`masks`, lib/mascot/occlude.ts). The director flies it in from its perch
 * onto the act's spot and back out (lib/mascot/director.ts).
 *
 * - load (02): stamps the cartridges into the deck. It stands on one and
 *   jumps on it, the cartridge going down a step each time it lands; when
 *   it seats it jumps for joy and hops over to the next. After the last it
 *   drops into the first free slot and pops up out of it, hands on its lip.
 * - seek (03): hide-and-seek round the ring's front screen. It looks out
 *   from behind one side edge, leaning out and holding on; as the ring turns
 *   it slips behind the screen and comes out on the other side with the next
 *   capture. Where the screen fills the width (a phone) it peeks over its
 *   top instead, one end then the other.
 * - lift (04): climbs the layer stack. It stands in the gap over the top
 *   slab lit, at its side corner, the slabs above in front of it, leaning
 *   out from behind them, and hops up a layer each time one lights; on the
 *   top slab it stands up straight.
 * - flip (05): turns the captures over. It peeks over the front one, climbs
 *   onto its top edge as it tips out of the window, rides it down, then
 *   jumps back up and drops in behind the next one.
 */

export type ActName = "load" | "seek" | "lift" | "flip";

/** What the visitor is doing, for acts that react to it. */
export type Sense = {
  /** The mouse, or a fresh tap, viewport px. */
  poke: Point | null;
  /** The element under the mouse, or the one just tapped. */
  target: Element | null;
  now: number;
};

export type ActSpot = {
  x: number;
  y: number;
  scale: number;
  pose: Pose;
  fly: number;
  lean?: number;
  hands?: Hands | null;
  masks: Poly[];
};

export type Act = (dt: number, sense: Sense) => ActSpot;

/** Drop below an edge that hides it whole, antenna and bob included. */
const HIDDEN = PEEK_DEPTH + PEEK_HIDE + 1.5;
/** Hands on an edge it peeks over: either side of its head. */
const KILROY = 11;

/** Fingers hooked over the edge, a little above it. */
const OVER = 1.4;

const kilroy = (x: number, y: number, k: number): Hands => ({
  l: { x: x - KILROY * k, y: y - OVER * k },
  r: { x: x + KILROY * k, y: y - OVER * k },
  grip: true,
});

/* 02 ------------------------------------------------------------------- */

/** Voxels across a cartridge's face: its width sets the robot's size. */
const CART_VOXELS = 21;
/** A stomp's and the joy jump's height, and the hop's arc between carts (voxels). */
const STOMP_UP = 5;
const JOY_UP = 9;
const HOP_UP = 12;
/** Phases of the last beat: the hop over the free slot, the drop into it,
    a moment out of sight, then up to peek out of it. */
const SLOT = { over: 0.4, drop: 0.6, hold: 0.78 } as const;
/** Hands on a slot's lip: narrower than on a wide edge. */
const LIP_HANDS = 7.5;
/** Down to the bottom of any screen: what lies in front of a slot's lip. */
const BELOW = 4000;

function load(root: HTMLElement, cap: number): Act {
  const carts = Array.from(root.querySelectorAll<HTMLElement>("[data-deck-cart]"));
  const mouth = root.querySelector<HTMLElement>("[data-deck-mouth]");
  const stand = (i: number) => {
    const mark = carts[i]?.querySelector("[data-stand]");
    return mark ? markAt(mark) : markAt(root);
  };
  /* The robot is as big as the cartridge's face is wide on screen. */
  const size = () => {
    const corners = carts[0]?.querySelectorAll(".deckCartFront > [data-corner]");
    if (!corners || corners.length < 2) return cap;
    const a = markAt(corners[0]);
    const b = markAt(corners[1]);
    return Math.min(cap, Math.hypot(b.x - a.x, b.y - a.y) / CART_VOXELS);
  };
  const on = (p: Point, k: number, up = 0, hands: Hands | null = null): ActSpot => ({
    x: p.x,
    y: p.y - up * k,
    scale: k,
    pose: "sit",
    fly: 0,
    hands,
    masks: [],
  });

  return () => {
    const k = size();
    const n = carts.length;
    if (!n) return { ...markAt(root), scale: k, pose: "hover", fly: 0, masks: [] };
    const at = clamp(deck.at, 0, n + 1);
    const i = Math.min(n, Math.floor(at));
    const f = i >= n ? Math.min(1, at - n) : at - i;

    if (i < n) {
      const here = stand(i);
      if (f < STOMP_FROM) return on(here, k);
      if (f < SEAT) {
        // A jump per step; it lands as the cartridge drops a step under it.
        const s = ((f - STOMP_FROM) / (SEAT - STOMP_FROM)) * STOMPS;
        return on(here, k, Math.sin(Math.PI * (s - Math.floor(s))) * STOMP_UP);
      }
      if (f < HOP) {
        // Seated: a jump for joy, arms up.
        const t = (f - SEAT) / (HOP - SEAT);
        const up = Math.sin(Math.PI * t) * JOY_UP;
        const y = here.y - up * k;
        return on(here, k, up, t > 0.1 && t < 0.9 ? { l: { x: here.x - 12 * k, y: y - 30 * k }, r: { x: here.x + 12 * k, y: y - 30 * k }, grip: false } : null);
      }
      // Over to the next cartridge; on the last one it stays and looks on.
      if (i + 1 >= n) return on(here, k);
      const there = stand(i + 1);
      const t = easeInOut((f - HOP) / (1 - HOP));
      return {
        x: mix(here.x, there.x, t),
        y: mix(here.y, there.y, t) - Math.sin(Math.PI * t) * HOP_UP * k,
        scale: k,
        pose: "hover",
        fly: Math.sin(Math.PI * t) * 0.5,
        masks: [],
      };
    }

    // The open slots: into the first free one, and up out of it.
    const from = stand(n - 1);
    const lips = mouth ? Array.from(mouth.querySelectorAll("[data-lip]"), markAt) : [];
    if (lips.length < 2) return on(from, k);
    const [l, r] = lips;
    const lip = { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
    const front: Poly = [l, r, { x: r.x, y: r.y + BELOW }, { x: l.x, y: l.y + BELOW }];
    const over = { x: lip.x, y: lip.y - 4 * k };
    const down = lip.y + HIDDEN * k;
    if (f < SLOT.over) {
      const t = easeInOut(f / SLOT.over);
      return {
        x: mix(from.x, over.x, t),
        y: mix(from.y, over.y, t) - Math.sin(Math.PI * t) * HOP_UP * k,
        scale: k,
        pose: "hover",
        fly: Math.sin(Math.PI * t) * 0.5,
        masks: [],
      };
    }
    if (f < SLOT.hold) {
      const t = easeInOut(clamp((f - SLOT.over) / (SLOT.drop - SLOT.over), 0, 1));
      return { x: lip.x, y: mix(over.y, down, t), scale: k, pose: "hover", fly: 0, masks: [front] };
    }
    const t = easeInOut((f - SLOT.hold) / (1 - SLOT.hold));
    const hands: Hands | null =
      t > 0.6 ? { l: { x: lip.x - LIP_HANDS * k, y: lip.y - OVER * k }, r: { x: lip.x + LIP_HANDS * k, y: lip.y - OVER * k }, grip: true } : null;
    return { x: lip.x, y: mix(down, lip.y + PEEK_DEPTH * k, t), scale: k, pose: "peek", fly: 0, hands, masks: [front] };
  };
}

/** Where along an edge it peeks over: one end or the other. */
const ENDS = [0.8, 0.2] as const;

/* 03 ------------------------------------------------------------------- */

/** How far out past the edge it stands, and how far it leans out (voxels, radians). */
const SEEK_OUT = 1.2;
const SEEK_LEAN = 0.32;
/** Room it needs beside the screen to look out from its side (voxels). */
const SEEK_ROOM = 9;

function seek(root: HTMLElement, cap: number): Act {
  const stage = root.querySelector<HTMLElement>("[data-ring-stage]") ?? root;
  const front = () => root.querySelector<HTMLElement>("[data-ring-card].is-front");
  return () => {
    // The front screen as drawn: the WebGL slab's outline, else the ring's
    // front card.
    const box = stage.getBoundingClientRect();
    const drawn = showcase.outline;
    const card = front()?.getBoundingClientRect();
    const poly: Poly = drawn.length
      ? drawn.map((p) => ({ x: box.left + p.x * box.width, y: box.top + p.y * box.height }))
      : card
        ? boxPoly(card)
        : boxPoly(box);
    const left = Math.min(...poly.map((p) => p.x));
    const right = Math.max(...poly.map((p) => p.x));
    const top = Math.min(...poly.map((p) => p.y));
    const bottom = Math.max(...poly.map((p) => p.y));
    const w = right - left;
    const h = bottom - top;
    const cx = (left + right) / 2;
    const k = Math.min(cap, (h * 0.62) / 28);

    // Even screens it looks out on the right, odd ones on the left.
    const side = (n: number) => (n % 2 === 0 ? 1 : -1);
    const u = easeInOut(clamp(showcase.turn, 0, 1));
    const n = showcase.screen;
    const masks = [clipPoly(poly, box)];

    // No room beside the screen (a phone): it peeks over its top instead,
    // one end then the other, ducking behind it for the turn.
    if (Math.min(left, window.innerWidth - right) < SEEK_ROOM * k) {
      const end = (m: number) => left + w * (side(m) > 0 ? ENDS[0] : ENDS[1]);
      const x = mix(end(n), end(n + 1), u);
      const depth = Math.sin(Math.PI * u);
      return {
        x,
        y: top + mix(PEEK_DEPTH, HIDDEN, depth) * k,
        scale: k,
        pose: "peek",
        fly: 0,
        hands: depth < 0.5 ? kilroy(x, top, k) : null,
        masks,
      };
    }

    const edge = (m: number) => cx + side(m) * (w / 2 + SEEK_OUT * k);
    const x = mix(edge(n), edge(n + 1), u);
    const lean = mix(side(n), side(n + 1), u) * SEEK_LEAN;
    const y = bottom - h * 0.06;
    // Holding on to the edge while it looks out: the hand on the screen's
    // side, its left when it looks out on the right.
    const out = Math.abs(lean) > SEEK_LEAN * 0.6;
    const hold = { x: cx + Math.sign(lean) * (w / 2), y: y - 15 * k };
    const hands: Hands | null = out ? (lean > 0 ? { l: hold, grip: true } : { r: hold, grip: true }) : null;

    return {
      x,
      y,
      scale: k,
      pose: "sit",
      fly: Math.sin(Math.PI * u) * 0.35,
      lean,
      hands,
      masks,
    };
  };
}

/* 04 ------------------------------------------------------------------- */

const CLIMB_SECONDS = 0.5;
/** How far past a slab's side corner it stands, and how far it leans out. */
const LIFT_OUT = 1;
const LIFT_LEAN = 0.34;

function lift(root: HTMLElement, k: number): Act {
  const slabs = Array.from(root.querySelectorAll<HTMLElement>("[data-slab]"));
  let at = -1;
  let from = 0;
  let t = 1;

  /* The top's side corner (leftmost on screen): it stands just past it, in
     the gap under the next slab, leaning out from behind the stack. */
  const standOn = (i: number): Point => {
    const top = slabs[i]?.querySelector(".slabTop");
    const corners = top ? Array.from(top.querySelectorAll(":scope > [data-corner]"), markAt) : [];
    if (!corners.length) return markAt(slabs[i] ?? root);
    const side = corners.reduce((best, p) => (p.x < best.x ? p : best));
    return { x: side.x - LIFT_OUT * k, y: side.y };
  };

  return (dt) => {
    const lit = slabs.filter((slab) => slab.classList.contains("is-on")).length;
    const want = clamp(lit - 1, 0, slabs.length - 1);
    if (at < 0) at = from = want;
    if (want !== at) {
      from = at;
      at = want;
      t = 0;
    }
    t = Math.min(1, t + dt / CLIMB_SECONDS);
    const e = easeInOut(t);
    const a = standOn(from);
    const b = standOn(at);
    const hop = Math.sin(Math.PI * t);
    // Halfway up it is past the next slab's edge: the slabs above that one hide it.
    const level = t < 0.5 ? from : at;
    // On the top slab nothing is above it: it stands up straight.
    const lean = at >= slabs.length - 1 && t >= 1 ? 0 : -LIFT_LEAN * (1 - hop * 0.6);
    return {
      x: mix(a.x, b.x, e),
      y: mix(a.y, b.y, e) - hop * 8 * k,
      scale: k,
      pose: "sit",
      fly: hop,
      lean,
      masks: slabs.slice(level + 1).map(silhouette),
    };
  };
}

/* 05 ------------------------------------------------------------------- */

/** Phases of one flip (0..1 of the capture tipping out): peeking, climbing
    onto the edge, riding it down, jumping back up, dropping in behind the
    next capture. */
const FLIP = { climb: 0.06, ride: 0.28, jump: 0.6, sink: 0.86 } as const;

function flip(root: HTMLElement, k: number): Act {
  const stage = root.querySelector<HTMLElement>("[data-viewer-stage]") ?? root;
  const shots = Array.from(root.querySelectorAll<HTMLElement>("[data-viewer-shot]"));
  const grip = (i: number) => {
    const mark = shots[i]?.querySelector("[data-grip]");
    return mark ? markAt(mark) : markAt(shots[i] ?? stage);
  };
  const behind = (i: number) => [clipPoly(boxPoly(shots[i].getBoundingClientRect()), stage.getBoundingClientRect())];
  const peek = (i: number): ActSpot => {
    const g = grip(i);
    return { x: g.x, y: g.y + PEEK_DEPTH * k, scale: k, pose: "peek", fly: 0, hands: kilroy(g.x, g.y, k), masks: behind(i) };
  };

  return () => {
    const last = shots.length - 1;
    if (last < 0) return { ...markAt(stage), scale: k, pose: "hover", fly: 0, masks: [] };
    const at = clamp(viewer.at, 0, last);
    const i = Math.min(last, Math.floor(at));
    const f = i >= last ? 0 : at - i;
    if (f <= FLIP.climb) return peek(i);

    const g = grip(i);
    if (f < FLIP.ride) {
      // Up out of the stack onto the top edge, pushing itself up on it.
      const u = easeInOut((f - FLIP.climb) / (FLIP.ride - FLIP.climb));
      return {
        x: g.x,
        y: g.y + mix(PEEK_DEPTH, 0, u) * k,
        scale: k,
        pose: "sit",
        fly: 0,
        hands: u < 0.75 ? { l: { x: g.x - 8 * k, y: g.y }, r: { x: g.x + 8 * k, y: g.y }, grip: true } : null,
        masks: behind(i),
      };
    }
    if (f < FLIP.jump) {
      // Rides the edge down as it tips toward the camera, arms out.
      return {
        x: g.x,
        y: g.y,
        scale: k,
        pose: "sit",
        fly: 0.15,
        lean: Math.sin((f - FLIP.ride) * 22) * 0.12,
        hands: { l: { x: g.x - 18 * k, y: g.y - 12 * k }, r: { x: g.x + 18 * k, y: g.y - 12 * k }, grip: false },
        masks: [],
      };
    }
    const next = grip(i + 1);
    const over = { x: next.x, y: next.y - 3 * k };
    if (f < FLIP.sink) {
      // Off before the capture is gone: a jump back up over the next one.
      const u = easeInOut((f - FLIP.jump) / (FLIP.sink - FLIP.jump));
      return {
        x: mix(g.x, over.x, u),
        y: mix(g.y, over.y, u) - Math.sin(Math.PI * u) * 9 * k,
        scale: k,
        pose: "hover",
        fly: Math.sin(Math.PI * u),
        masks: [],
      };
    }
    // And down behind it, taking hold of its edge.
    const u = easeInOut((f - FLIP.sink) / (1 - FLIP.sink));
    return {
      x: next.x,
      y: mix(over.y, next.y + PEEK_DEPTH * k, u),
      scale: k,
      pose: u > 0.5 ? "peek" : "hover",
      fly: 0,
      hands: kilroy(next.x, next.y, k),
      masks: behind(i + 1),
    };
  };
}

const ACTS: Record<ActName, (root: HTMLElement, k: number) => Act> = { load, seek, lift, flip };

/** `root` is the station's section; `k` its voxel size (load, seek: the most). */
export function createAct(name: ActName, root: HTMLElement, k: number): Act {
  return ACTS[name](root, k);
}
