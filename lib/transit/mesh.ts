/**
 * Voxel building blocks shared by every transit stretch (lib/transit): the
 * vertex layout, the shading kinds the shader knows, the site's palette, a
 * 5×7 voxel font, and a mesh that collects boxes and quads into one buffer.
 * Units are voxels; y is up.
 */

import type { Guide } from "@/lib/transit/guide";

/** pos 3, normal 3, colour 3, kind 1, seed 1, motion 4, axis 1 */
export const FLOATS_PER_VERTEX = 16;

/**
 * Shading kinds, mirrored in the shader. A route lights in order as the
 * stretch's route value passes its seed; rock takes its strata from depth.
 */
export const KIND = { solid: 0, trace: 1, bit: 2, lamp: 3, floor: 4, sky: 5, portal: 6, glow: 7, route: 8, rock: 9 } as const;

/**
 * How a box moves, mirrored in the shader. A spin turns it about its motion
 * pivot at `speed` rad/s; a slide carries it toward the gate at `speed`
 * voxels/s and wraps after `run` voxels (held in the pivot's x).
 */
export const AXIS = { none: 0, y: 1, z: 2, slide: 3 } as const;

/** The gate opening the camera passes through. */
export const GATE = { halfWidth: 5, height: 10 };

export type RGB = [number, number, number];
export type V3 = [number, number, number];

