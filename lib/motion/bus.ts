/**
 * The signal bus: the homepage drawn as a circuit board. The board itself
 * (components/layout/SignalBus.tsx) registers a launcher here; in-page jumps
 * hand it the trip so a packet can ride the bus in step with the scroll.
 */

/** Viewport fraction where the signal front rides. Section heads boot as they cross it. */
export const SIGNAL_LINE = 0.7;

/** Lenis' jump easing; the packet shares it so it stays in step with the page. */
export const jumpEase = (t: number) => 1 - Math.pow(1 - t, 4);

/** Longer trips take a little longer, but never drag. */
export function jumpDuration(distance: number) {
  return Math.min(1.4, Math.max(0.8, 0.7 + Math.abs(distance) / 6000));
}

export type BusTrip = {
  /** Element id the jump was asked for. */
  target: string;
  fromY: number;
  toY: number;
  /** The scroll the packet keeps pace with. */
  delay?: number;
  duration: number;
  ease: (t: number) => number;
};

let launcher: ((trip: BusTrip) => void) | null = null;

export function setBusLauncher(next: ((trip: BusTrip) => void) | null) {
  launcher = next;
}

export function launchPacket(trip: BusTrip) {
  launcher?.(trip);
}
