import { useCallback, useEffect, useReducer } from 'react';
import { isSolved, levelKey, scoreFor, weightsOf } from './levels.js';
import { session } from '../session.js';

const freshState = (level) => ({
  placed: Object.fromEntries(level.slots.map((s) => [s, null])),   // slot -> bank index
  locked: {},                                                       // slot -> true once a hint fills it
  moves: 0,                                                         // every placement, swaps included
  hints: 0,
  elapsed: 0,
  status: 'playing',
  qa: false,
});

// Hang bank weight `idx` on `slot`, taking it off any other unlocked hook first.
function hang(state, slot, idx) {
  const placed = { ...state.placed };
  for (const s of Object.keys(placed)) if (placed[s] === idx && !state.locked[s]) placed[s] = null;
  placed[slot] = idx;
  return placed;
}

const finish = (level, state) => (isSolved(level, weightsOf(level, state.placed)) ? { ...state, status: 'won' } : state);

function reducer(state, action) {
  const { level } = action;
  if (action.type === 'tick') return state.status === 'playing' ? { ...state, elapsed: state.elapsed + 1 } : state;
  if (state.status !== 'playing') return state;

  switch (action.type) {
    case 'place': {
      if (state.locked[action.slot]) return state;
      if (Object.keys(state.locked).some((s) => state.placed[s] === action.idx)) return state;
      if (state.placed[action.slot] === action.idx) return state;
      return finish(level, { ...state, placed: hang(state, action.slot, action.idx), moves: state.moves + 1 });
    }

    case 'remove':
      if (state.locked[action.slot]) return state;
      return { ...state, placed: { ...state.placed, [action.slot]: null } };

    case 'clear': {
      const placed = { ...state.placed };
      for (const s of level.slots) if (!state.locked[s]) placed[s] = null;
      return { ...state, placed };
    }

    case 'hint': {
      const slot = level.slots.find((s) => !state.locked[s]);
      if (!slot) return state;
      const want = level.solution[slot];
      // Prefer the copy already on this hook, then any copy not locked elsewhere.
      const lockedIdx = new Set(Object.keys(state.locked).map((s) => state.placed[s]));
      const idx = level.bank[state.placed[slot]] === want
        ? state.placed[slot]
        : level.bank.findIndex((w, i) => w === want && !lockedIdx.has(i));
      return finish(level, {
        ...state,
        placed: hang(state, slot, idx),
        locked: { ...state.locked, [slot]: true },
        hints: state.hints + 1,
      });
    }

    case 'autoSolve': {
      const placed = {};
      const used = new Set();
      for (const s of level.slots) {
        const idx = level.bank.findIndex((w, i) => w === level.solution[s] && !used.has(i));
        used.add(idx);
        placed[s] = idx;
      }
      return { ...state, placed, status: 'won', qa: true };
    }

    default:
      return state;
  }
}

const loadSaved = (level) => session.get(levelKey(level)) ?? freshState(level);

// How a finished level went, for the opening screen; null while unfinished.
export function resultOf(level) {
  const s = session.get(levelKey(level));
  if (!s || s.status === 'playing') return null;
  return {
    won: true,
    qa: s.qa,
    elapsed: s.elapsed,
    score: scoreFor({ elapsed: s.elapsed, moves: s.moves, hints: s.hints, par: level.par }),
    detail: `${s.moves} placements · par ${level.par}`,
  };
}

// One level's game, kept for this visit. Mount with key={level.id}.
export function useEquilibrium(level, { paused }) {
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
