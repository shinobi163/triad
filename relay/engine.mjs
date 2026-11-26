// Relay rules: each word must start with the last letter of the word before,
// belong to the day's category list, and not repeat. Shared by the app and
// check.mjs.
//
// A list entry can have other names: "united states|usa|america". Any of them
// links (by its own first and last letters), but they are one thing, so once
// one is in the chain the others count as used.
//
// So players aren't punished for spelling, a word that isn't on the list but
// is one typo away from exactly one list word counts as that word
// (RACOON -> RACCOON). Plurals are pointed back to the singular.

// "Polar bear" -> "POLARBEAR": entries and answers compare as letters only.
export const letters = (s) => s.toUpperCase().replace(/[^A-Z]/g, '');

// entries: ["cat", "united states|usa|america", ...] ->
//   words  Set of every name, as letters
//   idOf   name -> the entry's first name (what "used" is tracked by)
//   shown  name -> how to show it ("POLARBEAR" -> "POLAR BEAR")
//   size   how many entries (not names)
export function makeCategory(entries) {
  const idOf = new Map();
  const shown = new Map();
  for (const entry of entries) {
    const names = entry.split('|');
    const id = letters(names[0]);
    for (const name of names) {
      idOf.set(letters(name), id);
      shown.set(letters(name), name.trim().toUpperCase());
    }
  }
  return { words: new Set(idOf.keys()), idOf, shown, size: entries.length };
}

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
  const { words } = category;
  if (words.has(w)) return { word: w };
  for (const single of [w.replace(/IES$/, 'Y'), w.replace(/ES$/, ''), w.replace(/S$/, '')]) {
    if (single !== w && words.has(single)) return { plural: single };
  }
  if (w.length >= 4) {
    const near = [...words].filter((c) => oneEditApart(w, c));
    if (near.length === 1) return { word: near[0], fixed: true };
  }
  return { word: null };
}

// The entries already in a chain of names.
export const usedIds = (names, category) => new Set(names.map((n) => category.idOf.get(n)));

// Why `word` (already resolved) can't come next, or null if it can.
//   'letter'   doesn't start with the last letter of `prev`
//   'used'     already in the chain, under this or another name
export function linkError(prev, word, used, category) {
  if (word[0] !== letters(prev).slice(-1)) return 'letter';
  if (used.has(category.idOf.get(word))) return 'used';
  return null;
}

// Names that could follow `prev`, one per unused entry.
export function options(prev, category, used) {
  const need = letters(prev).slice(-1);
  const seen = new Set();
  const out = [];
  for (const w of category.words) {
    const id = category.idOf.get(w);
    if (w[0] !== need || used.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(w);
  }
  return out;
}
