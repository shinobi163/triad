// The one word list every Wits word game plays by.
//   enable1.txt  ENABLE (public domain): decides what counts as a word.
//   popular.txt  the ENABLE words that also appear in TV/film subtitle
//                frequency lists: puzzle answers come only from these.
//   blocklist.txt  words never used as an answer or shown in a route.
// `node words/lexicon.mjs` writes words.json, the slice the app ships.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const LENGTHS = [3, 4, 5, 6];

const here = (f) => fileURLToPath(new URL(f, import.meta.url));
const read = (f) => readFileSync(here(f), 'utf8').split('\n').map((w) => w.trim().toUpperCase()).filter((w) => /^[A-Z]+$/.test(w));

// { valid: Set, common: Set } of uppercase words, for Node scripts.
export function loadLexicon() {
  const blocked = new Set(read('blocklist.txt'));
  return { valid: new Set(read('enable1.txt')), common: new Set(read('popular.txt').filter((w) => !blocked.has(w))) };
}

// Space-separated strings per length keep the shipped file small.
function build() {
  const { valid, common } = loadLexicon();
  const pick = (set, n) => [...set].filter((w) => w.length === n).sort().join(' ');
  const out = {
    source: 'ENABLE (public domain) + popular.txt from github.com/dolph/dictionary',
    valid: Object.fromEntries(LENGTHS.map((n) => [n, pick(valid, n)])),
    common: Object.fromEntries(LENGTHS.map((n) => [n, pick(common, n)])),
  };
  writeFileSync(here('words.json'), JSON.stringify(out));
  for (const n of LENGTHS) console.log(`${n} letters: ${out.valid[n].split(' ').length} valid, ${out.common[n].split(' ').length} common`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) build();
