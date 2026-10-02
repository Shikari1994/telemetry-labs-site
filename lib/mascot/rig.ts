import {
  ANTENNA_TIP,
  ELBOW,
  FACE_CENTER_Y,
  FINGER_X,
  HEAD_CENTER_Y,
  KNUCKLE_Y,
  NECK_LENGTH,
  PHALANX,
  PIVOTS,
  THUMB_ROOT,
  WRIST,
  type Eyes,
  type Mouth,
  type PartId,
} from "@/lib/mascot/model";
import {
  chain,
  clamp,
  identity,
  mix,
  rotateX,
  rotateY,
  rotateZ,
  scale,
  translate,
  viewportOrtho,
  type M4,
} from "@/lib/mascot/math";
import { GLYPH_COL, GREETING_LENGTH } from "@/lib/mascot/hd";
import type { DrawState, PartDraw } from "@/lib/mascot/renderer";
import type { Pose } from "@/lib/mascot/route";

/**
 * Turns "where the mascot is and what it is doing" into per-part matrices.
 *
 * All secondary motion is springs integrated per frame, so the character
 * settles naturally whatever the scroll does: the head snaps toward the gaze
 * target first and the body turns after it, the antenna lags and wobbles,
 * the thruster ring spins faster in flight, a landing dips and rebounds.
 *
 * The face on the screen is picked from a small set of moods, from the most
 * pressing down: dizzy after a boop, beaming while it waves, startled when
 * woken, "whee" in flight, dozing when nobody has done anything for a while,
 * smitten while the cursor rests on its head, glad while it is near. A
 * scripted beat can hold a face instead (or write "HI" across the screen).
 * Every change of face plays a quick CRT squash; the face glances across the
 * screen toward whatever the head is turned to.
 *
 * Up close (the page's opening shot) it is drawn from the close-up model
 * (hd.ts) under a soft perspective: the same rig and joints, the parts
 * swapped for finer ones, and the greeting typed out on the screen.
 *
 * Locked (the 06 stack, where its screen shows the board), it faces the
 * camera square on, holds still and folds its antenna back, so the glass
 * stays where the page laid the board out and nothing rises into the text
 * above; a knock on its temple is the one beat it plays there, and with
 * `hole` the face is not drawn and the glass is cut out.
 *
 * The hands follow the same moods: loosely curled at rest, fists in flight,
 * limp while it dozes, spread wide after a boop, open and wiggling in a
 * wave. Given a target it points at it with the nearer arm, finger out.
 * A hand given the parcel (lib/mascot/parcel.ts) holds it out front, palm
 * up and fingers closed round it, whatever the rest of the body is doing;
 * each frame reports where both grips are so the parcel can sit in one or
 * be thrown between them.
 */

/** The nearest equivalent of `angle` to `near`, so a spring never takes the long way round. */
const unwrap = (angle: number, near: number) => angle + Math.round((near - angle) / (Math.PI * 2)) * Math.PI * 2;

/** Power-on state: 0 off … 1 on. */
export type Power = {
  /** Screen glass; the face shows from half power. */
  screen: number;
  /** Charge cells on the chest, filled in four steps. */
  charge: number;
};

export function poweredOff(): Power {
  return { screen: 0, charge: 0 };
}

export type RigInput = {
  /** Ground point under the body, viewport CSS px. */
  x: number;
  y: number;
  /** CSS px per voxel. */
  scale: number;
  pose: Pose;
  /** 0 resting, 1 in full flight. */
  fly: number;
  /** Camera pitch in radians; omitted = the default slight top-down view. */
  tilt?: number;
  /** Gaze target in viewport px, or null for idle glancing. */
  look: { x: number; y: number } | null;
  /** Last known mouse position in viewport px, or null. */
  pointer: { x: number; y: number } | null;
  /** Seconds since the pointer last moved. */
  still: number;
  /** Seconds since the visitor last did anything (pointer or scroll). */
  idle: number;
  width: number;
  height: number;
  /** Render pixel size in CSS px; the ground point snaps to this grid. */
  pixel: number;
  /** Omitted = fully on. */
  power?: Readonly<Power>;
  /** A face held by a scripted beat instead of the mood it would pick. */
  face?: FaceCue | null;
  /** Something to point at, viewport px. */
  point?: { x: number; y: number } | null;
  /** The hand holding the parcel, 0 for none. */
  carry?: Side | 0;
  /** Told to sleep (the page powering off), whoever is around. */
  doze?: boolean;
  /** Draw the close-up model (hd.ts) instead of the voxel robot. */
  hd?: boolean;
  /** Perspective strength, 0 flat (the page's usual view) … 1 the close-up's. */
  perspective?: number;
  /** Glyphs of the greeting typed so far, while the close-up says hi. */
  typed?: number;
  /** The body's turn as a 3D scene sees it (the transits, lib/transit/guide),
      composed as rotateZ(roll) · rotateX(tilt) · rotateY(yaw); the rig's own
      sway and glances ride on top. Omitted = the page's usual view. */
  frame?: { yaw: number; tilt: number; roll: number } | null;
  /** 0 free … 1 square on to the camera, no bob, no glances: the glass held
      over the element its screen shows (route `screen`). */
  lock?: number;
  /** The glass is a window onto the page: no face, the glass cut out. */
  hole?: boolean;
};

