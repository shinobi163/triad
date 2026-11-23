#!/usr/bin/env node
// CROSSFIRE puzzle generator.
//
// Grid (reading strictly left-to-right and top-to-bottom):
//
//     TL  A   TR
//     B   CE  C
//     BL  D   BR
//
//   A: TL+A, A+TR, A+CE      B: TL+B, B+CE, B+BL
//   C: TR+C, CE+C, C+BR      D: CE+D, BL+D, D+BR
//
// Every slot touches only anchors, so each slot is scored on its own. The
// generator finds grids where all 12 links are words in compounds.txt,
// confirms the bank has exactly one valid arrangement, scores how many
// "2/3 TRAP" placements the bank creates, and picks a Standard and a Master
// (decoy) puzzle that share no words.
//
// Usage:
//   node generate.mjs                      # print top candidates + picks
//   node generate.mjs --verify             # also check words via dictionaryapi.dev
//   node generate.mjs --json out.json      # write picks in game-ready JSON
//   node generate.mjs --top 20 --min-len 3 --max-len 6 --exclude fire,house
//   node generate.mjs --list my-words.txt  # use another word list

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---------- args ----------
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);

const LIST = opt('list', path.join(HERE, 'compounds.txt'));
const MIN_LEN = Number(opt('min-len', 3));
const MAX_LEN = Number(opt('max-len', 6));
const TOP = Number(opt('top', 10));
const JSON_OUT = opt('json', null);
const VERIFY = flag('verify');
const EXCLUDE = new Set((opt('exclude', '') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));

// ---------- dictionary ----------
const pairs = new Set();               // "a|b" means a+b is a word
const suffixes = new Map();            // a -> Set(b)  (a+b)
const prefixes = new Map();            // b -> Set(a)  (a+b)
const add = (m, k, v) => (m.get(k) ?? m.set(k, new Set()).get(k)).add(v);

