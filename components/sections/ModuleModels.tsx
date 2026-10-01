"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createModuleRenderer } from "@/lib/modules/renderer";

/**
 * Drives the voxel module models of the 03 section. Two kinds of slot share
 * one renderer:
 *
 * - `bay` (desktop aside): shows the module on the focal line. Whenever the
 *   active row changes, or the bay scrolls back into view, the model is
 *   stacked up again from the bottom.
 * - a row index (≤1180px, where the aside is not sticky): each row carries its
 *   own model, and its assembly is scrubbed by the row's way up the viewport.
 *
 * The active row comes from MotionProvider through `data-active-module` on
 * the section. Frames are drawn on the GSAP ticker; nothing here touches
 * React state. Reduced motion draws every model once, assembled and still.
 */

/** CSS px per art pixel. */
const PIXEL = 2;
/** Turntable positions per revolution: a sprite sheet, not a smooth spin. */
const TURN_STEPS = 40;

type Slot = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Row index, or -1 for the bay. */
  row: number;
  width: number;
  height: number;
  visible: boolean;
  key: string;
  scrub?: ScrollTrigger;
};

export function ModuleModels({ codes }: { codes: readonly string[] }) {
  useEffect(() => {
    const section = document.getElementById("equipment");
    if (!section) return;
    const renderer = createModuleRenderer(codes);
    if (!renderer) return;
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const slots: Slot[] = gsap.utils.toArray<HTMLCanvasElement>("[data-module-model]", section).flatMap((canvas) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return [];
      const value = canvas.dataset.moduleModel;
      const row = value === "bay" ? -1 : Number(value);
      return [{ canvas, ctx, row, width: 0, height: 0, visible: false, key: "" }];
    });
    const bySlot = new Map(slots.map((slot) => [slot.canvas, slot]));

    const measure = (slot: Slot) => {
      const box = slot.canvas.getBoundingClientRect();
      slot.width = Math.ceil(box.width / PIXEL);
      slot.height = Math.ceil(box.height / PIXEL);
      if (slot.width && slot.height && (slot.canvas.width !== slot.width || slot.canvas.height !== slot.height)) {
        slot.canvas.width = slot.width;
        slot.canvas.height = slot.height;
        slot.ctx.imageSmoothingEnabled = false;
      }
      slot.key = "";
    };
    const sizes = new ResizeObserver((entries) =>
      entries.forEach((entry) => {
        const slot = bySlot.get(entry.target as HTMLCanvasElement);
        if (slot) measure(slot);
      }),
    );

    /* The bay re-assembles when the active module changes or it comes back. */
    const bay = { build: reduced ? 1 : 0, model: -1 };
    let bayTween: gsap.core.Tween | null = null;
    const rebuildBay = (model: number) => {
      bay.model = model;
      if (reduced) return;
      bayTween?.kill();
      bayTween = gsap.fromTo(bay, { build: 0 }, { build: 1, duration: 0.95, ease: "none" });
    };

    const seen = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          const slot = bySlot.get(entry.target as HTMLCanvasElement);
          if (!slot) return;
          slot.visible = entry.isIntersecting;
          if (slot.row < 0 && !slot.visible) bay.model = -1;
        }),
      { rootMargin: "80px 0px" },
    );
    slots.forEach((slot) => {
      measure(slot);
      sizes.observe(slot.canvas);
      seen.observe(slot.canvas);
    });

    const ctx = gsap.context(() => {
      if (reduced) return;
      slots.forEach((slot) => {
        const row = slot.canvas.closest<HTMLElement>("[data-equipment-row]");
        if (slot.row < 0 || !row) return;
        slot.scrub = ScrollTrigger.create({ trigger: row, start: "top 94%", end: "top 56%" });
      });
    });

    const started = performance.now();
    const tick = () => {
      if (document.hidden) return;
      const time = (performance.now() - started) / 1000;
      const active = Number(section.dataset.activeModule ?? 0);
      const glow = reduced ? 1 : Math.round((0.6 + 0.4 * Math.sin(time * 3)) * 4) / 4;

      for (const slot of slots) {
        if (!slot.visible || !slot.width || !slot.height) continue;
        const isBay = slot.row < 0;
        if (isBay && bay.model !== active) rebuildBay(active);

        const model = isBay ? active : slot.row;
        const build = isBay ? bay.build : slot.scrub ? slot.scrub.progress : 1;
        const speed = isBay ? 0.75 : 0.5;
        const phase = isBay ? 0 : slot.row * 0.9;
        const step = reduced ? 0 : Math.floor(((time * speed + phase) / (Math.PI * 2)) * TURN_STEPS) % TURN_STEPS;
        const dim = isBay || model === active || reduced ? 1 : 0.62;

        const key = `${model}|${slot.width}x${slot.height}|${step}|${build.toFixed(2)}|${glow}|${dim}`;
        if (key === slot.key) continue;
        slot.key = key;
        renderer.render(
          {
            model,
            width: slot.width,
            height: slot.height,
            angle: -0.5 + (step / TURN_STEPS) * Math.PI * 2,
            build,
            glow,
            dim,
          },
          slot.ctx,
        );
      }
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      bayTween?.kill();
      ctx.revert();
      sizes.disconnect();
      seen.disconnect();
      renderer.dispose();
    };
  }, [codes]);

  return null;
}
