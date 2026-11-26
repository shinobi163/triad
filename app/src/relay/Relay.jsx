import { useEffect, useRef, useState } from 'react';
import data from '../../../relay/puzzles.json';
import { letters, linkError, makeCategory, options, resolve, usedIds } from '../../../relay/engine.mjs';
import { GameFrame, GiveUp, HowTo, useGame, useHowTo } from '../components/GameFrame.jsx';
import WordInput from '../components/WordInput.jsx';
import Modal from '../components/Modal.jsx';
import { ResultActions, Stat, StatRow } from '../components/Results.jsx';
import { formatTime } from '../format.js';
import { session } from '../session.js';
import { pick } from '../daily.js';

const LIMIT = data.seconds;

// Each category's How-to: a sample chain, a singular-not-plural pair, and
// (where the list has them) two names for one entry.
const EXAMPLES = {
  Animals: { chain: 'CAT → TIGER → RABBIT → TOAD …', one: 'FOX, not FOXES' },
  Countries: { chain: 'FRANCE → EGYPT → TOGO → OMAN …', names: 'USA or AMERICA' },
  'Fruit and veg': { chain: 'APPLE → EGGPLANT → TOMATO → OKRA …', one: 'PEACH, not PEACHES', names: 'EGGPLANT or AUBERGINE' },
  'Capital cities': { chain: 'PARIS → SEOUL → LONDON → NAIROBI …', names: 'KYIV or KIEV' },
  Sports: { chain: 'TENNIS → SQUASH → HOCKEY → YACHTING …', names: 'SOCCER or FOOTBALL' },
};

// Day n's category and start word.
const cache = new Map();
function relayFor(day) {
  if (!cache.has(day)) {
    const { category, start } = pick(data.days, day);
    const cat = makeCategory(data.categories[category]);
    const START = letters(start);
    cache.set(day, { name: category, thing: category.toLowerCase(), cat, START, KEY: `relay-${day}-${category}-${START}` });
  }
  return cache.get(day);
}

// chain: [{ word, passed }]; `passed` marks a fresh word handed over by Pass.
// note: the line under the box, { kind, ... } (a rejection or a fixed spelling).
// hint: { word, level } while a hint is showing for the current word.
const freshFor = ({ START }) => () => ({ chain: [{ word: START, passed: true }], hints: 0, hint: null, elapsed: 0, status: 'playing', note: null, shake: 0 });
const usedOf = (chain, cat) => usedIds(chain.map((c) => c.word), cat);
const last = (chain) => chain[chain.length - 1].word;

// The unused word with the most follow-ups, so a pass or hint leads somewhere.
const bestNext = (candidates, used, cat) =>
  candidates.reduce((best, w) => (options(w, cat, used).length > options(best, cat, used).length ? w : best));

const reducerFor = ({ cat }) => (state, action) => {
  if (state.status !== 'playing') return state;
  switch (action.type) {
    case 'tick': {
      const elapsed = state.elapsed + 1;
      return { ...state, elapsed, status: elapsed >= LIMIT ? 'done' : 'playing' };
    }
    case 'try': {
      const prev = last(state.chain);
      const typed = letters(action.word);
      const { word, fixed, plural } = resolve(typed, cat);
      const reject = (note) => ({ ...state, note, shake: state.shake + 1 });
      if (typed[0] !== prev.slice(-1)) return reject({ kind: 'letter', need: prev.slice(-1) });
      if (plural) return reject({ kind: 'plural', single: plural });
      if (!word) return reject({ kind: 'missing', typed });
      const error = linkError(prev, word, usedOf(state.chain, cat), cat);
      if (error) {
        const as = state.chain.find((c) => cat.idOf.get(c.word) === cat.idOf.get(word))?.word;   // the name it was used under
        return reject({ kind: error, word, as });
      }
      return { ...state, chain: [...state.chain, { word, passed: false }], hint: null, note: fixed ? { kind: 'fixed', typed, word } : null };
    }
    case 'pass': {
      const used = usedOf(state.chain, cat);
      const pool = [...cat.words].filter((w) => !used.has(cat.idOf.get(w)));
      if (!pool.length) return { ...state, status: 'done' };
      return { ...state, chain: [...state.chain, { word: bestNext(pool, used, cat), passed: true }], hint: null, note: null };
    }
    case 'hint': {
      // First press: the length and first letter. Second: the last letter too.
      const used = usedOf(state.chain, cat);
      const pool = options(last(state.chain), cat, used);
      if (!pool.length) return state;
      const word = state.hint?.word ?? bestNext(pool, used, cat);
      const level = Math.min(2, (state.hint?.level ?? 0) + 1);
      return { ...state, hint: { word, level }, hints: state.hints + (level > (state.hint?.level ?? 0) ? 1 : 0) };
    }
    case 'giveUp':
      return { ...state, status: 'done', gaveUp: true };
    default:
      return state;
  }
};

const linkCount = (chain) => chain.filter((c) => !c.passed).length;

export function relayResults(day) {
  const s = session.get(relayFor(day).KEY);
  return s?.status === 'done' ? [{ elapsed: s.elapsed, detail: `${linkCount(s.chain)} links${s.gaveUp ? ' · gave up' : ''}` }] : [];
}

