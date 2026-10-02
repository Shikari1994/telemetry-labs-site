import { BRIGHT, CELL, SCREEN, type ColorKey, type Eyes, type Mouth } from "@/lib/mascot/model";

/**
 * The close-up model: the head, its face and the waving arm, sculpted four
 * times finer than the voxel robot (a quarter voxel a cell on the head, an
 * eighth of a hand unit on the arm). Same palette, same lighting steps, so
 * at a distance it reads as the robot the page knows; up close the bevels,
 * seams, screws and dials show and the face is a 44 × 32 pixel screen.
 *
 * Every part is sculpted from a cell function and baked as boxes: hidden
 * faces are culled and runs of equal cells along x merged into one box.
 * The head and its face live in the voxel robot's head space; the arm parts
 * in hand space with the fingers pointing up (+y) and the palm toward +z.
 */

type Vec3 = [number, number, number];

/** One baked box; `hide` has a bit per face that is covered, in the order
    +x, -x, +y, -y, +z, -z (model.ts FACES). */
export type HdBox = { min: Vec3; max: Vec3; c: ColorKey; kind?: number; hide: number };

type Cell = ColorKey | [ColorKey, number] | null;
type Range = [number, number];

const HIDE_X = 0b11;

function sculpt(unit: number, [x0, x1]: Range, [y0, y1]: Range, [z0, z1]: Range, cell: (x: number, y: number, z: number) => Cell): HdBox[] {
  const nx = x1 - x0;
  const ny = y1 - y0;
  const nz = z1 - z0;
  const grid: (Cell | undefined)[] = new Array(nx * ny * nz);
  const index = (i: number, j: number, k: number) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k += 1) {
    for (let j = 0; j < ny; j += 1) {
      for (let i = 0; i < nx; i += 1) {
        grid[index(i, j, k)] = cell((x0 + i + 0.5) * unit, (y0 + j + 0.5) * unit, (z0 + k + 0.5) * unit);
      }
    }
  }
  const at = (i: number, j: number, k: number) =>
    i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? null : (grid[index(i, j, k)] ?? null);
  const mask = (i: number, j: number, k: number) =>
    (at(i + 1, j, k) ? 1 : 0) |
    (at(i - 1, j, k) ? 2 : 0) |
    (at(i, j + 1, k) ? 4 : 0) |
    (at(i, j - 1, k) ? 8 : 0) |
    (at(i, j, k + 1) ? 16 : 0) |
    (at(i, j, k - 1) ? 32 : 0);
  const key = (c: Cell) => (Array.isArray(c) ? `${c[0]}${c[1]}` : String(c));

  const out: HdBox[] = [];
  for (let k = 0; k < nz; k += 1) {
    for (let j = 0; j < ny; j += 1) {
      let i = 0;
      while (i < nx) {
        const c = at(i, j, k);
        const m = c ? mask(i, j, k) : 0;
        if (!c || m === 0b111111) {
          i += 1;
          continue;
        }
        // Extend the run while the next cell shows the same faces in y and z.
        let end = i;
        while (end + 1 < nx) {
          const next = at(end + 1, j, k);
          if (!next || key(next) !== key(c)) break;
          const nm = mask(end + 1, j, k);
          if ((nm & ~HIDE_X) !== (m & ~HIDE_X) || nm === 0b111111) break;
          end += 1;
        }
        const [color, kind] = Array.isArray(c) ? c : [c, undefined];
        out.push({
          min: [(x0 + i) * unit, (y0 + j) * unit, (z0 + k) * unit],
          max: [(x0 + end + 1) * unit, (y0 + j + 1) * unit, (z0 + k + 1) * unit],
          c: color,
          kind,
          hide: (m & ~HIDE_X) | (mask(end, j, k) & 1) | (m & 2),
        });
        i = end + 1;
      }
    }
  }
  return out;
}

/** Signed distance to a box with rounded edges: negative inside. */
function roundBox(x: number, y: number, z: number, c: Vec3, half: Vec3, r: number) {
  const q = [Math.abs(x - c[0]) - half[0] + r, Math.abs(y - c[1]) - half[1] + r, Math.abs(z - c[2]) - half[2] + r];
  return Math.hypot(...q.map((v) => Math.max(v, 0))) + Math.min(Math.max(q[0], q[1], q[2]), 0) - r;
}

