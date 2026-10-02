/**
 * The mascot: a small hovering robot — a boxy body riding a spinning thruster
 * ring, a short neck and a monitor for a head whose screen shows its face —
 * built in voxels. One voxel is one model unit; the origin is the ground
 * point under the body centre, +y up, +z toward the viewer. The whole robot
 * floats a couple of voxels above that point.
 *
 * Each rigid part is built around its own pivot so the rig can turn the head
 * on the neck, spin the ring, swing the antenna and work the arms: shoulder,
 * elbow and wrist joints, and a gripper hand of two jointed fingers and an
 * opposed thumb, so grips, waves and finger wiggles read even at small sizes. The face
 * is a pixel matrix on the screen: every pair of eyes and every mouth is its
 * own small part, and the rig picks one of each per frame.
 *
 * The shell is voxels; bolts, seams, fins, joints and the hands are finer
 * boxes on the same lighting steps, so the extra detail stays in the sprite
 * language. Geometry is baked once into a single interleaved buffer.
 */

import { buildHd, type HdPartId } from "@/lib/mascot/hd";

const PALETTE = {
  b: "#e2733f", // shell
  d: "#b4532a", // shell bands
  r: "#8e4536", // shell shadow accents, rivets
  k: "#2a2825", // nozzle, vent slots
  g: "#5e5d59", // dark steel
  s: "#87867f", // steel
  l: "#b0aea5", // light steel
  q: "#1c2519", // screen glass
  a: "#f2a65a", // emitter — glows
  c: "#c3e88d", // charge cells and face pixels
  f: "#f6c98a", // thruster beam — glows
  x: "#fff3d6", // spark
  h: "#f39a68", // shell highlight (close-up bevels)
  o: "#6f8f4e", // face pixels, dim
  n: "#33452a", // face pixel halo on the glass
  e: "#effcd6", // face pixels, hot
} as const;

export type ColorKey = keyof typeof PALETTE;
type Vec3 = [number, number, number];

/* Face pixel art. Eyes are three rows (top first) of three columns running
   from the outer edge inward, drawn as the left eye and mirrored for the
   right. Mouths are two rows of five columns. "#" is a lit pixel. */
const EYES = {
  open: [".##", ".##", ".##"],
  blink: ["...", ".##", "..."],
  happy: [".#.", "#.#", "..."],
  wide: ["###", "#.#", "###"],
  heart: ["#.#", "###", ".#."],
  dizzy: ["#.#", ".#.", "#.#"],
  squeeze: ["#..", ".#.", "#.."],
  sleepy: ["...", "...", "###"],
} as const;

/* A whole-screen greeting in place of the face, rows top (7) to bottom (0)
   across all eleven columns. */
const HI = [
  "...........",
  "..#.#.###..",
  "..#.#..#...",
  "..###..#...",
  "..#.#..#...",
  "..#.#.###..",
  "...........",
  "...........",
];

const MOUTHS = {
  soft: [".....", ".###."],
  smile: ["#...#", ".###."],
  grin: ["#####", ".###."],
  o: [".###.", ".###."],
  wobble: [".#.#.", "#.#.#"],
  dot: [".....", "..#.."],
} as const;

export type Eyes = keyof typeof EYES;
export type Mouth = keyof typeof MOUTHS;

type RigidPart =
  | "base"
  | "body"
  | "neck"
  | "head"
  | "antenna"
  | "armL"
  | "armR"
  | "foreL"
  | "foreR"
  | "handL"
  | "handR"
  | "finger"
  | "fingertip"
  | "jet"
  | "spark"
  | "zee"
  | "parcel";
export type PartId = RigidPart | `eyes-${Eyes}` | `mouth-${Mouth}` | "face-hi" | HdPartId;

/** Where each part's pivot sits, in its parent's space (see rig order). */
export const PIVOTS: Record<"base" | "neck" | "head" | "antenna" | "armL" | "armR" | "jet", Vec3> = {
  base: [0, 2, 0], // thruster ring, under the body
  neck: [0, 11, 0], // on the body's top
  head: [0, 13, 0], // monitor bottom, on top of the neck
  antenna: [3, 10, -1], // head space, on the monitor's roof
  armL: [-5.5, 10, 0], // shoulders, beside the body's top
  armR: [5.5, 10, 0],
  jet: [0, 2, 0], // beam hangs from the ring's underside
};

