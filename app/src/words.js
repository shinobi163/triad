// The shared word list (built by words/lexicon.mjs): ENABLE decides what
// counts as a word; the common list is where answers come from.
import data from '../../words/words.json';

const cache = {};
const setOf = (kind, n) => (cache[`${kind}${n}`] ??= new Set(data[kind][n] ? data[kind][n].split(' ') : []));

export const isWord = (w) => setOf('valid', w.length).has(w);
export const commonWords = (n) => setOf('common', n);
export const validWords = (n) => setOf('valid', n);