/** Signed distance to a rounded rectangle in a plane. */
function roundRect(u: number, v: number, hu: number, hv: number, r: number) {
  const qu = Math.abs(u) - hu + r;
  const qv = Math.abs(v) - hv + r;
  return Math.hypot(Math.max(qu, 0), Math.max(qv, 0)) + Math.min(Math.max(qu, qv), 0) - r;
}

const near = (v: number, at: number, half: number) => Math.abs(v - at) < half;

/* The head: the voxel monitor's outline (13 × 10 × 6, receivers on the
   sides, a sensor on the roof), with every edge stepped round, the screen
   set into a bevelled bezel behind a dark gasket. */
const HEAD_C: Vec3 = [0, 5, -0.5];
const HEAD_HALF: Vec3 = [6.5, 5, 3];
/** Screen opening on the bezel, and the glass behind it (head space). */
const GLASS: { x: number; y0: number; y1: number; z: number } = { x: 5.5, y0: 1, y1: 9, z: 1.5 };
/** The glass in voxels, wide and tall; its centre is the head centre. */
export const GLASS_WIDE = GLASS.x * 2;
export const GLASS_TALL = GLASS.y1 - GLASS.y0;

function headCell(x: number, y: number, z: number): Cell {
  const side = Math.abs(x);

  // Receivers: a stepped dial on each side.
  if (side > 6.5) {
    const r = Math.hypot(y - 5, z + 1);
    if (side < 7) return r < 1.75 ? (r > 1.45 ? "s" : "g") : null;
    if (side < 7.25) return r < 1.45 ? (r < 0.6 ? "l" : near(r, 1.05, 0.13) ? "k" : "s") : null;
    if (side < 7.5) return r < 0.6 ? (r < 0.3 ? "a" : "l") : null;
    return null;
  }

  // Sensor on the roof.
  if (y > 10) {
    if (x > -3.5 && x < -1.5 && z > -1.5 && z < 0.5 && y < 10.75) return y > 10.5 ? "s" : "g";
    if (x > -3.25 && x < -1.75 && z > 0.5 && z < 0.75 && y > 10.125 && y < 10.625) return near(x, -2.5, 0.26) ? "a" : "k";
    return null;
  }

  // Heat-sink fins down the back.
  if (z < -3.5) {
    const fin = [-4, -2, 0, 2, 4].some((fx) => near(x, fx, 0.26));
    return fin && z > -4.25 && y > 1.5 && y < 7.5 ? "g" : null;
  }

  // Raised details on the bezel: screws, keys and the power light.
  if (z > 2.5) {
    if (z > 2.75) return null;
    for (const [sx, sy] of [[-6, 8.5], [6, 8.5], [-6, 1.5], [6, 1.5]]) {
      if (near(x, sx, 0.26) && near(y, sy, 0.26)) return x > sx && y < sy ? "s" : "l";
    }
    for (const kx of [-4.25, -3.5, -2.75]) if (near(x, kx, 0.26) && near(y, 0.5, 0.26)) return y > 0.5 ? "s" : "g";
    if (near(x, 4.5, 0.26) && near(y, 0.5, 0.26)) return "a";
    return null;
  }

  const d = roundBox(x, y, z, HEAD_C, HEAD_HALF, 0.7);
  if (d > 0) return null;

  // The screen: an opening in the bezel, one cell wider on its front layer,
  // a gasket round the glass, the glass itself.
  const opening = roundRect(x, y - 5, GLASS.x + (z > 2.25 ? 0.25 : 0), 4 + (z > 2.25 ? 0.25 : 0), 0.5);
  if (z > GLASS.z && opening < 0) return null;
  if (z > 1.25 && z < GLASS.z && opening < 0) return opening > -0.25 ? "k" : ["q", SCREEN];

  const skin = d > -0.25;
  const under = d > -0.5;

  // Seams: grooves a cell deep, dark at the bottom.
  const seam =
    (y > 9.25 && near(side, 3.125, 0.13)) ||
    (side > 6 && (near(y, 7.625, 0.13) || near(y, 2.375, 0.13))) ||
    (z < -2.75 && near(y, 5.125, 0.13) && side < 5);
  if (seam && skin) return null;
  if (seam && under) return "r";

  // Vents on the bottom band, left of the power light.
  if (z > 2.25 && y < 0.75 && y > 0.25 && x > 0.5 && x < 3.25 && Math.floor(x * 4) % 2 === 0) return null;

  if (y < 1) return "d";
  if (z < -2.75) return "r";
  // The bevel along the bezel's top catches the light.
  if (skin && z > 2 && y > 9.5) return "h";
  return "b";
}

