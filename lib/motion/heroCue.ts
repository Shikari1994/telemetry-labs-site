/**
 * The hero opening is paced by the mascot: its intro (components/mascot)
 * owns the clock and announces two beats, and the hero reveal in
 * MotionProvider plays its parts on them.
 *
 * - "world": it leaves the opening shot for the room; the wordmark and copy build.
 * - "lights": it touches down on the pad; the room lights come on.
 *
 * A cue is remembered once fired, so a listener that subscribes late still
 * runs. When the mascot cannot play (no WebGL) it fires both at once.
 */

export type HeroCue = "world" | "lights";

type CueWindow = Window & { __heroCues?: Set<HeroCue> };
const EVENT = "hero:cue";

function fired() {
  const w = window as CueWindow;
  return (w.__heroCues ??= new Set());
}

export function emitHeroCue(cue: HeroCue) {
  if (fired().has(cue)) return;
  fired().add(cue);
  window.dispatchEvent(new CustomEvent<HeroCue>(EVENT, { detail: cue }));
}

/** Runs `run` once the cue has fired (now, if it already has). Returns a cleanup. */
export function onHeroCue(cue: HeroCue, run: () => void) {
  if (fired().has(cue)) {
    run();
    return () => {};
  }
  const listener = (event: Event) => {
    if ((event as CustomEvent<HeroCue>).detail !== cue) return;
    window.removeEventListener(EVENT, listener);
    run();
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
