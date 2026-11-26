// Checks every Relay day: its category exists, the start word is on it and
// something follows it, and no two entries share a name. Reports letters
// where a chain is likely to stall (warnings, not errors).
//   node relay/check.mjs        exits 1 on errors
import { readFileSync } from 'node:fs';
import { letters, makeCategory, options } from './engine.mjs';
import { reportRunway } from '../words/days.mjs';

const { seconds, days, categories } = JSON.parse(readFileSync(new URL('./puzzles.json', import.meta.url), 'utf8'));

let failed = false;
const fail = (msg) => { console.log(`  ✕ ${msg}`); failed = true; };

for (const [name, entries] of Object.entries(categories)) {
  const cat = makeCategory(entries);
  const names = entries.flatMap((e) => e.split('|').map(letters));
  console.log(`${name}: ${cat.size} entries, ${cat.words.size} names`);
  if (names.length !== cat.words.size) {
    const seen = new Set();
    fail(`names used twice: ${names.filter((n) => seen.has(n) || !seen.add(n)).join(', ')}`);
  }
  const ends = new Map();
  for (const w of cat.words) ends.set(w.slice(-1), (ends.get(w.slice(-1)) ?? 0) + 1);
  const stalls = [...ends]
    .map(([ch, n]) => [ch, n, options(ch, cat, new Set()).length])
    .filter(([, n, s]) => s < 3 && n >= 3)
    .map(([ch, n, s]) => `${ch} (${n} end, ${s} start)`);
  if (stalls.length) console.log(`  ⚠ chains will stall at: ${stalls.join(', ')}`);
}

days.forEach((d, i) => {
  const entries = categories[d.category];
  console.log(`#${i + 1} ${d.category}, start ${d.start.toUpperCase()}, ${seconds}s`);
  if (!entries) return fail(`no category called ${d.category}`);
  const cat = makeCategory(entries);
  const start = letters(d.start);
  if (!cat.words.has(start)) fail(`start word ${d.start} is not on the list`);
  else if (options(start, cat, new Set([cat.idOf.get(start)])).length === 0) fail(`nothing follows ${d.start}`);
});
reportRunway('Relay', days.length);
process.exit(failed ? 1 : 0);