/* The body, in the voxel robot's body space (the head sits on its neck at
   y = 13): the boxy shell with a charge meter, a vent and status lights on
   the front, vents on the sides and the finned power pack on the back. */
function bodyCell(x: number, y: number, z: number): Cell {
  if (z < -3.5) {
    if (z < -4.5 || Math.abs(x) > 2.5 || y < 5 || y > 10) return null;
    if (y > 9.5) return Math.abs(x) < 0.5 ? "a" : "d";
    return Math.floor(x * 2 + 10) % 2 === 0 ? "s" : "g";
  }
  if (z > 3.5) {
    if (z > 3.75) return null;
    for (const [bx, by] of [[-3, 9.5], [3, 9.5], [-3, 5.5], [3, 5.5]]) if (near(x, bx, 0.26) && near(y, by, 0.26)) return "l";
    for (const lx of [1.25, 2.25, 3.25]) if (near(x, lx, 0.26) && near(y, 8.75, 0.26)) return "a";
    return null;
  }
  const lower = y < 5;
  const d = roundBox(x, y, z, [0, 7.5, 0], [lower ? 4 : 4.5, 3.5, lower ? 3 : 3.5], 0.6);
  if (d > 0) return null;
  const skin = d > -0.25;
  const under = d > -0.5;
  const front = z > 3;
  // Charge meter: four cells that light with the charge, in a steel frame.
  if (front && x > -2.5 && x < -1.5 && y > 5 && y < 9) return skin ? ["c", CELL + Math.floor(y - 5)] : "g";
  if (front && x > -3.25 && x < -1.25 && y > 4.75 && y < 9.25) return "g";
  // Vents: slots on the front and down both sides.
  const frontVent = front && x > 0.5 && x < 3.5 && y > 6 && y < 8;
  const sideVent = Math.abs(x) > 4 && Math.abs(z) < 1.5 && y > 6 && y < 9;
  if ((frontVent || sideVent) && Math.floor(y * 4) % 2 === 0) return skin ? null : "k";
  if ((frontVent || sideVent) && skin) return "g";
  // A seam round the waist and a hatch plate on top round the neck.
  if (near(y, 6.125, 0.13) && !front && skin) return null;
  if (near(y, 6.125, 0.13) && !front && under) return "r";
  if (y > 10.75 && Math.abs(x) < 2.4 && Math.abs(z) < 2.4) return "g";
  if (y < 5 || y > 10) return "d";
  if (z < -3) return "r";
  if (skin && front && y > 9.75) return "h";
  return "b";
}

/** The thruster ring under the body, in ring space (it spins about y):
    an octagon with lit segments round the rim and a nozzle underneath. */
function ringCell(x: number, y: number, z: number): Cell {
  const o = Math.max(Math.abs(x), Math.abs(z), (Math.abs(x) + Math.abs(z)) * 0.78);
  if (y > 1) {
    if (y > 2 || o > 3.5) return null;
    if (o > 3) return Math.floor(((Math.atan2(z, x) / Math.PI + 1) * 8)) % 2 === 0 ? "a" : "s";
    return y > 1.75 && near(o, 1.75, 0.13) ? "s" : "g";
  }
  if (y < 0.25 && o < 0.75) return "k";
  return o < 2.6 ? (near(o, 2.375, 0.13) ? "s" : "g") : null;
}

/** Piston and collar under the head (head space). */
function neckCell(x: number, y: number, z: number): Cell {
  const r = Math.hypot(x, z);
  if (y > -0.5 && y < -0.25 && r < 1.5) return "l";
  if (y > -0.25 && r < 1.25) return "s";
  return r < 1 ? (Math.floor(y * 4) % 3 === 0 ? "s" : "g") : null;
}