const hex = (value: string): RGB => {
  const n = parseInt(value.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/* The site's palette (app/globals.css), as linear-ish RGB for the shader. */
export const PALETTE = {
  bg: hex("#141413"),
  floor: hex("#1a1a18"),
  chip: hex("#2a2927"),
  pin: hex("#87867f"),
  tower: hex("#33312e"),
  rack: hex("#1e1d1b"),
  ink: hex("#faf9f5"),
  ink4: hex("#5e5d59"),
  accent: hex("#e2733f"),
  accentDeep: hex("#b4532a"),
};

/* 5×7 glyphs, one string per row: gate numbers and zone signs. */
const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
};

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Random = () => number;

export const pick = <T,>(random: Random, items: readonly T[]) => items[Math.floor(random() * items.length) % items.length];

export class Mesh {
  data: number[] = [];
  /** Motion of the boxes being added: pivot x, y, z, speed, axis. */
  private motion = [0, 0, 0, 0, AXIS.none];
  /** Where the origin of what is being added stands in the world. */
  private offset: V3 = [0, 0, 0];

  quad(a: number[], b: number[], c: number[], d: number[], n: number[], col: RGB, kind: number, seed: number) {
    const [ox, oy, oz] = this.offset;
    for (const p of [a, b, c, a, c, d]) this.data.push(p[0] + ox, p[1] + oy, p[2] + oz, n[0], n[1], n[2], col[0], col[1], col[2], kind, seed, ...this.motion);
  }

  /** Adds what `draw` builds as one body moving about `pivot`. */
  moving(pivot: [number, number, number], speed: number, axis: number, draw: () => void) {
    const before = this.motion;
    const [ox, oy, oz] = this.offset;
    // A slide keeps its run in the pivot's x, which an offset must not move.
    this.motion = axis === AXIS.slide ? [...pivot, speed, axis] : [pivot[0] + ox, pivot[1] + oy, pivot[2] + oz, speed, axis];
    draw();
    this.motion = before;
  }

  /** Adds what `draw` builds with its origin moved to `origin`. */
  at(origin: V3, draw: () => void) {
    const before = this.offset;
    this.offset = [before[0] + origin[0], before[1] + origin[1], before[2] + origin[2]];
    draw();
    this.offset = before;
  }

  /** Axis-aligned box without its bottom face. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col: RGB, kind: number = KIND.solid, seed = 0) {
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], col, kind, seed);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, kind, seed);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col, kind, seed);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col, kind, seed);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col, kind, seed);
  }

  /** A thin plate on a face looking at the camera (+z), standing at z. */
  face(x0: number, y0: number, x1: number, y1: number, z: number, col: RGB, kind: number = KIND.solid, seed = 0) {
    this.box(x0, y0, z, x1, y1, z + 0.06, col, kind, seed);
  }

  /** A see-through opening: the page behind the canvas shows in it. */
  portal(corners: readonly V3[]) {
    const [a, b, c, d] = corners;
    this.quad(a, b, c, d, [0, 0, 1], PALETTE.bg, KIND.portal, 0);
  }

  /** A horizontal plane at height y, facing up. */
  plane(x0: number, z0: number, x1: number, z1: number, col: RGB, kind: number, y = 0) {
    this.quad([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], [0, 1, 0], col, kind, 0);
  }
}

/* A theme dresses a stretch for the section it leads to. Colours tint the
   bus, the signal heads running on it, the gate's lights and the portal's
   rim; `props` stands the section's own things along the way. */
export type TransitTheme = {
  /** Bus lanes, coloured in turn. */
  traces: RGB[];
  /** Signal heads on the traces, the hot core of the rim and its sparks. */
  hot: RGB;
  /** Gate lights and the portal's rim. */
  accent: RGB;
  /** The cool end of the rim's sparks. */
  deep: RGB;
  /** Lamps on chips and racks, and the drifting bits. */
  lamps: RGB[];
  /** Rings pulsing over the floor from the gate toward the camera. */
  pulse: boolean;
  racks: boolean;
  /** Capacitor towers scattered between the props. */
  towers: number;
  props: (mesh: Mesh, random: Random) => void;
};

/** A trace from (x, z0) to z1 along the board, a flat strip slightly raised. */
export function trace(mesh: Mesh, x: number, z0: number, z1: number, col: RGB, seed: number, width = 0.34, kind: number = KIND.trace, y = 0) {
  mesh.box(x - width / 2, y, Math.min(z0, z1), x + width / 2, y + 0.08, Math.max(z0, z1), col, kind, seed);
}

export function crossTrace(mesh: Mesh, x0: number, x1: number, z: number, col: RGB, seed: number, width = 0.34, kind: number = KIND.trace, y = 0) {
  mesh.box(Math.min(x0, x1), y, z - width / 2, Math.max(x0, x1), y + 0.08, z + width / 2, col, kind, seed);
}

/** Text in 5×7 voxel glyphs facing the camera (+z), centred on cx. */
export function glyphs(mesh: Mesh, text: string, cx: number, y0: number, z: number, cell: number, col: RGB, seed = 1) {
  const width = text.length * 6 * cell - cell;
  let x = cx - width / 2;
  for (const ch of text) {
    GLYPHS[ch]?.forEach((row, r) => {
      for (let c = 0; c < 5; c += 1) {
        if (row[c] !== "1") continue;
        const bx = x + c * cell;
        const by = y0 + (6 - r) * cell;
        mesh.box(bx, by, z - cell / 2, bx + cell * 0.92, by + cell * 0.92, z + cell / 2, col, KIND.lamp, seed);
      }
    });
    x += 6 * cell;
  }
  return width;
}

/**
 * Text in 5×7 voxel glyphs lying flat at height y, centred on (cx, cz) and
 * read from above with its top toward -z.
 */
export function flatGlyphs(mesh: Mesh, text: string, cx: number, cz: number, y: number, cell: number, col: RGB, kind: number = KIND.lamp, seed = 1) {
  const width = text.length * 6 * cell - cell;
  let x = cx - width / 2;
  const z0 = cz - (7 * cell) / 2;
  for (const ch of text) {
    GLYPHS[ch]?.forEach((row, r) => {
      for (let c = 0; c < 5; c += 1) {
        if (row[c] !== "1") continue;
        const bx = x + c * cell;
        const bz = z0 + r * cell;
        mesh.box(bx, y, bz, bx + cell * 0.92, y + 0.12, bz + cell * 0.92, col, kind, seed);
      }
    });
    x += 6 * cell;
  }
  return width;
}

/**
 * A chip seen on the board: a dark body with a die window on top, pins along
 * every side and a lit pin-1 mark. Its top stands at y = h.
 */
export function chip(mesh: Mesh, cx: number, cz: number, w: number, d: number, h = 1.2, mark: RGB = PALETTE.accent) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const z0 = cz - d / 2;
  const z1 = cz + d / 2;
  mesh.box(x0, 0, z0, x1, h, z1, PALETTE.chip);
  mesh.box(x0 + w * 0.22, h, z0 + d * 0.22, x1 - w * 0.22, h + 0.06, z1 - d * 0.22, PALETTE.rack);
  for (let x = x0 + 0.7; x < x1 - 0.4; x += 1) {
    mesh.box(x - 0.18, 0, z0 - 0.6, x + 0.18, 0.3, z0, PALETTE.pin);
    mesh.box(x - 0.18, 0, z1, x + 0.18, 0.3, z1 + 0.6, PALETTE.pin);
  }
  for (let z = z0 + 0.7; z < z1 - 0.4; z += 1) {
    mesh.box(x0 - 0.6, 0, z - 0.18, x0, 0.3, z + 0.18, PALETTE.pin);
    mesh.box(x1, 0, z - 0.18, x1 + 0.6, 0.3, z + 0.18, PALETTE.pin);
  }
  mesh.box(x0 + 0.4, h, z0 + 0.4, x0 + 0.9, h + 0.1, z0 + 0.9, mark, KIND.lamp, 1);
}

/** A small part on the board: an SMD body with two lighter ends, or a via. */
export function part(mesh: Mesh, random: Random, x: number, z: number) {
  if (random() <= 0.45) {
    mesh.box(x - 0.25, 0, z - 0.25, x + 0.25, 0.1, z + 0.25, PALETTE.ink4);
    return;
  }
  const lengthwise = random() > 0.5;
  const l = 0.7 + random() * 0.5;
  const w = 0.35;
  const [hx, hz] = lengthwise ? [l, w] : [w, l];
  mesh.box(x - hx, 0, z - hz, x + hx, 0.45, z + hz, PALETTE.tower);
  if (lengthwise) {
    mesh.box(x - hx - 0.25, 0, z - hz, x - hx, 0.4, z + hz, PALETTE.pin);
    mesh.box(x + hx, 0, z - hz, x + hx + 0.25, 0.4, z + hz, PALETTE.pin);
  } else {
    mesh.box(x - hx, 0, z - hz - 0.25, x + hx, 0.4, z - hz, PALETTE.pin);
    mesh.box(x - hx, 0, z + hz, x + hx, 0.4, z + hz + 0.25, PALETTE.pin);
  }
}

