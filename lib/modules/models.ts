/**
 * Voxel models of the equipment modules, one per row of the homepage 03
 * section, in the same sprite language as the mascot (lib/mascot/model.ts).
 * These are functional silhouettes of each module class, not drawings of a
 * specific product: a collar, its joints, and the one feature that tells the
 * modules apart (sensor window, crystal, antenna rings, pulser, cells, lobes).
 *
 * One voxel is one model unit, +y is the tool axis (pin down, box up), +z
 * faces the viewer. Every model is baked into one shared buffer; each vertex
 * also carries its build order (0 bottom .. 1 top) so the renderer can stack
 * the model up layer by layer from a single uniform.
 */

const PALETTE = {
  s: "#b0aea5", // light steel: pins, boxes, knobs
  g: "#87867f", // steel collar
  n: "#5e5d59", // dark steel: joints, housings
  k: "#1e1d1b", // screen glass
  a: "#e2733f", // accent
  d: "#b4532a", // accent shadow
  e: "#f2a65a", // emitter — glows
  l: "#c3e88d", // signal lime — glows
  c: "#89ddff", // signal cyan — glows
} as const;

type ColorKey = keyof typeof PALETTE;
const EMISSIVE = new Set<ColorKey>(["e", "l", "c"]);

/** Vertex layout: position(3) normal(3) colour(3) emissive(1) order(1). */
export const FLOATS_PER_VERTEX = 11;

export type ModelRange = {
  first: number;
  count: number;
  /** Largest distance from the vertical axis, in voxels. */
  radius: number;
  height: number;
};

/* A sparse voxel grid; later writes win, so features are carved and painted
   on top of the collar they sit in. */
class Grid {
  cells = new Map<string, [number, number, number, ColorKey]>();

  set(x: number, y: number, z: number, color: ColorKey) {
    this.cells.set(`${x},${y},${z}`, [x, y, z, color]);
  }

  del(x: number, y: number, z: number) {
    this.cells.delete(`${x},${y},${z}`);
  }

  has(x: number, y: number, z: number) {
    return this.cells.has(`${x},${y},${z}`);
  }

  /** Rounded disc of radius `r` around the axis; `inner` leaves a hole. */
  disc(y: number, r: number, color: ColorKey, inner = -1) {
    for (let x = -r; x <= r; x += 1) {
      for (let z = -r; z <= r; z += 1) {
        const d = x * x + z * z;
        if (d <= r * r + r && d > inner * inner + inner) this.set(x, y, z, color);
      }
    }
  }

  cyl(y0: number, y1: number, r: number, color: ColorKey | ((y: number) => ColorKey)) {
    for (let y = y0; y <= y1; y += 1) this.disc(y, r, typeof color === "function" ? color(y) : color);
  }

  /** Only the outer shell of a disc: a band painted around the collar. */
  band(y: number, r: number, color: ColorKey) {
    this.disc(y, r, color, r - 1);
  }

  box(min: [number, number, number], max: [number, number, number], color: ColorKey) {
    for (let x = min[0]; x <= max[0]; x += 1)
      for (let y = min[1]; y <= max[1]; y += 1) for (let z = min[2]; z <= max[2]; z += 1) this.set(x, y, z, color);
  }

  carve(min: [number, number, number], max: [number, number, number]) {
    for (let x = min[0]; x <= max[0]; x += 1)
      for (let y = min[1]; y <= max[1]; y += 1) for (let z = min[2]; z <= max[2]; z += 1) this.del(x, y, z);
  }
}

/** Threaded pin below and box above: every downhole module shares its joints. */
function collar(grid: Grid, top: number, body: ColorKey) {
  grid.cyl(0, 1, 2, "s");
  grid.cyl(2, top - 2, 3, body);
  grid.band(2, 3, "n");
  grid.band(top - 2, 3, "n");
  grid.cyl(top - 1, top, 2, "s");
}

/* INC: a sensor window over the orientation block and its three axes. */
function inclinometer(grid: Grid) {
  collar(grid, 17, "g");
  grid.carve([-2, 6, 1], [2, 11, 3]);
  grid.box([-1, 7, 0], [1, 9, 1], "a");
  grid.set(2, 8, 1, "l");
  grid.set(0, 8, 2, "c");
  grid.set(0, 10, 1, "e");
  grid.band(13, 3, "d");
}

/* GR: a slot over the scintillation crystal and its photomultiplier. */
function gamma(grid: Grid) {
  collar(grid, 17, "g");
  grid.band(4, 3, "d");
  grid.band(13, 3, "d");
  grid.carve([-1, 5, 2], [1, 12, 3]);
  grid.box([0, 6, 1], [0, 11, 2], "l");
  grid.box([0, 12, 1], [0, 12, 2], "s");
}

/* RES: transmitter and receiver rings standing proud of the collar. */
function resistivity(grid: Grid) {
  collar(grid, 19, "g");
  grid.disc(4, 4, "e");
  grid.disc(8, 4, "d");
  grid.disc(11, 4, "d");
  grid.disc(15, 4, "e");
}

/* MWD: centraliser fins, a data band and the pulser poppet on top. */
function mwd(grid: Grid) {
  grid.cyl(0, 1, 2, "s");
  grid.cyl(2, 14, 3, "g");
  grid.band(2, 3, "n");
  for (let y = 4; y <= 8; y += 1) {
    for (const [x, z] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) grid.set(x, y, z, "d");
  }
  grid.band(11, 3, "c");
  grid.cyl(15, 16, 2, "s");
  grid.disc(17, 3, "a");
  grid.disc(18, 2, "a");
  grid.set(0, 19, 0, "e");
  grid.set(0, 20, 0, "e");
}

