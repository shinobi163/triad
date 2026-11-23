// EQUILIBRIUM rules engine - pure functions, shared by the game and the checker.
//
// A level is a mobile: a beam whose two arms each hold either a weight slot
// or another beam. Beams weigh nothing.
//
//   torque of a side = arm length × total weight hanging from that side
//   a beam is BALANCED when both sides are fully loaded and the torques match
//   the level is SOLVED when every slot holds a weight and every beam balances
//
// An empty or half-loaded beam is never "balanced", even though 0 = 0.

// Every slot id, left to right.
export function slotIds(beam) {
  return ['left', 'right'].flatMap((side) => (beam[side].beam ? slotIds(beam[side].beam) : [beam[side].slot]));
}

// Every beam with a stable id: 'main', 'main.right', 'main.right.left', ...
export function beams(beam, id = 'main') {
  return [
    { id, beam },
    ...['left', 'right'].flatMap((side) => (beam[side].beam ? beams(beam[side].beam, `${id}.${side}`) : [])),
  ];
}

// assign: { A: 6, B: null, ... } - weight value per slot, null when empty.
function hangingWeight(arm, assign) {
  if (arm.beam) return ['left', 'right'].reduce((sum, side) => sum + hangingWeight(arm.beam[side], assign), 0);
  return assign[arm.slot] ?? 0;
}

const fullyLoaded = (arm, assign) => (arm.beam ? slotIds(arm.beam).every((s) => assign[s] != null) : assign[arm.slot] != null);

export function torques(beam, assign) {
  return {
    left: beam.left.arm * hangingWeight(beam.left, assign),
    right: beam.right.arm * hangingWeight(beam.right, assign),
  };
}

export function isBalanced(beam, assign) {
  if (!fullyLoaded(beam.left, assign) || !fullyLoaded(beam.right, assign)) return false;
  const t = torques(beam, assign);
  return t.left === t.right;
}

export const isSolved = (level, assign) =>
  slotIds(level.beam).every((s) => assign[s] != null) && beams(level.beam).every(({ beam }) => isBalanced(beam, assign));

// Tilt in degrees: positive = right side down. Proportional to the torque
// imbalance, capped, so a near miss barely moves and a big miss swings.
export function tilt(beam, assign, maxDeg = 14) {
  const { left, right } = torques(beam, assign);
  if (left + right === 0) return 0;
  return (maxDeg * (right - left)) / (right + left);
}

// Every way to hang bank weights (by position, so duplicates are allowed) on
// the slots. Returns the arrangements that solve the level.
export function solve(level) {
  const slots = slotIds(level.beam);
  const solutions = [];
  let tried = 0;
  const walk = (k, used, assign) => {
    if (k === slots.length) {
      tried++;
      if (isSolved(level, assign)) solutions.push({ ...assign });
      return;
    }
    level.bank.forEach((w, i) => {
      if (used.has(i)) return;
      used.add(i);
      walk(k + 1, used, { ...assign, [slots[k]]: w });
      used.delete(i);
    });
  };
  walk(0, new Set(), {});
  // Arrangements that only differ by swapping equal weights are the same answer.
  const distinct = [...new Map(solutions.map((s) => [JSON.stringify(s), s])).values()];
  return { slots, solutions: distinct, arrangements: tried };
}
