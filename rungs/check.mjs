// Checks every Rungs day: both ends are common words of the same length,
// a ladder exists through common words, par is in a fair range, and no
// pair repeats.
//   node rungs/check.mjs        exits 1 if any day fails
import { readFileSync } from 'node:fs';
import { loadLexicon } from '../words/lexicon.mjs';
import { shortestPath } from './engine.mjs';
import { reportRunway } from '../words/days.mjs';

const MIN_PAR = 3;
const MAX_PAR = 8;
const { valid, common } = loadLexicon();
const { days } = JSON.parse(readFileSync(new URL('./puzzles.json', import.meta.url), 'utf8'));

let failed = false;
const seen = new Set();
days.forEach((p, i) => {
  const problems = [];
  if (p.start.length !== p.end.length) problems.push('start and end differ in length');
  for (const w of [p.start, p.end]) if (!common.has(w)) problems.push(`${w} is not a common word`);
  const pair = `${p.start}-${p.end}`;
  if (seen.has(pair)) problems.push('repeats an earlier day');
  seen.add(pair);
  const route = shortestPath(p.start, p.end, common);
  const par = route ? route.length - 1 : null;
  if (!route) problems.push('no ladder through common words');
  else if (par < MIN_PAR || par > MAX_PAR) problems.push(`par ${par} outside ${MIN_PAR}-${MAX_PAR}`);
  const anyRoute = shortestPath(p.start, p.end, valid);

  console.log(`#${i + 1} ${p.start} → ${p.end}  par ${par ?? '—'}: ${route ? route.join(' → ') : ''}`);
  if (anyRoute && route && anyRoute.length < route.length) console.log(`    rare words allow ${anyRoute.length - 1}: ${anyRoute.join(' → ')}`);
  for (const msg of problems) console.log(`    ✕ ${msg}`);
  if (problems.length) failed = true;
});
reportRunway('Rungs', days.length);
process.exit(failed ? 1 : 0);
