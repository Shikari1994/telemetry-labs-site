import { KIND, Mesh, PALETTE, chip, crossTrace, part, rng, trace, type RGB, type V3 } from "@/lib/transit/mesh";

/**
 * The hero object: a chunk of the same voxel circuit board the transits fly
 * over, torn out of it and floating, seen from an isometric camera. The
 * board's top is the circuit (tiles, traces, parts) over an orange substrate
 * layer that shows along the ragged edge; under it hangs a stepped cone of
 * rock, the strata the drill transit bores into, with a few loose voxels.
 *
 * In front of the middle sits the socket the mascot lands on. Traces run from
 * it to two chips, one per work; above each chip hangs its hologram: a slab
 * of voxels carrying the work's capture, turned to the camera, which the chip
 * projects up its beam (renderer.ts). The live, readable screen of the work
 * is a DOM element laid exactly over the slab (HeroIsland).
 *
 * Units are voxels, y is up, the board's top is y = 0. Every box carries its
 * own centre and a group, so the shader can assemble the board box by box out
 * of the socket and lift a chip out of its slot.
 */

/** pos 3, normal 3, colour 3, kind 1, seed 1, centre 3, group 1 */
export const ISLAND_FLOATS = 15;

/** Kinds past the transit's own (lib/transit/mesh KIND). */
export const HERO_KIND = { pad: 7, holo: 10, beam: 11 } as const;

/** What a box belongs to: the board, the socket (there before the board), a work's chip. */
export const GROUP = { board: 0, socket: 1, work: 2 } as const;

/** The camera: looking at the board's corner, pitched down. The mascot is drawn at the same pitch. */
export const ISLAND_CAMERA = { yaw: Math.PI / 4, pitch: 0.5 };

/** A ground point from screen-aligned offsets at the camera's resting yaw: `right` across the screen, `back` into it. */
const ground = (right: number, back: number): V3 => {
  const c = Math.SQRT1_2;
  return [c * (right - back), 0, -c * (right + back)];
};

const SOCKET = ground(0, -3);
const CHIPS: V3[] = [ground(-14, 1.5), ground(14, 1.5)];
const CHIP = { size: 6, height: 1.2 };

/** The holograms at full size: the captures' 16:10, in voxel cells. */
export const HOLO = { w: 22, h: 13.75, cols: 48, rows: 30, depth: 0.3, rise: 4.4 };
/** How far a chip rises out of its slot and its hologram with it, at full lift. */
export const LIFT = { chip: 1.4, screen: 1.1 };

/** The socket pad's top centre, where the mascot stands. */
export const SPOT: V3 = [SOCKET[0], 0.62, SOCKET[2]];
/** Mascot voxels per board voxel. */
export const MASCOT_VOXEL = 0.42;

export const BOARD = { radius: 18, tile: 2, rock: 12 };

/** The die on a work's chip, lifted by `lift` (0..1). */
export const die = (work: number, lift: number): V3 => [CHIPS[work][0], CHIP.height + 0.06 + lift * LIFT.chip, CHIPS[work][2]];

/**
 * A hologram's size for its chip's lift (0..1): the current work's stands at
 * full size, the other's steps back to a smaller one beside it.
 */
export const holoScale = (lift: number) => 0.62 + 0.38 * lift;

/** The middle of a work's hologram, lifted by `lift` (0..1); its bottom edge stays over the die. */
export const screenCentre = (work: number, lift: number): V3 => [
  CHIPS[work][0],
  CHIP.height + HOLO.rise + (HOLO.h * holoScale(lift)) / 2 + lift * LIFT.screen,
  CHIPS[work][2],
];

/* ------------------------------------------------------------------ mesh */

class IslandMesh extends Mesh {
  out: number[] = [];
  group: number = GROUP.board;
  private centre: V3 = [0, 0, 0];

  override quad(a: number[], b: number[], c: number[], d: number[], n: number[], col: RGB, kind: number, seed: number) {
    for (const p of [a, b, c, a, c, d]) this.out.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2], kind, seed, ...this.centre, this.group);
  }

  override box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col: RGB, kind: number = KIND.solid, seed = 0) {
    const before = this.centre;
    this.centre = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    super.box(x0, y0, z0, x1, y1, z1, col, kind, seed);
    this.centre = before;
  }

  in(group: number, draw: () => void) {
    const before = this.group;
    this.group = group;
    draw();
    this.group = before;
  }
}

