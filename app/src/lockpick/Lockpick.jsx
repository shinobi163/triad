import { useState } from 'react';
import data from '../../../lockpick/puzzles.json';
import { bounds, clue, heat, heatLabel, idealGuesses, ruledOut, wordsBetween } from '../../../lockpick/engine.mjs';
import { GameFrame, GiveUp, HowTo, useGame, useHowTo } from '../components/GameFrame.jsx';
import WordInput from '../components/WordInput.jsx';
import Modal from '../components/Modal.jsx';
import { ResultActions, Stat, StatRow } from '../components/Results.jsx';
import { commonWords, isWord } from '../words.js';
import { formatTime } from '../format.js';
import { session } from '../session.js';
import { pick } from '../daily.js';

const LENGTHS = [4, 5, 6];
const SORTED = Object.fromEntries(LENGTHS.map((n) => [n, [...commonWords(n)].sort()]));   // distances on the meter count these

// Day n's three locks, one per length.
const cache = new Map();
function puzzlesFor(day) {
  if (!cache.has(day)) {
    const secrets = pick(data.days, day);
    cache.set(day, Object.fromEntries(
      LENGTHS.map((n) => {
        const secret = secrets[n];
        const sorted = SORTED[n];
        return [n, { n, secret, sorted, par: idealGuesses(sorted, secret), key: `lockpick-${day}-${n}-${secret}` }];
      }),
    ));
  }
  return cache.get(day);
}
const LENGTH_KEY = 'lockpick-length';

const ERRORS = { word: 'Not in the word list.', ruled: 'Already ruled out.' };

const fresh = () => ({ guesses: [], elapsed: 0, status: 'playing', error: null, shake: 0 });

// Only real, still-possible words count as guesses; anything else just shakes.
const reducerFor = (p) => (state, action) => {
  if (action.type === 'tick') return state.status === 'playing' ? { ...state, elapsed: state.elapsed + 1 } : state;
  if (state.status !== 'playing') return state;
  if (action.type === 'giveUp') return { ...state, status: 'done', gaveUp: true, error: null };
  if (action.type !== 'guess') return state;
  const { word } = action;
  const error = word.length !== p.n || !isWord(word) ? 'word' : ruledOut(word, bounds(state.guesses, p.secret)) ? 'ruled' : null;
  if (error) return { ...state, error, shake: state.shake + 1 };
  return { ...state, guesses: [...state.guesses, word], error: null, status: word === p.secret ? 'done' : 'playing' };
};

