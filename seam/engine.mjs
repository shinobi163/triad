// SEAM rules engine - pure functions, no UI. The game and the level checker
// both use this file, so the rules live in exactly one place.
//
// Rules (see the spec page for worked examples):
//  1. Fold an inner row/column that is completely empty: no orbs, no goals,
//     no Anchor cells. Edge lines never fold.
//  2. Only one seam may be closed at a time; the only move while a seam is
//     closed is SNIP.
//  3. Folding line i makes the cells directly either side of it (i-1, i+1)
//     face each other. Every facing pair reacts at the same moment:
//       Tier-1 + Tier-1  -> fuse into one Tier-2 that waits on the seam
//       Tier-2 + GOAL    -> the goal is filled (the orb goes into it)
//       anything else    -> nothing happens
//  4. SNIP opens the seam. Each waiting Tier-2 lands in whichever of its two
//     origin cells is an Anchor; if neither or both are, the top/left one.
//  5. The level is won the moment every goal is filled.

export const EMPTY = 0;
export const T1 = 1;
export const T2 = 2;
export const GOAL = 3;
export const FILLED = 4;

export function createState(level) {
  const [rows, cols] = level.size;
  const grid = new Array(rows * cols).fill(EMPTY);
  const at = ([r, c]) => r * cols + c;
  for (const o of level.orbs) grid[at(o.at)] = o.tier === 2 ? T2 : T1;
  for (const g of level.goals) grid[at(g)] = GOAL;
  return { grid, seam: null };
}

export function geometry(level) {
  const [rows, cols] = level.size;
  const anchors = new Set(level.anchors.map(([r, c]) => r * cols + c));
  return { rows, cols, anchors };
}

function lineCells(geo, axis, i) {
  const out = [];
  if (axis === 'R') for (let c = 0; c < geo.cols; c++) out.push(i * geo.cols + c);
  else for (let r = 0; r < geo.rows; r++) out.push(r * geo.cols + i);
  return out;
}

// Pairs that face each other when line i folds; the first cell is top/left.
function facingPairs(geo, axis, i) {
  const before = lineCells(geo, axis, i - 1);
  const after = lineCells(geo, axis, i + 1);
  return before.map((a, k) => [a, after[k]]);
}

export function canFold(geo, state, axis, i) {
  if (state.seam) return false;
  const last = (axis === 'R' ? geo.rows : geo.cols) - 1;
  if (i <= 0 || i >= last) return false;
  return lineCells(geo, axis, i).every((x) => state.grid[x] === EMPTY && !geo.anchors.has(x));
}

export function legalMoves(geo, state) {
  if (state.seam) return ['SNIP'];
  const moves = [];
  for (let i = 1; i < geo.rows - 1; i++) if (canFold(geo, state, 'R', i)) moves.push(`R${i}`);
  for (let i = 1; i < geo.cols - 1; i++) if (canFold(geo, state, 'C', i)) moves.push(`C${i}`);
  return moves;
}

export const isWon = (state) => !state.grid.includes(GOAL);

// Returns { state, events } or throws on an illegal move.
// options.ignoreAnchors: settle every fused orb top/left (used to prove the
// Anchor rule matters in a level).
export function applyMove(geo, state, move, options = {}) {
  const grid = state.grid.slice();
  const events = [];

  if (move === 'SNIP') {
    if (!state.seam) throw new Error('SNIP with no seam closed');
    for (const [a, b] of state.seam.pending) {
      const aA = !options.ignoreAnchors && geo.anchors.has(a);
      const bA = !options.ignoreAnchors && geo.anchors.has(b);
      const target = bA && !aA ? b : a;
      grid[target] = T2;
      events.push({ type: 'settle', from: [a, b], to: target, by: aA !== bA ? 'anchor' : 'top-left' });
    }
    return { state: { grid, seam: null }, events };
  }

  const axis = move[0];
  const i = Number(move.slice(1));
  if (!canFold(geo, state, axis, i)) throw new Error(`Illegal fold ${move}`);
  const pending = [];
  for (const [a, b] of facingPairs(geo, axis, i)) {
    const x = grid[a];
    const y = grid[b];
    if (x === T1 && y === T1) {
      grid[a] = EMPTY;
      grid[b] = EMPTY;
      pending.push([a, b]);
      events.push({ type: 'fuse', cells: [a, b] });
    } else if ((x === T2 && y === GOAL) || (x === GOAL && y === T2)) {
      grid[x === T2 ? a : b] = EMPTY;
      grid[x === GOAL ? a : b] = FILLED;
      events.push({ type: 'fill', goal: x === GOAL ? a : b });
    }
  }
  return { state: { grid, seam: { axis, i, pending } }, events };
}

