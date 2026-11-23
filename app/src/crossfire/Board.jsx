import { LAYOUT, SLOTS, SLOT_LINKS, slotStatus } from './logic.js';

const isSlot = (cell) => SLOTS.includes(cell);

const STATUS_STYLE = {
  ok: 'bg-ok border-ok text-white',
  trap: 'bg-trap border-trap text-ink',
  bad: 'bg-bad border-bad text-white',
};
const STATUS_BADGE = { ok: '3/3 ✓', trap: '2/3 TRAP', bad: '' };

// Result of one link (true/false), or null if that slot hasn't been checked
// with the word that's in it now.
function linkResult(state, a, b) {
  const slot = isSlot(a) ? a : b;
  const r = state.results[slot];
  if (!r || r.word !== state.placed[slot]) return null;
  const i = SLOT_LINKS[slot].findIndex(([l, rr]) => l === a && rr === b);
  return r.links[i];
}

function Link({ dir, result }) {
  const color = result === null ? 'text-ink/25' : result ? 'text-ok' : 'text-bad';
  return (
    <div className={`flex items-center justify-center text-lg font-black leading-none select-none ${color}`} aria-hidden="true">
      {result === false ? '✕' : dir === 'right' ? '→' : '↓'}
    </div>
  );
}

function Anchor({ word }) {
  return (
    <div className="flex aspect-square items-center justify-center rounded-md bg-ink px-1 text-center text-[clamp(0.7rem,3.6vw,1rem)] font-bold tracking-wide text-white">
      {word}
    </div>
  );
}

function Slot({ slot, state, selected, onTap }) {
  const word = state.placed[slot];
  const r = state.results[slot];
  const status = r && r.word === word ? slotStatus(r.links) : null;
  const locked = state.locked[slot];

  let look = 'border-2 border-dashed border-ink/40 bg-white text-ink/30';
  if (word) look = 'border-2 border-ink bg-white text-ink';
  if (status) look = `border-2 ${STATUS_STYLE[status]}`;
  if (selected) look += ' ring-4 ring-fire/60';

  return (
    <button
      type="button"
      onClick={() => onTap(slot)}
      disabled={locked || state.status !== 'playing'}
      aria-label={word ? `Slot ${slot}: ${word}${status ? `, ${STATUS_BADGE[status] || 'wrong'}` : ''}` : `Empty slot ${slot}`}
      className={`relative flex aspect-square w-full flex-col items-center justify-center rounded-md px-1 text-center font-bold tracking-wide transition ${look} ${
        status === 'ok' ? 'animate-pop' : status === 'bad' ? 'animate-shake' : ''
      } disabled:cursor-default`}
    >
      <span className="text-[clamp(0.7rem,3.6vw,1rem)]">{word ?? slot}</span>
      {status && STATUS_BADGE[status] && (
        <span className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-wider opacity-90">{STATUS_BADGE[status]}</span>
      )}
      {locked && <span className="absolute right-1 top-0.5 text-[0.65rem]" aria-hidden="true">🔒</span>}
    </button>
  );
}

// 5x5 CSS grid: cells on odd tracks, link arrows on even tracks.
export default function Board({ level, state, selectedSlot, onTapSlot }) {
  const items = [];
  LAYOUT.forEach((row, i) => {
    row.forEach((cell, j) => {
      items.push(
        <div key={cell} style={{ gridRow: 2 * i + 1, gridColumn: 2 * j + 1 }}>
          {isSlot(cell) ? (
            <Slot slot={cell} state={state} selected={selectedSlot === cell} onTap={onTapSlot} />
          ) : (
            <Anchor word={level.fixed[cell]} />
          )}
        </div>,
      );
      if (j < 2) {
        const right = row[j + 1];
        items.push(
          <div key={`${cell}-${right}`} style={{ gridRow: 2 * i + 1, gridColumn: 2 * j + 2 }} className="flex">
            <Link dir="right" result={linkResult(state, cell, right)} />
          </div>,
        );
      }
      if (i < 2) {
        const below = LAYOUT[i + 1][j];
        items.push(
          <div key={`${cell}-${below}`} style={{ gridRow: 2 * i + 2, gridColumn: 2 * j + 1 }} className="flex justify-center">
            <Link dir="down" result={linkResult(state, cell, below)} />
          </div>,
        );
      }
    });
  });

  return (
    <div className="mx-auto grid w-full max-w-[22rem] grid-cols-[1fr_1.5rem_1fr_1.5rem_1fr] grid-rows-[auto_1.5rem_auto_1.5rem_auto]">
      {items}
    </div>
  );
}
