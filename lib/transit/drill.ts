import {
  GATE,
  KIND,
  Mesh,
  PALETTE,
  chip,
  clamp01,
  crossTrace,
  flatGlyphs,
  gate,
  gateOpening,
  mix,
  part,
  rng,
  smooth,
  trace,
  type Pose,
  type RGB,
  type Stretch,
  type TransitTheme,
  type V3,
} from "@/lib/transit/mesh";
import { chase, span, type Guide } from "@/lib/transit/guide";

/**
 * The drill: the transit into Drill Monitor bores down instead of flying on.
 *
 * The page peels off a plan view of the board, the camera straight above a
 * plated via with the section's number beside it and buses running into it.
 * It then sinks, turning once about its own axis like a bit, through the via
 * and the board's copper layers into rock. The bore runs straight down,
 * bends through a build curve and levels out inside the target layer, as a
 * directional well does, and opens into a chamber where the gate stands with
 * the Drill Monitor things around it. Rock takes its strata from depth in the
 * shader (KIND.rock); the target layer glows.
 *
 * The camera's path lies in the x = 0 plane: down -y, then toward -z.
 */

/** Height of the camera over the board when the page peels off it. */
const HIGH = 36;
/** Board thickness: the via's copper and core layers. */
const BOARD = 2.4;
/** Depth below the board surface where the bore starts to bend. */
const KICK = 40;
/** Radius of the build curve. */
const RADIUS = 24;
/** The level leg, then the chamber, before the gate. */
const RUN = 28;
const ROOM = 20;
/** Bore radius and how many faces go round it. */
const BORE = 4;
const SIDES = 14;
/** Height of the level leg: the camera rides at the gate's middle. */
const LEVEL = -KICK - RADIUS;
const FLOOR = LEVEL - GATE.height / 2;
const GATE_Z = -RADIUS - RUN - ROOM;
const END_GAP = 1.6;
const ARC = (Math.PI / 2) * RADIUS;
const DOWN = HIGH + KICK;
const TOTAL = DOWN + ARC + RUN + ROOM - END_GAP;

/** The target layer, by depth: the level leg runs inside it. */
const TARGET: [number, number] = [FLOOR - 3, FLOOR + 13];

/** Centre and heading of the path `s` voxels from the camera's start. */
function along(s: number): { c: V3; t: V3 } {
  if (s <= DOWN) return { c: [0, HIGH - s, 0], t: [0, -1, 0] };
  if (s <= DOWN + ARC) {
    const a = (s - DOWN) / RADIUS;
    return { c: [0, -KICK - RADIUS * Math.sin(a), -RADIUS * (1 - Math.cos(a))], t: [0, -Math.cos(a), -Math.sin(a)] };
  }
  return { c: [0, LEVEL, -RADIUS - (s - DOWN - ARC)], t: [0, 0, -1] };
}

/**
 * A run of the bore from s0 to s1: rings of SIDES faces at `radius` round
 * the path, facing in. The ring frame is x and the heading turned a quarter
 * in the y-z plane, so it stays continuous through the bend.
 */
function bore(mesh: Mesh, s0: number, s1: number, step: number, radius: number, col: (s: number) => RGB, kind: number, seed: (s: number) => number = () => 0) {
  const ring = (s: number) => {
    const { c, t } = along(s);
    return Array.from({ length: SIDES }, (_, i) => {
      const a = (i / SIDES) * Math.PI * 2;
      const u = Math.cos(a);
      const v = Math.sin(a);
      // v axis: (0, t.z, -t.y)
      return { p: [c[0] + radius * u, c[1] + radius * v * t[2], c[2] - radius * v * t[1]], n: [-u, -v * t[2], v * t[1]] };
    });
  };
  for (let s = s0; s < s1 - 1e-6; s += step) {
    const next = Math.min(s1, s + step);
    const a = ring(s);
    const b = ring(next);
    for (let i = 0; i < SIDES; i += 1) {
      const j = (i + 1) % SIDES;
      const n = [(a[i].n[0] + a[j].n[0]) / 2, (a[i].n[1] + a[j].n[1]) / 2, (a[i].n[2] + a[j].n[2]) / 2];
      mesh.quad(a[i].p, a[j].p, b[j].p, b[i].p, n, col(s), kind, seed(s));
    }
  }
}

