import { chain, clamp, identity, rotateX, rotateY, rotateZ, translate, type M4 } from "@/lib/mascot/math";
import type { Pose, V3 } from "@/lib/transit/mesh";
import { FLOATS_PER_VERTEX, LENGTH, PALETTE, buildSky, transitStretch, transitTheme } from "@/lib/transit/scene";

/*
 * Same look as the mascot: banded light in four steps, so faces read like
 * shaded sprite pixels, rendered small and scaled up without smoothing.
 *
 * Kinds: traces carry signal dashes that run away from the camera (on a
 * radial stretch, into the centre of the board), lamps blink on their own
 * phase (seed 1 holds steady), bits drift, the floor draws its grid from
 * world position (and, when the theme asks, rings pulsing out of the gate),
 * glow dots stay lit far out and dim on their far side. A route lights in
 * order as the stretch's route value passes each piece's seed (labels carry
 * theirs plus 10), with packets running along the lit part. Rock takes
 * wavy strata from depth, voxel by voxel, and glows in the target layer.
 * Bodies the scene marks as moving spin about their pivot or slide toward
 * the gate. Colours of the signal heads, gate rim and sparks come from the
 * stretch's theme. Fog falls off in steps toward the page background, over
 * the stretch's own range.
 *
 * Nothing is drawn above u_edge, the top of the transit's spacer on screen,
 * so the section the page is leaving is never covered. Below the edge the
 * board rises out of the page background through an ordered (Bayer) dither
 * anchored to the page: right under the edge every block is the background
 * itself, and deeper down blocks step up to the board's own tones, so there
 * is no line where the page ends. The way out is the gate's portal, drawn
 * fully transparent, so the next section shows through it; over the last
 * stretch the opening widens past its frame with a dithered, glowing rim that
 * throws sparks, until it fills the screen.
 */
const VERT = `
precision highp float;
attribute vec3 a_pos;
attribute vec3 a_nrm;
attribute vec3 a_col;
attribute float a_kind;
attribute float a_seed;
attribute vec4 a_motion;
attribute float a_axis;
uniform mat4 u_vp;
uniform float u_time;
varying vec3 v_col;
varying vec3 v_world;
varying float v_kind;
varying float v_seed;
varying float v_lit;
varying float v_cue;
vec3 spinY(vec3 v, float c, float s){ return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
vec3 spinZ(vec3 v, float c, float s){ return vec3(c * v.x - s * v.y, s * v.x + c * v.y, v.z); }
void main(){
  vec3 p = a_pos;
  vec3 n = a_nrm;
  v_cue = 1.0;
  if (a_axis > 0.5 && a_axis < 2.5) {
    // A spin about the body's pivot; the far side of a turning sphere dims.
    float ang = u_time * a_motion.w;
    float c = cos(ang);
    float s = sin(ang);
    vec3 r = p - a_motion.xyz;
    if (a_axis < 1.5) { r = spinY(r, c, s); n = spinY(n, c, s); }
    else { r = spinZ(r, c, s); n = spinZ(n, c, s); }
    p = a_motion.xyz + r;
    v_cue = r.z > 0.0 ? 1.0 : 0.4;
  } else if (a_axis > 2.5) {
    // A slide toward the gate, wrapping after its run (held in motion.x).
    p.z -= mod(u_time * a_motion.w + a_seed * a_motion.x, a_motion.x);
  } else if (a_kind > 1.5 && a_kind < 2.5) {
    p.y += sin(u_time * 0.9 + a_seed * 6.283) * 0.45;
    p.x += cos(u_time * 0.55 + a_seed * 12.0) * 0.3;
  }
  vec3 L = normalize(vec3(-0.45, 0.85, 0.3));
  float d = max(dot(n, L), 0.0);
  v_lit = floor((0.5 + 0.62 * d) * 4.0 + 0.5) / 4.0;
  v_col = a_col;
  v_world = p;
  v_kind = a_kind;
  v_seed = a_seed;
  gl_Position = a_kind > 4.5 && a_kind < 5.5 ? vec4(p, 1.0) : u_vp * vec4(p, 1.0);
}
`;

/** Rock tones, darkest to lightest: the site's inks, as shader literals. */
const ROCK = [PALETTE.rack, PALETTE.chip, PALETTE.tower, PALETTE.ink4.map((v) => v * 0.8)];
const vec = (rgb: readonly number[]) => `vec3(${rgb.map((v) => v.toFixed(4)).join(", ")})`;