export type Point3 = { x: number; y: number; z: number };

/** What the parcel needs from a frame, in viewport px (z toward the viewer). */
export type Hold = {
  /** Character space to viewport px, before the projection. */
  screen: M4;
  grips: Record<Side, Point3>;
  yaw: number;
  tilt: number;
  scale: number;
  /** Projection depth used for the frame. */
  depth: number;
  /** The hand it wants free: pointing, or the right one while it waves or knocks. */
  reach: Side | 0;
};

export const MOODS = {
  neutral: { eyes: "open", mouth: "soft" },
  glad: { eyes: "open", mouth: "smile" },
  happy: { eyes: "happy", mouth: "grin" },
  love: { eyes: "heart", mouth: "smile" },
  surprised: { eyes: "wide", mouth: "o" },
  dizzy: { eyes: "dizzy", mouth: "wobble" },
  whee: { eyes: "squeeze", mouth: "grin" },
  sleepy: { eyes: "sleepy", mouth: "dot" },
  bonk: { eyes: "squeeze", mouth: "wobble" },
} satisfies Record<string, { eyes: Eyes; mouth: Mouth }>;

export type Mood = keyof typeof MOODS;
/** A mood, or a greeting written across the whole screen. */
export type FaceCue = Mood | "hi";
/** Eyes that close for a blink; the rest are already a shape of their own. */
const BLINKS: ReadonlySet<Eyes> = new Set<Eyes>(["open", "wide"]);

type Spring = { x: number; v: number };
const spring = (x = 0): Spring => ({ x, v: 0 });
function step(s: Spring, target: number, k: number, c: number, dt: number) {
  s.v += (target - s.x) * k * dt;
  s.v *= Math.exp(-c * dt);
  s.x += s.v * dt;
}

/* Camera looks slightly down on the character so the top reads as 3D. */
const TILT = 0.22;
const WAVE_SECONDS = 1.6;
/** The arm it waves with: its own right, on the viewer's left. */
const WAVE_SIDE: Side = -1;
const SPIN_SECONDS = 0.8;
/** Cheerful after a boop, startled after waking. */
const CHEER_SECONDS = 1.1;
const STARTLE_SECONDS = 0.7;
/** Dozes off after this long with nothing happening. */
const SLEEP_AFTER = 14;
/** How far back (radians) the antenna folds while locked. */
const ANTENNA_FOLD = 1.45;
/** The knock on its temple: how long, when the knuckles land, and the arm
    it knocks with (the waving one, on the viewer's left). */
const KNOCK_SECONDS = 1.35;
export const KNOCK_HITS = [0.44, 0.66] as const;
const KNOCK_SIDE: Side = WAVE_SIDE;
/** CRT squash when the face changes. */
const SWAP_SECONDS = 0.09;
/** Pointer distances from the head centre, in voxels. */
const NEAR_HEAD = 8;
const NEARBY = 45;

/* Close-up parts in the voxel robot's part spaces: the forearm is modelled
   upward and twice as long in hand units, the hand and fingers upward; the
   right hand has its thumb on +x, as the voxel one does. */
const FORE_FIT = scale(0.92, -0.5, 0.92);
const DIGIT_FIT = scale(1, -1, 1);
const HAND_FIT: Record<-1 | 1, M4> = { [-1]: scale(-1, -1, 1), [1]: scale(1, -1, 1) };
/** Close-up shading: the light falls off down each part over its height. */
const SHADE = {
  head: { y: 5, span: 5 },
  neck: { y: -0.5, span: 2 },
  antenna: { y: 2, span: 2 },
  body: { y: 7.5, span: 3.5 },
  ring: { y: 1, span: 1 },
  arm: { y: -1, span: 2 },
  fore: { y: 4.5, span: 3.5 },
  palm: { y: 1.4, span: 1.2 },
  digit: { y: 0.8, span: 0.8 },
} satisfies Record<string, NonNullable<PartDraw["shade"]>>;
/** One close-up face pixel, in voxels. */
const HD_PIXEL = 0.25;

/** Hands are drawn larger than the arm that carries them, so grips read. */
const HAND_SCALE = 1.3;
/** A hand runs its fingers through once, one after another. */
const FLEX_SECONDS = 0.9;

export type Side = -1 | 1;

/** Where a held parcel sits in hand space: on the palm, which faces +z. */
const GRIP: [number, number, number] = [0, -1.3, 1.62];

