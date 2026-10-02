import {
  AXIS,
  FLOATS_PER_VERTEX,
  GATE,
  KIND,
  Mesh,
  PALETTE,
  crossTrace,
  gate,
  gateOpening,
  glyphs,
  mix,
  pick,
  rng,
  smooth,
  trace,
  type Pose,
  type RGB,
  type Random,
  type Stretch,
  type TransitTheme,
} from "@/lib/transit/mesh";
import { drill } from "@/lib/transit/drill";
import { chase, span, type Guide } from "@/lib/transit/guide";
import { overview } from "@/lib/transit/overview";

/**
 * Voxel geometry for the transits, and which stretch leads to which section.
 *
 * The flight (into "what we build"): a stretch of circuit board the camera
 * flies along from the hero into the portfolio. A data bus runs down the
 * middle toward a gate that carries the next section's number, and a few
 * data bits hang in the air. The gate's opening is a portal: it is drawn
 * see-through, so the page behind the canvas (the next section) shows in it,
 * and flying into it hands the screen back to the page. What stands on the
 * board belongs to the section ahead (THEMES): browser windows, app screens
 * and spinning wire cubes, spaced out and kept to the site's orange and ink.
 * The floor is y = 0, the camera travels toward -z.
 *
 * The other two stretches move the camera another way: the drill
 * (lib/transit/drill) bores down through the board, the overview
 * (lib/transit/overview) rises over it and dives into a chip.
 */

/** Length of the flight; its gate stands at z = -LENGTH. */
export const LENGTH = 120;

/**
 * A sign: a dark plate with lit letters and an underline, on a post from the
 * board, or hanging from cables when it floats over the bus.
 */
function sign(mesh: Mesh, text: string, cx: number, z: number, accent: RGB, y0 = 7.5) {
  const cell = 0.5;
  const width = text.length * 6 * cell - cell;
  const top = y0 + 7 * cell + 0.6;
  if (Math.abs(cx) > GATE.halfWidth) mesh.box(cx - 0.15, 0, z - 0.4, cx + 0.15, y0, z - 0.1, PALETTE.tower);
  else for (const x of [cx - width / 2, cx + width / 2]) mesh.box(x - 0.05, top, z - 0.4, x + 0.05, top + 12, z - 0.3, PALETTE.ink4);
  mesh.box(cx - width / 2 - 0.7, y0 - 0.9, z - 0.5, cx + width / 2 + 0.7, top, z - 0.2, PALETTE.rack);
  glyphs(mesh, text, cx, y0, z, cell, PALETTE.ink);
  mesh.face(cx - width / 2, y0 - 0.6, cx + width / 2, y0 - 0.35, z - 0.2, accent, KIND.lamp, 1);
}

/* ---- Props: 02, what we build -------------------------------------------- */

/** A browser window on a stand: title bar with three dots, a hero, lines of text. */
function browser(mesh: Mesh, random: Random, cx: number, cz: number, w: number, h: number, accent: RGB) {
  const y0 = 1.2 + random() * 1.4;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const top = y0 + h;
  mesh.box(cx - 0.2, 0, cz - 0.4, cx + 0.2, y0, cz - 0.1, PALETTE.tower);
  mesh.box(x0, y0, cz - 0.3, x1, top, cz, PALETTE.chip);
  mesh.face(x0 + 0.15, top - 0.75, x1 - 0.15, top - 0.15, cz, PALETTE.rack);
  [PALETTE.accent, PALETTE.ink4, PALETTE.ink4].forEach((col, i) =>
    mesh.face(x0 + 0.35 + i * 0.5, top - 0.6, x0 + 0.65 + i * 0.5, top - 0.3, cz + 0.06, col, KIND.lamp, 1),
  );
  const heroBottom = top - 1 - h * 0.36;
  mesh.face(x0 + 0.35, heroBottom, x1 - 0.35, top - 0.95, cz, PALETTE.rack);
  mesh.face(x0 + 0.7, heroBottom + 0.35, x0 + 0.7 + (w - 1.4) * (0.4 + random() * 0.4), heroBottom + 0.75, cz + 0.06, accent, KIND.lamp, 1);
  for (let y = heroBottom - 0.55; y > y0 + 0.3; y -= 0.5) {
    mesh.face(x0 + 0.35, y, x0 + 0.35 + (w - 0.7) * (0.35 + random() * 0.6), y + 0.22, cz, PALETTE.ink4);
  }
}

