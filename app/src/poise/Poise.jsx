import { useState } from 'react';
import data from '../../../poise/puzzles.json';
import { beams, fits, isBalanced, sideOfSlots, slotIds, solve, solved, tilt, torques, weightsOf } from '../../../poise/engine.mjs';
import { GameFrame, GiveUp, HowTo, useGame, useHowTo } from '../components/GameFrame.jsx';
import Modal from '../components/Modal.jsx';
import { ResultActions, Stat, StatRow } from '../components/Results.jsx';
import Mobile, { SIDE_TINT } from './Mobile.jsx';
import { formatTime } from '../format.js';
import { session } from '../session.js';
import { pick } from '../daily.js';

// Day n's level, with everything the screen derives from it worked out once.
const cache = new Map();
function levelFor(day) {
  if (!cache.has(day)) {
    const puzzle = pick(data.days, day);
    const SLOTS = slotIds(puzzle.beam);
    const WORDS = Object.keys(puzzle.bank).sort();   // alphabetical, so the order gives nothing away
    cache.set(day, {
      puzzle,
      SLOTS,
      SIDE: sideOfSlots(puzzle.beam),
      WORDS,
      PAR: SLOTS.length,
      KEY: `poise-${day}-${WORDS.join('-')}`,
      SOLUTION: solve(puzzle).solutions[0],
    });
  }
  return cache.get(day);
}
const beamName = (id) => (id === 'main' ? 'Top beam' : 'Lower beam');

// The How-to's picture: one beam, already balanced, pulls shown.
const DEMO = {
  categories: { left: 'Fruit', right: 'Colours' },
  beam: { left: { arm: 2, slot: 'X' }, right: { arm: 3, slot: 'Y' } },
  placed: { X: 'CHERRY', Y: 'BLUE' },
};

const freshFor = ({ SLOTS }) => () => ({ placed: Object.fromEntries(SLOTS.map((s) => [s, null])), moves: 0, elapsed: 0, status: 'playing', error: null, shake: 0 });

// Every placement counts as a move; a word on the wrong side just shakes.
const reducerFor = (L) => (state, action) => {
  const { puzzle, SLOTS, SOLUTION } = L;
  const fresh = freshFor(L);
  if (action.type === 'tick') return state.status === 'playing' ? { ...state, elapsed: state.elapsed + 1 } : state;
  if (state.status !== 'playing') return state;
  switch (action.type) {
    case 'place': {
      const { slot, word } = action;
      if (!fits(puzzle, word, slot)) return { ...state, error: { word, slot }, shake: state.shake + 1 };
      const placed = { ...state.placed };
      for (const s of SLOTS) if (placed[s] === word) placed[s] = null;
      placed[slot] = word;
      return { ...state, placed, moves: state.moves + 1, error: null, status: solved(puzzle, placed) ? 'done' : 'playing' };
    }
    case 'remove':
      return { ...state, placed: { ...state.placed, [action.slot]: null }, error: null };
    case 'clear':
      return { ...fresh(), moves: state.moves, elapsed: state.elapsed };
    case 'giveUp':
      return { ...state, placed: { ...SOLUTION }, status: 'done', gaveUp: true, error: null };
    default:
      return state;
  }
};

export function poiseResults(day) {
  const { KEY, PAR } = levelFor(day);
  const s = session.get(KEY);
  return s?.status === 'done' ? [{ elapsed: s.elapsed, detail: s.gaveUp ? 'Gave up' : `${s.moves} placements · par ${PAR}` }] : [];
}

// One line above the mobile that explains whatever the player just caused.
function instruction({ puzzle, SLOTS, SIDE }, state, weights) {
  if (state.status === 'done') return 'Perfect balance.';
  if (state.error) return `${state.error.word} isn't ${puzzle.categories[SIDE[state.error.slot]].toLowerCase()}. It belongs on the other side.`;
  if (SLOTS.every((s) => state.placed[s] == null)) return 'Hang a word on every hook so each beam balances.';
  // Lowest beams first: fix those before the beam they hang from.
  const loaded = beams(puzzle.beam).reverse().filter(({ beam }) => slotIds(beam).every((s) => weights[s] != null));
  const off = loaded.find(({ beam }) => !isBalanced(beam, weights));
  if (off) return `The ${beamName(off.id).toLowerCase()} tips ${tilt(off.beam, weights) > 0 ? 'right' : 'left'}: that side's letters × distance is bigger.`;
  if (loaded.length) return 'That beam balances. A lower beam pulls with all the letters hanging from it.';
  return 'Each side pulls with letters × distance. Count the ticks for distance.';
}

