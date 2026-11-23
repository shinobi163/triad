import { useState } from 'react';
import data from '../../../rungs/puzzles.json';
import { shortestPath, stepError } from '../../../rungs/engine.mjs';
import { GameFrame, HowTo, useGame, useHowTo } from '../components/GameFrame.jsx';
import WordInput from '../components/WordInput.jsx';
import Modal from '../components/Modal.jsx';
import { ResultActions, Stat, StatRow } from '../components/Results.jsx';
import { commonWords, isWord } from '../words.js';
import { formatTime } from '../format.js';
import { session } from '../session.js';

const raw = data.puzzles[0];
const route = shortestPath(raw.start, raw.end, commonWords(raw.start.length));
export const PUZZLE = { ...raw, par: route.length - 1, route };
const KEY = `rungs-${PUZZLE.id}-${PUZZLE.start}-${PUZZLE.end}`;

const ERRORS = {
  length: `Use ${PUZZLE.start.length} letters.`,
  same: 'Change one letter.',
  letters: 'Change only one letter.',
  word: 'Not in the word list.',
};

const fresh = () => ({ ladder: [PUZZLE.start], steps: 0, misses: 0, elapsed: 0, status: 'playing', error: null, shake: 0 });

// Every try is a step, valid or not; only valid words join the ladder.
function reducer(state, action) {
  if (action.type === 'tick') return state.status === 'playing' ? { ...state, elapsed: state.elapsed + 1 } : state;
  if (state.status !== 'playing' || action.type !== 'try') return state;
  const prev = state.ladder[state.ladder.length - 1];
  const error = stepError(prev, action.word, isWord);
  if (error) return { ...state, steps: state.steps + 1, misses: state.misses + 1, error, shake: state.shake + 1 };
  const ladder = [...state.ladder, action.word];
  return { ...state, ladder, steps: state.steps + 1, error: null, status: action.word === PUZZLE.end ? 'done' : 'playing' };
}

export function rungsResults() {
  const s = session.get(KEY);
  return s?.status === 'done' ? [{ elapsed: s.elapsed, detail: `${s.steps} steps · par ${PUZZLE.par}` }] : [];
}

// One word as letter tiles; `changed` marks the letter that differs from the word above.
function Rung({ word, changed, tone = 'normal' }) {
  return (
    <div className="flex justify-center gap-1.5">
      {[...word].map((ch, i) => (
        <span
          key={i}
          className={`grid h-11 w-11 place-items-center rounded-lg font-mono text-xl font-bold ${
            tone === 'target'
              ? 'border-2 border-dashed border-ink/25 text-ink/45'
              : i === changed
                ? 'bg-ink text-white'
                : 'border-2 border-ink/15'
          }`}
        >
          {ch}
        </span>
      ))}
    </div>
  );
}

const diffAt = (a, b) => [...b].findIndex((ch, i) => ch !== a[i]);

export default function Rungs({ onHome }) {
  const [howTo, setHowTo] = useHowTo('rungs');
  const [state, dispatch] = useGame(KEY, reducer, fresh, { paused: howTo });
  const [showResults, setShowResults] = useState(false);
  const done = state.status === 'done';

  const submit = (word) => {
    dispatch({ type: 'try', word });
    if (word === PUZZLE.end && !stepError(state.ladder[state.ladder.length - 1], word, isWord)) setTimeout(() => setShowResults(true), 500);
  };

  return (
    <GameFrame title="Rungs" clock={formatTime(state.elapsed)} onHome={onHome} onHelp={() => setHowTo(true)}>
      {howTo ? (
        <HowTo
          onPlay={() => setHowTo(false)}
          lines={[
            <>Get from the top word to the bottom word.</>,
            <>Each step, change <b>one letter</b>. Every step must be a real word.</>,
            <>A wrong try shakes and still counts as a step. Reach the end in as few steps as you can.</>,
          ]}
          example={
            <p className="font-mono tracking-wider">
              COLD → CO<b>R</b>D → <b>W</b>ORD → W<b>A</b>RD → WAR<b>M</b>
            </p>
          }
        />
      ) : (
        <>
          <p className="mt-6 text-center text-sm text-ink/70">
            <b className="font-mono text-ink">{PUZZLE.start}</b> to <b className="font-mono text-ink">{PUZZLE.end}</b>
          </p>
          <div className="mt-5 space-y-1.5" aria-label="Ladder">
            {state.ladder.map((w, i) => (
              <Rung key={i} word={w} changed={i ? diffAt(state.ladder[i - 1], w) : -1} />
            ))}
            {!done && <Rung word={PUZZLE.end} tone="target" />}
          </div>

          <p className="mt-5 text-center font-mono text-sm tabular-nums text-ink/70">
            Step <b className="text-ink">{state.steps}</b> · Par {PUZZLE.par}
          </p>

          <div className="mt-4">
            {done ? (
              <button type="button" onClick={() => setShowResults(true)} className="w-full rounded-full bg-ink py-3 font-bold text-white">
                Results
              </button>
            ) : (
              <>
                <WordInput onSubmit={submit} maxLength={PUZZLE.start.length} placeholder="Next word" shake={state.shake} />
                <p className="mt-2 h-5 text-center text-sm font-semibold text-bad" aria-live="polite">
                  {state.error && ERRORS[state.error]}
                </p>
              </>
            )}
          </div>
        </>
      )}

      {showResults && (
        <Modal title="You made it" onClose={() => setShowResults(false)}>
          <StatRow>
            <Stat label="Time" value={formatTime(state.elapsed)} />
            <Stat label="Steps" value={state.steps} />
            <Stat label="Par" value={PUZZLE.par} />
          </StatRow>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-ink/50">A shortest route</p>
          <p className="mt-1 font-mono text-sm">{PUZZLE.route.join(' → ')}</p>
          <ResultActions
            onHome={onHome}
            shareText={() => `Wits · Rungs ${PUZZLE.start} → ${PUZZLE.end}\n${state.steps} steps (par ${PUZZLE.par}) · ⏱ ${formatTime(state.elapsed)}`}
          />
        </Modal>
      )}
    </GameFrame>
  );
}
