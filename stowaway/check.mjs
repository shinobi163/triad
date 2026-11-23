// Checks today's Stowaway: each answer appears exactly once in its sentence
// and runs across a gap between words (not inside one word), and no other
// theme word hides in the sentence to catch players out.
//   node stowaway/check.mjs        exits 1 if any sentence fails
import { readFileSync } from 'node:fs';
import { findHidden } from './engine.mjs';

const { theme, themeWords = [], sentences } = JSON.parse(readFileSync(new URL('./puzzles.json', import.meta.url), 'utf8'));
let failed = false;
console.log(`Theme: ${theme}`);
for (const { text, answer } of sentences) {
  const { count, hit } = findHidden(text, answer);
  const problems = [];
  if (count === 0) problems.push(`${answer} is not hidden here`);
  if (count > 1) problems.push(`${answer} appears ${count} times`);
  if (hit && !hit.crosses) problems.push(`${answer} sits inside one word; it must cross a gap`);
  for (const other of themeWords) if (other !== answer && findHidden(text, other).count) problems.push(`${other} also hides here`);
  const shown = hit ? `${text.slice(0, hit.start)}[${text.slice(hit.start, hit.end + 1)}]${text.slice(hit.end + 1)}` : text;
  console.log(`  ${answer.padEnd(7)} ${shown}`);
  for (const msg of problems) console.log(`    ✕ ${msg}`);
  if (problems.length) failed = true;
}
process.exit(failed ? 1 : 0);
