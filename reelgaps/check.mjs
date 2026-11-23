// Checks today's Reel Gaps titles: every clue is long enough to be fair and
// no two titles shrink to the same clue.
//   node reelgaps/check.mjs        exits 1 if any title fails
import { readFileSync } from 'node:fs';
import { clueFor, isAnswer } from './engine.mjs';

const MIN_CLUE = 4;
const { seconds, theme, titles } = JSON.parse(readFileSync(new URL('./puzzles.json', import.meta.url), 'utf8'));

let failed = false;
const seen = new Map();
console.log(`${theme}: ${titles.length} titles, ${seconds}s on the clock`);
if (!theme) { console.log('  ✕ no theme'); failed = true; }
for (const title of titles) {
  const clue = clueFor(title);
  const problems = [];
  if (clue.length < MIN_CLUE) problems.push(`clue "${clue}" is shorter than ${MIN_CLUE}`);
  if (seen.has(clue)) problems.push(`same clue as "${seen.get(clue)}"`);
  if (!isAnswer(title, title)) problems.push('the title does not match itself');
  seen.set(clue, title);
  console.log(`  ${clue.padEnd(16)} ${title}`);
  for (const msg of problems) console.log(`    ✕ ${msg}`);
  if (problems.length) failed = true;
}
process.exit(failed ? 1 : 0);
