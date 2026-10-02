/**
 * The 02 cartridge deck as its scrub leaves it (MotionProvider writes, the
 * mascot reads on the next tick), so the robot stamping the cartridges in
 * runs on the deck's own timeline and nothing touches React.
 *
 * at: the deck's position in beats, 0 … carts + 1. Beat i (i < carts) seats
 * cartridge i; the last beat opens the free slots. Within a cartridge's beat
 * the robot stands on it, stamps it down a step per landing (STOMP_FROM to
 * SEAT), it seats with a clunk and the screen boots its work, and from HOP
 * it jumps over to the next cartridge.
 */
export const deck = { at: 0 };

export const STOMP_FROM = 0.12;
export const SEAT = 0.58;
export const STOMPS = 4;
export const HOP = 0.7;
/** Share of the last beat at which the screen turns to the open slots. */
export const OPEN_AT = 0.3;

/** How far cartridge `i` has been stamped in at `at`: 0 resting … 1 seated,
    in whole stomps. */
export function seated(at: number, i: number) {
  const f = (at - i - STOMP_FROM) / (SEAT - STOMP_FROM);
  if (f >= 1) return 1;
  if (f <= 0) return 0;
  return Math.floor(f * STOMPS) / STOMPS;
}
