#!/usr/bin/env node
// Searches random Seam layouts for good levels and prints the best ones.
//
//   node design.mjs                       # 4x4, defaults below
//   node design.mjs --size 5 --tries 50000 --seed 7 --min-par 6 --max-par 9
//
// A "good" level here: solvable, par in range, at most two optimal
// solutions, Anchors change the outcome, and at least one opening that
// fuses orbs (looks like progress) but is a detour or a dead end.

import { applyMove, createState, draw, legalMoves, solve } from './engine.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const SIZE = opt('size', 4);
const TRIES = opt('tries', 40000);
const MIN_PAR = opt('min-par', 5);
const MAX_PAR = opt('max-par', 8);
let seed = opt('seed', 1);

// mulberry32: small deterministic RNG so a run can be reproduced from its seed.
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (n) => Math.floor(rand() * n);

const shuffle = (xs) => {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
};
const onEdge = ([r, c]) => r === 0 || c === 0 || r === SIZE - 1 || c === SIZE - 1;

function randomLevel() {
  const goals = 1 + pick(2);
  const cells = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) cells.push([r, c]);
  shuffle(cells);
  // A goal never leaves its cell, so one on an inner line would block that
  // line forever: goals go on the border.
  const goalCells = cells.filter(onEdge).slice(0, goals);
  const rest = cells.filter((c) => !goalCells.includes(c));
  // Sometimes one extra Tier-1 orb: a decoy that invites the wrong fusion.
  const orbCells = rest.splice(0, goals * 2 + (rand() < 0.5 ? 1 : 0));
  cells.length = 0;
  cells.push(...rest);
  // Anchors usually sit under an orb; sometimes on a bare cell, where they
  // also block that row and column from folding.
  const anchors = [];
  const nAnchors = 1 + pick(2);
  for (let k = 0; k < nAnchors; k++) {
    const src = rand() < 0.75 ? orbCells : cells;
    const a = src[pick(src.length)];
    if (!anchors.some((x) => x.join() === a.join())) anchors.push(a);
  }
  return {
    size: [SIZE, SIZE],
    orbs: orbCells.map((at) => ({ at, tier: 1 })),
    anchors,
    goals: goalCells,
  };
}

const rejected = { unsolvable: 0, parOutOfRange: 0, loose: 0, anchorsIrrelevant: 0, noTrap: 0 };
const parSeen = {};

function rate(level) {
  const result = solve(level);
  if (result.par === Infinity) return void rejected.unsolvable++;
  parSeen[result.par] = (parSeen[result.par] ?? 0) + 1;
  if (result.par < MIN_PAR || result.par > MAX_PAR) return void rejected.parOutOfRange++;
  if (result.optimalSolutions > 2) return void rejected.loose++;
  if (solve(level, { ignoreAnchors: true }).par === result.par) return void rejected.anchorsIrrelevant++;

  const geo = result.geo;
  const start = createState(level);
  const firsts = legalMoves(geo, start).map((m) => {
    const { state, events } = applyMove(geo, start, m);
    return { m, fuses: events.some((e) => e.type === 'fuse'), cost: 1 + result.remaining(state) };
  });
  const traps = firsts.filter((f) => f.fuses && f.cost > result.par);
  if (!traps.length) return void rejected.noTrap++;
  const deadEnds = traps.filter((f) => f.cost === Infinity).length;

  const score =
    result.par * 2 +
    deadEnds * 4 +
    (traps.length - deadEnds) * 2 +
    (level.goals.length === 2 ? 3 : 0) -
    result.optimalSolutions * 2 -
    Math.max(0, level.anchors.length - 1);
  return { level, result, traps, deadEnds, firsts, score };
}

const seen = new Set();
const found = [];
for (let t = 0; t < TRIES; t++) {
  const level = randomLevel();
  const key = JSON.stringify(level);
  if (seen.has(key)) continue;
  seen.add(key);
  const r = rate(level);
  if (r) found.push(r);
}
found.sort((a, b) => b.score - a.score);

console.log(`${found.length} good layouts out of ${TRIES} tries (${SIZE}x${SIZE}, par ${MIN_PAR}-${MAX_PAR})`);
console.log(`  rejected: ${JSON.stringify(rejected)}`);
console.log(`  par of solvable layouts: ${JSON.stringify(parSeen)}`);
for (const r of found.slice(0, 6)) {
  console.log(`\nscore ${r.score}  par ${r.result.par}  optimal solutions ${r.result.optimalSolutions}  goals ${r.level.goals.length}`);
  console.log(draw(r.level));
  console.log(`  solution: ${r.result.solution.join(' → ')}`);
  console.log(`  openings: ${r.firsts.map((f) => `${f.m}${f.fuses ? '*' : ''}=${f.cost === Infinity ? 'dead' : f.cost}`).join('  ')}   (* fuses)`);
  console.log(`  ${JSON.stringify({ orbs: r.level.orbs, anchors: r.level.anchors, goals: r.level.goals })}`);
}