const dim = (rgb: RGB, k: number): RGB => [rgb[0] * k, rgb[1] * k, rgb[2] * k];
/** A rounded-square distance, so the island is a slab rather than a disc. */
const squircle = (x: number, z: number) => Math.pow(Math.pow(Math.abs(x), 4) + Math.pow(Math.abs(z), 4), 0.25);

function socket(mesh: IslandMesh) {
  const [sx, , sz] = SOCKET;
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col: RGB, kind?: number, seed?: number) =>
    mesh.box(sx + x0, y0, sz + z0, sx + x1, y1, sz + z1, col, kind, seed);
  box(-3.6, -0.4, -3.6, 3.6, 0.4, 3.6, PALETTE.chip);
  // A raised frame round the pad, pins down every side, a lamp on each corner.
  box(-3.6, 0.4, -3.6, 3.6, 0.85, -2.9, PALETTE.tower);
  box(-3.6, 0.4, 2.9, 3.6, 0.85, 3.6, PALETTE.tower);
  box(-3.6, 0.4, -2.9, -2.9, 0.85, 2.9, PALETTE.tower);
  box(2.9, 0.4, -2.9, 3.6, 0.85, 2.9, PALETTE.tower);
  box(-2.5, 0.4, -2.5, 2.5, 0.62, 2.5, PALETTE.accentDeep, HERO_KIND.pad);
  for (let k = -2.75; k <= 2.8; k += 1.1) {
    box(k - 0.18, -0.2, 3.6, k + 0.18, 0.15, 4.2, PALETTE.pin);
    box(3.6, -0.2, k - 0.18, 4.2, 0.15, k + 0.18, PALETTE.pin);
  }
  [
    [-3.4, -3.4],
    [2.85, -3.4],
    [-3.4, 2.85],
    [2.85, 2.85],
  ].forEach(([x, z], i) => box(x, 0.85, z, x + 0.55, 1.05, z + 0.55, PALETTE.accent, KIND.lamp, i * 0.23));
}

/** Three lanes from the socket to a chip: along x, then along z, a step apart. */
function lanes(mesh: IslandMesh, to: V3, seed: number) {
  const [sx, , sz] = SOCKET;
  const [cx, , cz] = to;
  for (let lane = -1; lane <= 1; lane += 1) {
    const z = sz + lane * 1.1;
    const x = cx - Math.sign(cx - sx) * lane * 1.1;
    const col = lane === 0 ? PALETTE.accent : PALETTE.pin;
    crossTrace(mesh, sx, x, z, col, seed + lane * 0.13, 0.36, KIND.trace, 0.01);
    trace(mesh, x, z, cz, col, seed + lane * 0.13, 0.36, KIND.trace, 0.01);
  }
}

