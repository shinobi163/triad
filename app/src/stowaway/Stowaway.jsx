import { useState } from 'react';
import data from '../../../stowaway/puzzles.json';
import { findHidden, picked } from '../../../stowaway/engine.mjs';
import { GameFrame, GiveUp, HowTo, useGame, useHowTo } from '../components/GameFrame.jsx';
import Modal from '../components/Modal.jsx';
import { ResultActions, Stat, StatRow } from '../components/Results.jsx';
import { formatTime } from '../format.js';
import { session } from '../session.js';
import { pick } from '../daily.js';

// Day n's theme and sentences, each with where its stowaway hides.
const cache = new Map();
function dayOf(day) {
  if (!cache.has(day)) {
    const { theme, sentences } = pick(data.days, day);
    const SENTENCES = sentences.map((s) => ({ ...s, hit: findHidden(s.text, s.answer).hit }));
    cache.set(day, { theme, SENTENCES, KEY: `stowaway-${day}-${theme}` });
  }
  return cache.get(day);
}

// log: 'found' | 'skipped' per sentence done; `first` is the first letter tapped.
const fresh = () => ({ index: 0, log: [], misses: 0, first: null, elapsed: 0, status: 'playing', shake: 0 });

const next = (SENTENCES, state, outcome) => {
  const log = [...state.log, outcome];
  return { ...state, log, first: null, index: state.index + 1, status: log.length >= SENTENCES.length ? 'done' : 'playing' };
};

const reducerFor = ({ SENTENCES }) => (state, action) => {
  if (action.type === 'tick') return state.status === 'playing' ? { ...state, elapsed: state.elapsed + 1 } : state;
  if (state.status !== 'playing') return state;
  const s = SENTENCES[state.index];
  switch (action.type) {
    case 'tap': {
      if (state.first === null) return { ...state, first: action.at };
      if (state.first === action.at) return { ...state, first: null };
      if (picked(s.text, state.first, action.at) === s.answer) return next(SENTENCES, state, 'found');
      return { ...state, first: null, misses: state.misses + 1, shake: state.shake + 1 };
    }
    case 'skip':
      return next(SENTENCES, state, 'skipped');
    case 'giveUp':
      return { ...state, first: null, status: 'done', gaveUp: true };
    default:
      return state;
  }
};

const foundCount = (log) => log.filter((l) => l === 'found').length;

export function stowawayResults(day) {
  const { KEY, SENTENCES } = dayOf(day);
  const s = session.get(KEY);
  return s?.status === 'done' ? [{ elapsed: s.elapsed, detail: `${foundCount(s.log)} of ${SENTENCES.length} found${s.gaveUp ? ' · gave up' : ''}` }] : [];
}

// The sentence with its stowaway marked, for the results card.
function Revealed({ s }) {
  const { start, end } = s.hit;
  return (
    <>
      {s.text.slice(0, start)}
      <mark className="rounded bg-ok/20 px-0.5 font-bold text-ink">{s.text.slice(start, end + 1)}</mark>
      {s.text.slice(end + 1)}
    </>
  );
}

export default function Stowaway({ day, onHome }) {
  const D = dayOf(day);
  const { SENTENCES, theme } = D;
  const [howTo, setHowTo] = useHowTo('stowaway');
  const [state, dispatch] = useGame(D.KEY, reducerFor(D), fresh, { paused: howTo });
  const [showResults, setShowResults] = useState(false);
  const done = state.status === 'done';
  const s = SENTENCES[state.index];

  const tap = (at) => {
    const finishing = state.first !== null && state.first !== at && picked(s.text, state.first, at) === s.answer && state.index === SENTENCES.length - 1;
    dispatch({ type: 'tap', at });
    if (finishing) setTimeout(() => setShowResults(true), 400);
  };
  const skip = () => {
    dispatch({ type: 'skip' });
    if (state.index === SENTENCES.length - 1) setTimeout(() => setShowResults(true), 200);
  };

  return (
    <GameFrame title="Stowaway" clock={formatTime(state.elapsed)} onHome={onHome} onHelp={() => setHowTo(true)}>
      {howTo ? (
        <HowTo
          onPlay={() => setHowTo(false)}
          lines={[
            <>Each sentence hides one <b>{theme.toLowerCase()}</b>, running across the gap between words.</>,
            <>Tap its <b>first letter</b>, then its <b>last letter</b>.</>,
            <>Find all {SENTENCES.length} as fast as you can.</>,
          ]}
          example={
            <p>
              Theme: Animals. “We had to gr<b className="underline">ab at</b> the rope.” hides <b>BAT</b>.
            </p>
          }
        />
      ) : done ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="font-serif text-3xl font-bold">{foundCount(state.log)} of {SENTENCES.length} found</p>
          <button type="button" onClick={() => setShowResults(true)} className="mt-6 w-full rounded-full bg-ink py-3 font-bold text-white">
            Results
          </button>
        </div>
      ) : (
        <>
          <p className="mt-6 text-center text-sm text-ink/70">
            Find the <b className="text-ink">{theme.toLowerCase()}</b> · {state.index + 1} of {SENTENCES.length}
          </p>
          <p
            key={state.index}
            className="mt-10 text-center font-serif text-[1.7rem] leading-[1.6]"
            aria-label="Sentence: tap the first and last letter of the hidden word"
          >
            {/* re-key on each miss so the shake replays */}
            <span key={state.shake} className={`inline-block ${state.shake ? 'animate-shake' : ''}`}>
              {[...s.text].map((ch, i) =>
                /[a-z]/i.test(ch) ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => tap(i)}
                    aria-pressed={state.first === i}
                    className={`rounded px-[1px] transition-colors hover:bg-black/10 ${state.first === i ? 'bg-ink text-white hover:bg-ink' : ''}`}
                  >
                    {ch}
                  </button>
                ) : (
                  <span key={i}>{ch}</span>
                ),
              )}
            </span>
          </p>
          <p className="mt-6 h-5 text-center text-sm text-ink/60" aria-live="polite">
            {state.first !== null ? 'Now tap the last letter.' : state.misses ? `Misses: ${state.misses}` : ''}
          </p>
          <button type="button" onClick={skip} className="mx-auto mt-auto block rounded-md px-4 py-2 text-sm font-semibold text-ink/60 hover:bg-black/5 hover:text-ink">
            Skip ›
          </button>
          <div className="mt-2">
            <GiveUp onGiveUp={() => { dispatch({ type: 'giveUp' }); setShowResults(true); }} />
          </div>
        </>
      )}

      {showResults && (
        <Modal title={state.gaveUp ? 'The stowaways' : 'All aboard'} onClose={() => setShowResults(false)}>
          <StatRow>
            <Stat label="Time" value={formatTime(state.elapsed)} />
            <Stat label="Found" value={`${foundCount(state.log)}/${SENTENCES.length}`} />
            <Stat label="Misses" value={state.misses} />
          </StatRow>
          <ul className="mt-4 space-y-2 font-serif">
            {SENTENCES.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className={state.log[i] === 'found' ? 'text-ok' : 'text-bad'}>{state.log[i] === 'found' ? '✓' : '✕'}</span>
                <span><Revealed s={s} /></span>
              </li>
            ))}
          </ul>
          <ResultActions
            onHome={onHome}
            shareText={() => `Wits #${day} · Stowaway (${theme})\n${state.log.map((l) => (l === 'found' ? '🟩' : '⬜')).join('')} · ⏱ ${formatTime(state.elapsed)}`}
          />
        </Modal>
      )}
    </GameFrame>
  );
}
