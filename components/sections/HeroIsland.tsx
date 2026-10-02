"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AlphaVideo } from "@/components/media/AlphaVideo";
import { AnchorLink } from "@/components/layout/AnchorLink";
import { PixelMark } from "@/components/pixel/PixelMark";
import { works } from "@/data/home";
import { HOLO, ISLAND_CAMERA, MASCOT_VOXEL, SPOT, basis, fitIsland, holoScale, screenCentre, toStage, type Fit } from "@/lib/hero/island";
import { createIslandRenderer, type IslandFrame } from "@/lib/hero/renderer";
import { island } from "@/lib/hero/state";
import { getMediaAsset } from "@/lib/media/manifest";

/** CSS px per render pixel: the island is drawn small and scaled up crisp. */
const PIXEL = 2;
/** Room above the holograms for their title bars, CSS px. */
const TITLE = 34;
/** Seconds to project a hologram, and to pull it back into its chip. */
const HOLO_UP = 1.1;
const HOLO_DOWN = 0.35;
/** The second hologram starts this much after the first. */
const HOLO_STAGGER = 0.3;
/** With nobody pointing, the other work takes the front this often. */
const CYCLE_MS = 6500;

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

/**
 * The hero object: a floating chunk of the site's voxel circuit board in
 * WebGL (lib/hero). The mascot lands on its socket after its opening shot;
 * the touchdown ("lights", MotionProvider) assembles the board out of the
 * socket, and once it stands each work's chip projects its hologram.
 *
 * Over each hologram lies the work itself as a DOM link: its capture, live
 * while it is the current work (AlphaVideo), under a title bar. The link is
 * laid exactly over the slab from the frame's camera and shows once the slab
 * has assembled, so the screen stays sharp and readable. The current work's
 * chip stands higher and its screen at full size, the other's a step smaller;
 * the current one is the one under the cursor or in focus, and with
 * nobody pointing the other takes over every few seconds, its hologram
 * pulled back into the chip and projected again. The mascot points out each
 * change (`data-current`, its station's aim).
 *
 * The camera follows the pointer by a few degrees and pitches down as the
 * hero scrolls away (island.dolly). Positions are written as styles on the
 * GSAP ticker, never React state; the only state is which work plays live.
 * Under reduced motion the island is drawn once, built, with both screens
 * up; without WebGL the works stand as two plain screens.
 */
