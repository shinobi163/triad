// Poise rules: a hanging mobile where every weight is a word.
//   a word weighs its number of letters
//   each side of the top beam has a category; a word may only hang on a
//   hook under the side whose category it belongs to
//   balance works as in balance.mjs: torque = arm × hanging weight
// Shared by the app and check.mjs.
import { beams, isBalanced, isSolved, slotIds, tilt, torques } from './balance.mjs';

export { beams, isBalanced, slotIds, tilt, torques };

export const weightOf = (word) => word.length;

// slot id -> 'left' | 'right': which side of the top beam it hangs under.
export const sideOfSlots = (beam) =>
  Object.fromEntries(['left', 'right'].flatMap((side) => (beam[side].beam ? slotIds(beam[side].beam) : [beam[side].slot]).map((s) => [s, side])));

// placed: { A: 'BANANA' | null } -> { A: 6 | null }
export const weightsOf = (placed) => Object.fromEntries(Object.entries(placed).map(([s, w]) => [s, w == null ? null : weightOf(w)]));

// Can `word` hang on `slot`? Its category must match the slot's side.
export const fits = (puzzle, word, slot) => puzzle.bank[word] === sideOfSlots(puzzle.beam)[slot];

export const solved = (puzzle, placed) => isSolved(puzzle, weightsOf(placed));

// Every way to hang distinct bank words that fit, and those that balance.
export function solve(puzzle) {
  const slots = slotIds(puzzle.beam);
  const words = Object.keys(puzzle.bank);
  const solutions = [];
  let tried = 0;
  const walk = (k, placed) => {
    if (k === slots.length) {
      tried++;
      if (solved(puzzle, placed)) solutions.push({ ...placed });
      return;
    }
    for (const w of words) {
      if (Object.values(placed).includes(w) || !fits(puzzle, w, slots[k])) continue;
      walk(k + 1, { ...placed, [slots[k]]: w });
    }
  };
  walk(0, {});
  return { slots, solutions, arrangements: tried };
}
