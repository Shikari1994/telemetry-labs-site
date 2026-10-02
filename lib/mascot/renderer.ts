import { buildMascotMesh, FLOATS_PER_VERTEX, type PartId } from "@/lib/mascot/model";
import { normalMatrix, type M4 } from "@/lib/mascot/math";

/*
 * Flat, banded lighting: each face gets one of four light steps so the voxels
 * read like hand-shaded sprite pixels rather than smooth 3D. Material kinds
 * (see model.ts) add the living details: emitters pulse with u_glow, charge
 * cells light with u_charge, the screen glass powers up with u_screen and
 * carries faint scanlines.
 *
 * Close-up parts (hd.ts) are lit the same way but dithered: the light falls
 * off down the part and the steps between bands are broken with a 4 × 4
 * Bayer pattern on the render grid, the glass carries a vignette and a
 * reflection, and scanlines run across the screen at render-pixel pitch.
 *
 * The same program draws a one-pixel outline first: the silhouette is stamped
 * in the page background colour, nudged one render pixel in each direction,
 * so the character stays legible over busy posters.
 *
 * With `hole` on, the glass is cut out of the canvas (transparent), so the
 * page shows through the screen: the 06 stack board is laid out under it.
 */
const VERT = `
attribute vec3 a_pos;
attribute vec3 a_nrm;
attribute vec3 a_col;
attribute float a_kind;
uniform mat4 u_mvp;
uniform mat3 u_rot;
uniform vec2 u_offset;
varying vec3 v_col;
varying vec3 v_base;
varying vec3 v_local;
varying float v_kind;
varying float v_light;
void main(){
  vec3 n = normalize(u_rot * a_nrm);
  vec3 L = normalize(vec3(-0.45, 0.8, 0.55));
  float d = max(dot(n, L), 0.0);
  v_light = 0.62 + 0.5 * d;
  float lit = floor(v_light * 4.0 + 0.5) / 4.0;
  v_col = min(a_col * lit, 1.0);
  v_base = a_col;
  v_local = a_pos;
  v_kind = a_kind;
  vec4 p = u_mvp * vec4(a_pos, 1.0);
  gl_Position = vec4(p.xy + u_offset * p.w, p.z, p.w);
}
`;

const FRAG = `
precision mediump float;
varying vec3 v_col;
varying vec3 v_base;
varying vec3 v_local;
varying float v_kind;
varying float v_light;
uniform float u_glow;
uniform float u_charge;
uniform float u_screen;
uniform float u_solid;
uniform float u_dither;
uniform float u_hole;
uniform vec2 u_shade;
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main(){
  if (u_hole > 0.5 && u_solid < 0.5 && v_kind > 7.5) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec3 c = v_col;
  float b = bayer4(gl_FragCoord.xy);
  float scanRow = mod(floor(gl_FragCoord.y), 2.0);
  if (u_dither > 0.5) {
    // The face's own band, then the fall-off across it, dithered.
    float band = floor(v_light * 4.0 + 0.5) + clamp((v_local.y - u_shade.x) / u_shade.y, -1.0, 1.0) * 0.8;
    c = min(v_base * floor(band + b) / 4.0, 1.0);
  }
  if (v_kind > 0.5 && v_kind < 1.5) {
    c = mix(c, min(v_base * 1.3 + 0.18, 1.0), u_glow);
  } else if (v_kind > 2.5 && v_kind < 6.5) {
    c = u_charge * 4.0 > v_kind - 2.5 ? min(v_base * 1.25 + 0.1, 1.0) : v_base * 0.3;
  } else if (v_kind > 6.5 && v_kind < 7.5) {
    c = v_base * (u_dither > 0.5 && scanRow > 0.5 ? 0.86 : 1.0);
  } else if (v_kind > 7.5 && u_dither > 0.5) {
    // Glass: brighter in the middle, a reflection across the top left.
    vec2 g = vec2(v_local.x / 5.5, (v_local.y - 5.0) / 4.0);
    float lum = 1.0 - dot(g, g) * 0.42;
    float sweep = g.y - g.x * 0.55;
    lum += (sweep > 0.95 && sweep < 1.2) || (sweep > 1.32 && sweep < 1.4) ? 0.55 : 0.0;
    float stepL = floor(lum * 3.0 + b) / 3.0;
    vec3 on = (v_base + vec3(0.03, 0.09, 0.03)) * mix(0.55, 1.45, stepL);
    vec3 off = v_base * mix(0.45, 1.6, stepL);
    c = mix(off, on, u_screen) * (scanRow > 0.5 ? 0.82 : 1.0);
  } else if (v_kind > 7.5) {
    float scan = mod(floor(v_local.y * 2.0), 2.0) > 0.5 ? 0.8 : 1.0;
    c = mix(v_base * 0.6, v_base + vec3(0.03, 0.09, 0.03), u_screen) * scan;
  }
  gl_FragColor = vec4(mix(c, vec3(0.078, 0.078, 0.075), u_solid), 1.0);
}
`;

