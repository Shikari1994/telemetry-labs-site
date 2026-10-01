/**
 * The page's power-off at the bottom of the footer (components/layout/Footer).
 * MotionProvider scrubs it and writes here; the mascot, docked on the footer
 * pad, reads it on the same tick: it dozes off, then its screen and charge
 * cells go dark with the page's.
 */
export const finale = {
  /** The mascot is told to sleep on its dock. */
  doze: false,
  /** 1 on … 0 off: the mascot's screen and charge cells. */
  power: 1,
};