/* The arm chain, each joint in its parent's space: elbow in upper-arm space,
   wrist in forearm space. In hand space the fingers hang along -y, spread
   along x, and the palm faces +z; the thumb sits on the +x edge of the right
   hand and the -x edge of the left. */
export const ELBOW = -3.3;
export const WRIST = -3.2;
export const KNUCKLE_Y = -2;
export const FINGER_X = [-0.6, 0.6] as const;
/** Thumb root on the right hand; mirrored in x for the left. */
export const THUMB_ROOT: Vec3 = [1.25, -0.9, 0.25];
/** Middle joint of a finger, in its root segment's space. */
export const PHALANX = -1.2;

export const NECK_LENGTH = 2;
/** Head centre above the ground, in voxels — the "gaze origin". */
export const HEAD_CENTER_Y = 18;
/** Face centre in head space, the pivot of the screen's CRT squash. */
export const FACE_CENTER_Y = 5;
/** Head space point above the antenna tip, where sleep Zs start. */
export const ANTENNA_TIP: [number, number, number] = [3, 14.5, -1];
/** Hip offset that leaves only the eyes and the monitor top above an edge. */
export const PEEK_DEPTH = 17.6;
/** Extra drop that hides the antenna too, for rising and ducking. */
export const PEEK_HIDE = 9.5;
/** Body height in voxel layers, and the layer it starts on. */
const BODY_LAYERS = 7;
const BODY_BOTTOM = 4;

/** Vertex layout: position(3) normal(3) colour(3) kind(1). */
export const FLOATS_PER_VERTEX = 10;

/**
 * Per-vertex material kind read by the shader:
 * 0 plain, 1 emitter (pulses with u_glow), 3..6 charge cell 0..3 (lit by
 * u_charge), 7 always full bright, 8 screen glass (lit by u_screen).
 */
const KIND: Partial<Record<ColorKey, number>> = { a: 1, f: 7, x: 7 };
export const CELL = 3;
export const BRIGHT = 7;
export const SCREEN = 8;

export type PartRange = { first: number; count: number };

type Voxel = [number, number, number, ColorKey, number?];

function rgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/* A voxel at grid cell (x, y, z) fills x±0.5, y..y+1, z±0.5, so the ground is
   the plane y = 0 and the cell index reads as "layer". */
const at = (x: number, y: number, z: number, c: ColorKey, kind?: number): Voxel => [x, y + 0.5, z, c, kind];

function base(): Voxel[] {
  // An octagonal ring: lit emitters alternate with steel around the rim so
  // the spin reads, a darker skirt and a nozzle underneath.
  const out: Voxel[] = [];
  for (let x = -3; x <= 3; x += 1) {
    for (let z = -3; z <= 3; z += 1) {
      const r = Math.abs(x) + Math.abs(z);
      if (r > 4) continue;
      const rim = Math.abs(x) === 3 || Math.abs(z) === 3 || r === 4;
      out.push(at(x, 1, z, rim ? ((x + z + 8) % 2 === 0 ? "a" : "s") : "g"));
      if (r <= 3 && Math.abs(x) <= 2 && Math.abs(z) <= 2) out.push(at(x, 0, z, x === 0 && z === 0 ? "k" : "g"));
    }
  }
  return out;
}