function board(mesh: IslandMesh) {
  const random = rng(11);
  const { radius, tile, rock } = BOARD;
  const kept = new Set<string>();
  for (let x = -radius - tile; x < radius + tile; x += tile) {
    for (let z = -radius - tile; z < radius + tile; z += tile) {
      const cx = x + tile / 2;
      const cz = z + tile / 2;
      const r = squircle(cx, cz);
      const ragged = random() * 3.2;
      // The chips' slots always stand on whole board.
      const slot = CHIPS.some(([sx, , sz]) => Math.abs(cx - sx) < CHIP.size / 2 + 2 && Math.abs(cz - sz) < CHIP.size / 2 + 2);
      if (r > radius - 1.5 + ragged && !slot) continue;
      kept.add(`${x},${z}`);
      // Circuit layer over an orange substrate that shows along every edge.
      mesh.box(x, -0.4, z, x + tile, 0, z + tile, PALETTE.chip, KIND.floor);
      mesh.box(x, -1, z, x + tile, -0.4, z + tile, dim(PALETTE.accentDeep, 0.75));
      // Rock under it, deepest in the middle, in two-voxel courses.
      const depth = Math.max(1, Math.round(Math.pow(Math.max(0, 1 - r / (radius + 1)), 0.7) * rock + random() * 2.5 - 0.5));
      for (let y = -1; y > -1 - depth; y -= 2) {
        mesh.box(x, Math.max(-1 - depth, y - 2), z, x + tile, y, z + tile, PALETTE.tower, KIND.rock);
      }
    }
  }

  // A few loose voxels drifting under the island.
  for (let i = 0; i < 9; i += 1) {
    const a = random() * Math.PI * 2;
    const d = 6 + random() * 9;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const y = -6 - random() * 9;
    const s = 0.6 + random() * 0.9;
    mesh.box(x, y, z, x + s, y + s, z + s, random() > 0.7 ? dim(PALETTE.accentDeep, 0.75) : PALETTE.tower, KIND.bit, random());
  }

  // Slots the chips seat in, and their traces.
  CHIPS.forEach(([cx, , cz], i) => {
    const h = CHIP.size / 2 + 1;
    mesh.box(cx - h, 0, cz - h, cx + h, 0.25, cz - h + 0.5, PALETTE.rack);
    mesh.box(cx - h, 0, cz + h - 0.5, cx + h, 0.25, cz + h, PALETTE.rack);
    mesh.box(cx - h, 0, cz - h + 0.5, cx - h + 0.5, 0.25, cz + h - 0.5, PALETTE.rack);
    mesh.box(cx + h - 0.5, 0, cz - h + 0.5, cx + h, 0.25, cz + h - 0.5, PALETTE.rack);
    lanes(mesh, CHIPS[i], 0.2 + i * 0.4);
  });

  // Buses leaving the board where it was torn off: the world goes on.
  const bus = (x: number, z0: number, z1: number, seed: number) => trace(mesh, x, z0, z1, PALETTE.pin, seed, 0.3, KIND.trace, 0.01);
  const busX = (x0: number, x1: number, z: number, seed: number) => crossTrace(mesh, x0, x1, z, PALETTE.pin, seed, 0.3, KIND.trace, 0.01);
  const [ax, , az] = CHIPS[0];
  const [bx, , bz] = CHIPS[1];
  for (let k = 0; k < 3; k += 1) {
    bus(ax - 1.5 + k * 1.5, az + 4, radius + 2, 0.5 + k * 0.1);
    busX(bx + 4, radius + 2, bz - 1.5 + k * 1.5, 0.7 + k * 0.1);
    busX(-radius - 2, SOCKET[0] - 6, -6 - k * 1.5, 0.1 + k * 0.1);
    bus(-2 + k * 1.5, -radius - 2, SOCKET[2] - 6, 0.3 + k * 0.1);
  }

  // Parts and a couple of small chips, kept off the lanes, buses and slots.
  const between = (v: number, a: number, b: number) => v > Math.min(a, b) - 1 && v < Math.max(a, b) + 1;
  const clear = (x: number, z: number) => {
    if (!kept.has(`${Math.floor(x / tile) * tile},${Math.floor(z / tile) * tile}`)) return false;
    if (squircle(x, z) > radius - 3) return false;
    if (Math.hypot(x - SOCKET[0], z - SOCKET[2]) < 6.5) return false;
    if (Math.abs(z - SOCKET[2]) < 2.6) return false;
    if (between(x, -3, 2) && z < SOCKET[2] - 5) return false;
    if (between(z, -10, -5) && x < SOCKET[0] - 5) return false;
    return CHIPS.every(
      ([cx, , cz]) => (Math.abs(x - cx) > 6 || Math.abs(z - cz) > 6) && !(Math.abs(x - cx) < 2.6 && between(z, SOCKET[2], cz)),
    );
  };
  [
    [-6, -9],
    [9, 8],
  ].forEach(([x, z]) => {
    if (clear(x, z)) chip(mesh, x, z, 3, 3, 0.8);
  });
  for (let i = 0; i < 40; i += 1) {
    const x = (random() - 0.5) * radius * 2;
    const z = (random() - 0.5) * radius * 2;
    if (clear(x, z)) part(mesh, random, x, z);
  }
}

function chips(mesh: IslandMesh) {
  CHIPS.forEach(([cx, , cz], i) =>
    mesh.in(GROUP.work + i, () => {
      chip(mesh, cx, cz, CHIP.size, CHIP.size, CHIP.height);
      // The die the beam leaves from.
      mesh.box(cx - 1.2, CHIP.height, cz - 1.2, cx + 1.2, CHIP.height + 0.12, cz + 1.2, PALETTE.ink, KIND.lamp, 1);
    }),
  );
}

