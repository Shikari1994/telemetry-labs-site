import { homeTree } from "@/data/home";
import {
  KIND,
  Mesh,
  PALETTE,
  aim,
  chip,
  clamp01,
  flatGlyphs,
  keyframes,
  mix,
  part,
  rng,
  smooth,
  type Pose,
  type Stretch,
  type TransitTheme,
  type V3,
} from "@/lib/transit/mesh";
import { span, type Guide } from "@/lib/transit/guide";
import { rotateY } from "@/lib/mascot/math";

/**
 * The overview: the transit before the request pulls back instead of going
 * forward, and shows that the page was a board all along.
 *
 * Every homepage section is a chip on one board, with its number on top, in
 * page order along a snake. The page peels off a close look at the chip of
 * the section just left; the camera then rises and swings round until the
 * whole board is in view, while the route of the visit lights up chip by
 * chip from the first section to that one (KIND.route, driven by `route`).
 * Then the last leg lights, and the camera swoops over the last chip and
 * dives straight down into the opening on its top, which holds the request
 * section and fills the screen.
 */

/** Chip centres on the board, in page order; the last one is the way out. */
const SLOTS: [number, number][] = [
  [-26, 22],
  [0, 22],
  [26, 22],
  [26, -4],
  [0, -4],
  [-26, -4],
  [0, -30],
];

const nodes = homeTree.slice(0, SLOTS.length);
const LAST = nodes.length - 1;
const CENTRE: V3 = [0, 0, -6];

/** The last chip: bigger, taller, with the opening on its top. */
const EXIT = { w: 14, d: 18, h: 1.6, hole: 4, holeZ: 3, labelZ: -5.5 };
const CHIP = { w: 10, d: 10, h: 1.2 };

const exitAt = SLOTS[LAST];
const HOLE_Y = EXIT.h + 0.1;
const HOLE_Z = exitAt[1] + EXIT.holeZ;

/* The route: chip to chip, turning a corner where two chips share no row or
   column. Positions along it are normalised to 0..1. */
const waypoints: [number, number][] = [];
SLOTS.slice(0, nodes.length).forEach(([x, z]) => {
  const prev = waypoints[waypoints.length - 1];
  if (prev && prev[0] !== x && prev[1] !== z) waypoints.push([prev[0], z]);
  waypoints.push([x, z]);
});
const lengths = waypoints.map((point, index) =>
  index === 0 ? 0 : Math.abs(point[0] - waypoints[index - 1][0]) + Math.abs(point[1] - waypoints[index - 1][1]),
);
const TOTAL = lengths.reduce((sum, length) => sum + length, 0);
const reached: number[] = [];
{
  let run = 0;
  waypoints.forEach((point, index) => {
    run += lengths[index];
    const chipIndex = SLOTS.findIndex(([x, z]) => x === point[0] && z === point[1]);
    if (chipIndex >= 0 && chipIndex < nodes.length) reached[chipIndex] = run / TOTAL;
  });
}
const LEFT = reached[Math.max(0, LAST - 1)] ?? 0;

/** How far the route is lit for a progress p: up to the chip just left, then on. */
function route(p: number) {
  if (p < 0.64) return LEFT * smooth(clamp01((p - 0.06) / 0.44));
  return mix(LEFT, 1, smooth(clamp01((p - 0.64) / 0.22)));
}

