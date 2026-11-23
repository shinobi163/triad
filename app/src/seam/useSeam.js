import { useCallback, useEffect, useReducer } from 'react';
import { applyMove, createState, isWon, legalMoves, levelKey, scoreFor } from './levels.js';
import { session } from '../session.js';

const freshState = (level) => ({
  stack: [createState(level)],   // positions; undo pops
  moves: 0,                       // every fold, snip and undo
  log: [],                        // 'fuse' | 'fill' | 'none' | 'snip' | 'undo' per move, for sharing
  events: [],                     // what the last move did, for animation
  hints: 0,
  elapsed: 0,
  status: 'playing',              // 'playing' | 'won'
  qa: false,
});

const top = (state) => state.stack[state.stack.length - 1];

function play(level, state, move) {
  const { state: next, events } = applyMove(level.geo, top(state), move);
  const kind = move === 'SNIP' ? 'snip' : events.some((e) => e.type === 'fill') ? 'fill' : events.length ? 'fuse' : 'none';
  return {
    ...state,
    stack: [...state.stack, next],
    moves: state.moves + 1,
    log: [...state.log, kind],
    events,
    status: isWon(next) ? 'won' : 'playing',
  };
}

// The solver's best move from `position`, or null from a dead end.
function bestMove(level, position) {
  const left = level.solver.remaining(position);
  if (left === Infinity || left === 0) return null;
  return legalMoves(level.geo, position).find(
    (m) => level.solver.remaining(applyMove(level.geo, position, m).state) === left - 1,
  );
}

function reducer(state, action) {
  const { level } = action;
  if (action.type === 'tick') return state.status === 'playing' ? { ...state, elapsed: state.elapsed + 1 } : state;
  if (state.status !== 'playing') return state;

  switch (action.type) {
    case 'move':
      if (!legalMoves(level.geo, top(state)).includes(action.move)) return state;
      return play(level, state, action.move);

    case 'undo': {
      // A fold and the snip that reopened it feel like one action, so undo
      // steps back over both: always to a position with no seam closed.
      const { stack } = state;
      if (stack.length < 2) return state;
      const steps = !top(state).seam && stack.length >= 3 && stack[stack.length - 2].seam ? 2 : 1;
      return { ...state, stack: stack.slice(0, -steps), moves: state.moves + 1, log: [...state.log, 'undo'], events: [] };
    }

    case 'reset':
      return { ...state, stack: state.stack.slice(0, 1), events: [] };

    case 'hint': {
      // From a dead end, rewind to the last position that can still win.
      let stack = state.stack;
      while (stack.length > 1 && level.solver.remaining(stack[stack.length - 1]) === Infinity) stack = stack.slice(0, -1);
      const move = bestMove(level, stack[stack.length - 1]);
      if (!move) return state;
      return { ...play(level, { ...state, stack }, move), hints: state.hints + 1 };
    }

    case 'autoSolve': {
      let next = { ...state, stack: state.stack.slice(0, 1) };
      for (const m of level.solution) next = play(level, next, m);
      return { ...next, qa: true };
    }

    default:
      return state;
  }
}

function loadSaved(level) {
  const saved = session.get(levelKey(level));
  return saved ? { ...saved, events: [] } : freshState(level);
}

// How a finished level went, for the opening screen; null while unfinished.
export function resultOf(level) {
  const s = session.get(levelKey(level));
  if (!s || s.status === 'playing') return null;
  return {
    won: true,
    qa: s.qa,
    elapsed: s.elapsed,
    score: scoreFor({ elapsed: s.elapsed, moves: s.moves, hints: s.hints, par: level.par }),
    detail: `${s.moves} moves · par ${level.par}`,
  };
}

// One level's game, kept for this visit. Mount with key={level.id}.
export function useSeam(level, { paused }) {
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

  return [state, dispatch, top(state)];
}