for (const raw of fs.readFileSync(LIST, 'utf8').split(/\r?\n/)) {
  const line = raw.replace(/#.*/, '').trim();
  if (!line) continue;
  const [first, rest] = line.split(':');
  if (rest === undefined) throw new Error(`Bad line (expected "first: second ..."): ${raw}`);
  const a = first.trim().toLowerCase();
  for (const b of rest.trim().toLowerCase().split(/\s+/).filter(Boolean)) {
    pairs.add(`${a}|${b}`);
    add(suffixes, a, b);
    add(prefixes, b, a);
  }
}

const has = (a, b) => pairs.has(`${a}|${b}`);
const suf = (w) => suffixes.get(w) ?? new Set();
const pre = (w) => prefixes.get(w) ?? new Set();
const inter = (x, y) => [...x].filter((v) => y.has(v));
const usable = (w) => w.length >= MIN_LEN && w.length <= MAX_LEN && !EXCLUDE.has(w);

// How many compounds a word appears in: a rough stand-in for "familiar".
const degree = (w) => suf(w).size + pre(w).size;

const vocab = [...new Set([...suffixes.keys(), ...prefixes.keys()])].filter(usable);

// ---------- grid geometry ----------
const SLOTS = ['A', 'B', 'C', 'D'];
const LINKS = {
  A: [['TL', 'A'], ['A', 'TR'], ['A', 'CE']],
  B: [['TL', 'B'], ['B', 'CE'], ['B', 'BL']],
  C: [['TR', 'C'], ['CE', 'C'], ['C', 'BR']],
  D: [['CE', 'D'], ['BL', 'D'], ['D', 'BR']],
};

// Links that hold when `word` sits in `slot`, as [first, second] words.
function validLinks(anchors, slot, word) {
  return LINKS[slot]
    .map(([l, r]) => [l === slot ? word : anchors[l], r === slot ? word : anchors[r]])
    .filter(([l, r]) => has(l, r));
}
const score = (anchors, slot, word) => validLinks(anchors, slot, word).length;

// Number of ways to put bank words into A-D so every slot is 3/3.
function countSolutions(anchors, bank) {
  const fits = SLOTS.map((s) => bank.filter((w) => score(anchors, s, w) === 3));
  let n = 0;
  const walk = (i, used) => {
    if (i === SLOTS.length) return void n++;
    for (const w of fits[i]) if (!used.has(w)) walk(i + 1, new Set([...used, w]));
  };
  walk(0, new Set());
  return n;
}

// Wrong-slot placements that score 2/3 (amber) - the "double agent" moments.
function traps(anchors, bank, solution) {
  const out = [];
  for (const w of bank) for (const s of SLOTS) {
    if (solution[s] === w) continue;
    if (score(anchors, s, w) === 2) out.push({ word: w, slot: s });
  }
  return out;
}

// ---------- search ----------
function* grids() {
  for (const CE of vocab) {
    const ab = [];
    const above = [...pre(CE)].filter(usable);   // A and B both read into CE
    for (const A of above) for (const B of above) {
      if (A === B) continue;
      const TLs = inter(pre(A), pre(B)).filter(usable);
      if (TLs.length) ab.push({ A, B, TLs });
    }
    if (!ab.length) continue;

    const cd = [];
    const below = [...suf(CE)].filter(usable);   // C and D both read out of CE
    for (const C of below) for (const D of below) {
      if (C === D) continue;
      const BRs = inter(suf(C), suf(D)).filter(usable);
      if (BRs.length) cd.push({ C, D, BRs });
    }

    for (const { A, B, TLs } of ab) for (const { C, D, BRs } of cd) {
      const TRs = inter(suf(A), pre(C)).filter(usable);
      if (!TRs.length) continue;
      const BLs = inter(suf(B), pre(D)).filter(usable);
      if (!BLs.length) continue;
      for (const TL of TLs) for (const TR of TRs) for (const BL of BLs) for (const BR of BRs) {
        const words = [TL, TR, CE, BL, BR, A, B, C, D];
        if (new Set(words).size !== 9) continue;
        yield { anchors: { TL, TR, CE, BL, BR }, solution: { A, B, C, D } };
      }
    }
  }
}

// Familiar words + some amber traps make a good daily; too many ambers = noise.
function rate(p) {
  const words = [...Object.values(p.anchors), ...Object.values(p.solution)];
  const familiarity = words.reduce((s, w) => s + Math.log2(1 + degree(w)), 0) / words.length;
  const amber = p.traps.length;
  return familiarity * 10 + Math.min(amber, 4) * 3 - Math.max(0, amber - 6) * 2;
}

// Best decoy: never 3/3 anywhere, 2/3 in as many slots as possible.
function pickDecoy(p, avoid) {
  const used = new Set([...Object.values(p.anchors), ...Object.values(p.solution), ...avoid]);
  let best = null;
  for (const w of vocab) {
    if (used.has(w)) continue;
    const scores = SLOTS.map((s) => score(p.anchors, s, w));
    if (Math.max(...scores) >= 3) continue;
    const amberSlots = scores.filter((x) => x === 2).length;
    if (!amberSlots) continue;
    const bank = [...Object.values(p.solution), w];
    if (countSolutions(p.anchors, bank) !== 1) continue;
    const r = amberSlots * 10 + Math.log2(1 + degree(w));
    if (!best || r > best.r) best = { word: w, r, amberSlots };
  }
  return best;
}

// Every valid compound the bank can form anywhere - the game's whitelist.
function validPairs(anchors, bank) {
  const out = new Set();
  for (const w of bank) for (const s of SLOTS) {
    for (const [l, r] of validLinks(anchors, s, w)) out.add(`${l}${r}`.toUpperCase());
  }
  return [...out].sort();
}

// ---------- optional online check ----------
const CACHE_FILE = path.join(HERE, '.dict-cache.json');
const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};

async function lookup(word) {
  if (cache[word] === 'ok' || cache[word] === 'missing') return cache[word];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      if (res.status === 200) return (cache[word] = 'ok');
      if (res.status === 404) return (cache[word] = 'missing');
    } catch { /* network hiccup - retry */ }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  return 'unknown';
}

async function verify(words) {
  const result = {};
  for (const w of words) result[w] = await lookup(w.toLowerCase());
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
  return result;
}

// ---------- output ----------
const U = (w) => w.toUpperCase();

function show(p, label) {
  const { TL, TR, CE, BL, BR } = p.anchors;
  const { A, B, C, D } = p.solution;
  const cell = (w, slot) => (slot ? `[${U(w)}]` : U(w)).padEnd(10);
  console.log(`\n=== ${label} ===`);
  console.log(`  ${cell(TL)}${cell(A, 1)}${cell(TR)}`);
  console.log(`  ${cell(B, 1)}${cell(CE)}${cell(C, 1)}`);
  console.log(`  ${cell(BL)}${cell(D, 1)}${cell(BR)}`);
  console.log(`  Bank: ${p.bank.map(U).join(', ')}${p.decoy ? `   (decoy: ${U(p.decoy)})` : ''}`);
  console.log(`  Solution links: ${p.links.join(', ')}`);
  console.log(`  Traps (2/3): ${p.traps.map((t) => `${U(t.word)}→${t.slot}`).join(', ') || 'none'}`);
  console.log(`  Unique solution: ${p.solutions === 1 ? 'yes' : `NO (${p.solutions})`}`);
}