/** The gate's opening, standing on y0 at z, as four corners. */
export const gateOpening = (y0: number, z: number): V3[] => [
  [-GATE.halfWidth, y0, z],
  [GATE.halfWidth, y0, z],
  [GATE.halfWidth, y0 + GATE.height, z],
  [-GATE.halfWidth, y0 + GATE.height, z],
];

/** The gate: two pillars, a beam, a ring of chase lights, the number and the portal. */
export function gate(mesh: Mesh, label: string, accent: RGB, y0: number, gz: number) {
  const { halfWidth: gw, height: gh } = GATE;
  const top = y0 + gh;
  mesh.box(-gw - 1.4, y0, gz - 0.7, -gw, top, gz + 0.7, PALETTE.chip);
  mesh.box(gw, y0, gz - 0.7, gw + 1.4, top, gz + 0.7, PALETTE.chip);
  mesh.box(-gw - 1.4, top, gz - 0.7, gw + 1.4, top + 1.4, gz + 0.7, PALETTE.chip);
  let n = 0;
  for (let y = y0 + 0.4; y < top; y += 0.8) {
    mesh.box(-gw + 0.05, y, gz + 0.5, -gw + 0.35, y + 0.4, gz + 0.8, accent, KIND.lamp, ((n += 1) * 0.07) % 1);
    mesh.box(gw - 0.35, y, gz + 0.5, gw - 0.05, y + 0.4, gz + 0.8, accent, KIND.lamp, (n * 0.07) % 1);
  }
  for (let x = -gw + 0.4; x < gw; x += 0.8) {
    mesh.box(x, top - 0.35, gz + 0.5, x + 0.4, top - 0.05, gz + 0.8, accent, KIND.lamp, ((n += 1) * 0.07) % 1);
  }
  glyphs(mesh, label, 0, top + 2, gz, 0.9, PALETTE.ink);
  mesh.portal(gateOpening(y0, gz));
}

/** A camera pose: position, then yaw (about y), pitch (about x), roll (about the view axis). */
export type Pose = { x: number; y: number; z: number; yaw: number; pitch: number; roll: number };

/**
 * How one kind of stretch is flown. `camera` places the camera for a flight
 * progress 0..1; `portal` is the way out (four world corners), which the last
 * stretch widens past its frame; `fog` is where fog starts and how long it
 * takes to swallow the scene; `route` (0..1) drives KIND.route. On a
 * `radial` stretch, signal on the board surface flows into its centre rather
 * than toward -z; `target` is the depth band where rock glows. `guide` is
 * where the mascot is for a progress and the camera at it (lib/transit/guide),
 * or null while it is not in this stretch's world.
 */
export type Stretch = {
  build: (seed: number, label: string, theme: TransitTheme) => Float32Array;
  camera: (p: number) => Pose;
  portal: readonly V3[];
  fog: [number, number];
  route?: (p: number) => number;
  radial?: boolean;
  target?: [number, number];
  guide?: (p: number, cam: Pose) => Guide | null;
};

export const smooth = (t: number) => t * t * (3 - 2 * t);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * A pose sampled from keyframes by Catmull-Rom, so the camera passes through
 * every key without stopping at it. Keys are sorted by `t`; the first and
 * last hold outside their range.
 */
export function keyframes(keys: readonly (Pose & { t: number })[]) {
  const channels = ["x", "y", "z", "yaw", "pitch", "roll"] as const;
  return (p: number): Pose => {
    let i = 0;
    while (i < keys.length - 2 && p > keys[i + 1].t) i += 1;
    const k1 = keys[i];
    const k2 = keys[i + 1];
    const k0 = keys[Math.max(0, i - 1)];
    const k3 = keys[Math.min(keys.length - 1, i + 2)];
    const span = k2.t - k1.t;
    const u = clamp01((p - k1.t) / span);
    const u2 = u * u;
    const u3 = u2 * u;
    const out = {} as Pose;
    for (const c of channels) {
      // Tangents scaled to this segment's span, so uneven key spacing does not overshoot.
      const m1 = k0 === k1 ? 0 : ((k2[c] - k0[c]) / (k2.t - k0.t)) * span;
      const m2 = k3 === k2 ? 0 : ((k3[c] - k1[c]) / (k3.t - k1.t)) * span;
      out[c] = (2 * u3 - 3 * u2 + 1) * k1[c] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * k2[c] + (u3 - u2) * m2;
    }
    return out;
  };
}

/** Yaw and pitch that look from `eye` at `target`. */
export function aim(eye: V3, target: V3) {
  const dx = target[0] - eye[0];
  const dy = target[1] - eye[1];
  const dz = target[2] - eye[2];
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}