function body(): Voxel[] {
  const out: Voxel[] = [];
  const top = BODY_BOTTOM + BODY_LAYERS - 1;
  for (let y = BODY_BOTTOM; y <= top; y += 1) {
    for (let x = -4; x <= 4; x += 1) {
      for (let z = -3; z <= 3; z += 1) {
        // Rounded vertical edges; the bottom layer tucks in over the ring.
        if (Math.abs(x) === 4 && Math.abs(z) === 3) continue;
        if (y === BODY_BOTTOM && (Math.abs(x) === 4 || Math.abs(z) === 3)) continue;
        let c: ColorKey = "b";
        let kind: number | undefined;
        if (y === BODY_BOTTOM || y === top) c = "d"; // lip and rim bands
        else if (z === -3) c = "r"; // back shading
        else if (Math.abs(x) === 4 && Math.abs(z) <= 1 && y >= 6 && y <= 8) c = y === 7 ? "g" : "k"; // side vents
        if (z === 3) {
          // Front: rivets, a charge meter and a vent.
          if (y === top - 1 && Math.abs(x) === 3) c = "r";
          if (x === -2 && y >= 5 && y <= 8) {
            c = "c";
            kind = CELL + (y - 5);
          }
          if (x === -3 && y >= 5 && y <= 8) c = "g";
          if (x >= 1 && x <= 3 && (y === 6 || y === 7)) c = x === 2 ? "k" : "g";
        }
        out.push(at(x, y, z, c, kind));
      }
    }
  }
  // Power pack on the back: finned, with a status light on top.
  for (let y = BODY_BOTTOM + 1; y <= top - 1; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      out.push(at(x, y, -4, y === top - 1 ? (x === 0 ? "a" : "d") : x % 2 === 0 ? "s" : "g"));
    }
  }
  return out;
}

/* Finer boxes, in the same space as the voxels they sit on. Each one stands
   proud of the faces it touches so no two faces share a plane. */
type Box = [min: Vec3, max: Vec3, c: ColorKey, kind?: number];

function pushBoxes(out: number[], boxes: Box[]) {
  for (const [a, b, c, kind] of boxes) {
    const min = [0, 1, 2].map((i) => Math.min(a[i], b[i]));
    const max = [0, 1, 2].map((i) => Math.max(a[i], b[i]));
    pushBox(out, min, max, c, kind ?? KIND[c] ?? 0);
  }
}

/** A cube of edge `s` around a point. */
const nub = (x: number, y: number, z: number, s: number, c: ColorKey): Box => [
  [x - s / 2, y - s / 2, z - s / 2],
  [x + s / 2, y + s / 2, z + s / 2],
  c,
];

function bodyDetail(): Box[] {
  const out: Box[] = [];
  // Bolts over the front rivets and at the lower corners.
  for (const [x, y] of [[-3, 9.5], [3, 9.5], [-3, 5.5], [3, 5.5]]) out.push(nub(x, y, 3.55, 0.36, "l"));
  // Three status lights over the vent, and a seam under it.
  for (const x of [1, 2, 3]) out.push(nub(x, 8.5, 3.56, 0.4, "a"));
  out.push([[0.6, 5.4, 3.5], [2.55, 5.6, 3.6], "r"]);
  // Hatch plate on the top, round the neck.
  out.push([[-2.4, 11, -2.4], [2.4, 11.12, 2.4], "g"]);
  return out;
}

function neck(): Voxel[] {
  const out: Voxel[] = [];
  for (const [x, z] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
    out.push(at(x, 0, z, "g"), at(x, 1, z, x === 0 && z === 0 ? "s" : "g"));
  }
  return out;
}

/** Collars on the neck piston. */
const neckDetail = (): Box[] => [
  [[-1.65, 0.85, -1.65], [1.65, 1.15, 1.65], "l"],
  [[-1.2, 1.9, -1.2], [1.2, 2.1, 1.2], "s"],
];

function head(): Voxel[] {
  // A monitor: 13 wide, 10 tall, 6 deep, the screen recessed one voxel
  // behind the bezel, a dial on each side.
  const out: Voxel[] = [];
  for (let y = 0; y <= 9; y += 1) {
    for (let x = -6; x <= 6; x += 1) {
      for (let z = -3; z <= 2; z += 1) {
        const edgeX = Math.abs(x) === 6;
        const edgeY = y === 0 || y === 9;
        if (edgeX && edgeY) continue;
        if (z === -3 && (edgeX || edgeY)) continue;
        const screen = Math.abs(x) <= 5 && y >= 1 && y <= 8;
        if (screen && z === 2) continue;
        let c: ColorKey = "b";
        let kind: number | undefined;
        if (screen && z === 1) {
          c = "q";
          kind = SCREEN;
        } else if (y === 0) c = "d";
        else if (z === -3) c = y === 7 && Math.abs(x) <= 3 && x % 2 === 0 ? "k" : "r";
        out.push(at(x, y, z, c, kind));
      }
    }
  }
  // Receivers on the sides, a sensor block on the roof.
  for (const side of [-1, 1]) {
    for (let y = 3; y <= 6; y += 1) {
      for (const z of [-2, -1, 0]) out.push(at(side * 7, y, z, (y === 4 || y === 5) && z === -1 ? "l" : "g"));
    }
  }
  out.push(at(-3, 10, 0, "g"), at(-2, 10, 0, "g"), at(-3, 10, -1, "s"), at(-2, 10, -1, "s"));
  return out;
}

