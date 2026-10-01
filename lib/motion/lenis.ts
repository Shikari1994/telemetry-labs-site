import type Lenis from "lenis";
import { jumpEase } from "@/lib/motion/bus";

/**
 * MotionProvider owns the Lenis instance. UI that needs to move the page (the
 * TREE rail, keyboard section jumps) reads it from here instead of creating a
 * second scroller. Falls back to native scrolling when Lenis is off, which is
 * the case under reduced motion.
 */
let instance: Lenis | null = null;

export function setLenis(next: Lenis | null) {
  instance = next;
}

export function getLenis() {
  return instance;
}

export function scrollToY(y: number, duration = 1.15) {
  if (instance) {
    instance.scrollTo(y, { duration, easing: jumpEase });
    return;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
}