const FRAG = `
precision highp float;
varying vec3 v_col;
varying vec3 v_world;
varying float v_kind;
varying float v_seed;
varying float v_lit;
varying float v_cue;
uniform float u_time;
uniform float u_edge;
uniform float u_block;
uniform vec2 u_res;
uniform vec3 u_cam;
uniform vec3 u_bg;
uniform vec3 u_hot;
uniform vec3 u_accent;
uniform vec3 u_deep;
uniform vec3 u_ink;
uniform vec4 u_portal;
uniform float u_open;
uniform float u_pulse;
uniform vec2 u_fog;
uniform float u_route;
uniform vec2 u_target;
uniform float u_radial;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }

// An ember field: lanes five blocks wide, each sending a spark upward now and
// then at its own pace, a hot head over a cooling trail. cell.y grows downward.
vec4 ember(vec2 cell){
  float lane = floor(cell.x / 5.0);
  float h = hash(vec2(lane, 1.7));
  float y = cell.y + u_time * (2.5 + h * 6.0);
  float period = 16.0 + floor(hash(vec2(lane, 4.2)) * 22.0);
  float slot = floor(y / period);
  float k = y - slot * period;
  float r = hash(vec2(lane, slot));
  if (r < 0.62) return vec4(0.0);
  float sway = floor(hash(vec2(slot, lane)) * 3.0 + 1.0 + sin(u_time * 1.3 + slot * 2.3 + lane) * 1.2);
  if (cell.x - lane * 5.0 != clamp(sway, 0.0, 4.0)) return vec4(0.0);
  float len = 1.0 + floor((r - 0.62) * 10.0);
  if (k >= len) return vec4(0.0);
  float heat = 1.0 - floor(k) / len;
  float flicker = 0.75 + 0.25 * step(0.5, fract(u_time * (2.0 + h * 4.0) + r * 7.0));
  vec3 col = r > 0.95 ? u_ink : mix(u_deep, u_hot, heat * heat);
  return vec4(col, floor(heat * flicker * 4.0 + 0.5) / 4.0);
}

void main(){
  float below = (u_edge - gl_FragCoord.y) / u_block;
  if (below < 0.0) discard;

  vec3 c = v_col * v_lit;
  if (v_kind > 0.5 && v_kind < 1.5) {
    float along = u_radial > 0.5 && v_world.y > -1.0 ? length(v_world.xz) : v_world.z;
    float ph = fract(along * 0.035 + u_time * 0.45 + v_seed * 0.37);
    c = mix(v_col * 0.5, u_hot, step(0.9, ph));
  } else if (v_kind > 1.5 && v_kind < 2.5) {
    c = v_col;
  } else if (v_kind > 2.5 && v_kind < 3.5) {
    // Seed 1 is a steady lamp (the gate number); others blink on their phase.
    float on = v_seed > 0.99 ? 1.0 : step(0.35, fract(u_time * 0.7 + v_seed));
    c = v_col * (0.55 + 0.45 * on);
  } else if (v_kind > 3.5 && v_kind < 4.5) {
    vec2 g = abs(fract(v_world.xz / 2.0) - 0.5);
    float line = step(0.47, max(g.x, g.y));
    c = mix(v_col, v_col * 1.9, line);
    if (u_pulse > 0.5) {
      // Rings leaving the gate along the floor, snapped to the voxel grid.
      float r = length(floor(v_world.xz) + 0.5 - vec2(0.0, -${LENGTH.toFixed(1)}));
      float ring = step(0.93, fract(r / 9.0 - u_time * 0.3));
      c = mix(c, u_accent * 0.75, ring * (1.0 - clamp(r / 130.0, 0.0, 1.0)));
    }
  } else if (v_kind > 6.5 && v_kind < 7.5) {
    c = v_col * v_cue;
  } else if (v_kind > 7.5 && v_kind < 8.5) {
    // Labels carry their route position plus 10; pieces of track carry theirs.
    bool label = v_seed > 5.0;
    float at = label ? v_seed - 10.0 : v_seed;
    float lit = step(at, u_route + 0.0001);
    if (label) {
      c = mix(v_col * 0.22, v_col, lit);
    } else {
      float packet = step(0.86, fract(at * 36.0 - u_time * 0.9));
      c = mix(v_col * 0.4, mix(u_accent * 0.8, u_hot, packet), lit);
      c = mix(c, u_hot, lit * step(u_route - 0.012, at));
    }
  } else if (v_kind > 8.5) {
    // Strata: wavy layers by depth, a dark seam between them, each voxel a
    // shade of its layer, the odd speck of ore; the target layer glows.
    vec3 cell = floor(v_world * 2.0);
    float n = hash(cell.xz + cell.y * 17.0);
    float depth = v_world.y + 1.6 * sin(v_world.x * 0.13 + v_world.z * 0.09);
    float layer = floor(depth / 5.0);
    float tone = hash(vec2(layer, 2.7));
    vec3 stone = tone < 0.3 ? ${vec(ROCK[0])} : tone < 0.55 ? ${vec(ROCK[1])} : tone < 0.8 ? ${vec(ROCK[2])} : ${vec(ROCK[3])};
    c = stone * (0.86 + 0.14 * floor(n * 3.0)) * v_lit;
    if (fract(depth / 5.0) < 0.07) c = u_bg;
    else if (n > 0.975) c = u_ink * 0.5 * v_lit;
    if (depth > u_target.x && depth < u_target.y && fract(depth / 5.0) >= 0.07) {
      float vein = step(0.97, n) * step(0.4, fract(u_time * 0.5 + n * 13.0));
      c = mix(mix(c, u_deep * v_lit * 0.7, 0.4), u_hot, vein);
    }
  }
  // Glow dots fade late, so the globe reads over the horizon; sky and portal take the background.
  float dist = length(v_world - u_cam);
  float f = v_kind > 6.5 && v_kind < 7.5
    ? clamp((dist - 40.0) / 150.0, 0.0, 1.0)
    : v_kind > 4.5 && v_kind < 6.5 ? 1.0 : clamp((dist - u_fog.x) / u_fog.y, 0.0, 1.0);
  f = floor(f * 6.0 + 0.5) / 6.0;
  c = mix(c, u_bg, f);
  float a = v_kind > 5.5 && v_kind < 6.5 ? 0.0 : 1.0;

  // The page edge: rows counted down from the spacer top, so the gradient
  // travels with the page instead of shimmering under it. Each block takes
  // one of five tones between the background and the board, picked by an
  // ordered dither broken up with a little noise, so it reads as a gradient
  // of blocks rather than a printed pattern.
  vec2 cell = vec2(floor(gl_FragCoord.x / u_block), floor(below));
  float band = floor(u_res.y * 0.45 / u_block) + 1.0;
  float grow = clamp(cell.y / band, 0.0, 1.0);
  grow = grow * grow * (3.0 - 2.0 * grow);
  float level = min(floor(grow * 4.0 + mix(bayer8(cell), hash(cell), 0.3)) / 4.0, 1.0);
  c = mix(u_bg, c, level);

  // The portal widening past its frame: cells open outward from its opening.
  float rimWidth = 10.0;
  float rimNear = 0.0;
  if (u_open > 0.0) {
    vec2 q = floor(gl_FragCoord.xy / u_block);
    vec2 o = max(u_portal.xy - q, q - u_portal.zw);
    float dist = length(max(o, 0.0));
    float reach = u_open * (length(u_res / u_block) + rimWidth * 2.0);
    float rim = reach - dist - mix(bayer8(q), hash(q), 0.45) * rimWidth;
    if (rim > 0.0) a = 0.0;
    else if (rim > -0.9 && hash(q + 7.0) > 0.35) c = mix(c, mix(u_accent, u_hot, 1.0 + rim / 0.9), 0.85);
    rimNear = 1.0 - clamp(abs(reach - dist - rimWidth * 0.5) / (rimWidth * 1.6), 0.0, 1.0);
  }

  vec4 col = vec4(c * a, a);
  if (u_open > 0.0) {
    // Sparks thrown off the widening rim, anchored to the screen.
    vec4 e = ember(floor(vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_block));
    float ea = floor(e.a * rimNear * 4.0 + 0.5) / 4.0;
    col = vec4(e.rgb * ea, ea) + col * (1.0 - ea);
  }
  gl_FragColor = col;
}
`;

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

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Flight progress at which the portal starts widening past its frame. */
const OPEN_FROM = 0.8;

