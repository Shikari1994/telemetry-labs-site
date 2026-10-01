/**
 * Minimal column-major 4x4 matrix helpers for the mascot renderer. The scene
 * is a handful of rigid parts, so a scene-graph library would cost far more
 * transfer than the math it replaces.
 */

export type M4 = Float32Array;

export function identity(): M4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function multiply(a: M4, b: M4): M4 {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[col * 4 + row] =
        a[row] * b[col * 4] + a[4 + row] * b[col * 4 + 1] + a[8 + row] * b[col * 4 + 2] + a[12 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

/** Left-to-right product: chain(A, B, C) = A * B * C. */
export function chain(...matrices: M4[]): M4 {
  return matrices.reduce((acc, m) => multiply(acc, m));
}

export function translate(x: number, y: number, z: number): M4 {
  const m = identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

export function scale(x: number, y: number, z: number): M4 {
  const m = identity();
  m[0] = x;
  m[5] = y;
  m[10] = z;
  return m;
}

export function rotateX(angle: number): M4 {
  const m = identity();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  m[5] = c;
  m[6] = s;
  m[9] = -s;
  m[10] = c;
  return m;
}

export function rotateY(angle: number): M4 {
  const m = identity();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  m[0] = c;
  m[2] = -s;
  m[8] = s;
  m[10] = c;
  return m;
}

export function rotateZ(angle: number): M4 {
  const m = identity();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  m[0] = c;
  m[1] = s;
  m[4] = -s;
  m[5] = c;
  return m;
}

/**
 * Viewport projection: x right and y down in CSS pixels, z toward the viewer.
 * Nearer fragments get smaller depth so the default LESS test keeps them.
 */
export function viewportOrtho(width: number, height: number, depth = 800): M4 {
  const m = identity();
  m[0] = 2 / width;
  m[5] = -2 / height;
  m[10] = -1 / depth;
  m[12] = -1;
  m[13] = 1;
  return m;
}

/** Upper-left 3x3, used to carry face normals through pure rotations. */
export function normalMatrix(m: M4): Float32Array {
  return new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]);
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