function noteText(note, { cat, thing }) {
  const SHOWN = cat.shown;
  switch (note.kind) {
    case 'letter':
      return { bad: true, text: `Must start with ${note.need}.` };
    case 'plural':
      return { bad: true, text: `Use one, not many: ${SHOWN.get(note.single)}.` };
    case 'missing':
      return { bad: true, text: `${note.typed} isn't on today's list of ${cat.size} ${thing}.` };
    case 'used':
      return { bad: true, text: `${SHOWN.get(note.word)} is already in your chain${note.as && note.as !== note.word ? ` as ${SHOWN.get(note.as)}` : ''}.` };
    case 'fixed':
      return { bad: false, text: `Counted as ${SHOWN.get(note.word)}.` };
    default:
      return null;
  }
}

// T _ _ _ R: the hint's letters, with blanks for the rest.
function HintPattern({ hint, cat }) {
  const shown = cat.shown.get(hint.word);
  const lastAt = shown.length - 1;
  return (
    <p className="mt-1 text-center font-mono text-lg tracking-[0.3em] text-ink/70" aria-label="Hint">
      {[...shown].map((ch, i) => (ch === ' ' ? ' ' : i === 0 || (hint.level > 1 && i === lastAt) ? ch : '_')).join('')}
      <span className="ml-2 font-sans text-xs tracking-normal text-ink/50">{letters(shown).length} letters</span>
    </p>
  );
}

export default function Relay({ day, onHome }) {
  const R = relayFor(day);
  const { cat, thing, name } = R;
  const SHOWN = cat.shown;
  const [howTo, setHowTo] = useHowTo('relay');
  const [state, dispatch] = useGame(R.KEY, reducerFor(R), freshFor(R), { paused: howTo });
  const [showResults, setShowResults] = useState(false);
  const done = state.status === 'done';
  const prev = last(state.chain);
  const stuck = !done && options(prev, cat, usedOf(state.chain, cat)).length === 0;
  const links = linkCount(state.chain);
  const note = state.note && noteText(state.note, R);

  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) setShowResults(true);
    wasDone.current = done;
  }, [done]);

  const submit = (typed) => {
    const { word } = resolve(typed, cat);
    dispatch({ type: 'try', word: typed });
    return Boolean(word) && letters(typed)[0] === prev.slice(-1) && !linkError(prev, word, usedOf(state.chain, cat), cat);   // keep a rejected word to edit
  };

  return (
    <GameFrame title="Relay" clock={formatTime(Math.max(0, LIMIT - state.elapsed))} onHome={onHome} onHelp={() => setHowTo(true)}>
      {howTo ? (
        <HowTo
          onPlay={() => setHowTo(false)}
          playLabel={`Start · ${LIMIT} seconds`}
          lines={[
            <>Each word must start with the <b>last letter</b> of the one before.</>,
            <>
              Words come from today's list of <b>{cat.size} {thing}</b>.{EXAMPLES[name]?.one && ` Use one, not many (${EXAMPLES[name].one}).`}
              {EXAMPLES[name]?.names && ` Other names count once (${EXAMPLES[name].names}).`} Close misspellings are fixed for you.
            </>,
            <>Make the longest chain in {LIMIT} seconds. <b>Hint</b> shows a word's shape; <b>Pass</b> gives you a fresh word.</>,
          ]}
          example={<p className="font-mono">{EXAMPLES[name]?.chain}</p>}
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
            {name} · Links <b className="font-mono text-ink">{links}</b>
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
            <p className={`mt-2 min-h-5 text-center text-sm font-semibold ${note && !note.bad ? 'text-ok' : 'text-bad'}`} aria-live="polite">
              {stuck ? `No ${thing} left starting with ${prev.slice(-1)}. Pass.` : note?.text}
            </p>
            {state.hint && <HintPattern hint={state.hint} cat={cat} />}
            <div className="mt-2 flex justify-center gap-2">
              {!stuck && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'hint' })}
                  disabled={state.hint?.level === 2}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-ink/60 hover:bg-black/5 hover:text-ink disabled:opacity-40"
                >
                  {state.hint ? 'More hint' : 'Hint'}
                </button>
              )}
              <button type="button" onClick={() => dispatch({ type: 'pass' })} className="rounded-md px-4 py-2 text-sm font-semibold text-ink/60 hover:bg-black/5 hover:text-ink">
                Pass ›
              </button>
            </div>
            <div className="mt-4">
              <GiveUp onGiveUp={() => dispatch({ type: 'giveUp' })} />
            </div>
          </div>
        </>
      )}

      {showResults && (
        <Modal title={state.gaveUp ? 'Chain ended' : "Time's up"} onClose={() => setShowResults(false)}>
          <StatRow>
            <Stat label="Links" value={links} />
            <Stat label="Passes" value={state.chain.length - 1 - links} />
            <Stat label="Hints" value={state.hints} />
          </StatRow>
          <p className="mt-4 font-mono text-sm leading-relaxed">
            {state.chain.map((c, i) => (
              <span key={i}>
                {i > 0 && (c.passed ? ' · ' : ' → ')}
                <span className={c.passed ? 'text-ink/45' : ''}>{SHOWN.get(c.word)}</span>
              </span>
            ))}
          </p>
          {options(prev, cat, usedOf(state.chain, cat)).length > 0 && (
            <p className="mt-3 text-sm text-ink/70">
              Could have followed {SHOWN.get(prev)}:{' '}
              <span className="font-mono">{options(prev, cat, usedOf(state.chain, cat)).slice(0, 5).map((w) => SHOWN.get(w)).join(', ')}</span>
            </p>
          )}
          <ResultActions onHome={onHome} shareText={() => `Wits #${day} · Relay (${name})\n🔗 ${links} links in ${LIMIT}s${state.hints ? ` · 💡×${state.hints}` : ''}`} />
        </Modal>
      )}
    </GameFrame>
  );
}