/** A cube drawn as its twelve edges, spinning about its own centre. */
function wireCube(mesh: Mesh, cx: number, cy: number, cz: number, s: number, speed: number, col: RGB, core: RGB) {
  const a = s / 2;
  const t = 0.1;
  mesh.moving([cx, cy, cz], speed, AXIS.y, () => {
    for (const u of [-a, a]) {
      for (const v of [-a, a]) {
        mesh.box(cx - a, cy + u - t, cz + v - t, cx + a, cy + u + t, cz + v + t, col, KIND.bit, 0);
        mesh.box(cx + u - t, cy - a, cz + v - t, cx + u + t, cy + a, cz + v + t, col, KIND.bit, 0);
        mesh.box(cx + u - t, cy + v - t, cz - a, cx + u + t, cy + v + t, cz + a, col, KIND.bit, 0);
      }
    }
  });
  // A solid voxel inside, turning the other way.
  const c = s * 0.2;
  mesh.moving([cx, cy, cz], -speed * 1.6, AXIS.y, () => mesh.box(cx - c, cy - c, cz - c, cx + c, cy + c, cz + c, core, KIND.lamp, 1));
}

/** A desktop monitor on a stand, a live chart on its screen. */
function monitor(mesh: Mesh, random: Random, cx: number, cz: number, w: number, curve: RGB) {
  const h = w * 0.62;
  const y0 = 1.6;
  mesh.box(cx - 1, 0, cz - 1, cx + 1, 0.2, cz + 0.2, PALETTE.tower);
  mesh.box(cx - 0.2, 0.2, cz - 0.5, cx + 0.2, y0, cz - 0.2, PALETTE.tower);
  mesh.box(cx - w / 2, y0, cz - 0.3, cx + w / 2, y0 + h, cz, PALETTE.chip);
  mesh.face(cx - w / 2 + 0.25, y0 + 0.25, cx + w / 2 - 0.25, y0 + h - 0.25, cz, PALETTE.rack);
  const base = y0 + 0.6;
  mesh.face(cx - w / 2 + 0.5, base - 0.12, cx + w / 2 - 0.5, base - 0.04, cz + 0.06, PALETTE.ink4);
  const phase = random() * 6;
  for (let x = cx - w / 2 + 0.5; x < cx + w / 2 - 0.6; x += 0.25) {
    const y = base + (h - 1.5) * (0.5 + 0.35 * Math.sin(x * 0.9 + phase) + 0.15 * Math.sin(x * 2.3 + phase * 2));
    mesh.face(x, y, x + 0.22, y + 0.22, cz + 0.06, curve, KIND.lamp, 1);
  }
}

/** A phone hanging in the air, turning slowly to show its face. */
function phone(mesh: Mesh, random: Random, cx: number, cy: number, cz: number, accent: RGB) {
  const w = 0.85;
  const h = 1.75;
  mesh.moving([cx, cy, cz], (random() > 0.5 ? 1 : -1) * (0.5 + random() * 0.4), AXIS.y, () => {
    mesh.box(cx - w, cy - h, cz - 0.15, cx + w, cy + h, cz + 0.15, PALETTE.chip);
    mesh.face(cx - w + 0.15, cy - h + 0.35, cx + w - 0.15, cy + h - 0.3, cz + 0.15, PALETTE.rack);
    mesh.face(cx - w + 0.3, cy + h - 0.85, cx + w - 0.3, cy + h - 0.5, cz + 0.21, accent, KIND.lamp, 1);
    for (let y = cy + h - 1.3; y > cy - h + 0.6; y -= 0.45) {
      mesh.face(cx - w + 0.3, y, cx - w + 0.3 + (w * 2 - 0.6) * (0.4 + random() * 0.6), y + 0.2, cz + 0.21, PALETTE.ink4);
    }
  });
}

