# Wits — prototype

Six daily word games. React + Vite + Tailwind.

**Play it:** https://shinobi163.github.io/triad/ (rebuilt and republished on every push to `main`; the deploy fails if any puzzle checker fails).

```
app/        the playable app: opening screen + every game
words/      the shared word list (ENABLE + common words + blocklist)
rungs/      word ladder          engine.mjs · puzzles.json · check.mjs
lockpick/   before/after guess   engine.mjs · puzzles.json · check.mjs
reelgaps/   movie time trial     engine.mjs · puzzles.json · check.mjs
relay/      word chain           engine.mjs · puzzles.json · check.mjs
stowaway/   hidden word          engine.mjs · puzzles.json · check.mjs
poise/      word mobile          engine.mjs · balance.mjs · puzzles.json · check.mjs
```

Each game's rules live in its `engine.mjs`, which both the app and that game's
`check.mjs` import, so the checker always tests the rules players get.

## Play

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173. Each game also has its own address (`#rungs`, `#lockpick`, …).

- Every game opens on a How-to screen (three lines, one example, **Play**) the first time each visit; **?** brings it back.
- **‹ Games** (top left) and **‹ Back to all games** (on every results card) return to the list at any time; the browser Back button works too. Leaving keeps the game as it was.
- Every game has **Give up** (tap twice), which ends the game and shows the answer.
- The list shows a ✓ line only for puzzles finished this visit.
- Nothing is saved between visits: progress lives in memory (`app/src/session.js`).

## Checking puzzles

```bash
cd app
npm run check    # runs every game's checker; exits 1 if any puzzle is unfair
npm run words    # rebuilds words/words.json after editing the word lists
```

## The games

**Rungs.** Get from the start word to the end word, changing one letter per step. Every try counts as a step; an invalid word shakes. No undo. Par is the shortest route through common words. A ladder can't become impossible (any step can be undone, so every word you reach still links to the end); Give up shows the shortest route from where you stopped.

**Lockpick.** Find the secret word. Each guess says whether the secret comes before or after it alphabetically. 4, 5 or 6 letters (Easy, Medium, Hard). Invalid or already-ruled-out guesses shake and don't count. A meter shows how close each guess is (Cold → Burning), measured in common words between the guess and the secret. Par is what perfect halving of the common words would take.

**Reel Gaps.** 90 seconds, 10 titles on one theme (today: Biopics). Each clue is a movie title with vowels (A E I O U) and spaces removed; Y stays. Answers ignore spaces, punctuation, capitals and a leading "The", "A" or "An". Skip moves on.

**Relay.** 60 seconds. Each word must start with the last letter of the one before, be on the day's category list, and not repeat. A word one typo away from exactly one list word counts as that word (RACOON → RACCOON); plurals point you to the singular; every rejection says why. Hint shows a possible word's length and first letter, then its last letter. Pass hands over a fresh word when you're stuck (it doesn't score).

**Stowaway.** Five sentences, each hiding a themed word across a word gap. Tap its first letter, then its last.

**Poise.** A hanging mobile. Each side of the top beam has a category, and words only hang on their own side. A word weighs its letter count; each side pulls with letters × distance, shown above each beam end once it's loaded (6×2=12). Balance every beam. The How-to shows a small balanced mobile.

## Word lists

- `words/enable1.txt`: ENABLE (public domain) decides what counts as a word.
- `words/popular.txt`: the ENABLE words that also appear in TV/film subtitle frequency lists ([dolph/dictionary](https://github.com/dolph/dictionary)). Answers, secrets and shown routes come only from these. Check its licence before a public launch.
- `words/blocklist.txt`: words never used as an answer or shown in a route.

Not built yet: daily rotation (each game has one fixed puzzle), sound, saving between visits.
