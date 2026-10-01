import { ScrollTrigger } from "gsap/ScrollTrigger";
import { jumpDuration, jumpEase, launchPacket } from "@/lib/motion/bus";
import { getLenis, scrollToY } from "@/lib/motion/lenis";

function headerOffset() {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  return (header?.offsetHeight ?? 72) + 16;
}

/**
 * Scroll target for a tree entry. A channel of the pinned screens viewer does
 * not move down the page, so its index is mapped onto the viewer's pinned
 * scroll range instead of read from the layout.
 */
function targetY(el: HTMLElement) {
  const viewer = el.closest<HTMLElement>("[data-viewer]");
  const index = Number(el.dataset.viewerIndex);
  const travel = Number(viewer?.dataset.viewerTravel);
  if (viewer && el !== viewer && Number.isFinite(index) && travel > 0) {
    const trigger = ScrollTrigger.getAll().find((st) => st.pin && viewer.contains(st.pin));
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
