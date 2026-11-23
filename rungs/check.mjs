// Checks every Rungs puzzle: both ends are common words of the same length,
// a ladder exists through common words, and par is in a fair range.
//   node rungs/check.mjs        exits 1 if any puzzle fails
import { readFileSync } from 'node:fs';
import { loadLexicon } from '../words/lexicon.mjs';
import { shortestPath } from './engine.mjs';

const MIN_PAR = 3;
const MAX_PAR = 8;
const { valid, common } = loadLexicon();
const { puzzles } = JSON.parse(readFileSync(new URL('./puzzles.json', import.meta.url), 'utf8'));

let failed = false;
for (const p of puzzles) {
  const problems = [];
  if (p.start.length !== p.end.length) problems.push('start and end differ in length');
  for (const w of [p.start, p.end]) if (!common.has(w)) problems.push(`${w} is not a common word`);
  const route = shortestPath(p.start, p.end, common);
  const par = route ? route.length - 1 : null;
  if (!route) problems.push('no ladder through common words');
  else if (par < MIN_PAR || par > MAX_PAR) problems.push(`par ${par} outside ${MIN_PAR}-${MAX_PAR}`);
  const anyRoute = shortestPath(p.start, p.end, valid);

  console.log(`${p.id}: ${p.start} → ${p.end}`);
  if (route) console.log(`  par ${par}: ${route.join(' → ')}`);
  if (anyRoute && route && anyRoute.length < route.length) console.log(`  rare words allow ${anyRoute.length - 1}: ${anyRoute.join(' → ')}`);
  for (const msg of problems) console.log(`  ✕ ${msg}`);
  if (problems.length) failed = true;
}
process.exit(failed ? 1 : 0);