/* PWR: a cutaway housing over stacked cells, the terminal lit on top. */
function power(grid: Grid) {
  collar(grid, 17, "n");
  grid.carve([-3, 4, 1], [3, 13, 3]);
  grid.cyl(4, 13, 2, (y) => (Math.floor((y - 4) / 2.5) % 2 ? "d" : "a"));
  grid.set(0, 18, 0, "e");
}

/* VZD: helical power section, a stepped bend, the bearing shaft and a bit. */
function motor(grid: Grid) {
  grid.disc(0, 1, "s");
  for (const [x, z] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) grid.set(x, 0, z, "a");
  grid.disc(1, 2, "g");
  grid.disc(2, 3, "s");
  grid.cyl(3, 8, 2, "g");
  grid.band(9, 3, "n");
  grid.cyl(10, 20, 3, "d");
  for (let y = 10; y <= 20; y += 1) {
    for (const start of [0, Math.PI]) {
      const angle = start + y * 0.75;
      grid.set(Math.round(3 * Math.cos(angle)), y, Math.round(3 * Math.sin(angle)), "a");
    }
  }
  grid.cyl(21, 22, 2, "s");

  // The bent housing: everything under the bend steps sideways.
  const bent = [...grid.cells.values()].filter(([, y]) => y < 10);
  bent.forEach(([x, y, z]) => grid.del(x, y, z));
  bent.forEach(([x, y, z, color]) => grid.set(x + Math.round((10 - y) / 4), y, z, color));
}

/* SFC: an acquisition unit with a live trace, and its pressure transducer. */
function surface(grid: Grid) {
  grid.box([-5, 2, -3], [5, 8, 2], "n");
  grid.box([-5, 2, 3], [5, 8, 3], "g");
  grid.box([-4, 4, 3], [1, 7, 3], "k");
  [5, 6, 7, 6, 5, 6].forEach((y, i) => grid.set(-4 + i, y, 3, "c"));
  grid.set(3, 7, 3, "l");
  grid.set(4, 7, 3, "e");
  grid.set(3, 4, 4, "s");
  grid.set(4, 4, 4, "s");
  for (const [x, z] of [[-4, -2], [4, -2], [-4, 2], [4, 2]]) grid.set(x, 1, z, "n");
  grid.box([3, 9, 0], [3, 10, 0], "s");
  grid.box([2, 11, -1], [4, 11, 1], "a");
  grid.box([-4, 9, -2], [-4, 12, -2], "g");
  grid.set(-4, 13, -2, "e");
}

/* SW: a monitor showing the trajectory and a gamma curve. */
function software(grid: Grid) {
  grid.box([-3, 0, -2], [3, 0, 2], "n");
  grid.box([-1, 1, -1], [1, 3, -1], "g");
  grid.box([-7, 4, -1], [7, 13, 1], "n");
  grid.box([-4, 6, -2], [4, 11, -2], "n");
  grid.box([-6, 5, 1], [6, 12, 1], "k");
  for (let x = -6; x <= 6; x += 1) {
    const t = (x + 6) / 12;
    grid.set(x, 12 - Math.round(t * t * 4), 1, "e");
    grid.set(x, 6 + Math.round(1 + Math.sin(x * 1.4)), 1, "l");
  }
}

/** Builders in the order of `equipment` in data/site.ts, keyed by module code. */
const BUILDERS: Record<string, (grid: Grid) => void> = {
  INC: inclinometer,
  GR: gamma,
  RES: resistivity,
  MWD: mwd,
  PWR: power,
  VZD: motor,
  SFC: surface,
  SW: software,
};

const FACES: { n: [number, number, number]; corners: [number, number, number][] }[] = [
  { n: [1, 0, 0], corners: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
  { n: [-1, 0, 0], corners: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]] },
  { n: [0, 1, 0], corners: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] },
  { n: [0, -1, 0], corners: [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]] },
  { n: [0, 0, 1], corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { n: [0, 0, -1], corners: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
];

function rgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/** Shell faces only, centred on the axis with the model's middle at y = 0. */
function mesh(out: number[], grid: Grid): Omit<ModelRange, "first" | "count"> {
  const voxels = [...grid.cells.values()];
  const ys = voxels.map(([, y]) => y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const midY = (minY + maxY) / 2;
  let radius = 0;

  for (const [x, y, z, color] of voxels) {
    radius = Math.max(radius, Math.hypot(Math.abs(x) + 0.5, Math.abs(z) + 0.5));
    const [r, g, b] = rgb(PALETTE[color]);
    const emissive = EMISSIVE.has(color) ? 1 : 0;
    const order = maxY === minY ? 0 : (y - minY) / (maxY - minY);
    for (const face of FACES) {
      if (grid.has(x + face.n[0], y + face.n[1], z + face.n[2])) continue;
      const pts = face.corners.map(([cx, cy, cz]) => [x + cx * 0.5, y - midY + cy * 0.5, z + cz * 0.5]);
      for (const index of [0, 1, 2, 0, 2, 3]) out.push(...pts[index], ...face.n, r, g, b, emissive, order);
    }
  }
  return { radius, height: maxY - minY + 1 };
}

export function buildModuleMeshes(codes: readonly string[]): { data: Float32Array; models: ModelRange[] } {
  const out: number[] = [];
  const models = codes.map((code) => {
    const grid = new Grid();
    (BUILDERS[code] ?? ((g: Grid) => collar(g, 17, "g")))(grid);
    const first = out.length / FLOATS_PER_VERTEX;
    const shape = mesh(out, grid);
    return { first, count: out.length / FLOATS_PER_VERTEX - first, ...shape };
  });
  return { data: new Float32Array(out), models };
}
