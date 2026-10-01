import { buildModuleMeshes, FLOATS_PER_VERTEX, type ModelRange } from "@/lib/modules/models";
import { chain, normalMatrix, rotateX, rotateY, scale } from "@/lib/mascot/math";

/*
 * Same banded sprite lighting as the mascot. On top of it, `u_build` stacks
 * the model up from the bottom: each voxel layer drops in from above in four
 * stepped increments, and layers that have not started yet are not drawn.
 * `u_dim` holds a model in stand-by while its row is not the active one.
 */
const VERT = `
attribute vec3 a_pos;
attribute vec3 a_nrm;
attribute vec3 a_col;
attribute float a_emi;
attribute float a_ord;
uniform mat4 u_mvp;
uniform mat3 u_rot;
uniform float u_build;
uniform float u_glow;
uniform float u_dim;
uniform vec2 u_offset;
uniform float u_solid;
varying vec3 v_col;
void main(){
  float t = clamp((u_build - a_ord * 0.65) / 0.35, 0.0, 1.0);
  t = floor(t * 4.0) / 4.0;
  if (t <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); v_col = vec3(0.0); return; }
  vec3 n = normalize(u_rot * a_nrm);
  vec3 L = normalize(vec3(-0.45, 0.8, 0.55));
  float d = max(dot(n, L), 0.0);
  float lit = floor((0.62 + 0.5 * d) * 4.0 + 0.5) / 4.0;
  vec3 c = min(a_col * lit, 1.0);
  c = mix(c, min(a_col * 1.3 + 0.18, 1.0), a_emi * u_glow);
  c *= mix(u_dim, 1.0, a_emi * 0.5);
  v_col = mix(c, vec3(0.078, 0.078, 0.075), u_solid);
  vec4 p = u_mvp * vec4(a_pos + vec3(0.0, (1.0 - t) * 8.0, 0.0), 1.0);
  gl_Position = vec4(p.xy + u_offset * p.w, p.z, p.w);
}
`;

const FRAG = `
precision mediump float;
varying vec3 v_col;
void main(){ gl_FragColor = vec4(v_col, 1.0); }
`;

/** Camera looks down onto the tool by this much, so the box ends read. */
const TILT = 0.42;
/** Share of the viewport the model may fill. */
const FILL = 0.86;

export type ModuleFrame = {
  model: number;
  /** Render target size in art pixels. */
  width: number;
  height: number;
  angle: number;
  build: number;
  glow: number;
  dim: number;
};

export type ModuleRenderer = {
  /** Draws one model and copies it into `target`'s top-left `width × height`. */
  render: (frame: ModuleFrame, target: CanvasRenderingContext2D) => void;
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

/**
 * One offscreen WebGL context serves every model slot in the section: each
 * slot is a small 2D canvas, and a frame is drawn into the corner of the
 * shared GL canvas and blitted across. Eight live contexts would be both
 * wasteful and past what some browsers allow.
 */
export function createModuleRenderer(codes: readonly string[]): ModuleRenderer | null {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  });
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

  const { data, models } = buildModuleMeshes(codes);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  const stride = FLOATS_PER_VERTEX * 4;
  const attribs: [string, number, number][] = [
    ["a_pos", 3, 0],
    ["a_nrm", 3, 3],
    ["a_col", 3, 6],
    ["a_emi", 1, 9],
    ["a_ord", 1, 10],
  ];
  for (const [name, size, offset] of attribs) {
    const loc = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset * 4);
  }

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uMvp = u("u_mvp");
  const uRot = u("u_rot");
  const uBuild = u("u_build");
  const uGlow = u("u_glow");
  const uDim = u("u_dim");
  const uOffset = u("u_offset");
  const uSolid = u("u_solid");
  const OUTLINE: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.SCISSOR_TEST);

  /** Orthographic fit of a model's turntable silhouette into the viewport. */
  const fit = (model: ModelRange, width: number, height: number) => {
    const projW = model.radius * 2;
    const projH = model.height * Math.cos(TILT) + model.radius * 2 * Math.sin(TILT);
    // Whole art pixels per voxel keep the faces crisp.
    return Math.max(1, Math.floor(Math.min((width * FILL) / projW, (height * FILL) / projH)));
  };

  return {
    render(frame, target) {
      const model = models[frame.model];
      if (!model) return;
      const { width, height } = frame;
      if (canvas.width < width || canvas.height < height) {
        canvas.width = Math.max(canvas.width, width);
        canvas.height = Math.max(canvas.height, height);
      }

      const px = fit(model, width, height);
      const rot = chain(rotateX(TILT), rotateY(frame.angle));
      const mvp = chain(scale((2 * px) / width, (2 * px) / height, -1 / 48), rot);

      gl.viewport(0, 0, width, height);
      gl.scissor(0, 0, width, height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(uMvp, false, mvp);
      gl.uniformMatrix3fv(uRot, false, normalMatrix(rot));
      gl.uniform1f(uBuild, frame.build);
      gl.uniform1f(uGlow, frame.glow);
      gl.uniform1f(uDim, frame.dim);

      // A one-pixel dark outline first, as on the mascot, then the model.
      gl.disable(gl.DEPTH_TEST);
      gl.uniform1f(uSolid, 1);
      for (const [dx, dy] of OUTLINE) {
        gl.uniform2f(uOffset, (dx * 2) / width, (dy * 2) / height);
        gl.drawArrays(gl.TRIANGLES, model.first, model.count);
      }
      gl.enable(gl.DEPTH_TEST);
      gl.uniform1f(uSolid, 0);
      gl.uniform2f(uOffset, 0, 0);
      gl.drawArrays(gl.TRIANGLES, model.first, model.count);

      // GL rows start at the bottom; the drawn corner is the canvas' last rows.
      target.clearRect(0, 0, width, height);
      target.drawImage(canvas, 0, canvas.height - height, width, height, 0, 0, width, height);
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
