/**
 * The 05 viewer as its scrub leaves it (MotionProvider writes, the mascot
 * reads on the next tick), so the robot turning the captures over runs on
 * the viewer's own timeline and nothing touches React.
 *
 * at: the front capture's index plus how far it has tipped out of the
 * window (0..1, eased as drawn).
 */
export const viewer = { at: 0 };