/** The antenna, from its pivot on the roof: a banded mast, a crossbar, a lit bead. */
function antennaCell(x: number, y: number, z: number): Cell {
  if (y < 0.5) return Math.abs(x) < 0.5 && Math.abs(z) < 0.5 ? "g" : null;
  if (Math.hypot(x, y - 3.4, z) < 0.5) return "a";
  if (y > 2.375 && y < 2.625 && Math.abs(x) < 1 && Math.abs(z) < 0.13) return "l";
  if (Math.abs(x) < 0.25 && Math.abs(z) < 0.25 && y < 3) return Math.floor(y * 4) % 3 === 0 ? "l" : "s";
  return null;
}

/* The arm, in hand units: an armoured forearm from the elbow (y = 0) to the
   wrist (y = FORE_LENGTH), then the hand: a palm with a lit emitter, two
   jointed fingers and an opposed thumb. */
export const FORE_LENGTH = 6.4;
export const HD_KNUCKLE_Y = 2.2;
export const HD_FINGER_X = [-0.6, 0.6] as const;
/** Thumb root on the right hand. */
export const HD_THUMB_ROOT: Vec3 = [1.3, 0.9, 0.2];
/** Length of a finger's root segment; the tip hangs off its end. */
export const HD_PHALANX = 1.2;

function foreCell(x: number, y: number, z: number): Cell {
  if (roundBox(x, y, z, [0, 5.95, 0], [0.98, 0.45, 0.98], 0.2) < 0) return y > 6.2 ? "s" : "d";
  const d = roundBox(x, y, z, [0, 3, 0], [0.85, 3, 0.85], 0.35);
  if (d > 0) return null;
  const skin = d > -0.125;
  if (skin && near(y, 4.5, 0.07)) return null;
  if (d > -0.25 && near(y, 4.5, 0.07)) return "r";
  // A recessed panel down the front and a light strip down the outer side.
  if (skin && z > 0.6 && Math.abs(x) < 0.45 && y > 1 && y < 3.9) return null;
  if (d > -0.25 && z > 0.6 && Math.abs(x) < 0.45 && y > 1 && y < 3.9) return "r";
  if (skin && x > 0.7 && Math.abs(z) < 0.25 && y > 1.6 && y < 4) return "a";
  if (skin && z > 0.7 && near(Math.abs(x), 0.5, 0.13) && near(y, 5.1, 0.13)) return "l";
  return "b";
}

function palmCell(x: number, y: number, z: number): Cell {
  // Wrist joint.
  if (y < 0.45) return Math.abs(x) < 0.45 && Math.abs(z) < 0.45 && y > -0.25 ? (near(y, 0.1, 0.07) ? "s" : "g") : null;
  // Knuckle joints the fingers turn on.
  if (y > 2.0) {
    const k = HD_FINGER_X.some((fx) => Math.abs(x - fx) < 0.45) && Math.abs(z) < 0.45 && y < 2.4;
    return k ? (z > 0.3 ? "s" : "l") : null;
  }
  // Thumb mount on the outer edge.
  if (x > 1.15) return x < 1.55 && y > 0.5 && y < 1.4 && z > -0.3 && z < 0.55 ? "g" : null;
  // Palm plate and its emitter, proud of the palm.
  if (z > 0.55) {
    if (z > 0.8) return null;
    if (Math.abs(x) < 0.38 && y > 0.85 && y < 1.5) return "a";
    return z < 0.68 && Math.abs(x) < 0.98 && y > 0.55 && y < 1.8 ? "g" : null;
  }
  const d = roundBox(x, y, z, [0, 1.25, 0], [1.2, 0.8, 0.55], 0.25);
  if (d > 0) return null;
  if (z < -0.4 && y > 1.6) return "d";
  if (d > -0.125 && z < -0.4 && near(Math.abs(x), 0.7, 0.07) && y < 1.5) return "r";
  return "b";
}

function fingerCell(x: number, y: number, z: number): Cell {
  if (y > 0.98) return Math.abs(x) < 0.34 && Math.abs(z) < 0.34 && y < 1.3 ? "g" : null;
  if (y < 0.12 || Math.abs(x) > 0.44 || Math.abs(z) > 0.42) return null;
  if (z > 0.3 && y > 0.35 && y < 0.8 && Math.abs(x) < 0.3) return "s";
  return "l";
}

function tipCell(x: number, y: number, z: number): Cell {
  if (y < 0.05) return null;
  if (y < 0.75) return Math.abs(x) < 0.4 && Math.abs(z) < 0.38 ? (z > 0.25 && y > 0.25 ? "s" : "l") : null;
  return Math.abs(x) < 0.28 && Math.abs(z) < 0.28 && y < 1.1 ? "g" : null;
}

