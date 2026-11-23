// Seam levels + everything derived from them. The rules come straight from
// seam/engine.mjs, the same file the level checker uses.
import data from '../../../seam/levels.json';
import { geometry, solve } from '../../../seam/engine.mjs';
export { applyMove, createState, isWon, legalMoves, EMPTY, T1, T2, GOAL, FILLED } from '../../../seam/engine.mjs';
import { formatTime } from '../format.js';

export const LEVELS = data.levels.map((l, i) => ({
  ...l,
  number: i + 1,
  label: `Daily #${i + 1}`,
  master: l.difficulty === 'master',
  geo: geometry(l),
  solver: solve(l),   // a few dozen positions: instant
}));

// Saved progress is keyed by the layout, so editing a level never loads a stale save.
export const levelKey = (level) =>
  `triad-seam-${level.id}-${JSON.stringify([level.size, level.orbs, level.anchors, level.goals]).replace(/\W/g, '')}`;

// 1000 − 1/sec after 30s (max 400) − 100 per move over par − 150 per hint.
export function scoreFor({ elapsed, moves, hints, par }) {
  const timePenalty = Math.min(400, Math.max(0, elapsed - 30));
  return Math.max(0, 1000 - timePenalty - Math.max(0, moves - par) * 100 - hints * 150);
}

const SQUARE = { fill: '🟩', fuse: '🟪', none: '⬜', undo: '↩️' };

// Spoiler-free: one square per fold or undo (snips are forced, so they're left out).
export function shareText(level, state) {
  const folds = state.log.filter((k) => k !== 'snip').map((k) => SQUARE[k]).join('');
  return [
    `TRIAD · Seam ${level.label} · ${state.moves} moves (par ${level.par})`,
    `⏱ ${formatTime(state.elapsed)}${state.hints ? ` · 💡×${state.hints}` : ''}`,
    folds,
  ].join('\n');
}
