// Stowaway rules: each sentence hides one themed word that runs across a
// gap between words. Shared by the app and check.mjs.

// Where `answer` hides in `sentence`: { start, end } as character indexes
// (end inclusive), skipping spaces and punctuation; null if it isn't there.
// `crosses` says whether the hidden word spans more than one word.
export function findHidden(sentence, answer) {
  const target = answer.toUpperCase();
  const idx = [];                    // character index of every letter
  let letters = '';
  for (let i = 0; i < sentence.length; i++) {
    if (/[a-z]/i.test(sentence[i])) {
      idx.push(i);
      letters += sentence[i].toUpperCase();
    }
  }
  const hits = [];
  for (let at = letters.indexOf(target); at !== -1; at = letters.indexOf(target, at + 1)) hits.push(at);
  if (hits.length !== 1) return { count: hits.length, hit: null };
  const start = idx[hits[0]];
  const end = idx[hits[0] + target.length - 1];
  return { count: 1, hit: { start, end, crosses: /[^a-z]/i.test(sentence.slice(start, end + 1)) } };
}

// The letters a player picked, first tap to last tap, ignoring gaps.
export const picked = (sentence, a, b) =>
  sentence.slice(Math.min(a, b), Math.max(a, b) + 1).replace(/[^a-z]/gi, '').toUpperCase();