/**
 * The board, the socket and the chips. The socket is its own group: it is
 * there before the board, a pad lit in the dark for the robot to land on.
 */
export function buildIsland() {
  const mesh = new IslandMesh();
  board(mesh);
  mesh.in(GROUP.socket, () => socket(mesh));
  chips(mesh);
  return new Float32Array(mesh.out);
}

/**
 * The holograms: a unit cube per cell for each work. Colour carries the
 * cell's column, row and a seed; the shader places each cube between the
 * die and its slot in the slab, facing the camera.
 */
export function buildHolograms() {
  const random = rng(29);
  const out: number[] = [];
  const faces: [V3, V3[]][] = [
    [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    [[1, 0, 0], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]]],
    [[-1, 0, 0], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]],
    [[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]],
    [[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
  ];
  for (let work = 0; work < CHIPS.length; work += 1) {
    for (let j = 0; j < HOLO.rows; j += 1) {
      for (let i = 0; i < HOLO.cols; i += 1) {
        const s0 = random();
        const s1 = random();
        for (const [n, quad] of faces) {
          for (const k of [0, 1, 2, 0, 2, 3]) {
            const [x, y, z] = quad[k];
            out.push(x / 2, y / 2, z / 2, n[0], n[1], n[2], i, j, s0, HERO_KIND.holo, s1, 0, 0, 0, GROUP.work + work);
          }
        }
      }
    }
    // The beam: a band from the die to the slab's bottom edge, two triangles;
    // colour carries (side, top).
    for (const [side, top] of [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
      [1, 1],
      [0, 1],
    ]) {
      out.push(0, 0, 0, 0, 0, 1, side, top, 0, HERO_KIND.beam, 0, 0, 0, 0, GROUP.work + work);
    }
  }
  return new Float32Array(out);
}

/* ---------------------------------------------------------------- camera */

export type IslandCamera = { yaw: number; pitch: number };
export type Basis = { right: V3; up: V3; back: V3 };

export function basis({ yaw, pitch }: IslandCamera): Basis {
  const back: V3 = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  const right: V3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const up: V3 = [
    back[1] * right[2] - back[2] * right[1],
    back[2] * right[0] - back[0] * right[2],
    back[0] * right[1] - back[1] * right[0],
  ];
  return { right, up, back };
}

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * How the island sits in its stage: CSS px per voxel and the view point that
 * lands in the stage's middle, fitted at the resting camera so parallax and
 * the handoff move the island without rescaling it. `top` is room kept
 * above the holograms for their title bars, in CSS px.
 */
export type Fit = { k: number; cx: number; cy: number };

export function fitIsland(width: number, height: number, top: number): Fit {
  const b = basis(ISLAND_CAMERA);
  const r = BOARD.radius + 1;
  const points: V3[] = [
    [r, 0, r],
    [-r, 0, r],
    [r, 0, -r],
    [-r, 0, -r],
    [0, -1 - BOARD.rock, 0],
  ];
  for (let work = 0; work < CHIPS.length; work += 1) {
    const c = screenCentre(work, 1);
    for (const sx of [-0.5, 0.5]) {
      for (const sy of [-0.5, 0.5]) {
        points.push([0, 1, 2].map((a) => c[a] + sx * HOLO.w * b.right[a] + sy * HOLO.h * b.up[a]) as V3);
      }
    }
  }
  const xs = points.map((p) => dot(p, b.right));
  const ys = points.map((p) => dot(p, b.up));
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const k = Math.min((width * 0.96) / (x1 - x0), (height * 0.97 - top) / (y1 - y0));
  // Centred across; vertically the slack goes under the island, the title bars get `top`.
  return { k, cx: (x0 + x1) / 2, cy: y1 - (height / 2 - top) / k };
}

/** A world point in stage CSS px. */
export function toStage(p: V3, b: Basis, fit: Fit, width: number, height: number) {
  return { x: width / 2 + (dot(p, b.right) - fit.cx) * fit.k, y: height / 2 - (dot(p, b.up) - fit.cy) * fit.k };
}
