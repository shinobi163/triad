// What every game shares: the top bar, the How-to screen and the game state.
import { useEffect, useReducer, useState } from 'react';
import { session } from '../session.js';

// ‹ Games on the left is always the way out. Leaving keeps the game as it is
// for this visit, so there is nothing to confirm.
export function GameFrame({ title, clock, onHome, onHelp, children }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-paper">
      <header className="border-b border-rule">
        <div className="mx-auto grid h-14 max-w-md grid-cols-[1fr_auto_1fr] items-center px-4">
          <button
            type="button"
            onClick={onHome}
            className="-ml-2 justify-self-start rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-black/5"
            aria-label="Back to all games"
          >
            ‹ Games
          </button>
          <h1 className="font-serif text-lg font-bold">{title}</h1>
          <div className="flex items-center gap-1 justify-self-end">
            {clock != null && <span className="font-mono text-sm tabular-nums" aria-label="Time">{clock}</span>}
            {onHelp && (
              <button type="button" onClick={onHelp} className="-mr-2 rounded-md px-2 py-1.5 text-sm font-bold hover:bg-black/5" aria-label="How to play">
                ?
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-8">{children}</main>
    </div>
  );
}

// Three short lines, one example, and Play. `children` sits above Play
// (Lockpick puts its word-length choice there).
export function HowTo({ lines, example, onPlay, playLabel = 'Play', children }) {
  return (
    <div className="flex flex-1 flex-col pt-8">
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-ink/50">How to play</h2>
      <ol className="mt-4 space-y-3 text-[1.05rem] leading-snug">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-3">
            <span className="font-mono text-sm leading-6 text-ink/40">{i + 1}</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
      {example && <div className="mt-6 rounded-xl bg-black/[0.04] p-4 text-sm">{example}</div>}
      {children}
      <button type="button" onClick={onPlay} className="mt-auto w-full rounded-full bg-ink py-3.5 font-bold text-white hover:bg-ink/85">
        {playLabel}
      </button>
    </div>
  );
}

// The How-to shows the first time a game opens each visit; ? brings it back.
export function useHowTo(id) {
  const key = `howto-${id}`;
  const [open, setOpen] = useState(() => !session.get(key));
  useEffect(() => {
    if (!open) session.set(key, true);
  }, [key, open]);
  return [open, setOpen];
}

// A game's state, kept in the session store under `key` so leaving and
// returning resumes it. The reducer must handle { type: 'tick' }, which
// arrives once a second while status is 'playing' and the game isn't paused.
export function useGame(key, reducer, init, { paused }) {
  const [state, dispatch] = useReducer(reducer, key, (k) => session.get(k) ?? init());

  useEffect(() => {
    session.set(key, state);
  }, [key, state]);

  useEffect(() => {
    if (state.status !== 'playing' || paused) return undefined;
    const id = setInterval(() => {
      if (!document.hidden) dispatch({ type: 'tick' });
    }, 1000);
    return () => clearInterval(id);
  }, [state.status, paused]);

  return [state, dispatch];
}

// Ends the game and shows the answer. The first tap asks to be sure, so a
// stray tap can't end a game.
export function GiveUp({ onGiveUp }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      onClick={() => (armed ? onGiveUp() : setArmed(true))}
      className={`mx-auto block rounded-md px-4 py-2 text-sm font-semibold hover:bg-black/5 ${armed ? 'text-bad' : 'text-ink/50 hover:text-ink'}`}
    >
      {armed ? 'Tap again to show the answer' : 'Give up'}
    </button>
  );
}
