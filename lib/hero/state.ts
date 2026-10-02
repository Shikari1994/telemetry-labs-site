/**
 * The hero island as the page and the mascot leave it, read by the island
 * scene (components/sections/HeroIsland) on its next tick, so nothing here
 * touches React.
 *
 * build: 0..1 as the board assembles out of the socket (MotionProvider, on
 * the "lights" cue); dolly: 0..1 as the camera pitches down while the hero
 * scrolls away (MotionProvider's handoff scrub); home: the robot stands on
 * the socket; landedAt: performance.now() of its touchdown, which sends a
 * ring out across the board (the mascot writes both).
 */
export const island = { build: 0, dolly: 0, home: false, landedAt: -1 };
