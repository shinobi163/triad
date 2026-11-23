// Pieces every game screen shares: top bar, QA bar, level tabs.
import { useEffect, useState } from 'react';
import { formatTime } from '../format.js';
import { session } from '../session.js';

export const SHOW_QA = import.meta.env.DEV;   // never shipped to players

function NavButton({ children, ...props }) {
  return (
    <button type="button" className="rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-black/5" {...props}>
      {children}
    </button>
  );
}

// The way out is always the first thing in the bar. Leaving keeps the game
// as it is for this visit, so there is nothing to confirm.
export function TopBar({ title, elapsed, onRules, onHome, qaOpen, onToggleQa }) {
  return (
    <header className="border-b border-black/10">
      <div className="mx-auto flex h-14 max-w-xl items-center gap-2 px-4">
        <button
          type="button"
          onClick={onHome}
          className="-ml-2 flex flex-none items-center gap-1 rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-black/5"
          aria-label="Back to all games"
        >
          <span aria-hidden="true" className="text-lg leading-none">‹</span> Games
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center font-serif text-lg font-bold">{title}</h1>
        <div className="flex flex-none items-center gap-1">
          <span className="mr-1 font-mono text-sm tabular-nums" aria-label="Time">⏱ {formatTime(elapsed)}</span>
          <NavButton onClick={onRules} aria-label="How to play">❓</NavButton>
          {SHOW_QA && (
            <NavButton onClick={onToggleQa} aria-pressed={qaOpen}>
              🐞 QA
            </NavButton>
          )}
        </div>
      </div>
    </header>
  );
}

export function QaBar({ children, onAutoSolve, disabled }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 bg-ink px-4 py-2 font-mono text-xs text-white">
      <span>{children}</span>
      <button type="button" disabled={disabled} onClick={onAutoSolve} className="rounded bg-fire px-2 py-1 font-bold disabled:opacity-40">
        ⚡ AUTO-SOLVE
      </button>
    </div>
  );
}

export function LevelTabs({ levels, level, onSelect }) {
  return (
    <nav className="mx-auto mt-4 flex w-full max-w-xl justify-center gap-2 px-4" aria-label="Puzzles">
      {levels.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => onSelect(l)}
          aria-current={l === level ? 'page' : undefined}
          className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
            l === level ? 'border-ink bg-ink text-white' : 'border-black/15 hover:border-ink'
          }`}
        >
          {l.label}
          {l.master && <span className="ml-1 text-xs opacity-70">(Master)</span>}
        </button>
      ))}
    </nav>
  );
}

// True the first time `key` is seen this visit; remembers it afterwards.
export function useFirstVisit(key) {
  const [first] = useState(() => !session.get(key));
  useEffect(() => {
    session.set(key, true);
  }, [key]);
  return first;
}