function headDetail(): Box[] {
  const out: Box[] = [];
  // Bezel screws, a power light and a row of keys under the screen.
  for (const [x, y] of [[-6, 8.5], [6, 8.5], [-6, 1], [6, 1]]) out.push(nub(x, y, 2.55, 0.34, "l"));
  out.push(nub(4.6, 0.5, 2.56, 0.42, "a"));
  for (const x of [-4, -3, -2]) out.push([[x - 0.35, 0.35, 2.5], [x + 0.35, 0.65, 2.62], "g"]);
  // Sensor lens on the roof block.
  out.push([[-3.3, 10.25, 0.5], [-1.7, 10.75, 0.62], "k"], nub(-2.5, 10.5, 0.66, 0.34, "a"));
  // Receiver lights on the sides.
  for (const side of [-1, 1]) out.push([[side * 7.5, 4.2, -1.3], [side * 7.62, 4.8, -0.7], "a"]);
  // Heat-sink fins down the back.
  for (const x of [-4, -2, 0, 2, 4]) out.push([[x - 0.18, 1.6, -3.5], [x + 0.18, 7.4, -4.1], "g"]);
  return out;
}

function antenna(): Voxel[] {
  return [at(0, 0, 0, "g"), at(0, 1, 0, "s"), at(0, 2, 0, "s"), at(0, 3, 0, "a")];
}

/** A crossbar on the mast. */
const antennaDetail = (): Box[] => [[[-0.9, 2.35, -0.2], [0.9, 2.65, 0.2], "l"]];

/* The arm: a shoulder housing and a piston to the elbow, an armoured
   forearm, then the hand. Fine boxes throughout, so joints and fingers read
   as separate pieces. `side` is -1 for the left arm, +1 for the right. */
function upperArm(side: -1 | 1): Box[] {
  const s = side;
  return [
    [[-1.1 * s, -0.8, -1.1], [1.1 * s, 0.8, 1.1], "b"], // housing
    [[-0.9 * s, -1.25, -0.95], [0.95 * s, -0.8, 0.95], "d"], // collar
    [[1.1 * s, -0.55, -0.7], [1.25 * s, 0.55, 0.7], "l"], // cap plate
    [[1.25 * s, -0.22, -0.22], [1.42 * s, 0.22, 0.22], "g"], // hub bolt
    [[-0.42, -3.1, -0.42], [0.42, -1.25, 0.42], "s"], // piston
    [[-0.55, -2.35, -0.55], [0.55, -2.05, 0.55], "g"], // piston band
  ];
}

function forearm(side: -1 | 1): Box[] {
  const s = side;
  return [
    nub(0, 0, 0, 1.15, "g"), // elbow joint
    [[0.57 * s, -0.32, -0.32], [0.72 * s, 0.32, 0.32], "l"], // joint cap
    [[-0.78, -2.75, -0.78], [0.78, -0.55, 0.78], "b"], // shell
    [[-0.88, -3.05, -0.88], [0.88, -2.75, 0.88], "d"], // cuff
    [[0.78 * s, -2.35, -0.22], [0.9 * s, -0.95, 0.22], "a"], // light strip
    [[-0.5, -1.75, 0.78], [0.5, -1.55, 0.86], "r"], // seam
  ];
}

function hand(side: -1 | 1): Box[] {
  const s = side;
  const out: Box[] = [
    nub(0, -0.05, 0, 0.7, "g"), // wrist joint
    [[-1.2, -1.9, -0.55], [1.2, -0.35, 0.55], "b"], // back of the hand
    [[-0.98, -1.7, 0.55], [0.98, -0.55, 0.66], "g"], // palm plate
    [[-0.4, -1.4, 0.66], [0.4, -0.85, 0.74], "a"], // palm emitter
    [[-1.08, -1.85, -0.55], [1.08, -1.45, -0.66], "d"], // knuckle band
    [[1.1 * s, -1.35, -0.3], [1.5 * s, -0.45, 0.55], "g"], // thumb mount
  ];
  for (const x of FINGER_X) out.push([[x - 0.5, -2.15, -0.48], [x + 0.5, -1.8, 0.48], "l"]); // knuckles
  return out;
}