/** A flat ring on the board round the via, from r0 to r1. */
function pad(mesh: Mesh, r0: number, r1: number, y: number, col: RGB, kind: number = KIND.solid, seed = 0) {
  const n = 28;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const b = ((i + 1) / n) * Math.PI * 2;
    mesh.quad(
      [Math.cos(a) * r0, y, Math.sin(a) * r0],
      [Math.cos(a) * r1, y, Math.sin(a) * r1],
      [Math.cos(b) * r1, y, Math.sin(b) * r1],
      [Math.cos(b) * r0, y, Math.sin(b) * r0],
      [0, 1, 0],
      col,
      kind,
      seed,
    );
  }
}

/** The board seen from above: the via, its pad, buses into it, chips and parts. */
function surface(mesh: Mesh, label: string, theme: TransitTheme, random: () => number) {
  const hole = BORE + 0.6;
  const far = 70;
  mesh.plane(-far, -far, far, -hole, PALETTE.floor, KIND.floor);
  mesh.plane(-far, hole, far, far, PALETTE.floor, KIND.floor);
  mesh.plane(-far, -hole, -hole, hole, PALETTE.floor, KIND.floor);
  mesh.plane(hole, -hole, far, hole, PALETTE.floor, KIND.floor);

  pad(mesh, BORE, BORE + 2.4, 0.05, PALETTE.accentDeep);
  // A ring of lamps chasing round the via's lip.
  for (let i = 0; i < 24; i += 1) {
    const a = (i / 24) * Math.PI * 2;
    const x = Math.cos(a) * (BORE + 1.2);
    const z = Math.sin(a) * (BORE + 1.2);
    mesh.box(x - 0.22, 0.05, z - 0.22, x + 0.22, 0.25, z + 0.22, theme.accent, KIND.lamp, i / 24);
  }

  /* Buses from three sides into the pad; the north side carries the number. */
  const lanes = [-1.6, -0.8, 0, 0.8, 1.6];
  const col = theme.traces[0];
  lanes.forEach((offset, lane) => {
    crossTrace(mesh, BORE + 2.4, far, offset, col, lane * 0.3);
    crossTrace(mesh, -far, -BORE - 2.4, offset, col, lane * 0.3 + 0.1);
    trace(mesh, offset, BORE + 2.4, far, col, lane * 0.3 + 0.2);
    trace(mesh, offset, -16, -far, col, lane * 0.3 + 0.4);
  });
  flatGlyphs(mesh, label, 0, -11, 0.02, 1, PALETTE.ink);

  const chips: [number, number, number, number][] = [
    [-17, -9, 9, 7],
    [17, -9, 8, 8],
    [-17, 10, 8, 6],
    [18, 11, 10, 7],
  ];
  chips.forEach(([x, z, w, d]) => chip(mesh, x, z, w, d));

  /* Small parts and vias between them, kept off the via, the buses and the chips. */
  const clear = (x: number, z: number) =>
    Math.hypot(x, z) > BORE + 5 &&
    Math.abs(z) > 2.6 &&
    !(z > 0 && Math.abs(x) < 2.6) &&
    !(z < -5 && Math.abs(x) < 7) &&
    chips.every(([cx, cz, w, d]) => Math.abs(x - cx) > w / 2 + 1.4 || Math.abs(z - cz) > d / 2 + 1.4);
  for (let i = 0; i < 90; i += 1) {
    const x = (random() - 0.5) * 70;
    const z = (random() - 0.5) * 44;
    if (!clear(x, z)) continue;
    part(mesh, random, x, z);
  }

  /* Data bits over the board, none in the column the camera sinks down. */
  for (let i = 0; i < 46; i += 1) {
    const x = (random() - 0.5) * 50;
    const z = (random() - 0.5) * 34;
    const y = 2 + random() * 20;
    if (Math.abs(x) < 7 && Math.abs(z) < 7) continue;
    const s = 0.05 + random() * 0.06;
    const col = random() > 0.8 ? theme.accent : random() > 0.5 ? PALETTE.ink : PALETTE.pin;
    mesh.box(x - s, y - s, z - s, x + s, y + s, z + s, col, KIND.bit, random());
  }
}

