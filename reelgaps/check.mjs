// Checks every Reel Gaps day: a theme, ten titles, every clue long enough to
// be fair, no two titles on a day shrinking to the same clue, and no title
// used on two days.
//   node reelgaps/check.mjs        exits 1 if any title fails
import { readFileSync } from 'node:fs';
import { clueFor, isAnswer } from './engine.mjs';
import { reportRunway } from '../words/days.mjs';

const MIN_CLUE = 4;
const TITLES_PER_DAY = 10;
const { seconds, days } = JSON.parse(readFileSync(new URL('./puzzles.json', import.meta.url), 'utf8'));

let failed = false;
const used = new Map();   // title -> day it first appeared
days.forEach(({ theme, titles }, i) => {
  console.log(`#${i + 1} ${theme}: ${titles.length} titles, ${seconds}s`);
  const problems = [];
  if (!theme) problems.push('no theme');
  if (titles.length !== TITLES_PER_DAY) problems.push(`${titles.length} titles (need ${TITLES_PER_DAY})`);
  const seen = new Map();
  for (const title of titles) {
    const clue = clueFor(title);
    const key = clueFor(title.replace(/^(the|an?)\s+/i, ''));
    if (clue.length < MIN_CLUE) problems.push(`${title}: clue "${clue}" is shorter than ${MIN_CLUE}`);
    if (seen.has(clue)) problems.push(`${title}: same clue as "${seen.get(clue)}"`);
    if (!isAnswer(title, title)) problems.push(`${title}: does not match itself`);
    if (used.has(key)) problems.push(`${title}: already on day ${used.get(key)}`);
    seen.set(clue, title);
    used.set(key, i + 1);
  }
  console.log(`   ${titles.map(clueFor).join(' ')}`);
  for (const msg of problems) console.log(`   ✕ ${msg}`);
  if (problems.length) failed = true;
});
reportRunway('Reel Gaps', days.length);
process.exit(failed ? 1 : 0);
