// Equilibrium levels + helpers. Rules come from equilibrium/engine.mjs, the
// same file the level checker uses.
import data from '../../../equilibrium/levels.json';
import { slotIds, solve } from '../../../equilibrium/engine.mjs';
export { beams, isBalanced, isSolved, tilt, torques, slotIds } from '../../../equilibrium/engine.mjs';
import { formatTime } from '../format.js';

export const LEVELS = data.levels.map((l, i) => {
  const slots = slotIds(l.beam);
  return {
    ...l,
    number: i + 1,
    label: `Daily #${i + 1}`,
    master: l.difficulty === 'master',
    slots,
    par: slots.length,   // one placement per slot
    solution: solve(l).solutions[0],
  };
});

export const levelKey = (level) => `triad-equilibrium-${level.id}-${JSON.stringify([level.bank, level.beam]).replace(/\W/g, '')}`;

// placed: { A: bankIndex | null } -> { A: weight | null }
export const weightsOf = (level, placed) =>
  Object.fromEntries(level.slots.map((s) => [s, placed[s] == null ? null : level.bank[placed[s]]]));

// Calder-style primaries, assigned by weight so equal weights match.
const PAINT = [
  { fill: '#1D4E9E', text: '#FFFFFF' },
  { fill: '#D7263D', text: '#FFFFFF' },
  { fill: '#F2B705', text: '#1B1B1B' },
  { fill: '#1B1B1B', text: '#FFFFFF' },
  { fill: '#2F7D57', text: '#FFFFFF' },
];
export function paintFor(level, weight) {
  const values = [...new Set(level.bank)].sort((a, b) => a - b);
  return PAINT[values.indexOf(weight) % PAINT.length];
}
// Heavier weights are bigger discs.
export const radiusFor = (weight) => 13 + 4 * Math.sqrt(weight);

export function scoreFor({ elapsed, moves, hints, par }) {
  const timePenalty = Math.min(400, Math.max(0, elapsed - 30));
  return Math.max(0, 1000 - timePenalty - Math.max(0, moves - par) * 100 - hints * 150);
}

export function shareText(level, state) {
  return [
    `TRIAD · Equilibrium ${level.label} · ${state.moves} placements (par ${level.par})`,
    `⏱ ${formatTime(state.elapsed)}${state.hints ? ` · 💡×${state.hints}` : ''}`,
    state.moves <= level.par ? '⚖️ balanced first time' : `⚖️ ${'🔁'.repeat(Math.min(8, state.moves - level.par))}`,
  ].join('\n');
}