/** A finger's root segment, from the knuckle; the tip hangs off PHALANX. */
const finger = (): Box[] => [
  [[-0.44, -1.12, -0.42], [0.44, -0.12, 0.42], "l"],
  [[-0.34, -1.32, -0.34], [0.34, -1.02, 0.34], "g"],
];

/** Tapered to a blunt claw, so the grip reads as a machine's. */
const fingertip = (): Box[] => [
  [[-0.4, -0.75, -0.38], [0.4, -0.05, 0.38], "l"],
  [[-0.28, -1.1, -0.28], [0.28, -0.75, 0.28], "g"],
];

/* The parcel it carries from the hero to the request: a shell-orange box
   tied with dark straps, an address plate on the front and a light on the
   knot that pulses with the emitters. Centred on its own origin; the box
   stands PARCEL_HALF voxels above and below it. */
export const PARCEL_HALF = 1;

const parcel = (): Box[] => [
  [[-1.3, -PARCEL_HALF, -1], [1.3, PARCEL_HALF, 1], "b"],
  [[-1.36, -0.18, -1.06], [1.36, 0.18, 1.06], "k"], // strap round the waist
  [[-0.18, -1.06, -1.08], [0.18, 1.06, 1.08], "k"], // strap over the top
  [[0.42, 0.34, 1], [1.06, 0.8, 1.1], "l"], // address plate
  [[0.58, 0.46, 1.1], [0.9, 0.68, 1.16], "c", BRIGHT], // its lit pixel
  [[-0.26, 1.08, -0.26], [0.26, 1.6, 0.26], "a"], // the knot light
];

function jet(): Voxel[] {
  // Thruster beam under the ring; the rig scales it with flight.
  return [
    at(0, -1, 0, "f"),
    at(-1, -1, 0, "a"),
    at(1, -1, 0, "a"),
    at(0, -1, -1, "a"),
    at(0, -1, 1, "a"),
    at(0, -2, 0, "f"),
    at(0, -3, 0, "a"),
  ];
}

