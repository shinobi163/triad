// Building blocks for every game's results screen.
import { useState } from 'react';

export function Stat({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[0.7rem] uppercase tracking-wider text-ink/60">{label}</div>
    </div>
  );
}

export function StatRow({ children }) {
  return <div className="grid auto-cols-fr grid-flow-col gap-2 border-y border-black/10 py-4">{children}</div>;
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  }
}

// Share (+ an optional next step), and the way back to all games.
export function ResultActions({ shareText, onNext, nextLabel = 'Next →', onHome }) {
  const [copied, setCopied] = useState(null);   // null | 'ok' | 'failed'
  const share = async () => {
    setCopied((await copy(shareText())) ? 'ok' : 'failed');
    setTimeout(() => setCopied(null), 1800);
  };
  return (
    <>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={share} className="flex-1 rounded-full border-2 border-ink py-3 font-bold hover:bg-black/5">
          {copied === 'ok' ? 'Copied ✓' : copied === 'failed' ? "Couldn't copy" : '📋 Share'}
        </button>
        {onNext && (
          <button type="button" onClick={onNext} className="flex-1 rounded-full bg-ink py-3 font-bold text-white hover:bg-ink/85">
            {nextLabel}
          </button>
        )}
      </div>
      {onHome && (
        <button type="button" onClick={onHome} className="mx-auto mt-3 block rounded-md px-3 py-2 text-sm font-semibold text-ink/70 underline-offset-4 hover:text-ink hover:underline">
          ‹ Back to all games
        </button>
      )}
    </>
  );
}
