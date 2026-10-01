/**
 * Procedural bitmap textures for the hero room.
 *
 * Every plane of the room is a canvas sized to its own layout box divided by
 * ART, painted with a few warm whites through an ordered (Bayer) dither and
 * upscaled nearest-neighbour. Painting at the real box size keeps each art
 * pixel square at every breakpoint, which a stretched image could not.
 * The lamp sprite is drawn at a fixed art size instead.
 * Painted once per size change; nothing here runs per frame.
 *
 * A box face takes its palette and tone from the canvas's data attributes
 * (`data-pal`, `data-tone`).
 */

/** CSS px per art pixel. */
export const ART = 4;

export type PaintKind =
  | "wall-left"
  | "wall-back"
  | "floor"
  | "pad"
  | "shadow"
  | "lamp"
  | "cone"
  | "pool"
  | "face"
  | "rack";

type RGB = [number, number, number];

const hex = (value: string): RGB => {
  const v = value.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) as RGB;
};

/* Walls run from paper white into warm greys; the floor sits a step lower. */
const WALL = ["#faf9f5", "#f1eee6", "#e6e0d4", "#d6cfc2", "#bdb7ab", "#9f9a90"].map(hex);
const FLOOR = ["#ece8df", "#e0dacd", "#d2cbbd", "#c1baac", "#a8a296", "#8a857c"].map(hex);
/* Equipment: steel from light to near black. */
const STEEL = ["#b0aea5", "#87867f", "#5e5d59", "#4a4945", "#3d3a35", "#2a2825", "#1c1b19"].map(hex);
const ACCENT = hex("#e2733f");
const AMBER = hex("#f2a65a");
const CREAM = hex("#fff3d6");
const SHADE = hex("#3d3a35");
const PALETTES: Record<string, RGB[]> = { light: WALL, floor: FLOOR, steel: STEEL };

/* 4x4 Bayer thresholds in (0, 1). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((n) => (n + 0.5) / 16);
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

/** Dithered pick along a ramp; t in [0, 1], 0 = brightest. */
function ramp(stops: RGB[], t: number, x: number, y: number): RGB {
  const pos = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(pos);
  return pos - i > bayer(x, y) ? stops[i + 1] : stops[i];
}

type Pixels = { w: number; h: number; data: Uint8ClampedArray };

function set(px: Pixels, x: number, y: number, [r, g, b]: RGB, a = 255) {
  if (x < 0 || y < 0 || x >= px.w || y >= px.h) return;
  const o = (y * px.w + x) * 4;
  px.data[o] = r;
  px.data[o + 1] = g;
  px.data[o + 2] = b;
  px.data[o + 3] = a;
}

/**
 * A wall seen from inside. `corner` is the side (0 left, 1 right) where it
 * meets the other wall, which is where ambient occlusion gathers; `base` is how
 * much light it catches overall.
 */
function wall(px: Pixels, corner: 0 | 1, base: number, outlet: number | null) {
  const { w, h } = px;
  const board = Math.max(2, Math.round(h * 0.045));
  for (let y = 0; y < h; y += 1) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x += 1) {
      const u = x / (w - 1);
      const fromCorner = corner === 0 ? u : 1 - u;
      let t = base;
      t += 0.42 * Math.exp(-fromCorner * 11); // corner occlusion
      t += 0.28 * Math.exp(-(1 - v) * 16); // floor occlusion
      t -= 0.08 * (1 - v); // light falls from above
      t += 0.06 * Math.exp(-v * 30); // cut edge
      set(px, x, y, ramp(WALL, t, x, y));
    }
  }
  // Skirting board: a lit top edge over a slightly darker board.
  for (let x = 0; x < w; x += 1) {
    const fromCorner = corner === 0 ? x / w : 1 - x / w;
    const dark = 0.3 * Math.exp(-fromCorner * 11);
    set(px, x, h - board - 1, WALL[0]);
    for (let y = h - board; y < h; y += 1) set(px, x, y, ramp(WALL, 0.38 + dark, x, y));
  }
  // A wall socket, because rooms have them.
  if (outlet !== null) {
    const ox = Math.round(w * outlet);
    const oy = h - board - 7;
    for (let y = 0; y < 5; y += 1) for (let x = 0; x < 4; x += 1) set(px, ox + x, oy + y, WALL[y === 4 ? 4 : 1]);
    set(px, ox + 1, oy + 1, WALL[5]);
    set(px, ox + 1, oy + 3, WALL[5]);
    set(px, ox + 2, oy + 1, WALL[5]);
    set(px, ox + 2, oy + 3, WALL[5]);
  }
}