function finish(p, decoy) {
  const bank = [...Object.values(p.solution), ...(decoy ? [decoy] : [])];
  const links = SLOTS.flatMap((s) => validLinks(p.anchors, s, p.solution[s]).map(([l, r]) => U(l + r)));
  return {
    ...p,
    bank,
    decoy: decoy ?? null,
    links,
    solutions: countSolutions(p.anchors, bank),
    traps: traps(p.anchors, bank, p.solution),
    validPairs: validPairs(p.anchors, bank),
  };
}

function toGameJson(p) {
  const up = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k === 'CE' ? 'CENTER' : k, U(v)]));
  return {
    fixed: up(p.anchors),
    solution: up(p.solution),
    bank: p.bank.map(U),
    decoy: p.decoy && U(p.decoy),
    solutionWords: p.links,
    validPairs: p.validPairs,
    trapPlacements: p.traps.map((t) => ({ word: U(t.word), slot: t.slot })),
    dictionaryLinks: p.links.map((w) => `https://www.merriam-webster.com/dictionary/${w.toLowerCase()}`),
  };
}

// ---------- main ----------
const seen = new Set();
const candidates = [];
for (const g of grids()) {
  const key = Object.values(g.anchors).concat(Object.values(g.solution)).sort().join(',');
  if (seen.has(key)) continue;   // same 9 words in a mirrored layout
  seen.add(key);
  const p = finish(g);
  if (p.solutions !== 1) continue;
  candidates.push({ ...p, rating: rate(p) });
}
candidates.sort((a, b) => b.rating - a.rating);

console.log(`Dictionary: ${pairs.size} compounds, ${vocab.length} usable words (${MIN_LEN}-${MAX_LEN} letters)`);
console.log(`Grids with a unique solution: ${candidates.length}`);
if (!candidates.length) process.exit(1);

console.log(`\nTop ${Math.min(TOP, candidates.length)} candidates:`);
candidates.slice(0, TOP).forEach((p, i) => {
  const w = { ...p.anchors, ...p.solution };
  console.log(`  ${String(i + 1).padStart(2)}. ${U(w.TL)} ${U(w.A)} ${U(w.TR)} / ${U(w.B)} ${U(w.CE)} ${U(w.C)} / ${U(w.BL)} ${U(w.D)} ${U(w.BR)}   traps=${p.traps.length} rating=${p.rating.toFixed(1)}`);
});

const wordsOf = (p) => new Set([...Object.values(p.anchors), ...Object.values(p.solution), ...(p.decoy ? [p.decoy] : [])]);
const disjoint = (a, b) => ![...wordsOf(a)].some((w) => wordsOf(b).has(w));

const verdicts = new Map();   // puzzle -> passed online check?
async function passes(p) {
  if (!VERIFY) return true;
  if (verdicts.has(p)) return verdicts.get(p);
  const res = await verify(p.validPairs);
  const bad = Object.entries(res).filter(([, v]) => v !== 'ok');
  if (bad.length) console.log(`  skipping a grid (not confirmed online: ${bad.map(([w, v]) => `${w}=${v}`).join(', ')})`);
  verdicts.set(p, !bad.length);
  return !bad.length;
}

// Choose both days together: best combined rating with no shared words.
const pool = candidates.slice(0, 300);
const standards = pool.filter((p) => p.traps.length >= 2);
const masters = pool
  .map((p) => {
    const d = pickDecoy(p, new Set());
    return d && finish(p, d.word);
  })
  .filter((m) => m && m.solutions === 1)
  .map((m) => ({ ...m, rating: rate(m) + 5 * m.traps.length }));

const combos = [];
for (const s of standards) for (const m of masters) {
  if (disjoint(s, m)) combos.push({ s, m, total: s.rating + m.rating });
}
combos.sort((a, b) => b.total - a.total);

let standard = null;
let master = null;
for (const { s, m } of combos) {
  if ((await passes(s)) && (await passes(m))) { standard = s; master = m; break; }
}
if (!standard && standards.length && (await passes(standards[0]))) standard = standards[0];

if (standard) show(standard, 'Daily #1 (Standard)');
if (master) show(master, 'Daily #2 (Master, with decoy)');
if (!standard || !master) console.log('\nCould not fill both days - loosen --min-len/--max-len or grow compounds.txt.');

if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify({ daily1: standard && toGameJson(standard), daily2: master && toGameJson(master) }, null, 2));
  console.log(`\nWrote ${JSON_OUT}`);
}
