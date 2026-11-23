import { useCallback, useEffect, useReducer } from 'react';
import { SLOTS, MAX_CHECKS, checkSlot, slotStatus, levelKey, scoreFor } from './logic.js';
import { session } from '../session.js';

const empty = () => Object.fromEntries(SLOTS.map((s) => [s, null]));

export const freshState = () => ({
  placed: empty(),         // slot -> word
  locked: Object.fromEntries(SLOTS.map((s) => [s, false])),
  results: empty(),        // slot -> { word, links: [bool, bool, bool] } from the last check
  checksLeft: MAX_CHECKS,
  history: [],             // one ['ok'|'trap'|'bad' x4] row per check
  hints: 0,
  elapsed: 0,
  status: 'playing',       // 'playing' | 'won' | 'lost'
  qa: false,               // finished with the QA auto-solve
});

// Put `word` in `slot`, taking it out of any other unlocked slot first.
function put(state, slot, word) {
  const placed = { ...state.placed };
  const results = { ...state.results };
  for (const s of SLOTS) {
    if (s !== slot && placed[s] === word && !state.locked[s]) {
      placed[s] = null;
      results[s] = null;
    }
  }
  if (placed[slot] !== word) results[slot] = null;
  placed[slot] = word;
  return { ...state, placed, results };
}

const allLocked = (locked) => SLOTS.every((s) => locked[s]);

function reducer(state, action) {
  const { level } = action;
  if (action.type === 'tick') return state.status === 'playing' ? { ...state, elapsed: state.elapsed + 1 } : state;
  if (state.status !== 'playing') return state;

  switch (action.type) {
    case 'place':
      if (state.locked[action.slot]) return state;
      if (SLOTS.some((s) => state.locked[s] && state.placed[s] === action.word)) return state;
      return put(state, action.slot, action.word);

    case 'remove':
      if (state.locked[action.slot]) return state;
      return {
        ...state,
        placed: { ...state.placed, [action.slot]: null },
        results: { ...state.results, [action.slot]: null },
      };

    case 'clear': {
      const placed = { ...state.placed };
      const results = { ...state.results };
      for (const s of SLOTS) if (!state.locked[s]) { placed[s] = null; results[s] = null; }
      return { ...state, placed, results };
    }

    case 'test': {
      if (SLOTS.some((s) => !state.placed[s]) || state.checksLeft === 0) return state;
      const results = {};
      const locked = { ...state.locked };
      const row = SLOTS.map((s) => {
        const links = checkSlot(level, s, state.placed[s]);
        results[s] = { word: state.placed[s], links };
        const status = slotStatus(links);
        if (status === 'ok') locked[s] = true;
        return status;
      });
      const checksLeft = state.checksLeft - 1;
      const won = row.every((r) => r === 'ok');
      const next = { ...state, results, locked, checksLeft, history: [...state.history, row] };
      if (won) return { ...next, status: 'won' };
      if (checksLeft === 0) return { ...next, status: 'lost', placed: { ...level.solution } };
      return next;
    }

    case 'hint': {
      const slot = SLOTS.find((s) => !state.locked[s]);
      if (!slot) return state;
      const word = level.solution[slot];
      const next = put(state, slot, word);
      const locked = { ...state.locked, [slot]: true };
      return {
        ...next,
        locked,
        results: { ...next.results, [slot]: { word, links: [true, true, true] } },
        hints: state.hints + 1,
        status: allLocked(locked) ? 'won' : 'playing',
      };
    }

    case 'autoSolve':
      return {
        ...state,
        placed: { ...level.solution },
        locked: Object.fromEntries(SLOTS.map((s) => [s, true])),
        results: Object.fromEntries(SLOTS.map((s) => [s, { word: level.solution[s], links: [true, true, true] }])),
        status: 'won',
        qa: true,
      };

    default:
      return state;
  }
}

const loadSaved = (level) => session.get(levelKey(level)) ?? freshState();

// How a finished level went, for the opening screen; null while unfinished.
export function resultOf(level) {
  const s = session.get(levelKey(level));
  if (!s || s.status === 'playing') return null;
  const won = s.status === 'won';
  const checksUsed = s.history.length;
  return {
    won,
    qa: s.qa,
    elapsed: s.elapsed,
    score: won ? scoreFor({ elapsed: s.elapsed, checksUsed, hints: s.hints }) : 0,
    detail: won ? `${checksUsed} of ${MAX_CHECKS} checks` : 'Out of checks',
  };
}

// One level's game state, kept for this visit (leaving and returning resumes it).
// Mount with key={level.id} so switching levels starts from that level's state.
export function useCrossfire(level, { paused }) {
  const [state, rawDispatch] = useReducer(reducer, level, loadSaved);
  const dispatch = useCallback((action) => rawDispatch({ ...action, level }), [level]);

  useEffect(() => {
    session.set(levelKey(level), state);
  }, [level, state]);

  useEffect(() => {
    if (state.status !== 'playing' || paused) return undefined;
    const id = setInterval(() => {
      if (!document.hidden) rawDispatch({ type: 'tick' });
    }, 1000);
    return () => clearInterval(id);
  }, [state.status, paused]);

  return [state, dispatch];
}
