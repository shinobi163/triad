// Checks today's Relay: the start word is in the category, there are no
// duplicates, and it reports letters where a chain is likely to stall.
//   node relay/check.mjs        exits 1 on errors (stall letters are warnings)
import { readFileSync } from 'node:fs';
import { letters, options } from './engine.mjs';

const { seconds, category, start, words } = JSON.parse(readFileSync(new URL('./puzzles.json', import.meta.url), 'utf8'));
const set = new Set(words.map(letters));
const problems = [];
if (set.size !== words.length) problems.push(`${words.length - set.size} duplicate words`);
if (!set.has(letters(start))) problems.push(`start word ${start} is not in the list`);
if (options(start, set, new Set([letters(start)])).length === 0) problems.push(`nothing follows ${start}`);

const ends = new Map();
for (const w of set) ends.set(w.slice(-1), (ends.get(w.slice(-1)) ?? 0) + 1);
const starts = (ch) => [...set].filter((w) => w[0] === ch).length;

console.log(`${category}: ${set.size} words, start ${start}, ${seconds}s`);
console.log('  ends with → words starting with that letter:');
for (const [ch, n] of [...ends].sort()) {
  const s = starts(ch);
  console.log(`  ${ch}: ${String(n).padStart(3)} end here → ${s} start here${s < 3 ? '   ⚠ chains will stall (Pass)' : ''}`);
}
for (const msg of problems) console.log(`  ✕ ${msg}`);
process.exit(problems.length ? 1 : 0);
