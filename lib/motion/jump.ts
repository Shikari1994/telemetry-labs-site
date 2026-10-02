import { ScrollTrigger } from "gsap/ScrollTrigger";
import { jumpDuration, jumpEase, launchPacket } from "@/lib/motion/bus";
import { getLenis, scrollToY } from "@/lib/motion/lenis";

function headerOffset() {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  return (header?.offsetHeight ?? 72) + 16;
}

/**
 * Scroll target for a tree entry. An entry inside a pinned scene (a channel
 * of the 05 viewer, a work on the 02 deck) does not move down the page, so
 * its beat (`data-pin-index`) is mapped onto the scene's pinned scroll range
 * (`data-pin-travel` beats long) instead of read from the layout.
 */
function targetY(el: HTMLElement) {
  const scene = el.closest<HTMLElement>("[data-pin-travel]");
  const index = Number(el.dataset.pinIndex);
  const travel = Number(scene?.dataset.pinTravel);
  if (scene && el !== scene && Number.isFinite(index) && travel > 0) {
    const trigger = ScrollTrigger.getAll().find((st) => st.pin && scene.contains(st.pin));
    if (trigger) return trigger.start + (trigger.end - trigger.start) * (index / travel) + 2;
  }
  return el.getBoundingClientRect().top + window.scrollY - headerOffset();
}

/** Scrolls to a tree entry; with smooth scroll on, a packet rides the signal bus there. */
export function jumpTo(id: string) {
  const el = id === "top" ? null : document.getElementById(id);
  if (id !== "top" && !el) return;

  const max = document.documentElement.scrollHeight - window.innerHeight;
  const toY = Math.min(max, Math.max(0, el ? targetY(el) : 0));
  const fromY = window.scrollY;

  const duration = jumpDuration(toY - fromY);
  if (getLenis()) launchPacket({ target: id, fromY, toY, duration, ease: jumpEase });
  scrollToY(toY, duration);
}