/** One arm's joint angles for a frame (radians). */
type ArmPose = {
  /** Shoulder swing out from the body, in the arm's own sense. */
  shoulder: number;
  /** Elbow bend, forearm forward. */
  elbow: number;
  /** Forearm sway about the elbow, for waving. */
  sway: number;
  /** Hand turned in toward the body; 0 shows the palm to the viewer. */
  twist: number;
  wrist: number;
  /** Per joint, the two fingers then the thumb. */
  curl: [number, number, number];
  spread: number;
};

/** Matrices for one arm, in body space, outermost first. */
function armChain(side: Side, pose: ArmPose): { id: PartId; m: M4 }[] {
  const s = side;
  const tag = s < 0 ? "L" : "R";
  const upper = chain(translate(...PIVOTS[s < 0 ? "armL" : "armR"]), rotateZ(s * pose.shoulder));
  const fore = chain(upper, translate(0, ELBOW, 0), rotateX(-pose.elbow), rotateZ(s * pose.sway));
  const palm = chain(
    fore,
    translate(0, WRIST, 0),
    rotateY(-s * pose.twist),
    rotateX(-pose.wrist),
    scale(HAND_SCALE, HAND_SCALE, HAND_SCALE),
  );
  const out: { id: PartId; m: M4 }[] = [
    { id: `arm${tag}`, m: upper },
    { id: `fore${tag}`, m: fore },
    { id: `hand${tag}`, m: palm },
  ];
  const digit = (root: M4, curl: number, length: number) => {
    const first = chain(root, rotateX(-curl));
    const second = chain(first, translate(0, PHALANX * length, 0), rotateX(-curl * 1.15));
    out.push(
      { id: "finger", m: chain(first, scale(1, length, 1)) },
      { id: "fingertip", m: chain(second, scale(1, length, 1)) },
    );
  };
  FINGER_X.forEach((x, i) => {
    digit(chain(palm, translate(x, KNUCKLE_Y, 0), rotateZ((i - 0.5) * 2 * pose.spread)), pose.curl[i], 1);
  });
  const thumb = chain(
    palm,
    translate(s * THUMB_ROOT[0], THUMB_ROOT[1], THUMB_ROOT[2]),
    rotateZ(s * (0.75 + pose.spread * 1.4)),
    rotateY(-s * 0.5),
  );
  digit(thumb, pose.curl[2], 0.85);
  return out;
}

type Spark = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number };
type Zee = { t: number };

export type Rig = ReturnType<typeof createRig>;

