// Checks every Stowaway day: each answer appears exactly once in its
// sentence and runs across a gap between words (not inside one word), no
// other theme word hides in the sentence to catch players out, and no
// answer repeats across days.
//   node stowaway/check.mjs        exits 1 if any sentence fails
import { readFileSync } from 'node:fs';
import { findHidden } from './engine.mjs';
import { reportRunway } from '../words/days.mjs';

const SENTENCES_PER_DAY = 5;
const { days } = JSON.parse(readFileSync(new URL('./puzzles.json', import.meta.url), 'utf8'));

let failed = false;
days.forEach(({ theme, themeWords = [], sentences }, i) => {
  console.log(`#${i + 1} ${theme}`);
  if (sentences.length !== SENTENCES_PER_DAY) {
    console.log(`  ✕ ${sentences.length} sentences (need ${SENTENCES_PER_DAY})`);
    failed = true;
  }
  const answers = new Set();
  for (const { text, answer } of sentences) {
    const { count, hit } = findHidden(text, answer);
    const problems = [];
    if (count === 0) problems.push(`${answer} is not hidden here`);
    if (count > 1) problems.push(`${answer} appears ${count} times`);
    if (hit && !hit.crosses) problems.push(`${answer} sits inside one word; it must cross a gap`);
    if (answers.has(answer)) problems.push(`${answer} is used twice today`);
    if (!themeWords.includes(answer)) problems.push(`${answer} is missing from themeWords`);
    answers.add(answer);
    for (const other of themeWords) if (other !== answer && findHidden(text, other).count) problems.push(`${other} also hides here`);
    const shown = hit ? `${text.slice(0, hit.start)}[${text.slice(hit.start, hit.end + 1)}]${text.slice(hit.end + 1)}` : text;
    console.log(`  ${answer.padEnd(7)} ${shown}`);
    for (const msg of problems) console.log(`    ✕ ${msg}`);
    if (problems.length) failed = true;
  }
});
reportRunway('Stowaway', days.length);
process.exit(failed ? 1 : 0);
