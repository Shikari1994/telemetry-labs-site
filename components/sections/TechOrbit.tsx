"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { orbitTags, type OrbitWork } from "@/data/home";

/** CSS px per art pixel of the wireframe. */
const PIXEL = 3;
/** Camera distance in sphere radii; smaller means stronger perspective. */
const CAMERA = 3.2;
/** Idle spin, radians per second. */
const BASE_SPIN = 0.22;
const REST_PITCH = -0.28;
const RING_SAMPLES = 72;

const legend: [OrbitWork, string][] = [
  ["site", "geo-tn.com"],
  ["monitor", "Drill Monitor"],
  ["both", "обе работы"],
];

type Vec = [number, number, number];

/**
 * The technology orbit: the works' stack as tags on a rotating sphere, with
 * a dotted wireframe globe and an orbit ring drawn at a coarse pixel grid on
 * a 2D canvas. Tags are real text, projected with the same camera as the
 * dots, so they always face the viewer and shrink and dim as they turn away.
 *
 * The pointer steers the spin and the pitch; scroll speed kicks the spin.
 * Frames run on the GSAP ticker only while the stage is on screen, and every
 * write is a direct style write, never React state. Without JavaScript the
 * tags are a plain wrapped list; reduced motion draws one still frame.
 */
export function TechOrbit() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = stage?.querySelector("canvas");
    const ctx = canvas?.getContext("2d");
    if (!stage || !canvas || !ctx) return;
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tags = gsap.utils.toArray<HTMLElement>("[data-orbit-tag]", stage);

    /* Tag anchors on a Fibonacci sphere: even spacing for any count. */
    const golden = Math.PI * (3 - Math.sqrt(5));
    const anchors: Vec[] = tags.map((_, i) => {
      const y = 1 - (2 * (i + 0.5)) / tags.length;
      const r = Math.sqrt(1 - y * y);
      return [Math.cos(i * golden) * r, y, Math.sin(i * golden) * r];
    });

    /* Wireframe: five parallels (the equator is marked) and six meridians. */
    const wire: { p: Vec; equator: boolean }[] = [];
    for (let band = -2; band <= 2; band += 1) {
      const y = band / 3;
      const r = Math.sqrt(1 - y * y);
      for (let k = 0; k < RING_SAMPLES; k += 1) {
        const a = (k / RING_SAMPLES) * Math.PI * 2;
        wire.push({ p: [Math.cos(a) * r, y, Math.sin(a) * r], equator: band === 0 });
      }
    }
    for (let m = 0; m < 6; m += 1) {
      const a = (m / 6) * Math.PI;
      for (let k = 0; k < RING_SAMPLES; k += 1) {
        const b = (k / RING_SAMPLES) * Math.PI * 2;
        wire.push({ p: [Math.cos(b) * Math.cos(a), Math.sin(b), Math.cos(b) * Math.sin(a)], equator: false });
      }
    }
    /* A tilted orbit ring around the globe, with one satellite on it. */
    const orbit: Vec[] = [];
    const ORBIT_R = 1.32;
    const ORBIT_TILT = 0.42;
    const onOrbit = (a: number): Vec => {
      const x = Math.cos(a) * ORBIT_R;
      const z = Math.sin(a) * ORBIT_R;
      return [x, z * Math.sin(ORBIT_TILT), z * Math.cos(ORBIT_TILT)];
    };
    for (let k = 0; k < RING_SAMPLES * 2; k += 1) orbit.push(onOrbit((k / (RING_SAMPLES * 2)) * Math.PI * 2));

    let width = 0;
    let height = 0;
    let radius = 0;
    let colors = { dim: "#5e5d59", mid: "#87867f", accent: "#e2733f", ink: "#faf9f5" };

    const measure = () => {
      const box = stage.getBoundingClientRect();
      width = box.width;
      height = box.height;
      canvas.width = Math.max(1, Math.floor(width / PIXEL));
      canvas.height = Math.max(1, Math.floor(height / PIXEL));
      radius = Math.min(width, height) * 0.34;
      const css = getComputedStyle(document.documentElement);
      const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
      colors = {
        dim: read("--ink-4", colors.dim),
        mid: read("--ink-3", colors.mid),
        accent: read("--accent", colors.accent),
        ink: read("--ink", colors.ink),
      };
    };

    let yaw = 0.6;
    let pitch = REST_PITCH;
    let spin = BASE_SPIN;
    let kick = 0;
    let satellite = 0;
    const pointer = { x: 0, y: 0 };

    const rotate = ([x, y, z]: Vec): Vec => {
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
    };
    /** Screen position in CSS px and the perspective scale; +z faces the viewer. */
    const project = ([x, y, z]: Vec) => {
      const s = CAMERA / (CAMERA - z);
      return [width / 2 + x * radius * s, height / 2 + y * radius * s, s] as const;
    };

    const dot = (p: Vec, color: string, size = 1) => {
      const [sx, sy] = project(rotate(p));
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(sx / PIXEL), Math.floor(sy / PIXEL), size, size);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Back half first and faint, so the globe reads as a solid volume.
      for (const pass of [0, 1]) {
        for (const { p, equator } of wire) {
          const front = rotate(p)[2] >= 0;
          if (front !== (pass === 1)) continue;
          ctx.globalAlpha = front ? 1 : 0.4;
          dot(p, equator ? colors.accent : front ? colors.mid : colors.dim);
        }
      }
      ctx.globalAlpha = 0.75;
      for (const p of orbit) dot(p, colors.dim);
      ctx.globalAlpha = 1;
      dot(onOrbit(satellite), colors.accent, 3);

      tags.forEach((tag, i) => {
        const r = rotate(anchors[i]);
        const [sx, sy, s] = project(r);
        const depth = (r[2] + 1) / 2;
        tag.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(s * 0.92).toFixed(3)})`;
        tag.style.opacity = (0.22 + 0.78 * depth).toFixed(2);
        tag.style.zIndex = String(Math.round(depth * 100));
      });
    };

    const tick = (_time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 50) / 1000;
      const ease = Math.min(1, dt * 3);
      spin += (BASE_SPIN + pointer.x * 1.3 - spin) * ease;
      kick *= Math.pow(0.04, dt);
      yaw += (spin + kick) * dt;
      pitch += (REST_PITCH + pointer.y * 0.55 - pitch) * ease;
      satellite += dt * 0.9;
      draw();
    };

    stage.classList.add("is-3d");
    measure();
    draw();

    const resize = new ResizeObserver(() => {
      measure();
      draw();
    });
    resize.observe(stage);

    if (reduced) {
      return () => {
        resize.disconnect();
        stage.classList.remove("is-3d");
      };
    }

    let running = false;
    const setRunning = (next: boolean) => {
      if (next === running) return;
      running = next;
      if (running) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    };
    const trigger = ScrollTrigger.create({
      trigger: stage,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => setRunning(self.isActive),
      onUpdate: (self) => {
        kick = gsap.utils.clamp(-2.4, 2.4, kick + self.getVelocity() / 9000);
      },
    });
    setRunning(trigger.isActive);

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const box = stage.getBoundingClientRect();
      pointer.x = gsap.utils.clamp(-1, 1, ((event.clientX - box.left) / box.width) * 2 - 1);
      pointer.y = gsap.utils.clamp(-1, 1, ((event.clientY - box.top) / box.height) * 2 - 1);
    };
    const onLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);

    return () => {
      setRunning(false);
      trigger.kill();
      resize.disconnect();
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      stage.classList.remove("is-3d");
      tags.forEach((tag) => tag.removeAttribute("style"));
    };
  }, []);

  return (
    <div className="orbit">
      <div className="tuiWin orbitWin">
        <p className="tuiWinBar" aria-hidden="true">
          <span>STACK / {orbitTags.length}</span>
        </p>
        <div className="orbitStage" ref={stageRef} data-orbit>
          <canvas className="orbitCanvas" aria-hidden="true" />
          <ul className="orbitTags" aria-label="Технологии обеих работ">
            {orbitTags.map((tag) => (
              <li className="orbitTag" data-work={tag.work} data-orbit-tag key={tag.label}>
                {tag.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="orbitLegend">
        {legend.map(([work, label]) => (
          <span data-work={work} key={work}>
            <i aria-hidden="true" />
            {label}
          </span>
        ))}
      </p>
    </div>
  );
}