/**
 * 02: the three directions side by side all the way to the gate — sites on
 * the left, apps on the right, 3D turning over the bus — each under its sign.
 */
function buildWorks(mesh: Mesh, random: Random) {
  const accent = PALETTE.accent;
  const tints = [accent, accent, PALETTE.ink];

  sign(mesh, "WEB", -14, -40, accent);
  for (let z = -6; z > -LENGTH + 12; z -= 12 + random() * 6) {
    browser(mesh, random, -(8 + random() * 4), z, 4.5 + random() * 2, 3.4 + random() * 1.2, pick(random, tints));
  }

  sign(mesh, "APP", 14, -46, accent);
  for (let z = -10; z > -LENGTH + 12; z -= 11 + random() * 6) {
    const x = 7.5 + random() * 4.5;
    if (random() > 0.45) monitor(mesh, random, x, z, 3.6 + random() * 1.6, pick(random, tints));
    else phone(mesh, random, x, 3.4 + random() * 2, z, pick(random, tints));
  }

  sign(mesh, "3D", 0, -54, accent, 11);
  for (let z = -16; z > -LENGTH + 18; z -= 15 + random() * 8) {
    const s = 1.3 + random() * 1.2;
    if (Math.abs(z + 54) < 3) continue;
    wireCube(mesh, (random() - 0.5) * 7, 7.4 + random() * 2, z, s, (random() > 0.5 ? 1 : -1) * (0.4 + random() * 0.5), random() > 0.35 ? PALETTE.ink : accent, accent);
  }
}

/* ---- Props: 04, Drill Monitor -------------------------------------------- */

/**
 * A well in miniature on a plinth, turning slowly: straight down, a build
 * curve, then level, as the bore the camera came down.
 */
function wellModel(mesh: Mesh, cx: number, cz: number, col: RGB) {
  mesh.box(cx - 1.6, 0, cz - 1.6, cx + 1.6, 1.2, cz + 1.6, PALETTE.chip);
  mesh.box(cx - 1.3, 1.2, cz - 1.3, cx + 1.3, 1.26, cz + 1.3, PALETTE.rack);
  mesh.moving([cx, 4, cz], 0.45, AXIS.y, () => {
    const cell = 0.24;
    const dot = (x: number, y: number) => mesh.box(cx + x - cell / 2, y - cell / 2, cz - cell / 2, cx + x + cell / 2, y + cell / 2, cz + cell / 2, col, KIND.lamp, 1);
    for (let y = 7.6; y > 4.6; y -= 0.3) dot(-1.2, y);
    for (let a = 0; a <= Math.PI / 2; a += 0.14) dot(-1.2 + 2 * (1 - Math.cos(a)), 4.6 - 2 * Math.sin(a));
    for (let x = 0.8; x < 2.6; x += 0.3) dot(x, 2.6);
    // The rig on top.
    mesh.box(cx - 1.6, 7.7, cz - 0.3, cx - 0.8, 7.8, cz + 0.3, PALETTE.ink4);
    mesh.box(cx - 1.3, 7.8, cz - 0.08, cx - 1.1, 8.8, cz + 0.08, PALETTE.ink4);
  });
}

/** The chamber at the end of the bore: a live chart, a phone, the well's path. */
function buildDrillRoom(mesh: Mesh, random: Random) {
  monitor(mesh, random, -9.5, 3, 4.8, PALETTE.accent);
  phone(mesh, random, 9, 6.4, 2.5, PALETTE.accent);
  wellModel(mesh, 9.5, 8, PALETTE.accent);
}

/* ---- Flight ------------------------------------------------------------- */

