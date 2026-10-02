import { chain, clamp, easeOutCubic, identity, type M4 } from "@/lib/mascot/math";

/*
 * The 03 showcase screen: one geo-tn.com capture laid over a slab of voxels
 * standing on the page's own board. Each voxel's front face carries its cell
 * of the capture, so at rest the slab is the capture itself, sharp and in
 * its own colours; its back face carries the same cell of the next capture.
 *
 * A change of screen is a wave across the slab, left to right: each block
 * lifts toward the camera, tumbles half a turn and lands with the next
 * capture showing, while the camera swings a little to the side so the
 * blocks read as blocks. On entry the blocks rise out of the board, bottom
 * rows first. Light is banded in four steps like the transits' and the
 * mascot's, and only touches a block while it moves.
 *
 * The board under the slab is the page background with a dot grid; the
 * capture's own colours spill onto it in dithered steps, and the wave's
 * front runs across it as one orange dashed line — the only accent; the
 * captures themselves are never tinted.
 */

const COLS = 48;
const ROWS = 30;
/** World size of the slab: the captures' 16:10, one cell deep. */
const SIZE = { w: 16, h: 10, d: 10 / ROWS };
/** The board, under the slab's bottom edge. */
const FLOOR = -SIZE.h / 2 - 0.7;
/** How far a block lifts toward the camera at the top of its tumble. */
const LIFT = 4.5;
/** Vertical field of view. */
const FOV = 0.5;

/** Where each block's tumble starts in the turn (0..1) and how long it takes. */
const WAVE = { span: 0.55, jitter: 0.15, length: 0.25 };

const FLOATS = 11;

