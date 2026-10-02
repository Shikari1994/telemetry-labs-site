/**
 * Where everything sits on the 06 stack board (copy in data/home.ts).
 *
 * The board is a grid of COLS × ROWS cells. A chip is placed by its first
 * column and row (1-based, as CSS grid lines) and its width in cells; every
 * chip is two rows tall. Frames are the silkscreen outlines: one per zone of
 * data/home.ts, plus the outline of the whole Drill Monitor half.
 *
 * Traces run between chip pads, routed PCB style: straight runs with a 45°
 * cut at each corner. Packets ride routes, chains of traces that pass under
 * a chip's middle from one trace to the next. Trace and packet geometry is
 * in board units, UNIT per cell, the viewBox of the board's SVG.
 */

export const COLS = 42;
export const ROWS = 26;
export const UNIT = 10;
const CHIP_ROWS = 2;
const CHAMFER = 0.5;

export type Cell = { x: number; y: number; w: number; h: number };

export const chipCells: Record<string, Omit<Cell, "h">> = {
  PYTHON: { x: 3, y: 14, w: 6 },
  WITSML: { x: 3, y: 20, w: 6 },
  WEBSOCKET: { x: 13, y: 12, w: 7 },
  FASTIFY: { x: 13, y: 17, w: 7 },
  POSTGRESQL: { x: 13, y: 22, w: 7 },
  ELECTRON: { x: 24, y: 12, w: 5 },
  "REACT 19": { x: 30, y: 12, w: 5 },
  R3F: { x: 37, y: 12, w: 4 },
  TYPESCRIPT: { x: 24, y: 15, w: 6 },
  VITE: { x: 31, y: 15, w: 4 },
  ZUSTAND: { x: 36, y: 15, w: 5 },
  ECHARTS: { x: 24, y: 18, w: 5 },
  "DND-KIT": { x: 30, y: 18, w: 5 },
  EXPO: { x: 24, y: 23, w: 4 },
  "REACT NATIVE": { x: 29, y: 23, w: 6 },
  NFC: { x: 37, y: 23, w: 4 },
  "THREE.JS": { x: 36, y: 3, w: 6 },
  ASTRO: { x: 2, y: 3, w: 4 },
  GSAP: { x: 7, y: 3, w: 4 },
  SCROLLTRIGGER: { x: 12, y: 3, w: 6 },
  LENIS: { x: 19, y: 3, w: 4 },
  GLSL: { x: 24, y: 3, w: 4 },
  WEBGL: { x: 29, y: 3, w: 4 },
};

/** Silkscreen frames by zone id; "monitor" outlines the Drill Monitor half. */
export const frameCells: Record<string, Cell> = {
  monitor: { x: 1, y: 8, w: 42, h: 19 },
  rig: { x: 2, y: 10, w: 8, h: 16 },
  server: { x: 12, y: 10, w: 9, h: 16 },
  office: { x: 23, y: 10, w: 19, h: 11 },
  field: { x: 23, y: 22, w: 19, h: 4 },
  shared: { x: 35, y: 1, w: 8, h: 6 },
  site: { x: 1, y: 1, w: 33, h: 6 },
};

type Side = "L" | "R" | "T" | "B";
type Pad = [chip: string, side: Side, at?: number];
type TraceDef = { id: string; from: Pad; to: Pad; /** Where the middle run goes, in grid lines. */ mid?: number };

const traceDefs: TraceDef[] = [
  { id: "rig-py", from: ["PYTHON", "R"], to: ["FASTIFY", "L", 0.3], mid: 10.5 },
  { id: "rig-wml", from: ["WITSML", "R"], to: ["FASTIFY", "L", 0.7], mid: 10 },
  { id: "srv-db", from: ["FASTIFY", "B"], to: ["POSTGRESQL", "T"] },
  { id: "srv-ws", from: ["FASTIFY", "T"], to: ["WEBSOCKET", "B"] },
  { id: "ws-desk", from: ["WEBSOCKET", "R", 0.35], to: ["ELECTRON", "L", 0.35] },
  { id: "ws-field", from: ["WEBSOCKET", "R", 0.75], to: ["EXPO", "L"], mid: 21 },
  { id: "desk-ui", from: ["ELECTRON", "R"], to: ["REACT 19", "L"] },
  { id: "ui-3d", from: ["REACT 19", "R"], to: ["R3F", "L"] },
  { id: "desk-ts", from: ["ELECTRON", "B"], to: ["TYPESCRIPT", "T"] },
  { id: "ts-vite", from: ["TYPESCRIPT", "R"], to: ["VITE", "L"] },
  { id: "vite-st", from: ["VITE", "R"], to: ["ZUSTAND", "L"] },
  { id: "ts-ch", from: ["TYPESCRIPT", "B"], to: ["ECHARTS", "T"] },
  { id: "ch-dnd", from: ["ECHARTS", "R"], to: ["DND-KIT", "L"] },
  { id: "app-rn", from: ["EXPO", "R"], to: ["REACT NATIVE", "L"] },
  { id: "rn-nfc", from: ["REACT NATIVE", "R"], to: ["NFC", "L"] },
  { id: "three-r3f", from: ["THREE.JS", "B"], to: ["R3F", "T"] },
  { id: "gl-three", from: ["WEBGL", "R"], to: ["THREE.JS", "L"] },
  { id: "glsl-gl", from: ["GLSL", "R"], to: ["WEBGL", "L"] },
  { id: "astro-glsl", from: ["ASTRO", "B"], to: ["GLSL", "B"], mid: 5.2 },
  { id: "astro-gsap", from: ["ASTRO", "R"], to: ["GSAP", "L"] },
  { id: "gsap-st", from: ["GSAP", "R"], to: ["SCROLLTRIGGER", "L"] },
  { id: "st-lenis", from: ["SCROLLTRIGGER", "R"], to: ["LENIS", "L"] },
];