/** The chamber at the end of the level leg, its walls cut from the rock. */
function chamber(mesh: Mesh) {
  const X = 14;
  const top = FLOOR + 24;
  const back = GATE_Z - 2;
  const front = -RADIUS - RUN;
  const h = BORE + 0.6;
  const rock = PALETTE.tower;
  mesh.plane(-X, back, X, front, PALETTE.floor, KIND.floor, FLOOR);
  mesh.quad([-X, top, back], [X, top, back], [X, top, front], [-X, top, front], [0, -1, 0], rock, KIND.rock, 0);
  mesh.quad([-X, FLOOR, back], [-X, top, back], [-X, top, front], [-X, FLOOR, front], [1, 0, 0], rock, KIND.rock, 0);
  mesh.quad([X, FLOOR, back], [X, FLOOR, front], [X, top, front], [X, top, back], [-1, 0, 0], rock, KIND.rock, 0);
  mesh.quad([-X, FLOOR, back], [X, FLOOR, back], [X, top, back], [-X, top, back], [0, 0, 1], rock, KIND.rock, 0);
  // The wall the bore comes through, with its mouth cut out.
  const wall = (x0: number, y0: number, x1: number, y1: number) =>
    mesh.quad([x0, y0, front], [x1, y0, front], [x1, y1, front], [x0, y1, front], [0, 0, -1], rock, KIND.rock, 0);
  wall(-X, FLOOR, -h, top);
  wall(h, FLOOR, X, top);
  wall(-h, LEVEL + h, h, top);
  wall(-h, FLOOR, h, LEVEL - h);
  // Two lanes on the floor lead from the mouth to the gate.
  for (const x of [-2.6, -1.8, 1.8, 2.6]) trace(mesh, x, front, GATE_Z + 0.8, PALETTE.accentDeep, Math.abs(x), 0.3, KIND.trace, FLOOR);
}

function build(seed: number, label: string, theme: TransitTheme) {
  const mesh = new Mesh();
  const random = rng(seed * 7919 + 17);

  surface(mesh, label, theme, random);

  /* Through the board: copper and core in turn, then rock all the way down,
     through the bend and along the level leg to the chamber. */
  bore(mesh, HIGH, HIGH + BOARD, BOARD / 5, BORE, (s) => (Math.round((s - HIGH) / (BOARD / 5)) % 2 ? PALETTE.chip : PALETTE.accentDeep), KIND.solid);
  bore(mesh, HIGH + BOARD, DOWN, 2, BORE, () => PALETTE.tower, KIND.rock);
  bore(mesh, DOWN, DOWN + ARC, 1, BORE, () => PALETTE.tower, KIND.rock);
  bore(mesh, DOWN + ARC, DOWN + ARC + RUN, 2, BORE, () => PALETTE.tower, KIND.rock);

  /* Casing joints every few voxels; every third one is lit, so the bore
     reads as depth going by. */
  let joint = 0;
  for (let s = HIGH + BOARD + 4; s < DOWN + ARC + RUN - 1; s += 6) {
    const lit = joint % 3 === 0;
    bore(mesh, s, s + 0.5, 0.5, BORE - 0.1, () => (lit ? theme.accent : PALETTE.rack), lit ? KIND.lamp : KIND.solid, () => 1);
    joint += 1;
  }

  chamber(mesh);
  mesh.at([0, FLOOR, GATE_Z], () => theme.props(mesh, random));
  gate(mesh, label, theme.accent, FLOOR, GATE_Z);

  return new Float32Array(mesh.data);
}

/**
 * The camera rides the path for a progress p (0..1), looking along it. It
 * leaves slowly, so the plan view holds a while, and while it sinks to the
 * bend it turns once about its own axis, like a bit, coming out of the turn
 * level, so it enters the bend upright.
 */
function camera(p: number): Pose {
  const s = smooth(p) ** 1.4 * TOTAL;
  const { c, t } = along(s);
  const spin = Math.PI * 2 * smooth(clamp01(s / DOWN));
  return { x: c[0], y: c[1], z: c[2], yaw: 0, pitch: Math.atan2(t[1], Math.hypot(t[0], t[2])), roll: -spin };
}

/**
 * The mascot on the drill. It drops past the camera into the via and falls
 * ahead of it down the bore on its back, looking up at the lens, square to
 * it all the way, so the board and the rock turn round the two of them. Out
 * of the bend it rolls over to face the way on, then darts through the gate
 * before the camera.
 */
function guide(p: number, cam: Pose): Guide | null {
  const pass = span(p, 0.04, 0.2);
  const turn = span(p, 0.64, 0.72);
  const dash = span(p, 0.72, 0.84);
  const wobble = Math.sin(p * 40) * 0.35 * (1 - turn);
  const d = mix(-1, 7, pass) + dash * dash * 50;
  const sx = mix(1.8, 0.8, pass) * (1 - turn) + wobble;
  const sy = mix(mix(1.4, 0.4, pass), -0.6, turn);
  const at = chase(cam, d, sx, sy, Math.PI * turn, false);
  if (at.at[2] < GATE_Z - 0.5) return null;
  return { ...at, size: 0.085, fly: 1 };
}

export const drill: Stretch = {
  build,
  camera,
  guide,
  portal: gateOpening(FLOOR, GATE_Z),
  fog: [14, 62],
  radial: true,
  target: TARGET,
};