function buildFlight(seed: number, label: string, theme: TransitTheme) {
  const mesh = new Mesh();
  const random = rng(seed * 7919 + 17);
  const far = -LENGTH - 60;

  mesh.plane(-60, 30, 60, far, PALETTE.floor, KIND.floor);

  /* The bus: seven lanes down the middle, stepping sideways now and then. */
  const lanes = 7;
  for (let lane = 0; lane < lanes; lane += 1) {
    const col = theme.traces[lane % theme.traces.length];
    let x = lane - (lanes - 1) / 2;
    let z = 24;
    while (z > far + 10) {
      const run = 6 + random() * 16;
      trace(mesh, x * 0.9, z, z - run, col, lane + random());
      z -= run;
      // Jog one pitch outward and back, as a routed bus does.
      if (random() > 0.6 && Math.abs(x) < 3) {
        const next = x + (x >= 0 ? 0.5 : -0.5);
        crossTrace(mesh, x * 0.9, next * 0.9, z, col, lane);
        x = next;
      }
    }
  }

  /* Capacitors and small towers between the props. */
  for (let i = 0; i < theme.towers; i += 1) {
    const side = random() > 0.5 ? 1 : -1;
    const x = side * (5 + random() * 18);
    const z = 14 - random() * (LENGTH + 20);
    const s = 0.5 + random() * 0.5;
    const h = 0.8 + random() * 2.4;
    mesh.box(x - s, 0, z - s, x + s, h, z + s, PALETTE.tower);
    mesh.box(x - s * 0.6, h, z - s * 0.6, x + s * 0.6, h + 0.08, z + s * 0.6, PALETTE.ink4);
  }

  /* Racks on the horizon: tall dark slabs with lit slots. */
  if (theme.racks) {
    for (let z = 0; z > far + 20; z -= 9 + random() * 8) {
      for (const side of [-1, 1]) {
        if (random() < 0.3) continue;
        const x = side * (26 + random() * 14);
        const w = 3 + random() * 4;
        const h = 6 + random() * 12;
        mesh.box(x - w / 2, 0, z - 2, x + w / 2, h, z + 2, PALETTE.rack);
        const face = side > 0 ? x - w / 2 - 0.05 : x + w / 2 + 0.05;
        for (let y = 1.2; y < h - 0.8; y += 1.1) {
          if (random() < 0.45) continue;
          const lamp = random() > 0.7 ? pick(random, theme.lamps) : PALETTE.ink4;
          mesh.box(face - 0.06, y, z - 1.4, face + 0.06, y + 0.35, z - 1.4 + 0.5 + random() * 2, lamp, KIND.lamp, random());
        }
      }
    }
  }

  theme.props(mesh, random);

  gate(mesh, label, theme.accent, 0, -LENGTH);

  /* Loose data bits in the air; the shader keeps them drifting. None hang in
     the camera's last stretch, so nothing is left in front of the portal. */
  const gw = GATE.halfWidth;
  for (let i = 0; i < 70; i += 1) {
    const x = (random() - 0.5) * 34;
    const y = 0.6 + random() * 9;
    const z = 20 - random() * (LENGTH + 40);
    const s = 0.04 + random() * 0.05;
    const tone = random();
    if (Math.abs(x) < gw + 2 && z > -LENGTH - 1 && z < -LENGTH + 16) continue;
    const col = tone > 0.85 ? pick(random, theme.lamps) : tone > 0.6 ? PALETTE.ink : PALETTE.pin;
    mesh.box(x - s, y - s, z - s, x + s, y + s, z + s, col, KIND.bit, random());
  }

  return new Float32Array(mesh.data);
}

/** Where the flight's camera starts, and how close to the portal it ends. */
const START_Z = 12;
const END_GAP = 1.6;

const clamp = (t: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, t));

/**
 * The flight's camera for a progress p (0..1). It starts high and at rest,
 * looking down at the board, so the board holds still under the page while
 * it is uncovered; it then dives to the bus, flies low, swaying and banking,
 * and eases out of the sway as it climbs to the middle of the gate, ending
 * level just short of the portal, which by then fills the screen. Travel
 * eases in and out, so it sets off from rest and settles into the next
 * section.
 */
