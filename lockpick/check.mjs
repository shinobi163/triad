// Checks today's Lockpick secrets: one per length (4, 5, 6), each a common
// word of that length. Prints how many guesses perfect halving needs.
//   node lockpick/check.mjs        exits 1 if any secret fails
import { readFileSync } from 'node:fs';
import { loadLexicon } from '../words/lexicon.mjs';
import { idealGuesses } from './engine.mjs';

const { common } = loadLexicon();
const { secrets } = JSON.parse(readFileSync(new URL('./puzzles.json', import.meta.url), 'utf8'));

let failed = false;
for (const n of ['4', '5', '6']) {
  const secret = secrets[n];
  const problems = [];
  if (!secret) problems.push('missing');
  else {
    if (secret.length !== Number(n)) problems.push(`${secret} is not ${n} letters`);
    if (!common.has(secret)) problems.push(`${secret} is not a common word`);
  }
  const pool = [...common].filter((w) => w.length === Number(n)).sort();
  console.log(`${n} letters: ${secret ?? '—'}  (${pool.length} common words; perfect halving finds it in ${secret ? idealGuesses(pool, secret) : '—'})`);
  for (const msg of problems) console.log(`  ✕ ${msg}`);
  if (problems.length) failed = true;
}
process.exit(failed ? 1 : 0);
