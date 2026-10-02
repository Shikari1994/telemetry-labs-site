import { identity, type M4 } from "@/lib/mascot/math";
import { PALETTE, type V3 } from "@/lib/transit/mesh";
import {
  HOLO,
  ISLAND_FLOATS,
  LIFT,
  SPOT,
  basis,
  buildHolograms,
  buildIsland,
  die,
  holoScale,
  screenCentre,
  type Fit,
  type IslandCamera,
} from "@/lib/hero/island";

/*
 * The hero island in WebGL (lib/hero/island.ts), in the transits' look:
 * light banded in four steps, drawn small and scaled up without smoothing.
 *
 * The board assembles box by box out of the socket as `build` runs: each box
 * rises from below into place on its own delay, by its distance from the
 * socket, the rock under it last and deepest last; the chips seat after the
 * board around them. Signal on the traces runs outward from the socket and
 * only as far as the board has built. Touchdown sends one orange ring across
 * the tiles; the pad blinks as a beacon until the robot stands on it.
 *
 * A hologram is its work's capture on a slab of voxel cells facing the
 * camera. Projecting it (`holo` 0..1) sends the cells up the beam from the
 * die, bottom rows first, tumbling into their slots; at 1 the slab is the
 * capture itself. The beam is screen-door dithered, with a scanline climbing
 * it. A lifted chip and its hologram stand higher and larger (`lift`).
 */

