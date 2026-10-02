"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { siteShowcase } from "@/data/home";
import { getMediaAsset } from "@/lib/media/manifest";
import { createShowcaseRenderer } from "@/lib/showcase/renderer";
import { showcase } from "@/lib/showcase/state";

// Next.js rewrites `basePath` only into next/image and next/link; a plain Image
// needs it spelled out, or on Pages the posters 404 and the ring stays CSS.
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
 * Case 01's screen in WebGL (lib/showcase): the capture in front as a slab of
 * voxels that tumbles to the next one as the ring scrub turns. With motion
 * only; it takes over the stage once every capture has loaded, and until
 * then (and under reduced motion or without WebGL) the CSS ring underneath
 * is the scene. It reads the scrub from lib/showcase/state on
 * the GSAP ticker and draws only while the section is on screen and
 * something changed.
 */
export function ShowcaseScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const stage = canvas?.closest<HTMLElement>("[data-ring-stage]");
    const section = canvas?.closest<HTMLElement>("[data-ring]");
    if (!canvas || !stage || !section) return;
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const renderer = createShowcaseRenderer(canvas);
      if (!renderer) return;
      let alive = true;
      let ready = false;
      let visible = false;
      let dirty = true;

      Promise.all(siteShowcase.map((item) => load(`${BASE_PATH}${getMediaAsset(item.shot).poster}`)))
        .then((images) => {
          if (!alive) return;
          renderer.setScreens(images);
          ready = true;
          dirty = true;
          stage.classList.add("is-gl");
        })
        .catch(() => undefined);

      const resize = () => {
        renderer.resize(stage.clientWidth, stage.clientHeight, Math.min(2, window.devicePixelRatio || 1));
        dirty = true;
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(stage);

      const watch = ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          visible = self.isActive;
          dirty = true;
        },
      });
      visible = watch.isActive;

      let drawn = "";
      const tick = () => {
        if (!ready || !visible) return;
        const state = `${showcase.screen}|${showcase.turn.toFixed(4)}|${showcase.intro.toFixed(4)}`;
        if (!dirty && state === drawn) return;
        drawn = state;
        dirty = false;
        renderer.draw(showcase.screen, showcase.turn, showcase.intro);
      };
      gsap.ticker.add(tick);

      return () => {
        alive = false;
        gsap.ticker.remove(tick);
        observer.disconnect();
        watch.kill();
        stage.classList.remove("is-gl");
        renderer.dispose();
      };
    });
    return () => mm.revert();
  }, []);

  return <canvas className="showcaseScene" ref={ref} aria-hidden="true" />;
}
