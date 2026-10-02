/**
 * Scroll says where a scene should be; time says how fast it may get there.
 * `pace` moves a value toward its goal no faster than one unit per `seconds`,
 * so a flick of the wheel cannot run a scene through faster than it can be
 * seen. Close to the goal it slows (`FOLLOW` per second) but never below a
 * share of that speed (`FLOOR`), so it settles rather than creeps. A goal far
 * ahead, as after a jump, is chased faster: the gap closes at no less than
 * gap / `catchUp` per second.
 */
const FOLLOW = 6;
const FLOOR = 0.3;

export function pace(value: number, goal: number, dt: number, seconds: number, catchUp = Infinity) {
  const gap = Math.abs(goal - value);
  const cap = Math.max(1 / seconds, gap / catchUp);
  const speed = Math.min(cap, FOLLOW * gap + FLOOR / seconds);
  const next = value + Math.sign(goal - value) * Math.min(gap, speed * dt);
  return Math.abs(goal - next) < 0.001 ? goal : next;
}
