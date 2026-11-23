#!/usr/bin/env node
// Checks every level in an Equilibrium level file.
//
//   node check.mjs                 # checks levels.json next to this file
//   node check.mjs my-levels.json
//
// Exit code 1 if any level has an error.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beams, isBalanced, slotIds, solve, torques } from './engine.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ?? path.join(HERE, 'levels.json');
const { levels } = JSON.parse(fs.readFileSync(file, 'utf8'));

function validateBeam(beam, where, errors) {
  for (const side of ['left', 'right']) {
    const arm = beam?.[side];
    if (!arm) { errors.push(`${where}.${side} is missing`); continue; }
    if (!Number.isInteger(arm.arm) || arm.arm < 1 || arm.arm > 4) errors.push(`${where}.${side}.arm must be a whole number 1-4`);
    if (!!arm.slot === !!arm.beam) errors.push(`${where}.${side} needs exactly one of "slot" or "beam"`);
    if (arm.beam) validateBeam(arm.beam, `${where}.${side}.beam`, errors);
  }
}

// Draws the mobile as an indented outline.
function outline(beam, indent = '  ') {
  return ['left', 'right']
    .map((side) => {
      const arm = beam[side];
      const head = `${indent}${side.padEnd(5)} arm ${arm.arm}: `;
      return arm.beam ? `${head}beam\n${outline(arm.beam, indent + '    ')}` : `${head}slot ${arm.slot}`;
    })
    .join('\n');
}

let failed = false;
for (const level of levels) {
  console.log(`\n=== ${level.id} - ${level.name ?? ''} ===`);
  const errors = [];
  validateBeam(level.beam, 'beam', errors);
  if (!errors.length) {
    const slots = slotIds(level.beam);
    if (new Set(slots).size !== slots.length) errors.push(`slot ids repeat: ${slots.join(', ')}`);
    if (!Array.isArray(level.bank) || level.bank.some((w) => !Number.isInteger(w) || w < 1)) errors.push('bank must be positive whole numbers');
    else if (level.bank.length < slots.length) errors.push(`bank has ${level.bank.length} weights for ${slots.length} slots`);
  }
  if (errors.length) {
    errors.forEach((e) => console.log(`  ERROR ${e}`));
    failed = true;
    continue;
  }

  console.log(outline(level.beam));
  console.log(`  bank: ${level.bank.join(', ')}`);
  const { slots, solutions, arrangements } = solve(level);
  console.log(`  ${arrangements} possible arrangements, ${solutions.length} solve it`);

  if (!solutions.length) {
    console.log('  ERROR no arrangement balances every beam');
    failed = true;
    continue;
  }
  if (solutions.length > 1) {
    console.log(`  ERROR ${solutions.length} solutions: ${solutions.map((s) => JSON.stringify(s)).join(' | ')}`);
    failed = true;
  }
  const answer = solutions[0];
  console.log(`  Solution: ${slots.map((s) => `${s}=${answer[s]}`).join(', ')}`);
  for (const { id, beam } of beams(level.beam)) {
    const t = torques(beam, answer);
    console.log(`    ${id}: ${t.left} = ${t.right}`);
  }

  if (level.solution && JSON.stringify(slots.map((s) => level.solution[s])) !== JSON.stringify(slots.map((s) => answer[s]))) {
    console.log(`  ERROR listed solution ${JSON.stringify(level.solution)} is not the solver's ${JSON.stringify(answer)}`);
    failed = true;
  }

  const used = slots.map((s) => answer[s]);
  const decoys = [...level.bank];
  for (const w of used) decoys.splice(decoys.indexOf(w), 1);
  if (decoys.length) console.log(`  Decoy weights: ${decoys.join(', ')}`);

  // Near misses: arrangements where some beams balance but not all.
  // These are what make live feedback interesting rather than a giveaway.
  const assignments = [];
  const walk = (k, usedIdx, assign) => {
    if (k === slots.length) return void assignments.push(assign);
    level.bank.forEach((w, i) => {
      if (!usedIdx.has(i)) walk(k + 1, new Set([...usedIdx, i]), { ...assign, [slots[k]]: w });
    });
  };
  walk(0, new Set(), {});
  const all = beams(level.beam);
  const near = assignments.filter((a) => {
    const n = all.filter(({ beam }) => isBalanced(beam, a)).length;
    return n > 0 && n < all.length;
  }).length;
  console.log(`  Near misses (some beams balanced, not all): ${near}`);
}

process.exit(failed ? 1 : 0);