/** Floor, top edge along the back wall and left edge along the left wall. */
function floor(px: Pixels) {
  const { w, h } = px;
  const tiles = 8;
  const tw = w / tiles;
  const th = h / tiles;
  for (let y = 0; y < h; y += 1) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x += 1) {
      const u = x / (w - 1);
      const tx = Math.floor(x / tw);
      const ty = Math.floor(y / th);
      const grout = x - Math.round(tx * tw) === 0 || y - Math.round(ty * th) === 0;
      const r2 = (u - 0.5) ** 2 + (v - 0.5) ** 2;
      let t = 0.16 + ((tx + ty) % 2) * 0.1;
      t += 0.5 * Math.exp(-u * 12) + 0.5 * Math.exp(-v * 12); // walls
      t -= 0.14 * Math.exp(-r2 * 7); // light pool
      t += 0.16 * Math.max(0, u + v - 1.1); // falls off toward the open edges
      if (grout) t += 0.2;
      set(px, x, y, ramp(FLOOR, t, x, y));
    }
  }
}

/** Charging pad: dithered accent disc and target rings, transparent around. */
function pad(px: Pixels) {
  const { w, h } = px;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const R = Math.min(w, h) / 2 - 0.5;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const d = Math.hypot(x - cx, y - cy) / R;
      if (d > 1) continue;
      const a = Math.atan2(y - cy, x - cx);
      const outer = d > 0.9;
      const dashed = Math.abs(d - 0.7) < 0.06 && Math.sin(a * 12) > 0;
      const inner = Math.abs(d - 0.36) < 0.06;
      const cross = (Math.abs(x - cx) < 0.6 || Math.abs(y - cy) < 0.6) && d < 0.2;
      if (outer || inner || cross) set(px, x, y, ACCENT);
      else if (dashed) set(px, x, y, AMBER);
      else if (bayer(x, y) < 0.22 * (1 - d)) set(px, x, y, ACCENT, 200);
    }
  }
}

/** Contact shadow under the robot. */
function shadow(px: Pixels) {
  const { w, h } = px;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const d = Math.hypot((x - cx) / (w / 2), (y - cy) / (h / 2));
      if (d < 1 && bayer(x, y) < 0.85 * (1 - d * d)) set(px, x, y, SHADE);
    }
  }
}

/** Warm light the lamp throws on the floor: a dithered ellipse. */
function pool(px: Pixels) {
  const { w, h } = px;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const d = Math.hypot(x / (w - 1) - 0.5, y / (h - 1) - 0.5) * 2;
      if (d < 1 && bayer(x, y) < 0.36 * (1 - d * d)) set(px, x, y, d < 0.55 ? AMBER : CREAM);
    }
  }
}

/** The lamp's beam: a widening dithered trapezoid, brightest under the shade. */
function cone(px: Pixels) {
  const { w, h } = px;
  for (let y = 0; y < h; y += 1) {
    const v = y / (h - 1);
    const half = 0.16 + 0.34 * v; // half-width as a fraction of the canvas
    for (let x = 0; x < w; x += 1) {
      const off = Math.abs(x / (w - 1) - 0.5) / half;
      if (off > 1) continue;
      const density = (0.3 - 0.18 * v) * (1 - off ** 4);
      if (bayer(x, y) < density) set(px, x, y, bayer(y, x) < 0.5 ? AMBER : CREAM, 190);
    }
  }
}