/* The face: a 44 × 32 pixel screen, a quarter voxel a pixel, on the glass
   (bottom left at x = -5.5, y = 1). Patterns are rows top first; "#" is a
   lit pixel, "+" a dim one, "@" a hot one. Every lit shape gets a dim halo,
   the phosphor bleeding into the glass. */
export const FACE_COLS = 44;
export const FACE_ROWS = 32;
const FACE_PIXEL = 0.25;

type Pattern = readonly string[];

/** Eyes are 10 wide; both use the same pattern (the highlight stays on one
    side), except those marked to be mirrored for the right eye. */
const HD_EYES: Record<Eyes, { rows: Pattern; mirror?: boolean }> = {
  open: {
    rows: [
      "..######..",
      ".########.",
      "##@@######",
      "##@@######",
      "##########",
      "##########",
      "##########",
      "##########",
      "##########",
      "##########",
      "##########",
      ".########.",
      "..######..",
    ],
  },
  blink: { rows: [".########.", "##########", ".########."] },
  happy: { rows: ["...####...", ".########.", "####..####", "###....###", "##......##"] },
  wide: {
    rows: [
      "..######..",
      ".##....##.",
      "##......##",
      "#........#",
      "#...@@...#",
      "#..@@@@..#",
      "#..@@@@..#",
      "#...@@...#",
      "#........#",
      "##......##",
      ".##....##.",
      "..######..",
    ],
  },
  heart: {
    rows: [".###..###.", "##########", "#@@#######", "#@########", "##########", ".########.", "..######..", "...####...", "....##...."],
  },
  dizzy: {
    rows: ["##......##", ".##....##.", "..##..##..", "...####...", "....##....", "...####...", "..##..##..", ".##....##.", "##......##"],
  },
  squeeze: {
    rows: ["##........", ".###......", "...###....", ".....###..", ".......###", ".....###..", "...###....", ".###......", "##........"],
    mirror: true,
  },
  sleepy: { rows: ["#........#", "##......##", ".##....##.", "..######.."] },
};

/** Mouths are 16 wide. */
const HD_MOUTHS: Record<Mouth, Pattern> = {
  soft: ["...##########...", "....########...."],
  smile: ["#..............#", "##............##", ".###........###.", "...##########..."],
  grin: ["################", "##++++++++++++##", ".##++++++++++##.", "..############.."],
  o: [".....######.....", "....##++++##....", "....##++++##....", "....##++++##....", ".....######....."],
  wobble: [".##....##....##.", "#..#..#..#..#..#", "....##....##...."],
  dot: [".......##.......", ".......##......."],
};

/** Eye columns and middle row, and the mouth's columns and top row, in face
    pixels from the bottom left. */
const EYE_COL = [8, 26];
const EYE_MID = 22;
const MOUTH_COL = 14;
const MOUTH_TOP = 10;

/* "ПРИВЕТ!" in a 5 × 7 bitmap font, typed out a glyph at a time. */
const GLYPHS: Pattern[] = [
  ["#####", "#...#", "#...#", "#...#", "#...#", "#...#", "#...#"],
  ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  ["#...#", "#...#", "#..##", "#.#.#", "##..#", "#...#", "#...#"],
  ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  ["#", "#", "#", "#", "#", ".", "#"],
];
export const GREETING_LENGTH = GLYPHS.length;
const TEXT_TOP = 19;
/** Columns where each glyph starts; the cursor sits one past the last. */
export const GLYPH_COL = GLYPHS.reduce<number[]>((cols, g, i) => [...cols, i ? cols[i - 1] + GLYPHS[i - 1][0].length + 1 : 3], []);

type Lit = Map<string, "#" | "+" | "@">;

function stamp(lit: Lit, rows: Pattern, col: number, top: number, mirror = false) {
  rows.forEach((row, r) =>
    [...row].forEach((cell, c) => {
      if (cell === ".") return;
      const i = col + (mirror ? row.length - 1 - c : c);
      lit.set(`${i},${top - r}`, cell as "#" | "+" | "@");
    }),
  );
}

const DIM: ColorKey = "o";
const HOT: ColorKey = "e";

