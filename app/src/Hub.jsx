import { GAMES } from './games.js';
import { formatTime } from './format.js';

export default function Hub({ onOpen }) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  // Results appear only for puzzles finished this visit.
  const games = GAMES.map((g) => ({ ...g, finished: g.results() }));
  const doneCount = games.filter((g) => g.finished.length).length;

  return (
    <div className="min-h-[100dvh] bg-paper">
      <main className="mx-auto max-w-md px-4 pb-12 pt-12 sm:pt-20">
        <h1 className="font-serif text-5xl font-bold tracking-tight">Wits</h1>
        <p className="mt-2 text-sm text-ink/60">
          {today} · {doneCount} of {games.length} played
        </p>

        <ul className="mt-8 divide-y divide-rule border-y border-rule">
          {games.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onOpen(g.id)}
                className="group flex w-full items-center gap-4 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-xl font-bold group-hover:underline">{g.name}</span>
                  <span className="block text-sm text-ink/60">{g.blurb}</span>
                  {g.finished.map((r, i) => (
                    <span key={i} className="mt-1 block font-mono text-xs tabular-nums text-ok">
                      ✓ {r.label ? `${r.label} · ` : ''}
                      {formatTime(r.elapsed)} · {r.detail}
                    </span>
                  ))}
                </span>
                <span className="flex-none text-2xl text-ink/30 group-hover:text-ink" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs text-ink/45">Progress lasts until you close or reload this page.</p>
      </main>
    </div>
  );
}
