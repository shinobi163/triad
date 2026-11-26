// Checks every Lockpick day: one secret per length (4, 5, 6), each a common
// word of that length, none used twice. Prints how many guesses perfect
// halving needs.
//   node lockpick/check.mjs        exits 1 if any secret fails
import { readFileSync } from 'node:fs';
import { loadLexicon } from '../words/lexicon.mjs';
import { idealGuesses } from './engine.mjs';
import { reportRunway } from '../words/days.mjs';

const { common } = loadLexicon();
const { days } = JSON.parse(readFileSync(new URL('./puzzles.json', import.meta.url), 'utf8'));
const pools = Object.fromEntries([4, 5, 6].map((n) => [n, [...common].filter((w) => w.length === n).sort()]));

let failed = false;
const seen = new Set();
days.forEach((secrets, i) => {
  const line = [];
  for (const n of ['4', '5', '6']) {
    const secret = secrets[n];
    const problems = [];
    if (!secret) problems.push(`${n}: missing`);
    else {
      if (secret.length !== Number(n)) problems.push(`${secret} is not ${n} letters`);
      if (!common.has(secret)) problems.push(`${secret} is not a common word`);
      if (seen.has(secret)) problems.push(`${secret} repeats an earlier day`);
      seen.add(secret);
    }
    line.push(`${secret ?? '—'} (par ${secret ? idealGuesses(pools[n], secret) : '—'})`);
    if (problems.length) { failed = true; line.push(...problems.map((m) => `✕ ${m}`)); }
  }
  console.log(`#${i + 1} ${line.join('  ')}`);
});
reportRunway('Lockpick', days.length);
process.exit(failed ? 1 : 0);