/** Packet routes, each a chain of traces read from → to. */
const routeDefs: string[][] = [
  ["rig-py", "srv-ws", "ws-desk", "desk-ui", "ui-3d"],
  ["rig-wml", "srv-db"],
  ["srv-ws", "ws-field", "app-rn", "rn-nfc"],
  ["glsl-gl", "gl-three", "three-r3f"],
  ["astro-gsap", "gsap-st", "st-lenis"],
  ["desk-ts", "ts-ch", "ch-dnd"],
];

export type Point = [number, number];
export type Trace = { id: string; from: string; to: string; points: Point[] };

const box = (label: string) => {
  const c = chipCells[label];
  return { left: c.x - 1, right: c.x - 1 + c.w, top: c.y - 1, bottom: c.y - 1 + CHIP_ROWS };
};

export const chipCenter = (label: string): Point => {
  const b = box(label);
  return [(b.left + b.right) / 2, (b.top + b.bottom) / 2];
};

const pad = ([label, side, at = 0.5]: Pad): Point => {
  const b = box(label);
  if (side === "L") return [b.left, b.top + (b.bottom - b.top) * at];
  if (side === "R") return [b.right, b.top + (b.bottom - b.top) * at];
  if (side === "T") return [b.left + (b.right - b.left) * at, b.top];
  return [b.left + (b.right - b.left) * at, b.bottom];
};

const flat = (side: Side) => side === "L" || side === "R";

/** Orthogonal route between two pads: out along the first side, across, in. */
function route(def: TraceDef): Point[] {
  const a = pad(def.from);
  const b = pad(def.to);
  const [, sa] = def.from;
  const [, sb] = def.to;
  if (flat(sa) && flat(sb)) {
    if (Math.abs(a[1] - b[1]) < 0.01) return [a, b];
    const x = def.mid ?? (a[0] + b[0]) / 2;
    return [a, [x, a[1]], [x, b[1]], b];
  }
  if (!flat(sa) && !flat(sb)) {
    // Pads nearly in line meet straight: the far pad slides along its chip.
    if (Math.abs(a[0] - b[0]) < 0.6) return [a, [a[0], b[1]]];
    const y = def.mid ?? (a[1] + b[1]) / 2;
    return [a, [a[0], y], [b[0], y], b];
  }
  return flat(sa) ? [a, [b[0], a[1]], b] : [a, [a[0], b[1]], b];
}

/** Cuts each corner at 45°, as a board router draws it. */
function chamfer(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    const cut = Math.min(CHAMFER, inLen / 2, outLen / 2);
    out.push([cx - ((cx - px) / inLen) * cut, cy - ((cy - py) / inLen) * cut]);
    out.push([cx + ((nx - cx) / outLen) * cut, cy + ((ny - cy) / outLen) * cut]);
  }
  out.push(points[points.length - 1]);
  return out;
}

const toUnits = (points: Point[]): Point[] => points.map(([x, y]) => [x * UNIT, y * UNIT]);

export const traces: Trace[] = traceDefs.map((def) => ({
  id: def.id,
  from: def.from[0],
  to: def.to[0],
  points: toUnits(chamfer(route(def))),
}));

export const tracePath = (points: Point[]) =>
  points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

/** A packet route as one polyline, with where along it each chip is passed. */
export type PacketRoute = { points: Point[]; lengths: number[]; total: number; stops: { at: number; chip: string }[] };

export const packetRoutes: PacketRoute[] = routeDefs.map((ids) => {
  const points: Point[] = [];
  const chips: string[] = [];
  ids.forEach((id, index) => {
    const trace = traces.find((t) => t.id === id);
    if (!trace) throw new Error(`Unknown trace ${id}`);
    // From one trace to the next through the middle of the chip between.
    if (index > 0) {
      const [cx, cy] = chipCenter(trace.from);
      points.push([cx * UNIT, cy * UNIT]);
    }
    points.push(...trace.points);
    chips.push(trace.from);
    if (index === ids.length - 1) chips.push(trace.to);
  });
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  // Each chip is passed where the route is nearest its middle.
  const stops = chips.map((chip) => {
    const [cx, cy] = chipCenter(chip).map((v) => v * UNIT);
    let best = 0;
    let bestDist = Infinity;
    points.forEach(([x, y], i) => {
      const d = Math.hypot(x - cx, y - cy);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return { at: lengths[best], chip };
  });
  return { points, lengths, total: lengths[lengths.length - 1], stops };
});

/** Position along a route, by distance from its start. */
export function pointAt(route: PacketRoute, distance: number): Point {
  const d = Math.max(0, Math.min(route.total, distance));
  let i = 1;
  while (i < route.lengths.length - 1 && route.lengths[i] < d) i += 1;
  const span = route.lengths[i] - route.lengths[i - 1] || 1;
  const f = (d - route.lengths[i - 1]) / span;
  const [ax, ay] = route.points[i - 1];
  const [bx, by] = route.points[i];
  return [ax + (bx - ax) * f, ay + (by - ay) * f];
}
