// Lockpick rules: each guess tells you whether the secret word comes
// before or after it in alphabetical order. Shared by the app and check.mjs.

// 'before' | 'after' | 'match': where the secret sits relative to the guess.
export function clue(guess, secret) {
  if (guess === secret) return 'match';
  return secret < guess ? 'before' : 'after';
}

// The narrowest gap the clues so far allow: the secret is after `low` and
// before `high` (either may be null for the start or end of the alphabet).
export function bounds(guesses, secret) {
  let low = null;
  let high = null;
  for (const g of guesses) {
    const c = clue(g, secret);
    if (c === 'after' && (low === null || g > low)) low = g;
    if (c === 'before' && (high === null || g < high)) high = g;
  }
  return { low, high };
}

// True when the clues so far already rule `guess` out.
export const ruledOut = (guess, { low, high }) => (low !== null && guess <= low) || (high !== null && guess >= high);

// Guesses a perfect halving strategy needs over `words` (sorted array).
export function idealGuesses(words, secret) {
  let lo = 0;
  let hi = words.length - 1;
  for (let n = 1; lo <= hi; n++) {
    const mid = (lo + hi) >> 1;
    if (words[mid] === secret) return n;
    if (secret < words[mid]) hi = mid - 1;
    else lo = mid + 1;
  }
  return null;
}