export default function Poise({ day, onHome }) {
  const L = levelFor(day);
  const { puzzle, SLOTS, SIDE, WORDS, PAR, KEY } = L;
  const [howTo, setHowTo] = useHowTo('poise');
  const [state, dispatch] = useGame(KEY, reducerFor(L), freshFor(L), { paused: howTo });
  const [selected, setSelected] = useState(null);   // { word } or { slot }
  const [showResults, setShowResults] = useState(false);
  const done = state.status === 'done';
  const weights = weightsOf(state.placed);
  const hung = new Set(Object.values(state.placed));

  const place = (slot, word) => {
    const next = { ...state.placed };
    for (const s of SLOTS) if (next[s] === word) next[s] = null;
    next[slot] = word;
    dispatch({ type: 'place', slot, word });
    setSelected(null);
    if (fits(puzzle, word, slot) && solved(puzzle, next)) setTimeout(() => setShowResults(true), 900);   // let the beams settle
  };

  const tapWord = (word) => {
    if (done) return;
    if (selected?.slot) place(selected.slot, word);
    else setSelected(selected?.word === word ? null : { word });
  };

  const tapSlot = (slot) => {
    if (done) return;
    if (selected?.word) place(slot, selected.word);
    else if (state.placed[slot] != null) dispatch({ type: 'remove', slot });
    else setSelected(selected?.slot === slot ? null : { slot });
  };

  return (
    <GameFrame title="Poise" clock={formatTime(state.elapsed)} onHome={onHome} onHelp={() => setHowTo(true)}>
      {howTo ? (
        <HowTo
          onPlay={() => setHowTo(false)}
          lines={[
            <>Tap a word, then a hook. Each side of the top beam has a <b>category</b>, and words only hang on their own side.</>,
            <>A word weighs its <b>letters</b>. A side pulls with <b>letters × distance</b>; count the ticks for distance.</>,
            <>When both sides pull the same, the beam turns <b className="text-[#16A34A]">green</b>. Balance them all. Some words are spares.</>,
          ]}
          example={
            <>
              <Mobile beam={DEMO.beam} weights={weightsOf(DEMO.placed)} placed={DEMO.placed} ui={{ categories: DEMO.categories, onTapSlot: () => {} }} />
              <p className="mt-1 text-center">
                CHERRY has 6 letters, 2 ticks out: 6 × 2 = 12.
                <br />
                BLUE has 4 letters, 3 ticks out: 4 × 3 = 12. Balanced.
              </p>
            </>
          }
        />
      ) : (
        <>
          <p className="mx-auto mt-5 min-h-[3rem] max-w-sm text-center text-[0.95rem] text-ink/80" aria-live="polite">
            {instruction(L, state, weights)}
          </p>

          <div key={state.shake} className={state.shake ? 'animate-shake' : ''}>
            <Mobile beam={puzzle.beam} weights={weights} placed={state.placed} ui={{ categories: puzzle.categories, selectedSlot: selected?.slot, onTapSlot: tapSlot }} />
          </div>

          <div className="mx-auto mt-4 flex flex-wrap justify-center gap-2" aria-label="Words">
            {WORDS.map((word) => {
              const isHung = hung.has(word);
              const isSel = selected?.word === word;
              return (
                <button
                  key={word}
                  type="button"
                  disabled={isHung || done}
                  onClick={() => tapWord(word)}
                  aria-pressed={isSel}
                  className={`rounded-lg border-2 px-3 py-1.5 font-mono text-sm font-bold tracking-wider transition ${
                    isHung ? 'border-dashed border-ink/15 text-ink/25' : isSel ? 'border-ink bg-ink text-white' : 'border-ink/20 hover:border-ink'
                  }`}
                >
                  {word}
                  <sup className="ml-1 font-sans text-[0.65rem] opacity-60">{word.length}</sup>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-center font-mono text-sm tabular-nums text-ink/70">
            Placed <b className="text-ink">{state.moves}</b> · Par {PAR}
          </p>

          <div className="mx-auto mt-auto flex w-full gap-2 pt-6">
            {done ? (
              <button type="button" onClick={() => setShowResults(true)} className="flex-1 rounded-full bg-ink py-3 font-bold text-white">
                Results
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { dispatch({ type: 'clear' }); setSelected(null); }}
                className="flex-1 rounded-full border-2 border-ink py-3 text-sm font-bold hover:bg-black/5"
              >
                Clear
              </button>
            )}
          </div>
          {!done && (
            <div className="mt-3">
              <GiveUp onGiveUp={() => { dispatch({ type: 'giveUp' }); setSelected(null); setTimeout(() => setShowResults(true), 900); }} />
            </div>
          )}
        </>
      )}

      {showResults && (
        <Modal title={state.gaveUp ? 'The answer' : 'Perfect balance'} onClose={() => setShowResults(false)}>
          <StatRow>
            <Stat label="Time" value={formatTime(state.elapsed)} />
            <Stat label="Placed" value={state.moves} />
            <Stat label="Par" value={PAR} />
          </StatRow>
          <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-ink/50">Why it balances</h3>
          <ul className="mt-2 space-y-1 font-mono text-sm">
            {beams(puzzle.beam).map(({ id, beam }) => {
              const t = torques(beam, weights);
              return (
                <li key={id}>
                  <span className="font-sans font-semibold">{beamName(id)}:</span> {t.left} = {t.right}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm">
            {SLOTS.map((s) => (
              <span key={s} className="mr-2 font-mono font-bold" style={{ color: SIDE_TINT[SIDE[s]] }}>{state.placed[s]}</span>
            ))}
          </p>
          <ResultActions
            onHome={onHome}
            shareText={() => `Wits #${day} · Poise\n⚖️ ${state.gaveUp ? 'Gave up' : `${state.moves} placements (par ${PAR})`} · ⏱ ${formatTime(state.elapsed)}`}
          />
        </Modal>
      )}
    </GameFrame>
  );
}