function build(seed: number, _label: string, theme: TransitTheme) {
  const mesh = new Mesh();
  const random = rng(seed * 7919 + 17);

  mesh.plane(-110, -110, 110, 110, PALETTE.floor, KIND.floor);

  /* Background routing: dim traces turning one corner each, so the board
     reads as a board from any height. */
  for (let i = 0; i < 90; i += 1) {
    const x = (random() - 0.5) * 150;
    const z = (random() - 0.5) * 130;
    const x1 = x + (random() - 0.5) * 50;
    const z1 = z + (random() - 0.5) * 40;
    const w = 0.25 + random() * 0.3;
    mesh.box(Math.min(x, x1), 0, z - w / 2, Math.max(x, x1), 0.05, z + w / 2, PALETTE.chip);
    mesh.box(x1 - w / 2, 0, Math.min(z, z1), x1 + w / 2, 0.05, Math.max(z, z1), PALETTE.chip);
  }

  /* The route, three lanes wide, cut into steps that light in order. */
  let run = 0;
  for (let i = 1; i < waypoints.length; i += 1) {
    const [ax, az] = waypoints[i - 1];
    const [bx, bz] = waypoints[i];
    const length = lengths[i];
    const dx = Math.sign(bx - ax);
    const dz = Math.sign(bz - az);
    for (let d = 0; d < length; d += 1) {
      const step = Math.min(1, length - d);
      const at = (run + d + step / 2) / TOTAL;
      for (const lane of [-0.8, 0, 0.8]) {
        const x0 = ax + dx * d + (dz ? lane : 0);
        const z0 = az + dz * d + (dx ? lane : 0);
        const x1 = x0 + dx * step;
        const z1 = z0 + dz * step;
        const w = 0.2;
        mesh.box(Math.min(x0, x1) - (dx ? 0 : w), 0, Math.min(z0, z1) - (dz ? 0 : w), Math.max(x0, x1) + (dx ? 0 : w), 0.1, Math.max(z0, z1) + (dz ? 0 : w), PALETTE.accentDeep, KIND.route, at);
      }
    }
    run += length;
  }

  /* One chip per section, its number on top lighting as the route reaches it. */
  nodes.forEach((node, index) => {
    const [x, z] = SLOTS[index];
    const at = 10 + (reached[index] ?? 0);
    if (index === LAST) {
      chip(mesh, x, z, EXIT.w, EXIT.d, EXIT.h, theme.accent);
      flatGlyphs(mesh, node.index, x, z + EXIT.labelZ, EXIT.h + 0.08, 0.7, PALETTE.ink, KIND.route, at);
      // A ring of chase lamps round the opening.
      const r = EXIT.hole + 0.5;
      let n = 0;
      for (let t = -r; t < r; t += 0.8) {
        for (const [lx, lz] of [
          [t, -r],
          [r, t],
          [-t, r],
          [-r, -t],
        ]) {
          mesh.box(x + lx - 0.2, EXIT.h, HOLE_Z + lz - 0.2, x + lx + 0.2, EXIT.h + 0.22, HOLE_Z + lz + 0.2, theme.accent, KIND.lamp, ((n += 1) * 0.05) % 1);
        }
      }
      mesh.portal(PORTAL);
      return;
    }
    chip(mesh, x, z, CHIP.w, CHIP.d, CHIP.h);
    flatGlyphs(mesh, node.index, x, z, CHIP.h + 0.08, 0.6, PALETTE.ink, KIND.route, at);
  });

  const clearOfChips = (x: number, z: number, margin: number) =>
    SLOTS.every(([cx, cz], index) => Math.abs(x - cx) > (index === LAST ? EXIT.w : CHIP.w) / 2 + margin || Math.abs(z - cz) > (index === LAST ? EXIT.d : CHIP.d) / 2 + margin);
  const offRoute = (x: number, z: number) =>
    waypoints.every((point, index) => {
      if (index === 0) return true;
      const prev = waypoints[index - 1];
      const inX = x > Math.min(prev[0], point[0]) - 2 && x < Math.max(prev[0], point[0]) + 2;
      const inZ = z > Math.min(prev[1], point[1]) - 2 && z < Math.max(prev[1], point[1]) + 2;
      return !(inX && inZ);
    });

  /* Small parts, and capacitors standing tall enough to slide past each
     other as the camera swings round. */
  for (let i = 0; i < 260; i += 1) {
    const x = (random() - 0.5) * 110;
    const z = (random() - 0.5) * 100;
    if (!clearOfChips(x, z, 1.4) || !offRoute(x, z)) continue;
    if (random() > 0.9) {
      const s = 0.6 + random() * 0.6;
      const h = 1.5 + random() * 3.5;
      mesh.box(x - s, 0, z - s, x + s, h, z + s, PALETTE.tower);
      mesh.box(x - s * 0.6, h, z - s * 0.6, x + s * 0.6, h + 0.08, z + s * 0.6, PALETTE.ink4);
    } else part(mesh, random, x, z);
  }

  /* Data bits in the air, none in the shaft the camera dives down. */
  for (let i = 0; i < 60; i += 1) {
    const x = (random() - 0.5) * 90;
    const z = (random() - 0.5) * 80;
    const y = 3 + random() * 30;
    if (Math.abs(x - exitAt[0]) < 8 && Math.abs(z - HOLE_Z) < 8) continue;
    const s = 0.06 + random() * 0.08;
    const col = random() > 0.8 ? theme.accent : random() > 0.5 ? PALETTE.ink : PALETTE.pin;
    mesh.box(x - s, y - s, z - s, x + s, y + s, z + s, col, KIND.bit, random());
  }

  return new Float32Array(mesh.data);
}

