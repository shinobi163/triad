import { LEVELS as CROSSFIRE_LEVELS } from './crossfire/logic.js';
import { resultOf as crossfireResult } from './crossfire/useCrossfire.js';
import { LEVELS as SEAM_LEVELS } from './seam/levels.js';
import { resultOf as seamResult } from './seam/useSeam.js';
import { LEVELS as EQUILIBRIUM_LEVELS } from './equilibrium/levels.js';
import { resultOf as equilibriumResult } from './equilibrium/useEquilibrium.js';
import { formatTime } from './format.js';

// Small line drawings so each card reads at a glance.
const GLYPHS = {
  crossfire: (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={4 + c * 14} y={4 + r * 14} width="12" height="12" rx="2"
          fill={r === 1 || c === 1 ? 'currentColor' : 'none'} fillOpacity={r === 1 && c === 1 ? 1 : 0.25}
          stroke="currentColor" strokeWidth="1.5" />
      )))}
    </svg>
  ),
  seam: (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="5" y="5" width="38" height="38" rx="3" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.5" />
      <line x1="24" y1="5" x2="24" y2="43" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
      <circle cx="14" cy="24" r="5" fill="currentColor" />
      <circle cx="34" cy="24" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  equilibrium: (
    <svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="24" y1="3" x2="24" y2="10" />
      <line x1="6" y1="10" x2="42" y2="10" strokeWidth="3" />
      <line x1="8" y1="10" x2="8" y2="24" /><circle cx="8" cy="29" r="5" fill="currentColor" />
      <line x1="38" y1="10" x2="38" y2="20" />
      <line x1="28" y1="20" x2="46" y2="20" strokeWidth="3" />
      <line x1="30" y1="20" x2="30" y2="34" /><circle cx="30" cy="38" r="4" fill="currentColor" />
      <line x1="44" y1="20" x2="44" y2="30" /><circle cx="44" cy="34" r="3" fill="currentColor" />
    </svg>
  ),
};

const GAMES = [
  { id: 'crossfire', name: 'Crossfire', blurb: 'Link compound words across a 3×3 circuit.', color: 'text-fire', bar: 'bg-fire', levels: CROSSFIRE_LEVELS, resultOf: crossfireResult },
  { id: 'seam', name: 'Seam', blurb: 'Fold the paper so matching orbs meet and fuse.', color: 'text-thread', bar: 'bg-thread', levels: SEAM_LEVELS, resultOf: seamResult },
  { id: 'equilibrium', name: 'Equilibrium', blurb: 'Balance a hanging mobile, weight by weight.', color: 'text-emerald-600', bar: 'bg-emerald-500', levels: EQUILIBRIUM_LEVELS, resultOf: equilibriumResult },
];

// One finished level: ✓ or ✕, then time, score and how it went.
function ResultLine({ level, result }) {
  return (
    <span className="flex items-baseline gap-2 text-sm">
      <span className={`font-bold ${result.won ? 'text-ok' : 'text-bad'}`} aria-hidden="true">{result.won ? '✓' : '✕'}</span>
      <span className="w-20 flex-none font-semibold">{level.master ? 'Master' : level.label}</span>
      <span className="min-w-0 flex-1 font-mono text-xs tabular-nums text-ink/70">
        {formatTime(result.elapsed)} · {result.qa ? 'QA' : `${result.score} pts`} · {result.detail}
      </span>
    </span>
  );
}

export default function Hub({ onOpen }) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  // Progress appears only for levels the player has finished this visit.
  const games = GAMES.map((g) => ({
    ...g,
    finished: g.levels.map((level) => ({ level, result: g.resultOf(level) })).filter((f) => f.result),
  }));
  // A game is complete once its Daily #1 is finished.
  const complete = (g) => g.finished.some((f) => f.level === g.levels[0]);
  const completeCount = games.filter(complete).length;

  return (
    <div className="min-h-[100dvh] bg-paper">
      <main className="mx-auto max-w-xl px-4 pb-12 pt-10 sm:pt-16">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">{today}</p>
        <h1 className="mt-2 text-center font-serif text-5xl font-bold tracking-tight sm:text-6xl">◆ TRIAD</h1>
        <p className="mt-3 text-center text-ink/70">Three logic puzzles. Pick one to play.</p>

        <div className="mx-auto mt-6 flex max-w-[14rem] items-center gap-1.5" aria-label={`${completeCount} of ${games.length} games complete`}>
          {games.map((g) => (
            <span key={g.id} className={`h-1.5 flex-1 rounded-full ${complete(g) ? g.bar : 'bg-black/10'}`} />
          ))}
        </div>
        <p className="mt-2 text-center text-sm font-semibold tabular-nums text-ink/70">
          {completeCount === games.length ? 'All three complete. See you tomorrow!' : `${completeCount} of ${games.length} complete`}
        </p>

        <ul className="mt-8 grid gap-3">
          {games.map((g) => {
            const done = complete(g);
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onOpen(g.id)}
                  className="group w-full rounded-2xl border border-black/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-ink hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
                >
                  <span className="flex items-center gap-4">
                    <span className={`grid h-14 w-14 flex-none place-items-center rounded-xl bg-black/[0.04] p-2 ${g.color}`}>
                      <span className="block h-full w-full">{GLYPHS[g.id]}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif text-xl font-bold">{g.name}</span>
                      <span className="block text-sm leading-snug text-ink/70">{g.blurb}</span>
                    </span>
                    {done ? (
                      <span className="flex-none rounded-full bg-ok/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ok">Complete</span>
                    ) : (
                      <span className="flex-none rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition group-hover:bg-ink/85">Play</span>
                    )}
                  </span>
                  {g.finished.length > 0 && (
                    <span className="mt-3 block space-y-1 border-t border-black/10 pt-3">
                      {g.finished.map(({ level, result }) => <ResultLine key={level.id} level={level} result={result} />)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-center text-xs text-ink/50">Progress lasts until you close or reload this page.</p>
      </main>
    </div>
  );
}