const VERT = `
precision highp float;
attribute vec3 a_pos;
attribute vec3 a_nrm;
attribute vec2 a_cell;
attribute vec2 a_seed;
attribute float a_kind;
uniform mat4 u_vp;
uniform vec2 u_grid;
uniform vec3 u_size;
uniform float u_turn;
uniform float u_intro;
uniform float u_lift;
uniform vec3 u_wave;
varying vec2 v_uv;
varying vec2 v_mid;
varying float v_face;
varying float v_flip;
varying float v_shade;
varying float v_kind;
varying vec3 v_world;
const float PI = 3.14159265;
vec3 rotY(vec3 v, float a){ float c = cos(a); float s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
vec3 rotX(vec3 v, float a){ float c = cos(a); float s = sin(a); return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z); }
void main(){
  v_kind = a_kind;
  v_world = a_pos;
  v_uv = vec2(0.0);
  v_mid = vec2(0.0);
  v_face = 0.0;
  v_flip = 0.0;
  v_shade = 1.0;
  if (a_kind > 0.5) {
    gl_Position = u_vp * vec4(a_pos, 1.0);
    return;
  }
  vec2 mid = (a_cell + 0.5) / u_grid;
  vec3 centre = vec3((mid.x - 0.5) * u_size.x, (0.5 - mid.y) * u_size.y, 0.0);
  // The wave: this block's tumble, eased, and its arc (0 at rest, 1 mid-air).
  float t = clamp((u_turn - mid.x * u_wave.x - a_seed.x * u_wave.y) / u_wave.z, 0.0, 1.0);
  float e = t * t * (3.0 - 2.0 * t);
  float arc = sin(PI * e);
  // Entry: blocks rise out of the board, bottom rows first.
  float ti = clamp((u_intro - (1.0 - mid.y) * 0.4 - a_seed.y * 0.25 - mid.x * 0.1) / 0.25, 0.0, 1.0);
  float fall = pow(1.0 - ti, 3.0);
  vec3 cube = vec3(u_size.x / u_grid.x, u_size.y / u_grid.y, u_size.z);
  vec3 p = a_pos * cube * (1.0 - 0.3 * max(arc, fall));
  vec3 n = a_nrm;
  float wob = arc * (a_seed.y - 0.5) * 1.2 + fall * (a_seed.x - 0.5) * 5.0;
  float spin = PI * e;
  p = rotY(rotX(p, wob), spin);
  n = rotY(rotX(n, wob), spin);
  vec3 off = vec3(0.0, arc * (a_seed.y - 0.5) * 2.0, arc * u_lift * (0.55 + 0.9 * a_seed.x));
  off.y -= fall * (u_size.y + 3.0 + a_seed.x * 4.0);
  off.z += fall * (a_seed.y - 0.5) * 2.0;
  vec3 world = centre + p + off;
  v_world = world;
  // Front: this capture's cell; back: the next one's, mirrored so it reads
  // the right way round once the block has turned.
  float face = a_nrm.z > 0.5 ? 1.0 : (a_nrm.z < -0.5 ? 2.0 : 0.0);
  float ux = face > 1.5 ? a_cell.x + 0.5 - a_pos.x : a_cell.x + 0.5 + a_pos.x;
  v_uv = vec2(ux, a_cell.y + 0.5 - a_pos.y) / u_grid;
  v_mid = mid;
  v_face = face;
  v_flip = step(0.5, e);
  vec3 light = normalize(vec3(0.45, 0.75, 0.5));
  float band = floor(max(dot(n, light), 0.0) * 4.0 + 0.5) / 4.0;
  v_shade = face > 0.5 ? mix(1.0, 0.45 + 0.55 * band, max(arc, fall) * 0.8) : 0.3 + 0.5 * band;
  gl_Position = u_vp * vec4(world, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform sampler2D u_a;
uniform sampler2D u_b;
uniform sampler2D u_glowA;
uniform sampler2D u_glowB;
uniform vec3 u_bg;
uniform vec3 u_ink;
uniform vec3 u_accent;
uniform vec3 u_size;
uniform vec2 u_grid;
uniform float u_turn;
uniform float u_intro;
uniform float u_block;
uniform vec3 u_wave;
varying vec2 v_uv;
varying vec2 v_mid;
varying float v_face;
varying float v_flip;
varying float v_shade;
varying float v_kind;
varying vec3 v_world;
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main(){
  if (v_kind < 0.5) {
    vec3 col;
    if (v_face > 1.5) col = texture2D(u_b, v_uv).rgb;
    else if (v_face > 0.5) col = texture2D(u_a, v_uv).rgb;
    else col = v_flip > 0.5 ? texture2D(u_b, v_mid).rgb : texture2D(u_a, v_mid).rgb;
    gl_FragColor = vec4(col * v_shade, 1.0);
    return;
  }
  // The board: page background, a dot grid on the slab's columns, falling
  // off in hard bands toward the stage's edges.
  vec3 w = v_world;
  float halfW = u_size.x * 0.5;
  vec2 cell = floor(gl_FragCoord.xy / u_block);
  float pitch = u_size.x / u_grid.x * 2.0;
  vec2 g = abs(fract(w.xz / pitch) - 0.5);
  float dots = step(max(g.x, g.y), 0.08);
  float reach = length(vec2(w.x / (halfW * 1.9), (w.z - 3.0) / 10.0));
  float fade = floor(clamp(1.0 - reach, 0.0, 1.0) * 4.0 + 0.5) / 4.0;
  vec3 col = mix(u_bg, u_ink, dots * 0.13 * fade);
  // The capture's colours spill forward onto the board, in dithered steps;
  // each column switches to the next capture as the wave passes it.
  float u = clamp(w.x / u_size.x + 0.5, 0.0, 1.0);
  float passed = step(0.5, clamp((u_turn - u * u_wave.x - 0.5 * u_wave.y) / u_wave.z, 0.0, 1.0));
  vec3 glow = mix(texture2D(u_glowA, vec2(u, 0.5)).rgb, texture2D(u_glowB, vec2(u, 0.5)).rgb, passed);
  float aside = max(abs(w.x) - halfW, 0.0);
  float spill = exp(-max(w.z, 0.0) * 0.3 - aside * 0.7) * step(-0.3, w.z) * u_intro;
  float level = min(floor(spill * 4.0 + bayer4(cell)) / 4.0, 1.0);
  col += glow * level * 0.3;
  // The wave's front, a dashed orange line across the board.
  float front = ((u_turn - 0.5 * u_wave.y - 0.5 * u_wave.z) / u_wave.x - 0.5) * u_size.x;
  if (u_turn > 0.0 && abs(front) < halfW) {
    float on = step(abs(w.x - front), 0.1) * step(0.0, w.z) * step(w.z, 5.0) * step(0.45, fract(w.z * 1.4));
    col = mix(col, u_accent, on);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export type ShowcaseRenderer = {
  /** Stage size in CSS px and the device pixel ratio to draw at. */
  resize: (width: number, height: number, ratio: number) => void;
  /** The captures, in order. */
  setScreens: (images: HTMLImageElement[]) => void;
  draw: (screen: number, turn: number, intro: number) => void;
  dispose: () => void;
};

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function perspective(fov: number, aspect: number, near: number, far: number): M4 {
  const f = 1 / Math.tan(fov / 2);
  const m = identity();
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  m[15] = 0;
  return m;
}

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

function lookAt(eye: V3, target: V3): M4 {
  const f = norm(sub(target, eye));
  const s = norm(cross(f, [0, 1, 0]));
  const u = cross(s, f);
  const m = identity();
  m[0] = s[0];
  m[4] = s[1];
  m[8] = s[2];
  m[1] = u[0];
  m[5] = u[1];
  m[9] = u[2];
  m[2] = -f[0];
  m[6] = -f[1];
  m[10] = -f[2];
  m[12] = -dot(s, eye);
  m[13] = -dot(u, eye);
  m[14] = dot(f, eye);
  return m;
}

/** A unit cube per cell, plus the board. */
function buildMesh() {
  const faces: [V3, V3[]][] = [
    [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]],
    [[1, 0, 0], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]]],
    [[-1, 0, 0], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]],
    [[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]],
    [[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
  ];
  const data = new Float32Array((COLS * ROWS * 36 + 6) * FLOATS);
  let o = 0;
  const put = (pos: V3, nrm: V3, i: number, j: number, s0: number, s1: number, kind: number) => {
    data.set([pos[0], pos[1], pos[2], nrm[0], nrm[1], nrm[2], i, j, s0, s1, kind], o);
    o += FLOATS;
  };
  // A fixed seed, so every visit tumbles the same blocks the same way.
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let j = 0; j < ROWS; j += 1) {
    for (let i = 0; i < COLS; i += 1) {
      const s0 = rand();
      const s1 = rand();
      for (const [nrm, quad] of faces) {
        for (const k of [0, 1, 2, 0, 2, 3]) {
          const [x, y, z] = quad[k];
          put([x / 2, y / 2, z / 2], nrm, i, j, s0, s1, 0);
        }
      }
    }
  }
  const ext = 60;
  const board: V3[] = [
    [-ext, FLOOR, -ext],
    [ext, FLOOR, -ext],
    [ext, FLOOR, ext],
    [-ext, FLOOR, ext],
  ];
  for (const k of [0, 2, 1, 0, 3, 2]) put(board[k], [0, 1, 0], 0, 0, 0, 0, 1);
  return data;
}

function texture(gl: WebGLRenderingContext, source: TexImageSource) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
  return tex;
}

/** The bottom band of a capture, averaged into a strip of 32 colours. */
function glowStrip(image: HTMLImageElement) {
  const strip = document.createElement("canvas");
  strip.width = 32;
  strip.height = 1;
  const ctx = strip.getContext("2d");
  const h = image.naturalHeight;
  ctx?.drawImage(image, 0, h * 0.6, image.naturalWidth, h * 0.4, 0, 0, 32, 1);
  return strip;
}

const hex = (value: string): V3 => {
  const n = parseInt(value.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function createShowcaseRenderer(canvas: HTMLCanvasElement): ShowcaseRenderer | null {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true, depth: true, premultipliedAlpha: true });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  const mesh = buildMesh();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
  const count = mesh.length / FLOATS;
  for (const [name, size, offset] of [
    ["a_pos", 3, 0],
    ["a_nrm", 3, 3],
    ["a_cell", 2, 6],
    ["a_seed", 2, 8],
    ["a_kind", 1, 10],
  ] as const) {
    const loc = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, FLOATS * 4, offset * 4);
  }

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uVp = u("u_vp");
  const uTurn = u("u_turn");
  const uIntro = u("u_intro");
  const uBlock = u("u_block");
  gl.uniform2f(u("u_grid"), COLS, ROWS);
  gl.uniform3f(u("u_size"), SIZE.w, SIZE.h, SIZE.d);
  gl.uniform1f(u("u_lift"), LIFT);
  gl.uniform3f(u("u_wave"), WAVE.span, WAVE.jitter, WAVE.length);
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => hex(styles.getPropertyValue(name).trim() || fallback);
  gl.uniform3fv(u("u_bg"), token("--bg", "#141413"));
  gl.uniform3fv(u("u_ink"), token("--ink", "#faf9f5"));
  gl.uniform3fv(u("u_accent"), token("--accent", "#e2733f"));
  ["u_a", "u_b", "u_glowA", "u_glowB"].forEach((name, unit) => gl.uniform1i(u(name), unit));

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  let screens: { image: WebGLTexture; glow: WebGLTexture }[] = [];
  let aspect = 1;
  let ratio = 1;

  return {
    resize(width, height, nextRatio) {
      ratio = nextRatio;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      aspect = canvas.width / canvas.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      // Board pixels in 2 CSS px blocks, like the rest of the page's bitmap.
      gl.uniform1f(uBlock, 2 * ratio);
    },
    setScreens(images) {
      screens = images.map((image) => ({ image: texture(gl, image), glow: texture(gl, glowStrip(image)) }));
    },
    draw(screen, turn, intro) {
      if (!screens.length) return;
      const last = screens.length - 1;
      const k = clamp(Math.round(screen), 0, last);
      // While a screen holds, its blocks' backs carry it too.
      const next = turn > 0 ? Math.min(k + 1, last) : k;

      // Rest: the slab square on, its top near the stage's top, the board
      // showing under it. A change swings the camera aside and back; the
      // entry swings it in from the side.
      const fit = Math.tan(FOV / 2);
      const aim = -SIZE.h * 0.07;
      const rest = Math.max((SIZE.h / 2 - aim) / (0.97 * fit), SIZE.w / 2 / (0.94 * fit * aspect));
      const swing = Math.sin(Math.PI * clamp(turn, 0, 1));
      const enter = 1 - easeOutCubic(clamp(intro, 0, 1));
      const side = k % 2 ? -1 : 1;
      const yaw = side * 0.32 * swing - 0.6 * enter;
      const dist = rest + swing * 6 + enter * 4;
      const eye: V3 = [Math.sin(yaw) * dist, 1.2 + swing * 2.4 + enter * 5, Math.cos(yaw) * dist];
      const vp = chain(perspective(FOV, aspect, 0.5, 200), lookAt(eye, [0, aim, 0]));

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(uVp, false, vp);
      gl.uniform1f(uTurn, turn);
      gl.uniform1f(uIntro, clamp(intro, 0, 1) * 1.05);
      const bind = (unit: number, tex: WebGLTexture) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
      };
      bind(0, screens[k].image);
      bind(1, screens[next].image);
      bind(2, screens[k].glow);
      bind(3, screens[next].glow);
      gl.drawArrays(gl.TRIANGLES, 0, count);
    },
    dispose() {
      screens.forEach(({ image, glow }) => {
        gl.deleteTexture(image);
        gl.deleteTexture(glow);
      });
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
