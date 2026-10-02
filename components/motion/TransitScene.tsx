"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { pace } from "@/lib/motion/pace";
import { project, ride } from "@/lib/transit/guide";
import { createTransitRenderer } from "@/lib/transit/renderer";
import { transitStretch } from "@/lib/transit/scene";

/** CSS px per render pixel; the frame is drawn small and scaled up crisp. */
const PIXEL = { desktop: 2, phone: 3 };
/** Block the edge crumbles in, in render pixels. */
const BLOCK = 2;
/** Transit progress per second that reads as a full rush. */
const RUSH = 1.6;
/** Share of the viewport the page peels off the board before the camera sets off. */
const LEAD = 0.4;
/** Far behind the scroll (after a jump), the camera closes the gap at no less than gap / CATCH_UP per second. */
const CATCH_UP = 1.2;

/**
 * The 3D passages between sections. A `[data-transit]` spacer is a stretch
 * of scroll; while it crosses the viewport, a fixed canvas shows a voxel
 * circuit board (lib/transit) under it. The board is uncovered exactly where
 * the spacer is and rises out of the page background, so the page peels up
 * off it with no visible seam while the camera holds still; then the camera
 * moves the way the stretch for the section ahead says (a flight along the
 * board, a bore down through it, a rise over all of it), past things that
 * belong to that section, to a see-through opening that holds the real
 * section and fills the screen as the camera goes in. The page's peel follows
 * the scroll exactly; the camera follows it at the stretch's own pace
 * (`seconds`, lib/motion/pace), so a flick of the wheel cannot run it
 * through, and a transit left at its far end keeps the screen until the
 * camera is through the portal.
 *
 * One canvas and one renderer serve all transits; the board for each is
 * built on first use. The scrub is the spacer's own ScrollTrigger, frames are
 * drawn on the GSAP ticker only while a transit is on screen, and nothing
 * touches React state.
 *
 * The mascot rides along: the stretch's guide says where the robot is in the
 * board's world, and each frame it is put through the same camera and handed
 * to the mascot in `ride` (lib/transit/guide), which draws it on the next
 * tick callback. This scene registers its tick first, so the two agree. Under reduced motion the spacers collapse (CSS) and
 * nothing is drawn.
 */
export function TransitScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const renderer = createTransitRenderer(canvas);
    if (!renderer) return;

    const spacers = gsap.utils.toArray<HTMLElement>("[data-transit]");
    const progress = spacers.map(() => 0);
    const headerHeight = () => document.querySelector<HTMLElement>("[data-site-header]")?.offsetHeight ?? 72;

    let pixel = PIXEL.desktop;
    const resize = () => renderer.resize(Math.ceil(window.innerWidth / pixel), Math.ceil(window.innerHeight / pixel), BLOCK);

    const mm = gsap.matchMedia();
    mm.add({ phone: "(max-width: 760px)", wide: "(min-width: 761px)" }, (context) => {
      pixel = context.conditions?.phone ? PIXEL.phone : PIXEL.desktop;
      resize();
    });

    /* The transit runs from its spacer entering at the bottom to the next
       section's top settling under the header. */
    const triggers = spacers.map((spacer, index) =>
      ScrollTrigger.create({
        trigger: spacer,
        start: "top bottom",
        end: () => `bottom top+=${headerHeight()}`,
        onUpdate: (self) => {
          progress[index] = self.progress;
        },
        onToggle: (self) => {
          if (!self.isActive) progress[index] = self.progress > 0.5 ? 1 : 0;
        },
      }),
    );

    let shown = false;
    let last = -1;
    let lastProgress = 0;
    let lastAt = 0;
    let rush = 0;
    let flown = 0;
    const startedAt = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastAt) / 1000);
      lastAt = now;
      // The transit nearest its middle owns the screen.
      let active = -1;
      progress.forEach((p, index) => {
        if (p > 0 && p < 1 && (active < 0 || Math.abs(p - 0.5) < Math.abs(progress[active] - 0.5))) active = index;
      });
      if (active < 0 && last >= 0 && progress[last] >= 1 && flown < 1) active = last;
      if (active < 0) {
        ride.visible = false;
        if (shown) {
          canvas.style.visibility = "hidden";
          shown = false;
        }
        last = -1;
        rush = 0;
        return;
      }
      const p = progress[active];
      // Scroll speed through the transit, eased so the lens breathes rather than twitches.
      const speed = active === last && dt > 0 ? Math.abs(p - lastProgress) / dt / RUSH : 0;
      rush += (Math.min(1, speed) - rush) * (1 - Math.exp(-dt * 5));
      if (!shown) {
        canvas.style.visibility = "visible";
        shown = true;
      }
      // The spacer's top edge, as render pixels uncovered from the bottom.
      const trigger = triggers[active];
      const span = trigger.end - trigger.start;
      const edge = (p * span) / pixel;
      // The camera holds until the page has peeled part way off the board,
      // then flies the rest of the stretch.
      const lead = Math.min(0.5, (LEAD * window.innerHeight) / span);
      const goal = Math.min(1, Math.max(0, (p - lead) / (1 - lead)));
      const { transit: label = "", transitTo: to = "" } = spacers[active].dataset;
      const stretch = transitStretch(to);
      // A transit coming on screen starts where the scroll has it.
      flown = active === last ? pace(flown, goal, dt, stretch.seconds, CATCH_UP) : goal;
      last = active;
      lastProgress = p;
      const frame = renderer.draw(active, label, to, flown, edge, rush, (now - startedAt) / 1000);

      const guide = stretch.guide?.(flown, frame.cam) ?? null;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const focal = height / 2 / Math.tan(frame.fov / 2);
      const spot = guide ? project(guide, frame.vp, frame.view, focal, width, height) : null;
      if (!guide || !spot) {
        ride.visible = false;
        return;
      }
      Object.assign(ride, spot, {
        visible: true,
        index: active,
        fly: guide.fly,
        face: guide.face ?? null,
        wave: Boolean(guide.wave),
        // Only where the board is uncovered: the robot never shows over the page.
        top: Math.max(0, height - edge * pixel),
      });
    };

    window.addEventListener("resize", resize);
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      ride.visible = false;
      window.removeEventListener("resize", resize);
      triggers.forEach((trigger) => trigger.kill());
      mm.revert();
      renderer.dispose();
    };
  }, []);

  return <canvas className="transitScene" ref={ref} aria-hidden="true" />;
}
