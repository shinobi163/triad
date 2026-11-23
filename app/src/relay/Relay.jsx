import { useEffect, useRef, useState } from 'react';
import data from '../../../relay/puzzles.json';
import { letters, linkError, options } from '../../../relay/engine.mjs';
import { GameFrame, HowTo, useGame, useHowTo } from '../components/GameFrame.jsx';
import WordInput from '../components/WordInput.jsx';
import Modal from '../components/Modal.jsx';
import { ResultActions, Stat, StatRow } from '../components/Results.jsx';
import { formatTime } from '../format.js';
import { session } from '../session.js';

const LIMIT = data.seconds;
// letters -> how to show it ("POLARBEAR" -> "POLAR BEAR")
const SHOWN = new Map(data.words.map((w) => [letters(w), w.toUpperCase()]));
const CATEGORY = new Set(SHOWN.keys());
const START = letters(data.start);
const KEY = `relay-${data.category}-${START}-${CATEGORY.size}`;

const ERRORS = {
  letter: (prev) => `Start with ${prev.slice(-1)}.`,
  category: () => `Not on today's ${data.category.toLowerCase()} list.`,
  used: () => 'Already used.',
};

// chain: [{ word, passed }]; `passed` marks a fresh word handed over by Pass.
const fresh = () => ({ chain: [{ word: START, passed: true }], elapsed: 0, status: 'playing', error: null, shake: 0 });
const usedOf = (chain) => new Set(chain.map((c) => c.word));
const last = (chain) => chain[chain.length - 1].word;

function reducer(state, action) {
  if (state.status !== 'playing') return state;
  switch (action.type) {
    case 'tick': {
      const elapsed = state.elapsed + 1;
      return { ...state, elapsed, status: elapsed >= LIMIT ? 'done' : 'playing' };
    }
    case 'try': {
      const word = letters(action.word);
      const error = linkError(last(state.chain), word, CATEGORY, usedOf(state.chain));
      if (error) return { ...state, error, shake: state.shake + 1 };
      return { ...state, chain: [...state.chain, { word, passed: false }], error: null };
    }
    case 'pass': {
      // Hand over the unused word with the most follow-ups, so a pass helps.
      const used = usedOf(state.chain);
      const pool = [...CATEGORY].filter((w) => !used.has(w));
      if (!pool.length) return { ...state, status: 'done' };
      const next = pool.reduce((best, w) => (options(w, CATEGORY, used).length > options(best, CATEGORY, used).length ? w : best));
      return { ...state, chain: [...state.chain, { word: next, passed: true }], error: null };
    }
    default:
      return state;
  }
}

const linkCount = (chain) => chain.filter((c) => !c.passed).length;

export function relayResults() {
  const s = session.get(KEY);
  return s?.status === 'done' ? [{ elapsed: s.elapsed, detail: `${linkCount(s.chain)} links` }] : [];
}

export default function Relay({ onHome }) {
  const [howTo, setHowTo] = useHowTo('relay');
  const [state, dispatch] = useGame(KEY, reducer, fresh, { paused: howTo });
  const [showResults, setShowResults] = useState(false);
  const done = state.status === 'done';
  const prev = last(state.chain);
  const stuck = !done && options(prev, CATEGORY, usedOf(state.chain)).length === 0;
  const links = linkCount(state.chain);

  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) setShowResults(true);
    wasDone.current = done;
  }, [done]);

  const submit = (word) => {
    dispatch({ type: 'try', word });
    return !linkError(prev, word, CATEGORY, usedOf(state.chain));   // keep a wrong word to edit
  };

  return (
    <GameFrame title="Relay" clock={formatTime(Math.max(0, LIMIT - state.elapsed))} onHome={onHome} onHelp={() => setHowTo(true)}>
      {howTo ? (
        <HowTo
          onPlay={() => setHowTo(false)}
          playLabel={`Start · ${LIMIT} seconds`}
          lines={[
            <>Today's category is <b>{data.category}</b>.</>,
            <>Each word must start with the <b>last letter</b> of the one before. No repeats.</>,
            <>Make the longest chain you can in {LIMIT} seconds. Stuck? Pass for a fresh word.</>,
          ]}
          example={<p className="font-mono">CAT → TIGER → RABBIT → TOAD …</p>}
        />
      ) : done ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="font-serif text-3xl font-bold">{links} links</p>
          <button type="button" onClick={() => setShowResults(true)} className="mt-6 w-full rounded-full bg-ink py-3 font-bold text-white">
            Results
          </button>
        </div>
      ) : (
        <>
          <p className="mt-6 text-center text-sm text-ink/70">
            {data.category} · Links <b className="font-mono text-ink">{links}</b>
          </p>
          <ol className="mt-4 flex flex-wrap justify-center gap-x-2 gap-y-1 font-mono text-sm text-ink/40" aria-label="Chain so far">
            {/* the last five words; · instead of → where a Pass broke the chain */}
            {state.chain.slice(-6, -1).map((c, i, shown) => {
              const next = shown[i + 1] ?? state.chain[state.chain.length - 1];
              return <li key={i}>{SHOWN.get(c.word)} {next.passed ? '·' : '→'}</li>;
            })}
          </ol>
          <p className="mt-6 text-center font-mono text-4xl font-bold tracking-[0.15em]" aria-label="Current word">
            {SHOWN.get(prev).slice(0, -1)}
            <span className="rounded bg-ink px-1 text-white">{prev.slice(-1)}</span>
          </p>
          <div className="mt-8">
            <WordInput onSubmit={submit} placeholder={`Starts with ${prev.slice(-1)}`} shake={state.shake} />
            <p className="mt-2 h-5 text-center text-sm font-semibold text-bad" aria-live="polite">
              {stuck ? `Nothing left starting with ${prev.slice(-1)}. Pass.` : state.error && ERRORS[state.error](prev)}
            </p>
            <button type="button" onClick={() => dispatch({ type: 'pass' })} className="mx-auto mt-1 block rounded-md px-4 py-2 text-sm font-semibold text-ink/60 hover:bg-black/5 hover:text-ink">
              Pass ›
            </button>
          </div>
        </>
      )}

      {showResults && (
        <Modal title="Time's up" onClose={() => setShowResults(false)}>
          <StatRow>
            <Stat label="Links" value={links} />
            <Stat label="Passes" value={state.chain.length - 1 - links} />
          </StatRow>
          <p className="mt-4 font-mono text-sm leading-relaxed">
            {state.chain.map((c, i) => (
              <span key={i}>
                {i > 0 && (c.passed ? ' · ' : ' → ')}
                <span className={c.passed ? 'text-ink/45' : ''}>{SHOWN.get(c.word)}</span>
              </span>
            ))}
          </p>
          <ResultActions onHome={onHome} shareText={() => `Wits · Relay (${data.category})\n🔗 ${links} links in ${LIMIT}s`} />
        </Modal>
      )}
    </GameFrame>
  );
}