/** The frame's camera: its pose, view-projection, view rotation and vertical field of view. */
export type TransitFrame = { cam: Pose; vp: M4; view: M4; fov: number };

export type TransitRenderer = {
  resize: (width: number, height: number, block: number) => void;
  /**
   * `to` is the id of the section ahead and picks the stretch's theme;
   * `flight` (0..1) is how far the camera has flown; `edge` is how much of the
   * canvas is uncovered, in render pixels from the bottom; `rush` (0..1) is
   * how fast the page is scrolling through. Returns the camera it drew with,
   * so the mascot can be put through the same lens.
   */
  draw: (index: number, label: string, to: string, flight: number, edge: number, rush: number, time: number) => TransitFrame;
  dispose: () => void;
};

export function createTransitRenderer(canvas: HTMLCanvasElement): TransitRenderer | null {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: true, premultipliedAlpha: true });
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

  const stride = FLOATS_PER_VERTEX * 4;
  const attribs: [number, number, number][] = (
    [
      ["a_pos", 3, 0],
      ["a_nrm", 3, 3],
      ["a_col", 3, 6],
      ["a_kind", 1, 9],
      ["a_seed", 1, 10],
      ["a_motion", 4, 11],
      ["a_axis", 1, 15],
    ] as const
  ).map(([name, size, offset]) => [gl.getAttribLocation(program, name), size, offset]);
  const bind = (buffer: WebGLBuffer) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [loc, size, offset] of attribs) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset * 4);
    }
  };

  const upload = (data: Float32Array) => {
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return { buffer, count: data.length / FLOATS_PER_VERTEX };
  };
  const sky = upload(buildSky());
  /* Each transit is built the first time it is reached. */
  const scenes = new Map<number, { buffer: WebGLBuffer; count: number }>();

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uVp = u("u_vp");
  const uTime = u("u_time");
  const uEdge = u("u_edge");
  const uBlock = u("u_block");
  const uRes = u("u_res");
  const uCam = u("u_cam");
  gl.uniform3fv(u("u_bg"), PALETTE.bg);
  gl.uniform3fv(u("u_ink"), PALETTE.ink);
  const uHot = u("u_hot");
  const uAccent = u("u_accent");
  const uDeep = u("u_deep");
  const uPulse = u("u_pulse");
  const uPortal = u("u_portal");
  const uOpen = u("u_open");
  const uFog = u("u_fog");
  const uRoute = u("u_route");
  const uTarget = u("u_target");
  const uRadial = u("u_radial");

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  let width = 1;
  let height = 1;
  let block = 1;

  /**
   * The portal opening's screen rect, in blocks from the bottom left. A corner
   * behind the camera means it is already through, so the rect is the screen.
   */
  const portalRect = (vp: M4, corners: readonly V3[]) => {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y, z] of corners) {
      const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
      if (w <= 0.01) return [0, 0, width / block, height / block];
      const sx = ((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / w) * 0.5 + 0.5;
      const sy = ((vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / w) * 0.5 + 0.5;
      x0 = Math.min(x0, (sx * width) / block);
      x1 = Math.max(x1, (sx * width) / block);
      y0 = Math.min(y0, (sy * height) / block);
      y1 = Math.max(y1, (sy * height) / block);
    }
    return [x0, y0, x1, y1];
  };

  return {
    resize(nextWidth, nextHeight, nextBlock) {
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      block = nextBlock;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform1f(uBlock, block);
      gl.uniform2f(uRes, width, height);
    },
    draw(index, label, to, flight, edge, rush, time) {
      const theme = transitTheme(to);
      const stretch = transitStretch(to);
      let scene = scenes.get(index);
      if (!scene) {
        scene = upload(stretch.build(index + 1, label, theme));
        scenes.set(index, scene);
      }
      const cam = stretch.camera(flight);
      const turn = chain(rotateZ(-cam.roll), rotateX(-cam.pitch), rotateY(-cam.yaw));
      const view = chain(turn, translate(-cam.x, -cam.y, -cam.z));
      // Portrait screens get a wider lens so the board still reads side to side;
      // a fast scroll widens it further once the camera is under way, so speed
      // reads as rush while the board itself holds still under the page.
      const aspect = width / height;
      const fov = (aspect < 1 ? 1.35 : 1.05) + rush * 0.3 * smooth(clamp(flight / 0.25, 0, 1));
      const vp = chain(perspective(fov, aspect, 0.1, 220), view);

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(uVp, false, vp);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uEdge, edge);
      gl.uniform3f(uCam, cam.x, cam.y, cam.z);
      gl.uniform3fv(uHot, theme.hot);
      gl.uniform3fv(uAccent, theme.accent);
      gl.uniform3fv(uDeep, theme.deep);
      gl.uniform1f(uPulse, theme.pulse ? 1 : 0);
      gl.uniform2f(uFog, stretch.fog[0], stretch.fog[1]);
      gl.uniform1f(uRoute, stretch.route ? stretch.route(flight) : 1);
      const [low, high] = stretch.target ?? [1e6, 1e6];
      gl.uniform2f(uTarget, low, high);
      gl.uniform1f(uRadial, stretch.radial ? 1 : 0);
      // Over the last stretch the opening widens past its frame to the screen's edges.
      const open = smooth(clamp((flight - OPEN_FROM) / (1 - OPEN_FROM), 0, 1));
      gl.uniform1f(uOpen, open);
      if (open > 0) gl.uniform4fv(uPortal, portalRect(vp, stretch.portal));

      bind(sky.buffer);
      gl.drawArrays(gl.TRIANGLES, 0, sky.count);
      bind(scene.buffer);
      gl.drawArrays(gl.TRIANGLES, 0, scene.count);
      return { cam, vp, view: turn, fov };
    },
    dispose() {
      scenes.forEach((scene) => gl.deleteBuffer(scene.buffer));
      gl.deleteBuffer(sky.buffer);
      gl.deleteProgram(program);
    },
  };
}