export function createRig() {
  let time = 0;
  const bodyYaw = spring();
  const headYaw = spring(); // absolute, body yaw included
  const headPitch = spring();
  const bodyPitch = spring();
  const tilt = spring(TILT);
  const roll = spring();
  const squash = spring();
  const hop = spring();
  const flyAmt = spring();
  const hoverAmt = spring();
  const swing = spring(); // antenna
  const spreadAmt = spring(); // hands thrown open
  const pointAmt: Record<Side, Spring> = { [-1]: spring(), [1]: spring() };
  const carryAmt: Record<Side, Spring> = { [-1]: spring(), [1]: spring() };
  const pointAim: Record<Side, number> = { [-1]: 1, [1]: 1 };
  /* A scene's turn, eased so a change of heading is a turn, not a cut. */
  const frameYaw = spring();
  const frameRoll = spring();
  let snapFrame = true;

  let velX = 0;
  let velY = 0;
  let lastX: number | null = null;
  let lastY = 0;
  let ring = 0;
  let nextBlink = 1.5;
  let blinkLeft = 0;
  let waveLeft = 0;
  let waveFor = WAVE_SECONDS;
  let spinLeft = 0;
  let cheerLeft = 0;
  let startleLeft = 0;
  /** Seconds into the knock; past KNOCK_SECONDS = none. */
  let knockT = KNOCK_SECONDS;
  let glowBoost = 0;
  let headX = 0;
  let headY = 0;
  let asleep = false;
  let face = "";
  let wasHd = false;
  let wasHole = false;
  let swapT = SWAP_SECONDS;
  let nextZee = 0;
  /** Seconds into each hand's finger run-through; past FLEX_SECONDS = idle. */
  const flexT: Record<Side, number> = { [-1]: FLEX_SECONDS, [1]: FLEX_SECONDS };
  const sparks: Spark[] = [];
  const zees: Zee[] = [];

  return {
    /** Forget the previous position so a reappearance does not read as a dash. */
    teleport() {
      lastX = null;
      snapFrame = true;
      velX = 0;
      velY = 0;
    },
    land() {
      squash.v -= 3.2;
      swing.v += 5;
    },
    wave(seconds = WAVE_SECONDS) {
      waveLeft = seconds;
      waveFor = seconds;
      swing.v += 6;
    },
    /** Raises a fist beside its head and knocks on its temple twice. */
    knock() {
      knockT = 0;
      blinkLeft = 0;
    },
    /** Runs one hand's fingers through. */
    flex(side: Side) {
      flexT[side] = 0;
    },
    boop() {
      hop.v -= 520;
      spinLeft = SPIN_SECONDS;
      cheerLeft = SPIN_SECONDS + CHEER_SECONDS;
      glowBoost = 1;
      blinkLeft = 0;
      swing.v += 14;
    },
    /** Jolts awake: a hop scaled to the current size and a whipping antenna. */
    startle(size: number) {
      hop.v -= 12 * size;
      swing.v += 10;
      blinkLeft = 0;
    },
    /** A ring of dust kicked off the floor by the thruster on touchdown. */
    puff(count = 18) {
      for (let i = 0; i < count; i += 1) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
        const speed = 9 + Math.random() * 7;
        const max = 0.35 + Math.random() * 0.3;
        sparks.push({
          x: 0,
          y: 0.6,
          z: 0,
          vx: Math.cos(a) * speed,
          vy: 3 + Math.random() * 5,
          vz: Math.sin(a) * speed,
          life: max,
          max,
        });
      }
    },
    /** Sparks thrown off a point (character space). */
    burst(at: readonly [number, number, number], count = 10) {
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const speed = 6 + Math.random() * 10;
        const max = 0.3 + Math.random() * 0.35;
        sparks.push({
          x: at[0],
          y: at[1],
          z: at[2],
          vx: Math.cos(a) * speed,
          vy: 5 + Math.random() * 12,
          vz: Math.sin(a) * speed * 0.6,
          life: max,
          max,
        });
      }
    },
    get busy() {
      return spinLeft > 0 || hop.x < -2;
    },
    /** Head centre in viewport px, for proximity checks. */
    get head() {
      return { x: headX, y: headY };
    },

    update(dt: number, input: RigInput): { parts: PartDraw[]; state: DrawState; hold: Hold } {
      time += dt;
      const k = input.scale;
      const power = input.power ?? { screen: 1, charge: 1 };
      const booting = power.screen < 1;

      /* Velocity, smoothed, drives banking and facing while flying. */
      if (lastX === null) {
        lastX = input.x;
        lastY = input.y;
      }
      const ivx = (input.x - lastX) / Math.max(dt, 1e-3);
      const ivy = (input.y - lastY) / Math.max(dt, 1e-3);
      const blend = 1 - Math.exp(-dt * 8);
      velX += (clamp(ivx, -3000, 3000) - velX) * blend;
      velY += (clamp(ivy, -3000, 3000) - velY) * blend;
      lastX = input.x;
      lastY = input.y;

      step(flyAmt, input.fly, 60, 14, dt);
      step(hoverAmt, input.pose === "hover" ? 1 : 0, 60, 14, dt);
      // A scene's camera sets its tilt; it eases into it and back out.
      const frame = input.frame ?? null;
      if (frame) step(tilt, frame.tilt, 90, 16, dt);
      else step(tilt, input.tilt ?? TILT, 40, 12, dt);
      const fly = clamp(flyAmt.x, 0, 1);
      const hover = clamp(hoverAmt.x, 0, 1) * (1 - fly);

      /* Sleep: nods off at a resting spot, wakes with a start. Told to doze,
         it sleeps on through its own power going off. */
      const lock = clamp(input.lock ?? 0, 0, 1);
      const dozing = Boolean(input.doze) && fly < 0.1;
      const canSleep = dozing || (!booting && !input.face && fly < 0.1 && input.pose !== "peek" && lock < 0.5);
      const wantsSleep = dozing || input.idle >= SLEEP_AFTER;
      if (asleep && (!wantsSleep || !canSleep)) {
        asleep = false;
        startleLeft = STARTLE_SECONDS;
        swing.v += 8;
      } else if (!asleep && canSleep && wantsSleep) {
        asleep = true;
        nextZee = time + 0.4;
      }

      /* Gaze: yaw/pitch from the head toward the target. Angles are taken
         against a distance that grows with size, so a close-up only glances. */
      headX = input.x;
      headY = input.y - HEAD_CENTER_Y * k;
      const reach = Math.max(1, k / 12);
      let lookYaw: number;
      let lookPitch: number;
      if (booting && !asleep) {
        // Faces the visitor squarely while it powers on.
        lookYaw = 0;
        lookPitch = 0.05;
      } else if (asleep) {
        // Head droops and sways a little.
        lookYaw = Math.sin(time * 0.5) * 0.12;
        lookPitch = 0.3;
      } else if (input.look) {
        lookYaw = clamp(Math.atan2(input.look.x - headX, 240 * reach), -1.15, 1.15);
        lookPitch = clamp(Math.atan2(input.look.y - headY, 300 * reach), -0.45, 0.55);
      } else {
        // Idle glances shrink up close, so the face stays on camera.
        const calm = 1 / Math.max(1, reach * 0.5);
        lookYaw = (Math.sin(time * 0.45) * 0.55 + Math.sin(time * 1.7) * 0.08) * calm;
        lookPitch = (Math.sin(time * 0.6) * 0.1 + 0.08) * calm;
      }
      lookYaw = mix(lookYaw, 0, lock);
      lookPitch = mix(lookPitch, 0, lock);
      // In a scene the body already faces its way; screen travel only banks it.
      // It turns into the scene's heading and back out of it on the page.
      const flyYaw = frame ? 0 : clamp(velX / 450, -1, 1) * 1.1;
      const yawTo = unwrap(frame?.yaw ?? 0, frameYaw.x);
      const rollTo = unwrap(frame?.roll ?? 0, frameRoll.x);
      if (snapFrame) {
        frameYaw.x = yawTo;
        frameRoll.x = rollTo;
        frameYaw.v = frameRoll.v = 0;
        snapFrame = false;
      } else {
        step(frameYaw, yawTo, 60, 13, dt);
        step(frameRoll, rollTo, 90, 16, dt);
      }

      step(headYaw, mix(lookYaw, flyYaw, fly * 0.85), 170, 18, dt);
      step(bodyYaw, mix(lookYaw * 0.5, flyYaw, fly), 26, 8.5, dt);
      step(headPitch, lookPitch * (1 - fly * 0.7), 140, 17, dt);
      step(bodyPitch, clamp(velY / 1400, -1, 1) * 0.25 * fly, 50, 10, dt);
      step(roll, -clamp(velX / 900, -1, 1) * 0.42 * fly, 50, 10, dt);
      // The antenna trails travel and whips when the head snaps round.
      step(swing, clamp(-velX / 1600, -0.6, 0.6) - clamp(headYaw.v * 0.04, -0.4, 0.4), 90, 5, dt);

      step(squash, 0, 230, 11, dt);
      step(hop, 0, 150, 9, dt);

      if (blinkLeft > 0) blinkLeft -= dt;
      else if (time > nextBlink) {
        blinkLeft = 0.13;
        nextBlink = time + 2 + Math.random() * 3.5;
      }
      waveLeft = Math.max(0, waveLeft - dt);
      spinLeft = Math.max(0, spinLeft - dt);
      cheerLeft = Math.max(0, cheerLeft - dt);
      startleLeft = Math.max(0, startleLeft - dt);
      glowBoost = Math.max(0, glowBoost - dt * 1.4);

      /* The knock: each landing jolts the head and whips the antenna; the
         second throws sparks off the temple. */
      const knockWas = knockT;
      knockT = Math.min(KNOCK_SECONDS, knockT + dt);
      KNOCK_HITS.forEach((hit, i) => {
        if (knockWas >= hit || knockT < hit) return;
        headYaw.v += 1.2;
        swing.v += 7;
        if (i === KNOCK_HITS.length - 1) {
          const temple = [KNOCK_SIDE * 6.6, HEAD_CENTER_Y, 2.8] as const;
          for (let n = 0; n < 9; n += 1) {
            const a = Math.random() * Math.PI * 2;
            const max = 0.25 + Math.random() * 0.25;
            sparks.push({
              x: temple[0],
              y: temple[1],
              z: temple[2],
              vx: KNOCK_SIDE * (4 + Math.random() * 8),
              vy: Math.sin(a) * 9 + 4,
              vz: Math.cos(a) * 5,
              life: max,
              max,
            });
          }
        }
      });
      const knocking = knockT < KNOCK_SECONDS;
      // Up in 0.3 s, held through both knocks, down over the rest.
      const knockEnv = knocking ? clamp(Math.min(knockT / 0.3, (KNOCK_SECONDS - knockT) / 0.4), 0, 1) : 0;
      const knockPulse = Math.max(0, ...KNOCK_HITS.map((hit) => 1 - Math.abs(knockT - hit) / 0.08));

      const spinP = spinLeft > 0 ? 1 - spinLeft / SPIN_SECONDS : 0;
      const spin = spinP > 0 ? (spinP < 0.5 ? 4 * spinP ** 3 : 1 - (-2 * spinP + 2) ** 3 / 2) * Math.PI * 2 : 0;

      /* Placement: it always floats, bobbing more in open air; the ground
         point snaps to the render grid. */
      const bob = Math.sin(time * 2.3) * k * (0.35 + hover * 0.35 + fly * 0.3) * (asleep ? 0.5 : 1) * (1 - lock);
      const px = input.pixel;
      const sx = Math.round(input.x / px) * px;
      const sy = Math.round((input.y + bob + hop.x) / px) * px;
      const sq = clamp(squash.x, -0.25, 0.25);

      const baseYaw = frameYaw.x;
      const charRot = chain(rotateZ(frameRoll.x + roll.x), rotateX(tilt.x + bodyPitch.x), rotateY(baseYaw + bodyYaw.x + spin));
      // Depth grows with size so a close-up is never clipped front or back.
      const depth = Math.max(800, k * 40);
      const toScreen = chain(translate(sx, sy, 0), scale(k * (1 - sq * 0.6), -k * (1 + sq), k), charRot);
      const projection = viewportOrtho(input.width, input.height, depth);
      // A soft perspective about the screen centre: w = 1 - z / focal.
      projection[11] = -(input.perspective ?? 0) / (Math.max(input.width, input.height) * 1.7);
      const world = chain(projection, toScreen);

      const headLocalYaw = clamp(headYaw.x - bodyYaw.x, -1.05, 1.05);
      const headRot = chain(rotateY(headLocalYaw), rotateX(headPitch.x));
      const headAt = translate(PIVOTS.head[0], PIVOTS.neck[1] + NECK_LENGTH, PIVOTS.head[2]);
      const onHead = chain(headAt, headRot);
      const at = (id: keyof typeof PIVOTS) => translate(...PIVOTS[id]);

      /* The ring keeps turning, faster in flight. */
      ring += dt * (1.4 + fly * 7 + hover * 1.5);

      // Locked, it folds the antenna back onto its roof, clear of the page above.
      const fold = rotateX(-lock * ANTENNA_FOLD);
      const antennaM = chain(at("antenna"), fold, rotateZ(clamp(swing.x, -0.9, 0.9)));

      const armBase = 0.24 + fly * 0.55 + hover * 0.12 + Math.sin(time * 2.1) * 0.05 - (asleep ? 0.1 : 0);
      const waveEnv = waveLeft > 0 ? Math.min(1, waveLeft * 4, (waveFor - waveLeft) * 5) : 0;

      /* Hands: a pose per mood, blended by the same envelopes as the rest. */
      step(spreadAmt, spinLeft > 0 || cheerLeft > 0 ? 1 : 0, 120, 14, dt);
      const spread = clamp(spreadAmt.x, 0, 1.2);
      const sleepy = asleep ? 1 : 0;

      /* Pointing: the arm on the target's side swings out along the line from
         its shoulder to the target (0 hangs down, pi/2 level, more is up). */
      const target = input.point;
      const pointSide: Side | 0 = target ? (target.x < input.x ? -1 : 1) : 0;
      for (const side of [-1, 1] as const) {
        // The hand with the parcel waits for it to be thrown across.
        step(pointAmt[side], pointSide === side && input.carry !== side ? 1 : 0, 110, 13, dt);
        step(carryAmt[side], input.carry === side ? 1 : 0, 130, 15, dt);
        if (target && pointSide === side) {
          const dx = Math.abs(target.x - (input.x + side * PIVOTS.armR[0] * k));
          const dy = target.y - (input.y - PIVOTS.armR[1] * k);
          pointAim[side] = clamp(Math.atan2(dx, dy), 0.5, 2.5);
        }
      }

      const armPose = (side: Side): ArmPose => {
        const hold = clamp(carryAmt[side].x, 0, 1);
        const wave = side === WAVE_SIDE ? waveEnv * (1 - hold) : 0;
        const aim = clamp(pointAmt[side].x, 0, 1) * (1 - wave);
        flexT[side] = Math.min(FLEX_SECONDS, flexT[side] + dt);
        const curl = [0, 1, 2].map((i) => {
          let c = 0.3 + Math.sin(time * 1.3 + i * 0.7 + side) * 0.06;
          c = mix(c, 1.15, fly);
          c = mix(c, 0.7, sleepy);
          c = mix(c, 0.02, spread);
          c = mix(c, 0.06 + Math.max(0, Math.sin(time * 15 - i * 0.9)) * 0.45, wave);
          // The run-through: each finger closes and opens in turn.
          const f = (flexT[side] - i * 0.12) / 0.4;
          c += f > 0 && f < 1 ? Math.sin(Math.PI * f) * 1.25 : 0;
          // Pointing: the first finger straight, the rest folded in.
          c = mix(c, i === 0 ? 0.02 : 1.2, aim);
          // Holding: fingers and thumb closed up round the parcel.
          return mix(c, 0.95, hold);
        }) as ArmPose["curl"];
        // Holding: forearm out front and the palm turned up (elbow and wrist
        // add up to a right angle), close in to the body.
        const pose: ArmPose = {
          shoulder: mix(mix(mix(armBase, 2.6, wave), pointAim[side], aim), 0.16 + Math.sin(time * 2.1) * 0.03, hold),
          elbow: mix(mix(mix(mix(mix(0.85, 0.3, fly), 0.45, sleepy), 0.3, wave), 0.08, aim), 1.3, hold),
          sway: Math.sin(time * 15) * 0.45 * wave,
          twist: mix(mix(mix(mix(0.55, 0.4, fly), 0, Math.max(wave, spread * 0.8)), 0.15, aim), 0, hold),
          wrist: mix(mix(mix(mix(0.15, 0.4, sleepy), -0.1, wave), 0, aim), Math.PI / 2 - 1.3, hold),
          curl,
          spread: mix(mix(mix(0.08, 0.3, Math.max(spread, wave)), 0.04, aim), 0.02, hold),
        };
        if (side !== KNOCK_SIDE || knockEnv <= 0) return pose;
        // Knocking: the arm up beside the head, a fist at the front edge of
        // the bezel by the temple, the forearm swinging in onto it at each
        // knock.
        const e = knockEnv * knockEnv * (3 - 2 * knockEnv);
        return {
          shoulder: mix(pose.shoulder, 2.975, e),
          elbow: mix(pose.elbow, 0.55, e),
          sway: mix(pose.sway, mix(-0.32, 0, knockPulse), e),
          twist: mix(pose.twist, 0.3, e),
          wrist: mix(pose.wrist, -0.2, e),
          curl: pose.curl.map((c) => mix(c, 1.2, e)) as ArmPose["curl"],
          spread: mix(pose.spread, 0.02, e),
        };
      };

      const jetSize = clamp(0.4 + fly * 0.6 + hover * 0.2, 0, 1) * (0.8 + Math.sin(time * 38) * 0.2);

      /* Every draw for the frame. */
      type Draw = { id: PartId; m: M4; r: M4; shade?: PartDraw["shade"] };
      const unit = identity();
      const hd = Boolean(input.hd);
      const ringM = chain(at("base"), rotateY(ring));
      const antennaR = chain(headRot, fold, rotateZ(swing.x));
      const draws: Draw[] = hd
        ? [
            { id: "hd-ring", m: ringM, r: rotateY(ring), shade: SHADE.ring },
            { id: "hd-body", m: unit, r: unit, shade: SHADE.body },
            { id: "hd-neck", m: onHead, r: headRot, shade: SHADE.neck },
            { id: "hd-head", m: onHead, r: headRot, shade: SHADE.head },
            { id: "hd-antenna", m: chain(onHead, antennaM), r: antennaR, shade: SHADE.antenna },
          ]
        : [
            { id: "base", m: ringM, r: rotateY(ring) },
            { id: "body", m: unit, r: unit },
            { id: "neck", m: at("neck"), r: unit },
            { id: "head", m: onHead, r: headRot },
            { id: "antenna", m: chain(onHead, antennaM), r: antennaR },
          ];
      /* The close-up's finer arm parts, fitted to the voxel arm's joints. */
      const fitArm = (side: Side, id: PartId, m: M4): Draw => {
        if (id === "foreL" || id === "foreR") {
          const fitted = chain(m, FORE_FIT);
          return { id: "hd-fore", m: fitted, r: fitted, shade: SHADE.fore };
        }
        if (id === "handL" || id === "handR") {
          const fitted = chain(m, HAND_FIT[side]);
          return { id: "hd-palm", m: fitted, r: fitted, shade: SHADE.palm };
        }
        if (id === "finger" || id === "fingertip") {
          const fitted = chain(m, DIGIT_FIT);
          return { id: id === "finger" ? "hd-finger" : "hd-tip", m: fitted, r: fitted, shade: SHADE.digit };
        }
        return { id, m, r: m, shade: SHADE.arm };
      };
      const grips = {} as Record<Side, Point3>;
      for (const side of [-1, 1] as const) {
        const arm = armChain(side, armPose(side));
        for (const { id, m } of arm) draws.push(hd ? fitArm(side, id, m) : { id, m, r: m });
        // The hand is the third link of the chain.
        const grip = chain(toScreen, arm[2].m, translate(...GRIP));
        grips[side] = { x: grip[12], y: grip[13], z: grip[14] };
      }
      if (jetSize > 0.02) draws.push({ id: "jet", m: chain(at("jet"), scale(jetSize, jetSize, jetSize)), r: unit });

      /* Face: pick the mood, squash the screen on a change, glance, blink. */
      const pointer = input.pointer;
      const near = pointer ? Math.hypot(pointer.x - headX, pointer.y - headY) / k : Infinity;
      let mood: Mood;
      if (input.face && input.face !== "hi") mood = input.face;
      else if (booting && !asleep) mood = "surprised";
      else if (knocking && knockT >= KNOCK_HITS[0]) mood = "bonk";
      else if (spinLeft > 0) mood = "dizzy";
      else if (cheerLeft > 0 || waveLeft > 0) mood = "happy";
      else if (startleLeft > 0) mood = "surprised";
      else if (fly > 0.45) mood = "whee";
      else if (asleep) mood = "sleepy";
      else if (near < NEAR_HEAD && input.still > 0.4) mood = "love";
      else if (near < NEARBY) mood = "glad";
      else mood = "neutral";

      const shown = input.face === "hi" ? "hi" : mood;
      // The screen also squashes as the close-up model hands over to the voxel
      // one, and as the face comes back on glass that was a window.
      const hole = Boolean(input.hole);
      if (shown !== face || hd !== wasHd || hole !== wasHole) {
        face = shown;
        wasHd = hd;
        wasHole = hole;
        swapT = 0;
      }
      swapT += dt;
      const crt = clamp(swapT / SWAP_SECONDS, 0, 1);

      const screen = clamp(power.screen, 0, 1);
      if (screen > 0.5 && !hole) {
        const still = mood === "sleepy" || mood === "dizzy" || shown === "hi";
        // A glance moves the face a voxel pixel, or two close-up ones.
        const pixelSize = hd ? HD_PIXEL : 1;
        const gx = still ? 0 : Math.round(clamp(headLocalYaw / 0.55, -1, 1) * (hd ? 2 : 1)) * pixelSize;
        const gy = still ? 0 : -Math.round(clamp(headPitch.x / 0.28, -1, 1)) * pixelSize;
        const screenM = chain(
          onHead,
          translate(gx, gy + FACE_CENTER_Y, 0),
          scale(1, 0.12 + 0.88 * crt, 1),
          translate(0, -FACE_CENTER_Y, 0),
        );
        const face = (id: PartId, m = screenM) => draws.push({ id, m, r: headRot, shade: SHADE.head });
        if (hd && shown === "hi") {
          // The greeting typed out, a block cursor blinking after it.
          const typed = clamp(Math.floor(input.typed ?? GREETING_LENGTH), 0, GREETING_LENGTH);
          for (let i = 0; i < typed; i += 1) face(`hd-glyph-${i}`);
          const col = typed < GREETING_LENGTH ? GLYPH_COL[typed] : GLYPH_COL[GREETING_LENGTH - 1] + 2;
          if (time % 0.6 < 0.36) face("hd-cursor", chain(screenM, translate(col * HD_PIXEL, 0, 0)));
        } else if (hd) {
          const eyes: Eyes = blinkLeft > 0 && BLINKS.has(MOODS[mood].eyes) ? "blink" : MOODS[mood].eyes;
          face(`hd-eyes-${eyes}`);
          face(`hd-mouth-${MOODS[mood].mouth}`);
        } else if (shown === "hi") {
          draws.push({ id: "face-hi", m: screenM, r: headRot });
        } else {
          const { mouth } = MOODS[mood];
          const eyes: Eyes = blinkLeft > 0 && BLINKS.has(MOODS[mood].eyes) ? "blink" : MOODS[mood].eyes;
          draws.push({ id: `eyes-${eyes}`, m: screenM, r: headRot }, { id: `mouth-${mouth}`, m: screenM, r: headRot });
        }
      }

      const parts: PartDraw[] = draws.map(({ id, m, r, shade }) => ({ id, mvp: chain(world, m), rot: chain(charRot, r), shade }));

      /* Sparks: short ballistic embers, shrinking as they cool. */
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.vy -= 48 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;
        const size = 0.55 * (s.life / s.max);
        parts.push({ id: "spark", mvp: chain(world, translate(s.x, s.y, s.z), scale(size, size, size)), rot: charRot });
      }

      /* Zs: while it dozes, one drifts up off the antenna now and then,
         swelling and fading, always facing the viewer. */
      if (asleep && time > nextZee) {
        zees.push({ t: 0 });
        nextZee = time + 1.3;
      }
      const tip = chain(onHead, translate(...ANTENNA_TIP));
      const unturn = rotateY(-(baseYaw + bodyYaw.x + spin + headLocalYaw));
      for (let i = zees.length - 1; i >= 0; i -= 1) {
        const z = zees[i];
        z.t += dt / 2;
        if (z.t >= 1) {
          zees.splice(i, 1);
          continue;
        }
        const size = Math.sin(Math.PI * z.t) * 0.55;
        parts.push({
          id: "zee",
          mvp: chain(world, tip, translate(z.t * 3, z.t * 6, 0), unturn, scale(size, size, size)),
          rot: translate(0, 0, 0),
        });
      }

      const pulse = 0.5 + 0.5 * Math.sin(time * 3.4);
      // Emitters dim with the charge, so a powered-off robot is dark all over.
      const glow = clamp(0.35 + pulse * 0.5 + glowBoost * (0.5 + 0.5 * Math.sin(time * 40)), 0, 1) * (0.25 + 0.75 * clamp(power.charge, 0, 1));
      const charge = clamp(power.charge, 0, 1) * (glowBoost > 0 ? 0.75 + 0.25 * Math.sin(time * 30) : 1);
      const hold: Hold = {
        screen: toScreen,
        grips,
        yaw: baseYaw + bodyYaw.x + spin,
        tilt: tilt.x,
        scale: k,
        depth,
        reach: pointSide || (waveLeft > 0 ? WAVE_SIDE : knocking ? KNOCK_SIDE : 0),
      };
      return { parts, state: { glow, charge, screen: screen * (asleep ? 0.55 : 1), hole }, hold };
    },
  };
}