const GLYPH = { [EMPTY]: '·', [T1]: '1', [T2]: '2', [GOAL]: 'G', [FILLED]: '✓' };

// Text picture of a position: ★ marks Anchor cells.
export function draw(level, state = createState(level)) {
  const geo = geometry(level);
  const lines = [];
  for (let r = 0; r < geo.rows; r++) {
    let line = '   ';
    for (let c = 0; c < geo.cols; c++) {
      const i = r * geo.cols + c;
      line += (geo.anchors.has(i) ? '★' : ' ') + GLYPH[state.grid[i]] + ' ';
    }
    lines.push(line);
  }
  return lines.join('\n');
}

export const stateKey = (s) =>
  s.grid.join('') + (s.seam ? `|${s.seam.axis}${s.seam.i}:${s.seam.pending.flat().join(',')}` : '|');

// Breadth-first search over every reachable position.
// Returns par (fewest moves), one optimal solution, how many distinct optimal
// solutions exist, and a function giving the best remaining moves from any
// position (Infinity = dead end) - which is what hints and "stuck" use.
export function solve(level, options = {}) {
  const geo = geometry(level);
  const start = createState(level);
  const startKey = stateKey(start);

  // Forward BFS: depth, number of shortest paths, parent links.
  const depth = new Map([[startKey, 0]]);
  const ways = new Map([[startKey, 1]]);
  const parent = new Map();
  const nodes = new Map([[startKey, start]]);
  const edges = new Map();   // key -> [[move, childKey]]
  const queue = [startKey];
  const wins = [];
  for (let q = 0; q < queue.length; q++) {
    const key = queue[q];
    const s = nodes.get(key);
    const out = [];
    edges.set(key, out);
    if (isWon(s)) { wins.push(key); continue; }
    for (const m of legalMoves(geo, s)) {
      const next = applyMove(geo, s, m, options).state;
      const k = stateKey(next);
      out.push([m, k]);
      if (!depth.has(k)) {
        depth.set(k, depth.get(key) + 1);
        ways.set(k, ways.get(key));
        parent.set(k, [key, m]);
        nodes.set(k, next);
        queue.push(k);
      } else if (depth.get(k) === depth.get(key) + 1) {
        ways.set(k, ways.get(k) + ways.get(key));
      }
    }
  }

  // Backward pass: fewest moves to a win from every position.
  const toWin = new Map();
  for (const k of wins) toWin.set(k, 0);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [k, out] of edges) {
      let best = toWin.has(k) ? toWin.get(k) : Infinity;
      for (const [, child] of out) if (toWin.has(child)) best = Math.min(best, toWin.get(child) + 1);
      if (best !== Infinity && best !== toWin.get(k)) { toWin.set(k, best); changed = true; }
    }
  }

  const par = toWin.has(startKey) ? toWin.get(startKey) : Infinity;
  const bestWins = wins.filter((k) => depth.get(k) === par);
  const optimalSolutions = bestWins.reduce((n, k) => n + ways.get(k), 0);
  let solution = null;
  if (bestWins.length) {
    solution = [];
    for (let k = bestWins[0]; parent.has(k); k = parent.get(k)[0]) solution.unshift(parent.get(k)[1]);
  }

  return {
    geo,
    par,
    solution,
    optimalSolutions,
    positions: nodes.size,
    remaining: (state) => (toWin.has(stateKey(state)) ? toWin.get(stateKey(state)) : Infinity),
  };
}
