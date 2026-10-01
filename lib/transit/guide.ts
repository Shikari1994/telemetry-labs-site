import { chain, rotateX, rotateY, rotateZ, type M4 } from "@/lib/mascot/math";
import type { FaceCue } from "@/lib/mascot/rig";
import type { Pose, V3 } from "@/lib/transit/mesh";

/**
 * The mascot's way through a transit. Each stretch says where the robot is in
 * its world for a flight progress (`Stretch.guide`); the transit scene puts
 * that through its own camera and publishes the result in `ride`, which the
 * mascot (components/mascot) reads on the same tick and draws over the board.
 * So the robot flies through the same world the camera does: it overtakes the
 * camera, leads the way, drops down the bore, runs the route across the
 * board, and goes through the way out first.
 *
 * The robot is drawn on its own canvas, so the board never hides it; paths
 * keep it in open air on the camera's side of everything.
 */

export type Guide = {
  /** Ground point under the body, world units. */
  at: V3;
  /** Body orientation in the world (robot space: y up, front +z). */
  rot: M4;
  /** World units per robot voxel. */
  size: number;
  /** 0 resting … 1 in full flight. */
  fly: number;
  face?: FaceCue | null;
  /** True over the beat where it turns to the camera and waves. */
  wave?: boolean;
};

/** The camera's own rotation (camera space to world). */
export const cameraRot = (cam: Pose) => chain(rotateY(cam.yaw), rotateX(cam.pitch), rotateZ(cam.roll));

/**
 * A spot in front of the camera: `d` units along its view, `sx` right and
 * `sy` up on screen, the body turned by `turn` about its own up (0 faces the
 * camera, PI shows its back). An `upright` body stands straight in the world
 * and only follows the camera's heading, so a camera looking down sees its
 * top; otherwise it keeps square to the lens whatever the camera does.
 */
export function chase(cam: Pose, d: number, sx: number, sy: number, turn: number, upright: boolean): Pick<Guide, "at" | "rot"> {
  const r = cameraRot(cam);
  // Columns of r: camera right, up and back, in the world.
  const at: V3 = [
    cam.x + r[0] * sx + r[4] * sy - r[8] * d,
    cam.y + r[1] * sx + r[5] * sy - r[9] * d,
    cam.z + r[2] * sx + r[6] * sy - r[10] * d,
  ];
  return { at, rot: upright ? rotateY(cam.yaw + turn) : chain(r, rotateY(turn)) };
}

/** 0..1 over [a, b], eased in and out. */
export const span = (p: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** What the mascot needs from the transit for this frame, in viewport px. */
export type Ride = {
  visible: boolean;
  /** Which transit, so a new one starts the robot afresh. */
  index: number;
  x: number;
  y: number;
  /** CSS px per voxel. */
  scale: number;
  /** Body turn as the rig composes it: rotateZ(roll) · rotateX(tilt) · rotateY(yaw). */
  yaw: number;
  tilt: number;
  roll: number;
  fly: number;
  face: FaceCue | null;
  wave: boolean;
  /** Viewport y of the transit's top edge: nothing above it is board. */
  top: number;
};

/** Written by the transit scene each tick, read by the mascot after it. */
export const ride: Ride = {
  visible: false,
  index: -1,
  x: 0,
  y: 0,
  scale: 1,
  yaw: 0,
  tilt: 0,
  roll: 0,
  fly: 0,
  face: null,
  wave: false,
  top: 0,
};

/** Smallest distance in front of the camera at which the robot is drawn. */
const NEAR = 1.2;
/** Largest drawn size, CSS px per voxel: an overtake passes the lens this big. */
const MAX_SCALE = 44;

/**
 * Puts a guide through the camera. `vp` is the frame's view-projection,
 * `view` the camera's rotation inverse (world to camera), `focal` CSS px per
 * unit at distance 1.
 */
export function project(guide: Guide, vp: M4, view: M4, focal: number, width: number, height: number) {
  const [x, y, z] = guide.at;
  const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
  if (w < NEAR) return null;
  const sx = ((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / w) * 0.5 + 0.5;
  const sy = ((vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / w) * 0.5 + 0.5;
  const scale = (guide.size * focal) / w;
  if (scale > MAX_SCALE) return null;
  // The body in camera space, taken apart into the rig's three turns:
  // R = Rz(roll) · Rx(tilt) · Ry(yaw), so R21 = sin(tilt), R20 / R22 give yaw,
  // R01 / R11 give roll (row, column; matrices are column-major).
  const m = chain(view, guide.rot);
  const tilt = Math.asin(Math.max(-1, Math.min(1, m[6])));
  const yaw = Math.atan2(-m[2], m[10]);
  const roll = Math.atan2(-m[4], m[5]);
  return { x: sx * width, y: (1 - sy) * height, scale, yaw, tilt, roll };
}
