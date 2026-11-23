// Crossfire rules, independent of React.
//
//     TL      A      TR
//     B     CENTER   C
//     BL      D      BR
//
// Words read left-to-right and top-to-bottom. Each slot touches only anchors,
// so every slot is scored on its own three links.

import puzzles from '../../../crossfire/puzzles.json';

export const SLOTS = ['A', 'B', 'C', 'D'];
export const MAX_CHECKS = 4;

export const SLOT_LINKS = {
  A: [['TL', 'A'], ['A', 'TR'], ['A', 'CENTER']],
  B: [['TL', 'B'], ['B', 'CENTER'], ['B', 'BL']],
  C: [['TR', 'C'], ['CENTER', 'C'], ['C', 'BR']],
  D: [['CENTER', 'D'], ['BL', 'D'], ['D', 'BR']],
};

// Where each cell sits on the 3x3 board.
export const LAYOUT = [
  ['TL', 'A', 'TR'],
  ['B', 'CENTER', 'C'],
  ['BL', 'D', 'BR'],
];

export const LEVELS = [
  { id: 'daily1', number: 1, label: 'Daily #1', master: false, ...puzzles.daily1 },
  { id: 'daily2', number: 2, label: 'Daily #2', master: true, ...puzzles.daily2 },
].filter((l) => l.fixed);

// Changes whenever the generator produces a different puzzle, so saved
// progress from an old puzzle is never applied to a new one.
export const levelKey = (level) =>
  `triad-crossfire-${level.id}-${Object.values(level.fixed).join('-')}`;

const word = (level, cell, slot, placed) => (cell === slot ? placed : level.fixed[cell]);

// [true, false, true] for the slot's three links with `placed` in it.
export function checkSlot(level, slot, placed) {
  const valid = new Set(level.validPairs);
  return SLOT_LINKS[slot].map(([l, r]) => valid.has(word(level, l, slot, placed) + word(level, r, slot, placed)));
}

export function slotStatus(links) {
  const n = links.filter(Boolean).length;
  return n === 3 ? 'ok' : n === 2 ? 'trap' : 'bad';
}

// 1000 minus 1 point per second over 30s (max 400), 100 per extra check,
// 150 per hint. Never below 0.
export function scoreFor({ elapsed, checksUsed, hints }) {
  const timePenalty = Math.min(400, Math.max(0, elapsed - 30));
  const checkPenalty = Math.max(0, checksUsed - 1) * 100;
  return Math.max(0, 1000 - timePenalty - checkPenalty - hints * 150);
}

export { formatTime } from '../format.js';
import { formatTime } from '../format.js';

const SQUARE = { ok: '🟩', trap: '🟨', bad: '🟥' };

// Spoiler-free: one row of slot colours per check, in A-B-C-D order.
export function shareText(level, state) {
  const rows = state.history.map((row) => row.map((s) => SQUARE[s]).join(''));
  const result = state.status === 'won' ? `${state.history.length}/${MAX_CHECKS}` : `X/${MAX_CHECKS}`;
  return [
    `TRIAD · Crossfire ${level.label} ${result}`,
    `⏱ ${formatTime(state.elapsed)}${state.hints ? ` · 💡×${state.hints}` : ''}`,
    ...rows,
  ].join('\n');
}

export const dictionaryUrl = (w) => `https://www.merriam-webster.com/dictionary/${w.toLowerCase()}`;