const FACES: { n: [number, number, number]; corners: [number, number, number][] }[] = [
  { n: [1, 0, 0], corners: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
  { n: [-1, 0, 0], corners: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]] },
  { n: [0, 1, 0], corners: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] },
  { n: [0, -1, 0], corners: [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]] },
  { n: [0, 0, 1], corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { n: [0, 0, -1], corners: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
];

function pushBox(
  out: number[],
  min: number[],
  max: number[],
  color: ColorKey,
  kind = KIND[color] ?? 0,
  skip?: (n: number[], face: number) => boolean,
) {
  const [r, g, b] = rgb(PALETTE[color]);
  const center = [0, 1, 2].map((i) => (min[i] + max[i]) / 2);
  const half = [0, 1, 2].map((i) => (max[i] - min[i]) / 2);
  for (const [index, face] of FACES.entries()) {
    if (skip?.(face.n, index)) continue;
    const pts = face.corners.map((c) => [0, 1, 2].map((i) => center[i] + c[i] * half[i]));
    for (const index of [0, 1, 2, 0, 2, 3]) {
      out.push(...pts[index], ...face.n, r, g, b, kind);
    }
  }
}

/** Unit voxels with internal faces culled, so only the shell is drawn. */
function pushVoxels(out: number[], voxels: Voxel[]) {
  const filled = new Set(voxels.map(([x, y, z]) => `${x},${y},${z}`));
  for (const [x, y, z, color, kind] of voxels) {
    pushBox(out, [x - 0.5, y - 0.5, z - 0.5], [x + 0.5, y + 0.5, z + 0.5], color, kind ?? KIND[color] ?? 0, (n) =>
      filled.has(`${x + n[0]},${y + n[1]},${z + n[2]}`),
    );
  }
}

/* The screen is an 11 × 8 pixel grid: columns -5..5, rows 0..7 from the
   bottom, one voxel each, on the glass in head space (bottom at y = 1,
   surface at z = 1.5). Eyes sit on rows 4..6 and the mouth on rows 1..2,
   leaving a free pixel all round so the face can glance across the screen. */
function pushPixels(out: number[], pixels: [number, number][]) {
  for (const [i, j] of pixels) {
    pushBox(out, [i - 0.5, j + 1, 1.5], [i + 0.5, j + 2, 1.72], "c", BRIGHT);
  }
}

function eyePixels(rows: readonly string[]): [number, number][] {
  const out: [number, number][] = [];
  rows.forEach((row, r) =>
    [...row].forEach((cell, c) => {
      if (cell === "#") out.push([-4 + c, 6 - r], [4 - c, 6 - r]);
    }),
  );
  return out;
}

function mouthPixels(rows: readonly string[]): [number, number][] {
  const out: [number, number][] = [];
  rows.forEach((row, r) =>
    [...row].forEach((cell, c) => {
      if (cell === "#") out.push([-2 + c, 2 - r]);
    }),
  );
  return out;
}

export function buildMascotMesh(): { data: Float32Array; parts: Record<PartId, PartRange> } {
  const out: number[] = [];
  const parts = {} as Record<PartId, PartRange>;
  const add = (id: PartId, build: () => void) => {
    const first = out.length / FLOATS_PER_VERTEX;
    build();
    parts[id] = { first, count: out.length / FLOATS_PER_VERTEX - first };
  };

  add("base", () => pushVoxels(out, base()));
  add("body", () => {
    pushVoxels(out, body());
    pushBoxes(out, bodyDetail());
  });
  add("neck", () => {
    pushVoxels(out, neck());
    pushBoxes(out, neckDetail());
  });
  add("head", () => {
    pushVoxels(out, head());
    pushBoxes(out, headDetail());
  });
  add("antenna", () => {
    pushVoxels(out, antenna());
    pushBoxes(out, antennaDetail());
  });
  add("armL", () => pushBoxes(out, upperArm(-1)));
  add("armR", () => pushBoxes(out, upperArm(1)));
  add("foreL", () => pushBoxes(out, forearm(-1)));
  add("foreR", () => pushBoxes(out, forearm(1)));
  add("handL", () => pushBoxes(out, hand(-1)));
  add("handR", () => pushBoxes(out, hand(1)));
  add("finger", () => pushBoxes(out, finger()));
  add("fingertip", () => pushBoxes(out, fingertip()));
  add("jet", () => pushVoxels(out, jet()));
  add("spark", () => pushBox(out, [-0.5, -0.5, -0.5], [0.5, 0.5, 0.5], "x"));
  add("parcel", () => pushBoxes(out, parcel()));
  // A pixel "Z" that drifts up off the antenna while it dozes.
  add("zee", () =>
    ["####", "..#.", ".#..", "####"].forEach((row, r) =>
      [...row].forEach((cell, c) => {
        if (cell !== "#") return;
        const [x, y] = [c - 1.5, 1.5 - r];
        pushBox(out, [x - 0.5, y - 0.5, -0.2], [x + 0.5, y + 0.5, 0.2], "c", BRIGHT);
      }),
    ),
  );
  add("face-hi", () =>
    pushPixels(
      out,
      HI.flatMap((row, r) => [...row].flatMap((cell, c): [number, number][] => (cell === "#" ? [[c - 5, 7 - r]] : []))),
    ),
  );
  for (const [name, rows] of Object.entries(EYES)) add(`eyes-${name as Eyes}`, () => pushPixels(out, eyePixels(rows)));
  for (const [name, rows] of Object.entries(MOUTHS)) {
    add(`mouth-${name as Mouth}`, () => pushPixels(out, mouthPixels(rows)));
  }
  // The close-up model (hd.ts).
  for (const [id, boxes] of buildHd()) {
    add(id, () => {
      for (const { min, max, c, kind, hide } of boxes) {
        pushBox(out, min, max, c, kind ?? KIND[c] ?? 0, (_, face) => (hide & (1 << face)) !== 0);
      }
    });
  }

  return { data: new Float32Array(out), parts };
}
