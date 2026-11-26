// Checks every Poise day: every bank word has a category side, no word
// fits both categories, and exactly one arrangement of fitting words
// balances every beam.
//   node poise/check.mjs        exits 1 if any day fails
import { readFileSync } from 'node:fs';
import { beams, slotIds, solve, torques, weightsOf } from './engine.mjs';
import { reportRunway } from '../words/days.mjs';

const { days } = JSON.parse(readFileSync(new URL('./puzzles.json', import.meta.url), 'utf8'));

const outline = (beam) =>
  ['left', 'right'].map((side) => (beam[side].beam ? `${beam[side].arm}:(${outline(beam[side].beam)})` : `${beam[side].arm}:${beam[side].slot}`)).join(' ');

let failed = false;
days.forEach((puzzle, i) => {
  const problems = [];
  for (const [word, side] of Object.entries(puzzle.bank)) if (!['left', 'right'].includes(side)) problems.push(`${word} has no side`);
  const { slots, solutions, arrangements } = solve(puzzle);
  if (solutions.length !== 1) problems.push(`${solutions.length} solutions (need exactly 1)`);

  console.log(`#${i + 1} ${puzzle.categories.left} / ${puzzle.categories.right}  [${outline(puzzle.beam)}]  ${slotIds(puzzle.beam).length} hooks, ${arrangements} arrangements`);
  for (const s of solutions) {
    const w = weightsOf(s);
    const sums = beams(puzzle.beam).map(({ beam }) => { const t = torques(beam, w); return `${t.left}=${t.right}`; });
    console.log(`  ${slots.map((k) => `${k}=${s[k]}`).join(' ')}   ${sums.join(', ')}`);
  }
  for (const msg of problems) console.log(`  ✕ ${msg}`);
  if (problems.length) failed = true;
});
reportRunway('Poise', days.length);
process.exit(failed ? 1 : 0);
