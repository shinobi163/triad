# TRIAD — prototype

```
app/         playable React + Vite + Tailwind app: hub, Crossfire, Seam, Equilibrium
crossfire/   Crossfire puzzle generator, word list, puzzles.json
seam/        Seam rules engine, level checker, level search, levels.json, rules spec
equilibrium/ Equilibrium rules engine, level checker, levels.json
```

## Play

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173. The opening screen lists the three games; each also has its own address (`#crossfire`, `#seam`, `#equilibrium`).

- **‹ Games** (top left of every game) and **‹ Back to all games** (on every results screen) return to the opening screen at any time. The browser Back button works too.
- Leaving a game keeps it exactly as it was, timer included, so coming back resumes it.
- The opening screen shows a game's results (time, score, how it went) only once a level is finished. A game counts as complete when its Daily #1 is finished; a finished Master gets its own line.
- Nothing is saved between visits: progress lives in memory (`app/src/session.js`), so closing or reloading the page starts every game fresh. The rules pop-up shows once per visit.

## Crossfire

Edit `crossfire/compounds.txt` if you like, then `npm run puzzles` (from `app/`) to regenerate `crossfire/puzzles.json`, checking every word online.

- Tap a word then a slot (or a slot then a word). Tap a filled slot to send its word back.
- **Test Circuit** needs all four slots filled and something changed since the last check. Green (3/3) slots lock; arrows turn green, or ✕ for the failing link.
- 4 checks per puzzle. Running out reveals the solution.
- Score: 1000 − 1/sec after 30s (max 400) − 100 per check after the first − 150 per hint.

## Seam

The rules live in one place, `seam/engine.mjs`; the app imports it directly. The full rules spec with worked examples is `seam/spec/seam-spec.html` (rebuild with `node seam/spec/build-spec.mjs`).

```bash
cd seam
node check.mjs                                   # validate levels.json (exit 1 on errors)
node design.mjs --size 5 --min-par 5 --max-par 7 # search for new levels
```

- Tap a dashed row or column (or its ⇕ / ⇔ handle) to fold it; tap the gold thread to snip.
- The line above the board explains each rule the moment it comes up, so the rules pop-up stays at four lines.
- **Undo** steps back over a fold and its snip together. Every fold, snip and undo counts as a move; **Reset** keeps the count.
- When the solver finds no way to win from the current position, the game says so.
- **Hint** plays the solver's best next move, rewinding out of a dead end first.
- Score: 1000 − 1/sec after 30s (max 400) − 100 per move over par − 150 per hint.

## Equilibrium

The rules live in `equilibrium/engine.mjs`, shared by the app and the checker.

```bash
cd equilibrium
node check.mjs   # validate levels.json: exactly one solution, decoy, near misses
```

- Tap a weight then a hook (or a hook then a weight). Tap a hung weight to take it back.
- A side pulls with weight × distance (ticks count distance); a lower beam pulls with its total weight. A beam turns green only when everything under it is hung and both sides match.
- Beams tilt live as you place, and the line above the mobile says which beam tips which way.
- **Hint** hangs one correct weight and locks it. Par is one placement per hook.
- Score: 1000 − 1/sec after 30s (max 400) − 100 per placement over par − 150 per hint.

## All games

- **Hint** plays a 3-second placeholder ad first.
- The 🐞 QA bar (solution + auto-solve) only exists in `npm run dev`; it is stripped from `npm run build`.

Not built yet: sound, the simulated "global percentile", daily puzzle rotation.
