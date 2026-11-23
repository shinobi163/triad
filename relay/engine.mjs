// Relay rules: each word must start with the last letter of the word before,
// belong to the day's category, and not repeat. Shared by the app and check.mjs.

// "Polar bear" -> "POLARBEAR": entries and answers compare as letters only.
export const letters = (s) => s.toUpperCase().replace(/[^A-Z]/g, '');

// Why `word` can't come next, or null if it can.
//   'letter'   doesn't start with the last letter of `prev`
//   'category' not in the category list
//   'used'     already in the chain
export function linkError(prev, word, category, used) {
  const w = letters(word);
  if (w[0] !== letters(prev).slice(-1)) return 'letter';
  if (!category.has(w)) return 'category';
  if (used.has(w)) return 'used';
  return null;
}

// Category words that could follow `prev` and haven't been used.
export const options = (prev, category, used) => {
  const need = letters(prev).slice(-1);
  return [...category].filter((w) => w[0] === need && !used.has(w));
};