function facePixels(lit: Lit): HdBox[] {
  const out: HdBox[] = [];
  const box = (i: number, j: number, c: ColorKey, lift: number): HdBox => ({
    min: [-5.5 + i * FACE_PIXEL, 1 + j * FACE_PIXEL, GLASS.z],
    max: [-5.5 + (i + 1) * FACE_PIXEL, 1 + (j + 1) * FACE_PIXEL, GLASS.z + lift],
    c,
    kind: BRIGHT,
    hide: 0,
  });
  const halo = new Set<string>();
  for (const [key, cell] of lit) {
    const [i, j] = key.split(",").map(Number);
    out.push(box(i, j, cell === "@" ? HOT : cell === "+" ? DIM : "c", cell === "+" ? 0.06 : 0.1));
    if (cell === "+") continue;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = `${i + di},${j + dj}`;
      if (!lit.has(n)) halo.add(n);
    }
  }
  for (const key of halo) {
    const [i, j] = key.split(",").map(Number);
    if (i >= 0 && j >= 0 && i < FACE_COLS && j < FACE_ROWS) out.push(box(i, j, "n", 0.04));
  }
  return out;
}

function eyesPart(name: Eyes): HdBox[] {
  const { rows, mirror } = HD_EYES[name];
  const top = EYE_MID + Math.floor(rows.length / 2);
  const lit: Lit = new Map();
  stamp(lit, rows, EYE_COL[0], top);
  stamp(lit, rows, EYE_COL[1], top, mirror);
  return facePixels(lit);
}

function mouthPart(name: Mouth): HdBox[] {
  const lit: Lit = new Map();
  stamp(lit, HD_MOUTHS[name], MOUTH_COL, MOUTH_TOP);
  return facePixels(lit);
}

function glyphPart(index: number): HdBox[] {
  const lit: Lit = new Map();
  stamp(lit, GLYPHS[index], GLYPH_COL[index], TEXT_TOP);
  return facePixels(lit);
}

/** A block cursor, drawn at column 0; the rig moves it along. */
function cursorPart(): HdBox[] {
  const lit: Lit = new Map();
  stamp(lit, Array(7).fill("###"), 0, TEXT_TOP);
  return facePixels(lit);
}

export type HdPartId =
  | "hd-head"
  | "hd-neck"
  | "hd-body"
  | "hd-ring"
  | "hd-antenna"
  | "hd-fore"
  | "hd-palm"
  | "hd-finger"
  | "hd-tip"
  | "hd-cursor"
  | `hd-eyes-${Eyes}`
  | `hd-mouth-${Mouth}`
  | `hd-glyph-${number}`;

export function buildHd(): [HdPartId, HdBox[]][] {
  const h = 0.25;
  const a = 0.125;
  return [
    ["hd-head", sculpt(h, [-32, 32], [0, 44], [-17, 11], headCell)],
    ["hd-neck", sculpt(h, [-6, 6], [-12, 0], [-6, 6], neckCell)],
    ["hd-body", sculpt(h, [-19, 19], [16, 45], [-18, 16], bodyCell)],
    ["hd-ring", sculpt(h, [-15, 15], [0, 8], [-15, 15], ringCell)],
    ["hd-antenna", sculpt(h, [-4, 4], [0, 16], [-2, 2], antennaCell)],
    ["hd-fore", sculpt(a, [-9, 9], [0, 54], [-9, 9], foreCell)],
    ["hd-palm", sculpt(a, [-12, 14], [-3, 20], [-7, 8], palmCell)],
    ["hd-finger", sculpt(a, [-4, 4], [0, 11], [-4, 4], fingerCell)],
    ["hd-tip", sculpt(a, [-4, 4], [0, 9], [-4, 4], tipCell)],
    ["hd-cursor", cursorPart()],
    ...(Object.keys(HD_EYES) as Eyes[]).map((name): [HdPartId, HdBox[]] => [`hd-eyes-${name}`, eyesPart(name)]),
    ...(Object.keys(HD_MOUTHS) as Mouth[]).map((name): [HdPartId, HdBox[]] => [`hd-mouth-${name}`, mouthPart(name)]),
    ...GLYPHS.map((_, i): [HdPartId, HdBox[]] => [`hd-glyph-${i}`, glyphPart(i)]),
  ];
}
