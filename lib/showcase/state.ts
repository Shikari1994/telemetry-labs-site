/**
 * The 03 showcase as the ring scrub leaves it (MotionProvider writes, the
 * WebGL screen in components/sections/ShowcaseScene reads on the next tick),
 * so the ring and the screen run on one timeline and nothing touches React.
 *
 * screen: the capture in front; turn: 0..1 through the change to the next
 * one (0 while it holds); intro: 0..1 as the screen assembles on entry.
 */
export const showcase = { screen: 0, turn: 0, intro: 0 };