const VERT = `
precision highp float;
attribute vec3 a_pos;
attribute vec3 a_nrm;
attribute vec3 a_col;
attribute float a_kind;
attribute float a_seed;
attribute vec3 a_centre;
attribute float a_group;
uniform mat4 u_vp;
uniform float u_time;
uniform float u_build;
uniform vec3 u_origin;
uniform vec2 u_holo;
uniform vec2 u_lift;
uniform vec2 u_scale;
uniform vec3 u_right;
uniform vec3 u_up;
uniform vec3 u_back;
uniform vec3 u_screen0;
uniform vec3 u_screen1;
uniform vec3 u_die0;
uniform vec3 u_die1;
uniform vec4 u_slab;
uniform vec2 u_grid;
varying vec3 v_col;
varying vec3 v_world;
varying float v_kind;
varying float v_seed;
varying float v_lit;
varying float v_show;
varying vec2 v_uv;
varying float v_group;
varying float v_amount;
const float PI = 3.14159265;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float band(vec3 n){
  vec3 L = normalize(vec3(-0.45, 0.85, 0.3));
  return floor((0.5 + 0.62 * max(dot(n, L), 0.0)) * 4.0 + 0.5) / 4.0;
}
vec3 spin(vec3 v, float a){ float c = cos(a); float s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
void main(){
  v_kind = a_kind;
  v_seed = a_seed;
  v_group = a_group;
  v_col = a_col;
  v_uv = vec2(0.0);
  v_amount = 0.0;
  v_show = 1.0;
  bool second = a_group > 2.5;
  float holo = second ? u_holo.y : u_holo.x;
  vec3 screen = second ? u_screen1 : u_screen0;
  vec3 die = second ? u_die1 : u_die0;
  vec2 slab = u_slab.xy * (second ? u_scale.y : u_scale.x);
  vec3 p;
  vec3 n;
  if (a_kind > 10.5) {
    // The beam: a band from the die to the slab's bottom edge.
    vec3 low = die + (a_col.x - 0.5) * 2.4 * u_right;
    vec3 high = screen - 0.5 * slab.y * u_up + (a_col.x - 0.5) * slab.x * 0.94 * u_right;
    p = mix(low, high, a_col.y);
    n = u_back;
    v_uv = a_col.xy;
    v_amount = holo;
    v_show = step(0.02, holo);
    v_lit = 1.0;
  } else if (a_kind > 9.5) {
    // A hologram cell: up the beam from the die into its slot, bottom rows first.
    vec2 cell = a_col.xy;
    vec2 seed = vec2(a_col.z, a_seed);
    vec2 mid = (cell + 0.5) / u_grid;
    float delay = (1.0 - mid.y) * 0.55 + seed.x * 0.25;
    float t = clamp((holo - delay * 0.8) / 0.2, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - t, 3.0);
    vec3 slot = screen + (mid.x - 0.5) * slab.x * u_right + (0.5 - mid.y) * slab.y * u_up;
    vec3 start = die + (seed.x - 0.5) * 2.0 * u_right + (seed.y - 0.5) * 2.0 * u_back;
    vec3 at = mix(start, slot, e) + u_back * sin(PI * e) * (1.0 + 2.5 * seed.y);
    vec3 cube = vec3(slab.x / u_grid.x, slab.y / u_grid.y, u_slab.z) * mix(0.25, 1.0, e);
    float turn = (1.0 - e) * (seed.x - 0.5) * 9.0;
    vec3 local = spin(a_pos * cube, turn);
    vec3 ln = spin(a_nrm, turn);
    p = at + local.x * u_right + local.y * u_up + local.z * u_back;
    n = ln.x * u_right + ln.y * u_up + ln.z * u_back;
    bool front = a_nrm.z > 0.5;
    v_uv = front ? vec2(cell.x + 0.5 + a_pos.x, cell.y + 0.5 - a_pos.y) / u_grid : mid;
    v_lit = front ? mix(1.0, band(n), min(1.0, (1.0 - e) * 3.0)) : 0.4 + 0.3 * band(n);
    v_show = step(0.001, t);
  } else {
    // The board, box by box out of the socket; the socket is always there.
    p = a_pos;
    n = a_nrm;
    float r = length(a_centre.xz - u_origin.xz);
    float h = hash(a_centre.xz + a_centre.y * 3.1);
    float delay = r / 26.0 * 0.6 + h * 0.1;
    if (a_kind > 8.5) delay = 0.18 + r / 26.0 * 0.45 + (-a_centre.y) / 14.0 * 0.3 + h * 0.08;
    if (a_kind > 1.5 && a_kind < 2.5) delay = 0.8 + h * 0.2;
    if (a_group > 1.5) delay = 0.62 + (a_group - 2.0) * 0.08;
    if (a_group > 0.5 && a_group < 1.5) delay = -1.0;
    float t = clamp((u_build * 1.3 - delay) / 0.22, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - t, 3.0);
    p = a_centre + (p - a_centre) * mix(0.3, 1.0, e);
    p.y -= (1.0 - e) * (7.0 + h * 9.0);
    v_show = step(0.001, t);
    if (a_group > 1.5) p.y += (second ? u_lift.y : u_lift.x) * u_slab.w;
    if (a_kind > 1.5 && a_kind < 2.5) p.y += sin(u_time * 0.9 + a_seed * 6.283) * 0.35;
    v_lit = band(n);
  }
  v_world = p;
  gl_Position = u_vp * vec4(p, 1.0);
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
varying float v_show;
varying vec2 v_uv;
varying float v_group;
varying float v_amount;
uniform float u_time;
uniform float u_build;
uniform float u_land;
uniform float u_home;
uniform vec3 u_origin;
uniform vec3 u_bg;
uniform vec3 u_ink;
uniform vec3 u_accent;
uniform vec3 u_hot;
uniform sampler2D u_tex0;
uniform sampler2D u_tex1;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main(){
  if (v_show < 0.5) discard;
  vec3 c = v_col * v_lit;
  float r = length(v_world.xz - u_origin.xz);
  if (v_kind > 0.5 && v_kind < 1.5) {
    // Signal runs outward from the socket, as far as the board has built.
    float on = step(r, u_build * 52.0 - 6.0);
    float ph = fract(r * 0.07 - u_time * 0.55 + v_seed * 0.37);
    c = mix(v_col * 0.35 * v_lit, mix(v_col * 0.7 * v_lit, u_hot, step(0.86, ph)), on);
  } else if (v_kind > 2.5 && v_kind < 3.5) {
    // Seed 1 holds steady (the dies); other lamps blink on their phase.
    float on = v_seed > 0.99 ? 1.0 : step(0.35, fract(u_time * 0.7 + v_seed));
    c = v_col * (0.55 + 0.45 * on);
  } else if (v_kind > 3.5 && v_kind < 4.5) {
    // Tiles: a darker seam between them; the touchdown ring runs out over them.
    vec2 g = abs(fract(v_world.xz / 2.0) - 0.5);
    c *= 1.0 - 0.2 * step(0.45, max(g.x, g.y));
    if (u_land < 1.4) {
      float rr = length(floor(v_world.xz * 2.0) / 2.0 + 0.25 - u_origin.xz);
      float ring = step(abs(rr - u_land * 24.0), 0.9);
      c = mix(c, u_accent, ring * step(0.0, 1.0 - u_land / 1.4));
    }
  } else if (v_kind > 6.5 && v_kind < 7.5) {
    // The pad: a beacon until the robot stands on it, then a steady glow.
    float beat = u_home > 0.5 ? 0.8 + 0.2 * step(0.5, fract(u_time * 0.6)) : 0.25 + 0.75 * step(0.55, fract(u_time * 1.4));
    c = mix(v_col * 0.4, u_accent, beat);
  } else if (v_kind > 8.5 && v_kind < 9.5) {
    // Rock: wavy strata by depth, a dark seam between them, ore specks.
    vec3 cell = floor(v_world * 2.0);
    float n = hash(cell.xz + cell.y * 17.0);
    float depth = v_world.y + 1.2 * sin(v_world.x * 0.23 + v_world.z * 0.17);
    float layer = floor(depth / 3.0);
    float tone = hash(vec2(layer, 2.7));
    vec3 stone = tone < 0.3 ? ${vec(ROCK[0])} : tone < 0.55 ? ${vec(ROCK[1])} : tone < 0.8 ? ${vec(ROCK[2])} : ${vec(ROCK[3])};
    c = stone * (0.86 + 0.14 * floor(n * 3.0)) * v_lit;
    if (fract(depth / 3.0) < 0.08) c = u_bg;
    else if (n > 0.975) c = u_accent * 0.6 * v_lit;
  } else if (v_kind > 9.5 && v_kind < 10.5) {
    c = (v_group > 2.5 ? texture2D(u_tex1, v_uv).rgb : texture2D(u_tex0, v_uv).rgb) * v_lit;
  } else if (v_kind > 10.5) {
    // The beam, screen-door dithered, densest at the die, a scanline climbing it.
    float h = v_uv.y;
    float scan = step(0.82, fract(h * 4.0 - u_time * 1.2));
    float a = (0.08 + 0.28 * (1.0 - h) + 0.22 * scan) * min(1.0, v_amount * 1.5);
    if (bayer4(gl_FragCoord.xy) >= a) discard;
    c = mix(u_ink * 0.85, u_accent, scan);
  }
  gl_FragColor = vec4(c, 1.0);
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

function texture(gl: WebGLRenderingContext, source: TexImageSource | null) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
  else {
    const bg = PALETTE.bg.map((v) => Math.round(v * 255));
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(bg));
  }
  return tex;
}

/** Depth range of the view, in voxels either side of the island's middle. */
const DEPTH = 100;

export type IslandFrame = {
  camera: IslandCamera;
  fit: Fit;
  /** 0..1, the board assembling. */
  build: number;
  time: number;
  /** Seconds since touchdown (large before it). */
  land: number;
  home: boolean;
  /** Per work: hologram projected (0..1) and chip lifted (0..1). */
  holo: [number, number];
  lift: [number, number];
};

export type IslandRenderer = {
  /** Stage size in CSS px and how many CSS px one render pixel spans. */
  resize: (width: number, height: number, pixel: number) => void;
  /** The works' captures, in order. */
  setScreens: (images: HTMLImageElement[]) => void;
  draw: (frame: IslandFrame) => void;
  dispose: () => void;
};

export function createIslandRenderer(canvas: HTMLCanvasElement): IslandRenderer | null {
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

  const stride = ISLAND_FLOATS * 4;
  const attribs = (
    [
      ["a_pos", 3, 0],
      ["a_nrm", 3, 3],
      ["a_col", 3, 6],
      ["a_kind", 1, 9],
      ["a_seed", 1, 10],
      ["a_centre", 3, 11],
      ["a_group", 1, 14],
    ] as const
  ).map(([name, size, offset]) => [gl.getAttribLocation(program, name), size, offset] as const);
  const upload = (data: Float32Array) => {
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return { buffer, count: data.length / ISLAND_FLOATS };
  };
  const drawBuffer = ({ buffer, count }: { buffer: WebGLBuffer; count: number }) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [loc, size, offset] of attribs) {
      if (loc < 0) continue;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset * 4);
    }
    gl.drawArrays(gl.TRIANGLES, 0, count);
  };
  const scene = upload(buildIsland());
  const holograms = upload(buildHolograms());

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uVp = u("u_vp");
  const uTime = u("u_time");
  const uBuild = u("u_build");
  const uLand = u("u_land");
  const uHome = u("u_home");
  const uHolo = u("u_holo");
  const uLift = u("u_lift");
  const uScale = u("u_scale");
  const uRight = u("u_right");
  const uUp = u("u_up");
  const uBack = u("u_back");
  const uScreen = [u("u_screen0"), u("u_screen1")];
  const uDie = [u("u_die0"), u("u_die1")];
  gl.uniform3f(u("u_origin"), SPOT[0], SPOT[1], SPOT[2]);
  gl.uniform4f(u("u_slab"), HOLO.w, HOLO.h, HOLO.depth, LIFT.chip);
  gl.uniform2f(u("u_grid"), HOLO.cols, HOLO.rows);
  gl.uniform3fv(u("u_bg"), PALETTE.bg);
  gl.uniform3fv(u("u_ink"), PALETTE.ink);
  gl.uniform3fv(u("u_accent"), PALETTE.accent);
  gl.uniform3fv(u("u_hot"), [1, 0.82, 0.6]);
  gl.uniform1i(u("u_tex0"), 0);
  gl.uniform1i(u("u_tex1"), 1);

  let screens = [texture(gl, null), texture(gl, null)];

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  let width = 1;
  let height = 1;

  return {
    resize(nextWidth, nextHeight, pixel) {
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      canvas.width = Math.ceil(width / pixel);
      canvas.height = Math.ceil(height / pixel);
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    setScreens(images) {
      screens.forEach((tex) => gl.deleteTexture(tex));
      screens = images.map((image) => texture(gl, image));
    },
    draw(frame) {
      const { right, up, back } = basis(frame.camera);
      const { k, cx, cy } = frame.fit;
      const sx = (2 * k) / width;
      const sy = (2 * k) / height;
      const vp: M4 = identity();
      vp[0] = right[0] * sx;
      vp[4] = right[1] * sx;
      vp[8] = right[2] * sx;
      vp[12] = -cx * sx;
      vp[1] = up[0] * sy;
      vp[5] = up[1] * sy;
      vp[9] = up[2] * sy;
      vp[13] = -cy * sy;
      vp[2] = -back[0] / DEPTH;
      vp[6] = -back[1] / DEPTH;
      vp[10] = -back[2] / DEPTH;

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(uVp, false, vp);
      gl.uniform1f(uTime, frame.time);
      gl.uniform1f(uBuild, frame.build);
      gl.uniform1f(uLand, frame.land);
      gl.uniform1f(uHome, frame.home ? 1 : 0);
      gl.uniform2f(uHolo, frame.holo[0], frame.holo[1]);
      gl.uniform2f(uLift, frame.lift[0], frame.lift[1]);
      gl.uniform2f(uScale, holoScale(frame.lift[0]), holoScale(frame.lift[1]));
      gl.uniform3fv(uRight, right);
      gl.uniform3fv(uUp, up);
      gl.uniform3fv(uBack, back);
      for (let work = 0; work < 2; work += 1) {
        gl.uniform3fv(uScreen[work], screenCentre(work, frame.lift[work]) as V3);
        gl.uniform3fv(uDie[work], die(work, frame.lift[work]) as V3);
        gl.activeTexture(gl.TEXTURE0 + work);
        gl.bindTexture(gl.TEXTURE_2D, screens[work] ?? screens[0]);
      }
      drawBuffer(scene);
      drawBuffer(holograms);
    },
    dispose() {
      screens.forEach((tex) => gl.deleteTexture(tex));
      gl.deleteBuffer(scene.buffer);
      gl.deleteBuffer(holograms.buffer);
      gl.deleteProgram(program);
    },
  };
}
