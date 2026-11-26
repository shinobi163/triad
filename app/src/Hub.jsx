import { GAMES } from './games.js';
import { formatTime } from './format.js';
import { dateOf, dayNumber } from './daily.js';
import { streak } from './streak.js';

// "3-day streak · Best 5", plus a nudge when today still needs a game.
function Streak() {
  const { current, best, today } = streak();
  if (!best) return null;
  return (
    <p className="mt-1 text-sm text-ink/60" aria-label="Streak">
      <span aria-hidden="true">🔥 </span>
      <b className="text-ink">{current}-day streak</b>
      {best > current && ` · Best ${best}`}
      {!today && current > 0 && ' · Play today to keep it going'}
    </p>
  );
}

// The day switcher's arrows: ‹ goes back a day, › forward (up to today).
function Arrow({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full text-xl text-ink/60 hover:bg-black/5 hover:text-ink disabled:invisible"
    >
      {children}
    </button>
  );
}

export default function Hub({ day, latest, onDay, onOpen }) {
  const isToday = day === dayNumber();
  const date = dateOf(day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const games = GAMES.map((g) => ({ ...g, finished: g.results(day) }));
  const doneCount = games.filter((g) => g.finished.length).length;

  return (
    <div className="min-h-[100dvh] bg-paper">
      <main className="mx-auto max-w-md px-4 pb-12 pt-12 sm:pt-20">
        <h1 className="font-serif text-5xl font-bold tracking-tight">Wits</h1>
        <div className="-ml-2 mt-2 flex items-center gap-1">
          <Arrow label="Previous day" onClick={() => onDay(day - 1)} disabled={day <= 1}>‹</Arrow>
          <p className="text-sm text-ink/60" aria-live="polite">
            <b className="font-mono text-ink">#{day}</b> · {isToday ? 'Today' : date} · {doneCount} of {games.length} played
          </p>
          <Arrow label="Next day" onClick={() => onDay(day + 1)} disabled={day >= latest}>›</Arrow>
        </div>
        <Streak />

        <ul className="mt-6 divide-y divide-rule border-y border-rule">
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

        <p className="mt-6 text-xs text-ink/45">
          New puzzles every midnight. {isToday ? (day > 1 ? 'Use ‹ to play earlier days.' : '') : <button type="button" onClick={() => onDay(dayNumber())} className="font-semibold underline">Back to today</button>}
          {' '}Progress is saved in this browser.
        </p>
      </main>
    </div>
  );
}
