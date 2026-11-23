#!/usr/bin/env node
// Checks every level in a Seam level file against the rules engine.
//
//   node check.mjs                 # checks levels.json next to this file
//   node check.mjs my-levels.json
//
// Exit code 1 if any level has an error, so this can run in CI.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GOAL, applyMove, createState, draw, geometry, legalMoves, solve, stateKey } from './engine.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ?? path.join(HERE, 'levels.json');
const { levels } = JSON.parse(fs.readFileSync(file, 'utf8'));

const cellName = (geo, i) => `[${Math.floor(i / geo.cols)},${i % geo.cols}]`;

function validate(level) {
  const errors = [];
  const [rows, cols] = level.size ?? [];
  if (!(rows >= 3 && rows <= 6 && cols >= 3 && cols <= 6)) errors.push('size must be [rows, cols], each 3-6');
  const inside = ([r, c] = []) => Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0 && r < rows && c < cols;
  const taken = new Map();
  const claim = (cell, what) => {
    if (!inside(cell)) return errors.push(`${what} at ${JSON.stringify(cell)} is off the grid`);
    const k = cell.join(',');
    if (taken.has(k)) errors.push(`${what} and ${taken.get(k)} share cell [${k}]`);
    taken.set(k, what);
  };
  for (const o of level.orbs ?? []) {
    if (o.tier !== 1 && o.tier !== 2) errors.push(`orb at ${JSON.stringify(o.at)} has tier ${o.tier} (must be 1 or 2)`);
    claim(o.at, `tier-${o.tier} orb`);
  }
  for (const g of level.goals ?? []) claim(g, 'goal');
  for (const a of level.anchors ?? []) {
    if (!inside(a)) errors.push(`anchor at ${JSON.stringify(a)} is off the grid`);
    if ((level.goals ?? []).some((g) => g.join() === a.join())) errors.push(`anchor at [${a}] sits on a goal (anchors only matter for orbs)`);
  }
  if (!(level.goals ?? []).length) errors.push('a level needs at least one goal');
  return errors;
}

// Walk every reachable position looking for things designers should know.
function survey(level) {
  const geo = geometry(level);
  const seen = new Set();
  const queue = [createState(level)];
  let anchorTie = false;
  for (let q = 0; q < queue.length; q++) {
    const s = queue[q];
    for (const m of legalMoves(geo, s)) {
      const { state, events } = applyMove(geo, s, m);
      for (const e of events) {
        if (e.type === 'settle' && e.from.every((x) => geo.anchors.has(x))) anchorTie = true;
      }
      const k = stateKey(state);
      if (!seen.has(k)) { seen.add(k); queue.push(state); }
    }
  }
  return { anchorTie };
}

// What each possible opening does. A fold that leads nowhere costs the fold
// plus the forced snip, so it's judged after that snip.
function openings(level, result) {
  const geo = result.geo;
  const start = createState(level);
  return legalMoves(geo, start).map((m) => {
    const { state, events } = applyMove(geo, start, m);
    const used = 1 + result.remaining(state);
    const fused = events.filter((e) => e.type === 'fuse').map((e) => e.cells.map((c) => cellName(geo, c)).join('+'));
    let verdict;
    if (used === Infinity) verdict = 'DEAD END - level can no longer be won';
    else if (used === result.par) verdict = 'on an optimal path';
    else verdict = `detour (+${used - result.par} moves)`;
    return { move: m, fused, verdict };
  });
}

let failed = false;
for (const level of levels) {
  console.log(`\n=== ${level.id} - ${level.name ?? ''} ===`);
  const errors = validate(level);
  if (errors.length) {
    errors.forEach((e) => console.log(`  ERROR ${e}`));
    failed = true;
    continue;
  }
  console.log(draw(level));

  const result = solve(level);
  const warnings = [];
  if (result.par === Infinity) {
    console.log('  ERROR level cannot be solved');
    failed = true;
    continue;
  }
  console.log(`  Par ${result.par}: ${result.solution.join(' → ')}   (${result.positions} reachable positions)`);
  console.log(`  Optimal solutions: ${result.optimalSolutions}`);

  if (level.par !== undefined && level.par !== result.par) {
    console.log(`  ERROR file says par ${level.par}, solver finds ${result.par}`);
    failed = true;
  }
  if (level.solution) {
    try {
      const geo = result.geo;
      let s = createState(level);
      for (const m of level.solution) s = applyMove(geo, s, m).state;
      if (s.grid.includes(GOAL)) throw new Error('does not fill every goal');
      if (level.solution.length !== result.par) throw new Error(`takes ${level.solution.length} moves, par is ${result.par}`);
      console.log('  Listed solution: replays correctly');
    } catch (e) {
      console.log(`  ERROR listed solution ${e.message}`);
      failed = true;
    }
  }

  const noAnchors = solve(level, { ignoreAnchors: true });
  if (level.anchors.length && noAnchors.par === result.par) warnings.push('Anchors never change the outcome - the level plays the same without them');
  else if (level.anchors.length) console.log(`  Anchors matter: without them ${noAnchors.par === Infinity ? 'the level is unsolvable' : `par is ${noAnchors.par}`}`);
  if (result.optimalSolutions > 3) warnings.push(`${result.optimalSolutions} different optimal solutions - the puzzle may feel loose`);
  if (survey(level).anchorTie) warnings.push('two Anchors can fuse together (resolves top/left, but players may find it confusing)');

  console.log('  Openings:');
  for (const o of openings(level, result)) {
    console.log(`    ${o.move.padEnd(3)} ${o.fused.length ? `fuses ${o.fused.join(', ')}` : 'no reaction'.padEnd(14)}  → ${o.verdict}`);
  }
  warnings.forEach((w) => console.log(`  WARN  ${w}`));
}

process.exit(failed ? 1 : 0);