/** One face of a box: lit from above, a highlight on its top edge. */
function face(px: Pixels, palette: RGB[], tone: number) {
  const { w, h } = px;
  for (let y = 0; y < h; y += 1) {
    const v = y / Math.max(1, h - 1);
    for (let x = 0; x < w; x += 1) {
      let t = tone + 0.1 * v;
      if (y === 0) t -= 0.18;
      else if (y === h - 1 || x === 0 || x === w - 1) t += 0.1;
      set(px, x, y, ramp(palette, t, x, y));
    }
  }
}

/** Rack front: a steel frame of 1U units with vent slots and pull handles.
    The status lights are separate elements so they can blink. */
function rack(px: Pixels) {
  const { w, h } = px;
  face(px, STEEL, 0.62);
  const units = 7;
  const top = 2;
  const unitH = (h - top - 2) / units;
  for (let i = 0; i < units; i += 1) {
    const y0 = Math.round(top + i * unitH);
    const y1 = Math.round(top + (i + 1) * unitH) - 1;
    for (let x = 2; x < w - 2; x += 1) {
      set(px, x, y0, STEEL[2]); // lit seam
      set(px, x, y1, STEEL[6]);
    }
    for (let y = y0 + 1; y < y1; y += 1) {
      for (let x = 2; x < w - 2; x += 1) set(px, x, y, ramp(STEEL, 0.5 + 0.08 * ((i + x) % 2), x, y));
      // Vent slots across the right half.
      for (let x = Math.round(w * 0.5); x < w - 4; x += 2) set(px, x, y, STEEL[6]);
    }
    // A pull handle at each end.
    for (let y = y0 + 1; y < y1; y += 1) {
      set(px, 3, y, STEEL[1]);
      set(px, w - 4, y, STEEL[1]);
    }
  }
}

/* A pendant lamp, drawn by hand, one character per art pixel: cord, shade
   and bulb. */
const LAMP = [
  "......kk......",
  "......kk......",
  ".....dbbd.....",
  "....dbbbbd....",
  "...dbbbbbbd...",
  "..dbbbbbbbbd..",
  ".dbbbbbbbbbbd.",
  ".dddddddddddd.",
  "....aaaaaa....",
  "......aa......",
];
const SPRITE_COLORS: Record<string, RGB> = {
  d: hex("#8e4536"),
  b: hex("#e2733f"),
  k: STEEL[5],
  a: CREAM,
};

function sprite(px: Pixels, rows: string[]) {
  rows.forEach((row, y) =>
    [...row].forEach((key, x) => {
      const color = SPRITE_COLORS[key];
      if (color) set(px, x, y, color);
    }),
  );
}

const SPRITES: Partial<Record<PaintKind, { cols: number; rows: number; draw: (px: Pixels) => void }>> = {
  lamp: { cols: LAMP[0].length, rows: LAMP.length, draw: (px) => sprite(px, LAMP) },
};

export function paintRoomCanvas(canvas: HTMLCanvasElement, kind: PaintKind) {
  const fixed = SPRITES[kind];
  const w = fixed ? fixed.cols : Math.max(4, Math.round(canvas.offsetWidth / ART));
  const h = fixed ? fixed.rows : Math.max(4, Math.round(canvas.offsetHeight / ART));
  if (canvas.width === w && canvas.height === h && canvas.dataset.painted === kind) return;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const image = ctx.createImageData(w, h);
  const px: Pixels = { w, h, data: image.data };

  if (fixed) fixed.draw(px);
  else if (kind === "wall-left") wall(px, 1, 0.2, 0.3);
  else if (kind === "wall-back") wall(px, 0, 0.04, 0.82);
  else if (kind === "floor") floor(px);
  else if (kind === "pad") pad(px);
  else if (kind === "shadow") shadow(px);
  else if (kind === "pool") pool(px);
  else if (kind === "cone") cone(px);
  else if (kind === "face") face(px, PALETTES[canvas.dataset.pal ?? "light"] ?? WALL, Number(canvas.dataset.tone ?? 0.2));
  else if (kind === "rack") rack(px);

  ctx.putImageData(image, 0, 0);
  canvas.dataset.painted = kind;
}
