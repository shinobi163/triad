// Checks today's Poise: every bank word has a category side, and exactly one
// arrangement of fitting words balances every beam.
//   node poise/check.mjs        exits 1 if the puzzle fails
import { readFileSync } from 'node:fs';
import { beams, slotIds, solve, torques, weightsOf } from './engine.mjs';

const puzzle = JSON.parse(readFileSync(new URL('./puzzles.json', import.meta.url), 'utf8'));
const problems = [];
for (const [word, side] of Object.entries(puzzle.bank)) {
  if (!['left', 'right'].includes(side)) problems.push(`${word} has no side`);
}
const { slots, solutions, arrangements } = solve(puzzle);
if (solutions.length !== 1) problems.push(`${solutions.length} solutions (need exactly 1)`);

const outline = (beam, pad = '') =>
  ['left', 'right']
    .map((side) => {
      const arm = beam[side];
      const head = `${pad}${side} arm ${arm.arm}: `;
      return arm.beam ? `${head}beam\n${outline(arm.beam, pad + '  ')}` : `${head}hook ${arm.slot}`;
    })
    .join('\n');

console.log(`Left: ${puzzle.categories.left} · Right: ${puzzle.categories.right}`);
console.log(outline(puzzle.beam, '  '));
console.log(`  ${Object.keys(puzzle.bank).length} words, ${slotIds(puzzle.beam).length} hooks, ${arrangements} fitting arrangements`);
for (const s of solutions) {
  const w = weightsOf(s);
  console.log(`  solution: ${slots.map((k) => `${k}=${s[k]}`).join(' ')}`);
  for (const { id, beam } of beams(puzzle.beam)) {
    const t = torques(beam, w);
    console.log(`    ${id}: ${t.left} = ${t.right}`);
  }
}
for (const msg of problems) console.log(`  ✕ ${msg}`);
process.exit(problems.length ? 1 : 0);
