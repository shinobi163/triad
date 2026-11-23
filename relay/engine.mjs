// Relay rules: each word must start with the last letter of the word before,
// belong to the day's category list, and not repeat. Shared by the app and
// check.mjs.
//
// So players aren't punished for spelling, a word that isn't on the list but
// is one typo away from exactly one list word counts as that word
// (RACOON -> RACCOON). Plurals are pointed back to the singular.

// "Polar bear" -> "POLARBEAR": entries and answers compare as letters only.
export const letters = (s) => s.toUpperCase().replace(/[^A-Z]/g, '');

// True when a and b differ by one inserted, deleted or changed letter.
function oneEditApart(a, b) {
  if (Math.abs(a.length - b.length) > 1 || a === b) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

// What the player meant by `typed`:
//   { word }                    on the list
//   { word, fixed: true }       a close misspelling of one list word
//   { plural: word }            the plural of a list word
//   { word: null }              not on the list
export function resolve(typed, category) {
  const w = letters(typed);
  if (category.has(w)) return { word: w };
  for (const single of [w.replace(/IES$/, 'Y'), w.replace(/ES$/, ''), w.replace(/S$/, '')]) {
    if (single !== w && category.has(single)) return { plural: single };
  }
  if (w.length >= 4) {
    const near = [...category].filter((c) => oneEditApart(w, c));
    if (near.length === 1) return { word: near[0], fixed: true };
  }
  return { word: null };
}

// Why `word` (already resolved) can't come next, or null if it can.
//   'letter'   doesn't start with the last letter of `prev`
//   'used'     already in the chain
export function linkError(prev, word, used) {
  if (word[0] !== letters(prev).slice(-1)) return 'letter';
  if (used.has(word)) return 'used';
  return null;
}

// Category words that could follow `prev` and haven't been used.
export const options = (prev, category, used) => {
  const need = letters(prev).slice(-1);
  return [...category].filter((w) => w[0] === need && !used.has(w));
};