function flightCamera(p: number): Pose {
  const travel = smooth(p);
  const z = mix(START_Z, -LENGTH + END_GAP, travel);
  const dive = smooth(clamp(p / 0.5, 0, 1));
  const arrive = smooth(clamp((p - 0.62) / 0.36, 0, 1));
  const sway = Math.sin(p * Math.PI * 2) * (1 - arrive) * dive;
  const x = sway * 1.8;
  const y = mix(mix(13, 2.4, dive), GATE.height / 2, arrive);
  const yaw = -Math.cos(p * Math.PI * 2) * 0.06 * (1 - arrive) * dive;
  const roll = -sway * 0.07;
  const pitch = mix(mix(-0.95, -0.16, dive), 0, arrive);
  return { x, y, z, yaw, pitch, roll };
}

/** Robot voxel in world units on the flight: about three units tall. */
const ROBOT = 0.09;

/**
 * The mascot on the flight. It comes past the camera from behind, low on the
 * right, settles a few units ahead and leads along the bus, weaving across
 * it; halfway it turns round, flying backwards, and waves the camera on;
 * then it turns back and shoots ahead through the gate before the camera,
 * gone once it is through.
 */
function flightGuide(p: number, cam: Pose): Guide | null {
  const pass = span(p, 0.05, 0.3);
  const weave = span(p, 0.3, 0.56);
  const back = span(p, 0.56, 0.62) - span(p, 0.68, 0.74);
  const dash = span(p, 0.74, 0.9);
  const d = mix(-1, 8, pass) + dash * dash * 46;
  const sx = mix(2.4, 1.2, pass) * Math.cos(Math.PI * weave) * (1 - span(p, 0.56, 0.74));
  const sy = mix(mix(-1.8, -1, pass), -0.4, dash);
  const guide = chase(cam, d, sx, sy, Math.PI * (1 - back), true);
  if (guide.at[2] < -LENGTH - 0.5) return null;
  return {
    ...guide,
    size: ROBOT,
    fly: 1 - back * 0.7,
    wave: p > 0.6 && p < 0.7,
  };
}

const flight: Stretch = {
  build: buildFlight,
  camera: flightCamera,
  seconds: 2.2,
  guide: flightGuide,
  portal: gateOpening(0, -LENGTH),
  fog: [18, 70],
};

/* ---- Themes and stretches ----------------------------------------------- */

const quiet = () => {};

const ORANGE = {
  hot: [1, 0.66, 0.44] as RGB,
  accent: PALETTE.accent,
  deep: PALETTE.accentDeep,
  traces: [PALETTE.accentDeep],
  lamps: [PALETTE.accent, PALETTE.ink],
  pulse: false,
};

/** Keyed by the id of the section the transit leads to. */
const THEMES: Record<string, TransitTheme> = {
  works: { ...ORANGE, racks: true, towers: 6, props: buildWorks },
  "drill-monitor": { ...ORANGE, racks: false, towers: 0, props: buildDrillRoom },
  request: { ...ORANGE, racks: false, towers: 0, props: quiet },
};

/** The board on its own, for a transit to a section without a theme. */
const BOARD: TransitTheme = { ...THEMES.works, props: quiet };

export const transitTheme = (to: string) => THEMES[to] ?? BOARD;

/**
 * Each stretch moves the camera its own way, so no two transits feel alike:
 * a flight along the board into the portfolio, a bore down through it into
 * Drill Monitor, a rise over the whole board and a dive into the last chip
 * before the request.
 */
const STRETCHES: Record<string, Stretch> = {
  works: flight,
  "drill-monitor": drill,
  request: overview,
};

export const transitStretch = (to: string) => STRETCHES[to] ?? flight;

/** A full-screen quad in clip space for the sky, drawn behind the board. */
export function buildSky() {
  const data: number[] = [];
  const z = 0.999;
  const col = PALETTE.bg;
  const quad = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (const [x, y] of quad) data.push(x, y, z, 0, 0, 1, col[0], col[1], col[2], KIND.sky, 0, 0, 0, 0, 0, AXIS.none);
  return new Float32Array(data);
}

export { FLOATS_PER_VERTEX, PALETTE };