export type PartDraw = {
  id: PartId;
  mvp: M4;
  rot: M4;
  /** Close-up shading: the light falls off from `y` (part space) over
      `span` either way, dithered. Omitted = the sprite's flat bands. */
  shade?: { y: number; span: number };
};

/** Screen: 0 off … 1 powered. Hole: the glass cut out, the page behind it. */
export type DrawState = { glow: number; charge: number; screen: number; hole?: boolean };

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

export type MascotRenderer = {
  resize: (width: number, height: number) => void;
  clear: () => void;
  draw: (parts: PartDraw[], state: DrawState) => void;
  dispose: () => void;
};

export function createMascotRenderer(canvas: HTMLCanvasElement): MascotRenderer | null {
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

  const mesh = buildMascotMesh();
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);

  const stride = FLOATS_PER_VERTEX * 4;
  const attribs: [string, number, number][] = [
    ["a_pos", 3, 0],
    ["a_nrm", 3, 3],
    ["a_col", 3, 6],
    ["a_kind", 1, 9],
  ];
  for (const [name, size, offset] of attribs) {
    const loc = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset * 4);
  }

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uMvp = u("u_mvp");
  const uRot = u("u_rot");
  const uGlow = u("u_glow");
  const uScreen = u("u_screen");
  const uCharge = u("u_charge");
  const uOffset = u("u_offset");
  const uSolid = u("u_solid");
  const uDither = u("u_dither");
  const uShade = u("u_shade");
  const uHole = u("u_hole");
  const OUTLINE: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  return {
    resize(width, height) {
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    },
    clear() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    },
    draw(parts, state) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform1f(uGlow, state.glow);
      gl.uniform1f(uCharge, state.charge);
      gl.uniform1f(uScreen, state.screen);
      gl.uniform1f(uHole, state.hole ? 1 : 0);
      const drawAll = () => {
        for (const part of parts) {
          const range = mesh.parts[part.id];
          gl.uniformMatrix4fv(uMvp, false, part.mvp);
          gl.uniformMatrix3fv(uRot, false, normalMatrix(part.rot));
          gl.uniform1f(uDither, part.shade ? 1 : 0);
          if (part.shade) gl.uniform2f(uShade, part.shade.y, part.shade.span);
          gl.drawArrays(gl.TRIANGLES, range.first, range.count);
        }
      };

      gl.disable(gl.DEPTH_TEST);
      gl.uniform1f(uSolid, 1);
      for (const [dx, dy] of OUTLINE) {
        gl.uniform2f(uOffset, (dx * 2) / canvas.width, (dy * 2) / canvas.height);
        drawAll();
      }

      gl.enable(gl.DEPTH_TEST);
      gl.uniform1f(uSolid, 0);
      gl.uniform2f(uOffset, 0, 0);
      drawAll();
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
