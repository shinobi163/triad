import { useEffect, useRef, useState } from 'react';
import data from '../../../reelgaps/puzzles.json';
import { clueFor, isAnswer } from '../../../reelgaps/engine.mjs';
import { GameFrame, GiveUp, HowTo, useGame, useHowTo } from '../components/GameFrame.jsx';
import WordInput from '../components/WordInput.jsx';
import Modal from '../components/Modal.jsx';
import { ResultActions, Stat, StatRow } from '../components/Results.jsx';
import { formatTime } from '../format.js';
import { session } from '../session.js';

const LIMIT = data.seconds;
const TITLES = data.titles;
const KEY = `reelgaps-${TITLES.length}-${clueFor(TITLES.join(''))}`;

// log: one { title, solved } per title seen, in order.
const fresh = () => ({ index: 0, log: [], elapsed: 0, status: 'playing', shake: 0 });

const advance = (state, solved) => {
  const log = [...state.log, { title: TITLES[state.index], solved }];
  const index = state.index + 1;
  return { ...state, log, index, status: index >= TITLES.length ? 'done' : 'playing' };
};

function reducer(state, action) {
  if (state.status !== 'playing') return state;
  switch (action.type) {
    case 'tick': {
      const elapsed = state.elapsed + 1;
      return { ...state, elapsed, status: elapsed >= LIMIT ? 'done' : 'playing' };
    }
    case 'answer':
      return isAnswer(action.text, TITLES[state.index]) ? advance(state, true) : { ...state, shake: state.shake + 1 };
    case 'skip':
      return advance(state, false);
    case 'giveUp':
      return { ...state, status: 'done', gaveUp: true };
    default:
      return state;
  }
}

const solvedCount = (s) => s.log.filter((l) => l.solved).length;

export function reelGapsResults() {
  const s = session.get(KEY);
  return s?.status === 'done' ? [{ elapsed: s.elapsed, detail: `${solvedCount(s)} of ${TITLES.length} solved${s.gaveUp ? ' · gave up' : ''}` }] : [];
}

export default function ReelGaps({ onHome }) {
  const [howTo, setHowTo] = useHowTo('reelgaps');
  const [state, dispatch] = useGame(KEY, reducer, fresh, { paused: howTo });
  const [showResults, setShowResults] = useState(false);
  const [flash, setFlash] = useState(false);
  const done = state.status === 'done';
  const solved = solvedCount(state);

  // Show results the moment time runs out or the last title goes.
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) setShowResults(true);
    wasDone.current = done;
  }, [done]);

  const submit = (text) => {
    const right = isAnswer(text, TITLES[state.index]);
    dispatch({ type: 'answer', text });
    if (right) {
      setFlash(true);
      setTimeout(() => setFlash(false), 350);
    }
    return right;   // keep a wrong answer in the box to edit
  };

  return (
    <GameFrame title="Reel Gaps" clock={formatTime(Math.max(0, LIMIT - state.elapsed))} onHome={onHome} onHelp={() => setHowTo(true)}>
      {howTo ? (
        <HowTo
          onPlay={() => setHowTo(false)}
          playLabel={`Start · ${LIMIT} seconds`}
          lines={[
            <>Each clue is a movie title with its <b>vowels and spaces removed</b>. Y stays.</>,
            <>Today's {TITLES.length} titles are all <b>{data.theme.toLowerCase()}</b>. Type the full title; spaces and capitals don't matter.</>,
            <>Solve as many as you can in {LIMIT} seconds. Stuck? Skip.</>,
          ]}
          example={<p className="font-mono">THSCLNTWRK → THE SOCIAL NETWORK</p>}
        />
      ) : done ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="font-serif text-3xl font-bold">{solved} solved</p>
          <button type="button" onClick={() => setShowResults(true)} className="mt-6 w-full rounded-full bg-ink py-3 font-bold text-white">
            Results
          </button>
        </div>
      ) : (
        <>
          <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.2em] text-fire">Theme: {data.theme}</p>
          <p className="mt-1 text-center text-sm text-ink/70">
            Solved <b className="font-mono text-ink">{solved}</b> · Title {state.index + 1} of {TITLES.length}
          </p>
          <p
            className={`mt-8 break-all text-center font-mono text-3xl font-bold tracking-[0.25em] transition-colors sm:text-4xl ${flash ? 'text-ok' : ''}`}
            aria-label="Clue"
          >
            {clueFor(TITLES[state.index])}
          </p>
          <div className="mt-10">
            <WordInput onSubmit={submit} placeholder="Movie title" shake={state.shake} />
            <button type="button" onClick={() => dispatch({ type: 'skip' })} className="mx-auto mt-3 block rounded-md px-4 py-2 text-sm font-semibold text-ink/60 hover:bg-black/5 hover:text-ink">
              Skip ›
            </button>
            <div className="mt-6">
              <GiveUp onGiveUp={() => dispatch({ type: 'giveUp' })} />
            </div>
          </div>
        </>
      )}

      {showResults && (
        <Modal title={state.gaveUp ? 'The answers' : state.elapsed >= LIMIT ? "Time's up" : 'All done'} onClose={() => setShowResults(false)}>
          <StatRow>
            <Stat label="Solved" value={`${solved}/${TITLES.length}`} />
            <Stat label="Time" value={formatTime(state.elapsed)} />
          </StatRow>
          {/* every title, including ones the clock or Give up cut off */}
          <ul className="mt-4 space-y-1 text-sm">
            {TITLES.map((title, i) => {
              const ok = state.log[i]?.solved;
              return (
                <li key={title} className="flex gap-2">
                  <span className={ok ? 'text-ok' : 'text-bad'}>{ok ? '✓' : '✕'}</span>
                  <span className="font-mono text-ink/50">{clueFor(title)}</span>
                  <span className="ml-auto text-right font-semibold">{title}</span>
                </li>
              );
            })}
          </ul>
          <ResultActions
            onHome={onHome}
            shareText={() => `Wits · Reel Gaps (${data.theme})\n🎬 ${solved}/${TITLES.length} in ${LIMIT}s\n${TITLES.map((_, i) => (state.log[i]?.solved ? '🟩' : '⬜')).join('')}`}
          />
        </Modal>
      )}
    </GameFrame>
  );
}
