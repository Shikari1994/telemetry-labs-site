"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cursor-reactive halftone field for the footer (blueprint §6 row 14).
 *
 * Deliberately raw WebGL rather than Three.js: the effect is a single
 * full-quad fragment shader, so pulling in a scene graph would cost far more
 * transfer than the scene itself. Contract from §6/§14:
 *   - lazy init (nothing runs until the footer is near the viewport)
 *   - DPR capped so high-DPI screens do not render 4x the pixels
 *   - destroyed on unmount, paused when hidden or offscreen
 *   - static poster remains underneath as the graceful fallback
 * Reduced-motion skips the canvas entirely and keeps the poster.
 */

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

/* Halftone signal field. The screen is cut into square cells; each cell draws
   one dot whose radius is the signal intensity sampled at the cell centre, so
   the waves read as a dot-matrix print. The pointer acts as a lens that swells
   nearby dots and tints them toward the accent. */
const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_ptr;
uniform float u_cell;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float line(vec2 uv, float off, float freq, float amp){
  float y = 0.52 + sin(uv.x * freq + u_time * 0.5 + off) * amp
                 + sin(uv.x * freq * 0.5 - u_time * 0.3 + off) * amp * 0.6;
  return max(0.0, 1.0 - abs(uv.y - y) / 0.06);
}

void main(){
  vec2 cellId = floor(gl_FragCoord.xy / u_cell);
  vec2 center = (cellId + 0.5) * u_cell;
  vec2 uv = center / u_res;

  vec2 aspect = vec2(u_res.x / u_res.y, 1.0);
  vec2 dp = (uv - u_ptr) * aspect;
  float pull = exp(-dot(dp, dp) * 18.0);

  float s = line(uv, 0.0, 9.0, 0.07) * 0.9
          + line(uv, 1.7, 7.0, 0.06) * 0.55
          + line(uv, 3.4, 11.0, 0.05) * 0.4;
  s = clamp(s + pull * 0.55, 0.0, 1.0);

  // Sparse twinkling dust between the waves.
  float h = hash(cellId);
  float dust = step(0.985, h) * (0.5 + 0.5 * sin(u_time * 1.7 + h * 40.0)) * 0.28;

  float radius = max(s * 0.42, dust) * u_cell;
  float d = length(gl_FragCoord.xy - center);
  float a = smoothstep(radius + 0.8, radius - 0.8, d);

  vec3 grey = vec3(0.529, 0.525, 0.498);
  vec3 accent = vec3(0.886, 0.451, 0.247);
  // Mostly grey print; the accent is kept for the crest and the pointer lens.
  vec3 col = mix(grey, accent, clamp(smoothstep(0.9, 1.0, s) * 0.6 + pull * 0.85, 0.0, 1.0));

  gl_FragColor = vec4(col, a * (0.25 + 0.6 * max(s, dust * 2.0)));
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

export function SignalFieldCanvas({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  /* Only mount the canvas once the footer is actually approaching. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const host = hostRef.current;
    if (!host) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!live) return;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return; // poster stays visible — graceful fallback

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uPtr = gl.getUniformLocation(program, "u_ptr");
    const uCell = gl.getUniformLocation(program, "u_cell");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    /* §14: clamp DPR so retina screens do not quadruple the fill cost. */
    const DPR_CAP = 1.75;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const w = Math.max(1, Math.round(host.clientWidth * dpr));
      const h = Math.max(1, Math.round(host.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uCell, Math.round(14 * dpr));
    };
    resize();

    /* Pointer is smoothed toward the target rather than applied raw. */
    /* Parked far off-canvas until the pointer arrives, so no lens sits idle. */
    const target = { x: -2, y: -2 };
    const current = { x: -2, y: -2 };
    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      target.x = (event.clientX - rect.left) / rect.width;
      target.y = 1 - (event.clientY - rect.top) / rect.height;
    };
    const onLeave = () => {
      target.x = -2;
      target.y = -2;
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    let frame = 0;
    let running = true;
    const start = performance.now();

    const render = () => {
      if (!running) return;
      // Jump in from the parked position instead of sweeping across the field.
      if (current.x < -1 && target.x >= -1) {
        current.x = target.x;
        current.y = target.y;
      }
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.uniform2f(uPtr, current.x, current.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = requestAnimationFrame(render);
    };

    /* Pause offscreen and on hidden tabs (§14 "animation hidden tab"). */
    let onscreen = true;
    const setRunning = (next: boolean) => {
      if (next === running) return;
      running = next;
      if (running) frame = requestAnimationFrame(render);
      else cancelAnimationFrame(frame);
    };
    const sync = () => setRunning(onscreen && !document.hidden);

    const vis = new IntersectionObserver((entries) => {
      onscreen = entries.some((entry) => entry.isIntersecting);
      sync();
    });
    vis.observe(host);
    document.addEventListener("visibilitychange", sync);

    const onResize = () => resize();
    window.addEventListener("resize", onResize, { passive: true });

    frame = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      vis.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("resize", onResize);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [live]);

  return (
    <div className={`signalField${className ? ` ${className}` : ""}`} ref={hostRef} aria-hidden="true">
      {live ? <canvas className="signalFieldCanvas" ref={canvasRef} /> : null}
    </div>
  );
}
