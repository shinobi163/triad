// Reel Gaps rules: a movie title is shown with its vowels (A E I O U) and
// spaces removed; Y counts as a consonant. Shared by the app and check.mjs.

const lettersOf = (s) => s.toUpperCase().replace(/&/g, 'AND').replace(/[^A-Z0-9]/g, '');

// "The Social Network" -> "THSCLNTWRK"
export const clueFor = (title) => lettersOf(title).replace(/[AEIOU]/g, '');

// Answers ignore spaces, punctuation, capitals and a leading "The".
const comparable = (s) => lettersOf(s.trim().replace(/^the\s+/i, ''));
export const isAnswer = (guess, title) => comparable(guess) === comparable(title);