export function lockpickResults(day) {
  const PUZZLES = puzzlesFor(day);
  return LENGTHS.flatMap((n) => {
    const s = session.get(PUZZLES[n].key);
    if (s?.status !== 'done') return [];
    return [{ label: `${n} letters`, elapsed: s.elapsed, detail: s.gaveUp ? 'Gave up' : `${s.guesses.length} guesses · par ${PUZZLES[n].par}` }];
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

// One colour per band, cold blue to burning red.
const BAND_COLOR = { Cold: '#2563EB', Cool: '#0891B2', Warm: '#D97706', Hot: '#EA580C', Burning: '#DC2626' };
const heatColor = (between) => BAND_COLOR[heatLabel(between)];

// How close the latest guess was, as a bar and a word.
function Meter({ p, guess }) {
  const between = wordsBetween(guess, p.secret, p.sorted);
  const h = heat(between, p.sorted.length);
  return (
    <div className="mt-4" aria-live="polite">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-mono font-bold tracking-widest">{guess}</span>
        <span className="font-bold" style={{ color: heatColor(between) }}>{heatLabel(between)}</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/10" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(h * 100)} aria-label="How close">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(4, h * 100)}%`, background: heatColor(between) }} />
      </div>
      <p className="mt-1 text-right text-xs text-ink/50">
        {between === 0 ? 'Right next to it' : between === 1 ? 'One word away' : `About ${between.toLocaleString()} words away`}
      </p>
    </div>
  );
}

// Guesses in alphabetical order with the secret's gap between them; each
// guess keeps a dot showing how close it was.
function Ladder({ p, guesses, done }) {
  const sorted = [...guesses].sort();
  const above = sorted.filter((g) => clue(g, p.secret) === 'after');
  const below = sorted.filter((g) => clue(g, p.secret) === 'before');
  const row = (w, near) => (
    <li key={w} className={`flex items-center justify-center gap-3 font-mono text-lg tracking-[0.3em] ${near ? 'font-bold text-ink' : 'text-ink/35'}`}>
      <span className="h-2 w-2 flex-none rounded-full" style={{ background: heatColor(wordsBetween(w, p.secret, p.sorted)) }} aria-hidden="true" />
      {w}
    </li>
  );
  return (
    <ol className="space-y-1" aria-label="Guesses in alphabetical order">
      {above.length === 0 && <li className="text-center text-xs uppercase tracking-widest text-ink/35">A</li>}
      {above.map((w, i) => row(w, i === above.length - 1))}
      <li
        className={`my-2 rounded-xl py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] text-white ${done ? 'bg-ok' : 'bg-ink'}`}
        aria-label={done ? `The word: ${p.secret}` : 'The secret word is here'}
      >
        {done ? p.secret : '?'.repeat(p.n)}
      </li>
      {below.map((w, i) => row(w, i === 0))}
      {below.length === 0 && <li className="text-center text-xs uppercase tracking-widest text-ink/35">Z</li>}
    </ol>
  );
}

export default function Lockpick({ day, onHome }) {
  const [howTo, setHowTo] = useHowTo('lockpick');
  const [n, setN] = useState(() => session.get(LENGTH_KEY) ?? 5);
  const p = puzzlesFor(day)[n];
  const pickLength = (len) => {
    session.set(LENGTH_KEY, len);
    setN(len);
  };
  return (
    // key: each length is its own game with its own clock
    <Board key={n} day={day} p={p} howTo={howTo} setHowTo={setHowTo} onHome={onHome}>
      <LengthPicker value={n} onChange={pickLength} />
    </Board>
  );
}

function Board({ day, p, howTo, setHowTo, onHome, children }) {
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
            <>The meter shows how close you are, from <b style={{ color: BAND_COLOR.Cold }}>Cold</b> to <b style={{ color: BAND_COLOR.Burning }}>Burning</b>. Pick the lock in as few guesses as you can.</>,
          ]}
          example={
            <p className="font-mono">
              MOUSE → after · TABLE → before
              <br />
              The word is between MOUSE and TABLE.
              <br />
              PRINT → before · Warm
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
            <Ladder p={p} guesses={state.guesses} done={done} />
          </div>
          {!done && state.guesses.length > 0 && <Meter p={p} guess={state.guesses[state.guesses.length - 1]} />}
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
                <div className="mt-4">
                  <GiveUp onGiveUp={() => { dispatch({ type: 'giveUp' }); setShowResults(true); }} />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {showResults && (
        <Modal title={state.gaveUp ? 'The word was' : 'Lock picked'} onClose={() => setShowResults(false)}>
          <p className="-mt-2 mb-4 font-mono text-2xl font-bold tracking-[0.3em]">{p.secret}</p>
          <StatRow>
            <Stat label="Time" value={formatTime(state.elapsed)} />
            <Stat label="Guesses" value={state.guesses.length} />
            <Stat label="Par" value={p.par} />
          </StatRow>
          <ResultActions
            onHome={onHome}
            shareText={() =>
              `Wits #${day} · Lockpick (${p.n} letters)\n${state.gaveUp ? 'Gave up' : `${state.guesses.length} guesses (par ${p.par})`} · ⏱ ${formatTime(state.elapsed)}`
            }
          />
        </Modal>
      )}
    </GameFrame>
  );
}