export function HeroIsland() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spotRef = useRef<HTMLSpanElement>(null);
  const [live, setLive] = useState(-1);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const spot = spotRef.current;
    if (!stage || !canvas || !spot) return;
    const links = Array.from(stage.querySelectorAll<HTMLAnchorElement>("[data-island-work]"));
    const show = (el: HTMLElement, on: boolean) => {
      if (on !== ("shown" in el.dataset)) el.toggleAttribute("data-shown", on);
    };

    const renderer = createIslandRenderer(canvas);
    if (!renderer) {
      stage.classList.add("is-flat");
      links.forEach((el) => show(el, true));
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let alive = true;

    const holo: [number, number] = [0, 0];
    const lift: [number, number] = [0, 0];
    const want = [0, 0];
    let startAt = -1;
    let current = -1;
    let hovered = -1;
    let cycleAt = 0;
    const setCurrent = (next: number) => {
      if (next === current) return;
      current = next;
      links.forEach((el, i) => el.toggleAttribute("data-current", i === next));
      setLive(reduced ? -1 : next);
    };
    if (reduced) {
      island.build = 1;
      holo.fill(1);
      lift.fill(0.3);
      setCurrent(0);
    }

    let width = 1;
    let height = 1;
    let fit: Fit = { k: 1, cx: 0, cy: 0 };
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
    const startedAt = performance.now();
    const written = new Map<HTMLElement, string>();
    const place = (el: HTMLElement, css: string) => {
      if (written.get(el) === css) return;
      written.set(el, css);
      el.style.cssText = css;
    };

    const frame = (now: number): IslandFrame => {
      const camera = {
        yaw: ISLAND_CAMERA.yaw + parallax.x * 0.09,
        pitch: ISLAND_CAMERA.pitch + parallax.y * 0.05 + island.dolly * 0.45,
      };
      // The works and the socket follow the camera, in stage px.
      const b = basis(camera);
      links.forEach((el, i) => {
        const c = toStage(screenCentre(i, lift[i]), b, fit, width, height);
        const w = Math.round(HOLO.w * holoScale(lift[i]) * fit.k);
        const h = Math.round(HOLO.h * holoScale(lift[i]) * fit.k);
        place(el, `transform:translate(${Math.round(c.x - w / 2)}px,${Math.round(c.y - h / 2)}px);width:${w}px;height:${h}px`);
        show(el, holo[i] >= 1);
      });
      const s = toStage(SPOT, b, fit, width, height);
      const voxel = Math.max(1, Math.round(fit.k * MASCOT_VOXEL));
      place(spot, `transform:translate(${Math.round(s.x - voxel / 2)}px,${Math.round(s.y)}px);width:${voxel}px`);
      return {
        camera,
        fit,
        build: island.build,
        time: (now - startedAt) / 1000,
        land: island.landedAt < 0 ? 99 : (now - island.landedAt) / 1000,
        home: island.home,
        holo,
        lift,
      };
    };

    let dirty = true;
    const resize = () => {
      width = Math.max(1, stage.clientWidth);
      height = Math.max(1, stage.clientHeight);
      fit = fitIsland(width, height, TITLE);
      renderer.resize(width, height, PIXEL);
      dirty = true;
      if (reduced) renderer.draw(frame(performance.now()));
    };
    resize();
    // Before the first tick, so the mascot finds the socket where it is drawn.
    frame(performance.now());
    const observer = new ResizeObserver(resize);
    observer.observe(stage);

    Promise.all(works.map((work) => load(`${BASE_PATH}${getMediaAsset(work.media).poster}`)))
      .then((images) => {
        if (!alive) return;
        renderer.setScreens(images);
        dirty = true;
        if (reduced) renderer.draw(frame(performance.now()));
      })
      .catch(() => undefined);

    if (reduced) {
      return () => {
        alive = false;
        observer.disconnect();
        renderer.dispose();
      };
    }

    /* Pointer and focus pick the current work; leaving hands it back to the cycle. */
    const offs = links.flatMap((el, i) => {
      const enter = (event: Event) => {
        if (event instanceof PointerEvent && event.pointerType !== "mouse") return;
        hovered = i;
        if (startAt >= 0) setCurrent(i);
      };
      const leave = () => {
        if (hovered === i) hovered = -1;
        cycleAt = performance.now() + CYCLE_MS;
      };
      const pairs: [string, EventListener][] = [
        ["pointerenter", enter],
        ["focus", enter],
        ["pointerleave", leave],
        ["blur", leave],
      ];
      pairs.forEach(([type, fn]) => el.addEventListener(type, fn));
      return pairs.map(([type, fn]) => () => el.removeEventListener(type, fn));
    });
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      parallax.tx = (event.clientX / window.innerWidth) * 2 - 1;
      parallax.ty = (event.clientY / window.innerHeight) * 2 - 1;
    };
    if (!coarse) window.addEventListener("pointermove", onMove, { passive: true });

    const watch = ScrollTrigger.create({ trigger: stage, start: "top bottom", end: "bottom top" });

    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!watch.isActive && !dirty) return;
      dirty = false;

      // The chips project once the board stands.
      if (startAt < 0 && island.build >= 1) {
        startAt = now;
        cycleAt = now + CYCLE_MS;
        setCurrent(hovered >= 0 ? hovered : 0);
      }
      if (startAt >= 0) {
        // Nobody pointing: the other work takes the front, its hologram pulled
        // back into the chip and projected anew.
        if (hovered < 0 && now > cycleAt && holo[0] >= 1 && holo[1] >= 1) {
          const next = 1 - current;
          want[next] = 0;
          setCurrent(next);
          cycleAt = now + CYCLE_MS;
        }
        for (let i = 0; i < 2; i += 1) {
          if (want[i] === 0 && holo[i] === 0 && now - startAt > i * HOLO_STAGGER * 1000) want[i] = 1;
          if (want[i] > holo[i]) holo[i] = Math.min(want[i], holo[i] + dt / HOLO_UP);
          else if (want[i] < holo[i]) holo[i] = Math.max(want[i], holo[i] - dt / HOLO_DOWN);
          const to = i === current ? 1 : 0.3;
          lift[i] += (to - lift[i]) * (1 - Math.exp(-dt * 6));
        }
      }
      parallax.x += (parallax.tx - parallax.x) * (1 - Math.exp(-dt * 5));
      parallax.y += (parallax.ty - parallax.y) * (1 - Math.exp(-dt * 5));
      renderer.draw(frame(now));
    };
    gsap.ticker.add(tick);

    return () => {
      alive = false;
      gsap.ticker.remove(tick);
      offs.forEach((off) => off());
      window.removeEventListener("pointermove", onMove);
      watch.kill();
      observer.disconnect();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="island" ref={stageRef} data-island>
      <canvas className="islandCanvas" ref={canvasRef} aria-hidden="true" />
      {/* The mascot stands here; its width is the mascot's voxel size. */}
      <span className="islandSpot" ref={spotRef} data-island-spot>
        {/* Without motion the realtime mascot is off; its sprite stands in. */}
        <span className="islandStatic" aria-hidden="true">
          <PixelMark cell={5} animated={false} />
        </span>
      </span>
      {works.map((work, i) => (
        <AnchorLink className="islandWork" to={work.caseId} data-island-work aria-label={`${work.title} — к кейсу`} key={work.id}>
          <span className="islandTitle">
            <b>{work.index}</b>
            <span>{work.title}</span>
            <i aria-hidden="true">↘</i>
          </span>
          <span className="islandScreen">
            <AlphaVideo id={work.media} live={live === i} />
          </span>
        </AnchorLink>
      ))}
    </div>
  );
}