const PORTAL: V3[] = [
  [exitAt[0] - EXIT.hole, HOLE_Y, HOLE_Z - EXIT.hole],
  [exitAt[0] + EXIT.hole, HOLE_Y, HOLE_Z - EXIT.hole],
  [exitAt[0] + EXIT.hole, HOLE_Y, HOLE_Z + EXIT.hole],
  [exitAt[0] - EXIT.hole, HOLE_Y, HOLE_Z + EXIT.hole],
];

/** A key on a circle round the board's centre, looking at it. */
function orbit(t: number, angle: number, distance: number, height: number) {
  const eye: V3 = [CENTRE[0] + Math.sin(angle) * distance, height, CENTRE[2] + Math.cos(angle) * distance];
  return { t, x: eye[0], y: eye[1], z: eye[2], ...aim(eye, CENTRE), roll: 0 };
}

const leftAt = SLOTS[Math.max(0, LAST - 1)];
const startEye: V3 = [leftAt[0] + 2, 7.5, leftAt[1] + 13];
const swoopEye: V3 = [exitAt[0] + Math.sin(0.58) * 9, 22, HOLE_Z + Math.cos(0.58) * 9];

/**
 * Close on the chip just left, then up and round the board's centre (yaw
 * only ever turns one way), over the last chip, and straight down into it.
 */
const camera = keyframes([
  { t: 0, x: startEye[0], y: startEye[1], z: startEye[2], ...aim(startEye, [leftAt[0], 1, leftAt[1]]), roll: 0 },
  orbit(0.22, 0.2, 30, 26),
  orbit(0.45, 0.36, 38, 70),
  orbit(0.62, 0.5, 36, 74),
  { t: 0.82, x: swoopEye[0], y: swoopEye[1], z: swoopEye[2], ...aim(swoopEye, [exitAt[0], HOLE_Y, HOLE_Z]), roll: 0 },
  { t: 1, x: exitAt[0], y: HOLE_Y + 2.4, z: HOLE_Z, yaw: 0.62, pitch: -Math.PI / 2, roll: 0 },
]) as (p: number) => Pose;

/** A point `f` (0..1) along the route, and the way it runs there. */
function routeAt(f: number): { x: number; z: number; dx: number; dz: number } {
  let left = clamp01(f) * TOTAL;
  for (let i = 1; i < waypoints.length; i += 1) {
    const [ax, az] = waypoints[i - 1];
    const [bx, bz] = waypoints[i];
    const dx = Math.sign(bx - ax);
    const dz = Math.sign(bz - az);
    if (left <= lengths[i] || i === waypoints.length - 1) {
      const d = Math.min(left, lengths[i]);
      return { x: ax + dx * d, z: az + dz * d, dx, dz };
    }
    left -= lengths[i];
  }
  const [x, z] = waypoints[0];
  return { x, z, dx: 0, dz: -1 };
}

/** Robot voxel in world units here: big enough to read from high over the board. */
const ROBOT = 0.4;
const HOVER = 2.2;

/**
 * The mascot on the overview runs the route of the visit just ahead of the
 * light, so each chip lights behind it; it cuts the wait on the chip just
 * left short, so it is over the opening before the camera swoops. It waits on the chip
 * just left while the camera climbs, takes the last leg, turns to the camera
 * over the opening and waves, then hops and drops in before the camera dives.
 */
function guide(p: number, cam: Pose): Guide | null {
  // A step ahead of the light, so it is in the opening before the camera dives.
  const q = p + mix(0.03, 0.14, span(p, 0.45, 0.6));
  const run = routeAt(route(q));
  const moving = Math.min(1, Math.abs(route(q + 0.004) - route(q - 0.004)) * 60);
  const settle = span(p, 0.71, 0.74);
  const hop = clamp01((p - 0.755) / 0.04);
  const x = mix(run.x, exitAt[0], settle);
  const z = mix(run.z, HOLE_Z, settle);
  const y = HOVER + EXIT.h * settle + Math.sin(Math.PI * Math.min(1, hop * 1.4)) * 3 - hop * hop * 9;
  if (y < HOLE_Y - 0.3) return null;
  // Along the route while it runs, round to the camera while it waits.
  const facing = moving > 0.2 && settle === 0 ? Math.atan2(run.dx, run.dz) : Math.atan2(cam.x - x, cam.z - z);
  return {
    at: [x, y, z],
    rot: rotateY(facing),
    size: ROBOT,
    fly: Math.max(moving, hop > 0 ? 1 : 0.15),
    wave: p > 0.71 && p < 0.755,
  };
}

export const overview: Stretch = {
  build,
  camera,
  guide,
  portal: PORTAL,
  fog: [70, 160],
  route,
};
