import { useState } from 'react';
import data from '../../../lockpick/puzzles.json';
import { bounds, clue, idealGuesses, ruledOut } from '../../../lockpick/engine.mjs';
import { GameFrame, HowTo, useGame, useHowTo } from '../components/GameFrame.jsx';
import WordInput from '../components/WordInput.jsx';
import Modal from '../components/Modal.jsx';
import { ResultActions, Stat, StatRow } from '../components/Results.jsx';
import { commonWords, isWord } from '../words.js';
import { formatTime } from '../format.js';
import { session } from '../session.js';

const LENGTHS = [4, 5, 6];
const PUZZLES = Object.fromEntries(
  LENGTHS.map((n) => {
    const secret = data.secrets[n];
    return [n, { n, secret, par: idealGuesses([...commonWords(n)].sort(), secret), key: `lockpick-${n}-${secret}` }];
  }),
);
const LENGTH_KEY = 'lockpick-length';

const ERRORS = { word: 'Not in the word list.', ruled: 'Already ruled out.' };

const fresh = () => ({ guesses: [], elapsed: 0, status: 'playing', error: null, shake: 0 });

// Only real, still-possible words count as guesses; anything else just shakes.
const reducerFor = (p) => (state, action) => {
  if (action.type === 'tick') return state.status === 'playing' ? { ...state, elapsed: state.elapsed + 1 } : state;
  if (state.status !== 'playing' || action.type !== 'guess') return state;
  const { word } = action;
  const error = word.length !== p.n || !isWord(word) ? 'word' : ruledOut(word, bounds(state.guesses, p.secret)) ? 'ruled' : null;
  if (error) return { ...state, error, shake: state.shake + 1 };
  return { ...state, guesses: [...state.guesses, word], error: null, status: word === p.secret ? 'done' : 'playing' };
};

export function lockpickResults() {
  return LENGTHS.flatMap((n) => {
    const s = session.get(PUZZLES[n].key);
    return s?.status === 'done' ? [{ label: `${n} letters`, elapsed: s.elapsed, detail: `${s.guesses.length} guesses · par ${PUZZLES[n].par}` }] : [];
  });
}

function LengthPicker({ value, onChange }) {
  return (
    <div className="mt-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/50">Word length</p>
      <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Word length">
        {LENGTHS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={`rounded-xl border-2 py-2.5 font-bold ${value === n ? 'border-ink bg-ink text-white' : 'border-ink/15 hover:border-ink'}`}
          >
            {n} letters
            <span className="block text-xs font-normal opacity-70">{n === 4 ? 'Easy' : n === 5 ? 'Medium' : 'Hard'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Guesses in alphabetical order with the secret's gap between them.
function Ladder({ guesses, secret, n, done }) {
  const sorted = [...guesses].sort();
  const above = sorted.filter((g) => clue(g, secret) === 'after');
  const below = sorted.filter((g) => clue(g, secret) === 'before');
  const row = (w, near) => (
    <li key={w} className={`text-center font-mono text-lg tracking-[0.3em] ${near ? 'font-bold text-ink' : 'text-ink/35'}`}>{w}</li>
  );
  return (
    <ol className="space-y-1" aria-label="Guesses in alphabetical order">
      {above.length === 0 && <li className="text-center text-xs uppercase tracking-widest text-ink/35">A</li>}
      {above.map((w, i) => row(w, i === above.length - 1))}
      <li
        className={`my-2 rounded-xl py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] ${done ? 'bg-ok text-white' : 'bg-ink text-white'}`}
        aria-label={done ? `Solved: ${secret}` : 'The secret word is here'}
      >
        {done ? secret : '?'.repeat(n)}
      </li>
      {below.map((w, i) => row(w, i === 0))}
      {below.length === 0 && <li className="text-center text-xs uppercase tracking-widest text-ink/35">Z</li>}
    </ol>
  );
}

export default function Lockpick({ onHome }) {
  const [howTo, setHowTo] = useHowTo('lockpick');
  const [n, setN] = useState(() => session.get(LENGTH_KEY) ?? 5);
  const p = PUZZLES[n];
  const pickLength = (len) => {
    session.set(LENGTH_KEY, len);
    setN(len);
  };
  return (
    // key: each length is its own game with its own clock
    <Board key={n} p={p} howTo={howTo} setHowTo={setHowTo} onHome={onHome}>
      <LengthPicker value={n} onChange={pickLength} />
    </Board>
  );
}

function Board({ p, howTo, setHowTo, onHome, children }) {
  const [state, dispatch] = useGame(p.key, reducerFor(p), fresh, { paused: howTo });
  const [showResults, setShowResults] = useState(false);
  const done = state.status === 'done';

  const submit = (word) => {
    dispatch({ type: 'guess', word });
    if (word === p.secret) setTimeout(() => setShowResults(true), 500);
  };

  return (
    <GameFrame title="Lockpick" clock={formatTime(state.elapsed)} onHome={onHome} onHelp={() => setHowTo(true)}>
      {howTo ? (
        <HowTo
          onPlay={() => setHowTo(false)}
          lines={[
            <>Find the secret word.</>,
            <>Each guess tells you if the secret comes <b>before</b> or <b>after</b> it in the dictionary.</>,
            <>Close the gap and pick the lock in as few guesses as you can.</>,
          ]}
          example={
            <p className="font-mono">
              MOUSE → after · TABLE → before
              <br />
              The word is between MOUSE and TABLE.
            </p>
          }
        >
          {children}
        </HowTo>
      ) : (
        <>
          <p className="mt-6 text-center text-sm text-ink/70">
            {p.n}-letter word · Guess <b className="font-mono text-ink">{state.guesses.length}</b> · Par {p.par}
          </p>
          <div className="mt-4">
            <Ladder guesses={state.guesses} secret={p.secret} n={p.n} done={done} />
          </div>
          <div className="mt-6">
            {done ? (
              <button type="button" onClick={() => setShowResults(true)} className="w-full rounded-full bg-ink py-3 font-bold text-white">
                Results
              </button>
            ) : (
              <>
                <WordInput onSubmit={submit} maxLength={p.n} placeholder={`A ${p.n}-letter word`} buttonLabel="Guess" shake={state.shake} />
                <p className="mt-2 h-5 text-center text-sm font-semibold text-bad" aria-live="polite">
                  {state.error && ERRORS[state.error]}
                </p>
              </>
            )}
          </div>
        </>
      )}

      {showResults && (
        <Modal title="Lock picked" onClose={() => setShowResults(false)}>
          <p className="-mt-2 mb-4 font-mono text-2xl font-bold tracking-[0.3em]">{p.secret}</p>
          <StatRow>
            <Stat label="Time" value={formatTime(state.elapsed)} />
            <Stat label="Guesses" value={state.guesses.length} />
            <Stat label="Par" value={p.par} />
          </StatRow>
          <ResultActions
            onHome={onHome}
            shareText={() => `Wits · Lockpick (${p.n} letters)\n${state.guesses.length} guesses (par ${p.par}) · ⏱ ${formatTime(state.elapsed)}`}
          />
        </Modal>
      )}
    </GameFrame>
  );
}
