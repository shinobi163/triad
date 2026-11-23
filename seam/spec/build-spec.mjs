#!/usr/bin/env node
// Builds seam-spec.html from the rules engine and levels.json, so every board
// in the spec is a real engine position.  node build-spec.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EMPTY, T1, T2, GOAL, FILLED, applyMove, createState, geometry, legalMoves, solve } from '../engine.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { levels } = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'levels.json'), 'utf8'));
const byId = Object.fromEntries(levels.map((l) => [l.id, l]));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- boards ----------
function describe(level, state) {
  const geo = geometry(level);
  const parts = [];
  state.grid.forEach((v, i) => {
    const at = `row ${Math.floor(i / geo.cols)} col ${i % geo.cols}`;
    if (v === T1) parts.push(`tier-1 orb at ${at}`);
    if (v === T2) parts.push(`tier-2 orb at ${at}`);
    if (v === GOAL) parts.push(`goal at ${at}`);
    if (v === FILLED) parts.push(`filled goal at ${at}`);
  });
  for (const a of geo.anchors) parts.push(`anchor at row ${Math.floor(a / geo.cols)} col ${a % geo.cols}`);
  if (state.seam) parts.push(`seam closed on ${state.seam.axis === 'R' ? 'row' : 'column'} ${state.seam.i}${state.seam.pending.length ? ', tier-2 orb waiting on the seam' : ''}`);
  return parts.join('; ');
}

function board(level, state, { flash = [] } = {}) {
  const geo = geometry(level);
  const seam = state.seam;
  const foldable = seam ? [] : legalMoves(geo, state);
  const rowTrack = (r) => (seam?.axis === 'R' && seam.i === r ? 'var(--thread-w)' : 'var(--cell)');
  const colTrack = (c) => (seam?.axis === 'C' && seam.i === c ? 'var(--thread-w)' : 'var(--cell)');
  const rows = ['var(--lab)', ...Array.from({ length: geo.rows }, (_, r) => rowTrack(r))].join(' ');
  const cols = ['var(--lab)', ...Array.from({ length: geo.cols }, (_, c) => colTrack(c))].join(' ');
  const out = [];

  for (let c = 0; c < geo.cols; c++) {
    if (seam?.axis === 'C' && seam.i === c) continue;
    const isFold = foldable.includes(`C${c}`);
    out.push(`<span class="lab${isFold ? ' lab-fold' : ''}" style="grid-area:1/${c + 2}">${isFold ? `C${c}` : c}</span>`);
  }
  for (let r = 0; r < geo.rows; r++) {
    if (seam?.axis === 'R' && seam.i === r) continue;
    const isFold = foldable.includes(`R${r}`);
    out.push(`<span class="lab${isFold ? ' lab-fold' : ''}" style="grid-area:${r + 2}/1">${isFold ? `R${r}` : r}</span>`);
  }

  for (let r = 0; r < geo.rows; r++) {
    for (let c = 0; c < geo.cols; c++) {
      if (seam?.axis === 'R' && seam.i === r) continue;
      if (seam?.axis === 'C' && seam.i === c) continue;
      const i = r * geo.cols + c;
      const v = state.grid[i];
      const cls = ['cell'];
      if (geo.anchors.has(i)) cls.push('anchor');
      if (foldable.includes(`R${r}`) || foldable.includes(`C${c}`)) cls.push('fold');
      if (flash.includes(i)) cls.push('flash');
      let inner = '';
      if (v === T1) inner = '<span class="orb t1">1</span>';
      if (v === T2) inner = '<span class="orb t2">2</span>';
      if (v === GOAL) inner = '<span class="socket">2</span>';
      if (v === FILLED) inner = '<span class="socket filled">✓</span>';
      out.push(`<span class="${cls.join(' ')}" style="grid-area:${r + 2}/${c + 2}">${inner}</span>`);
    }
  }

  if (seam) {
    const area = seam.axis === 'R' ? `${seam.i + 2}/2/${seam.i + 3}/-1` : `2/${seam.i + 2}/-1/${seam.i + 3}`;
    out.push(`<span class="thread thread-${seam.axis === 'R' ? 'h' : 'v'}" style="grid-area:${area}"></span>`);
    for (const [a] of seam.pending) {
      const r = Math.floor(a / geo.cols);
      const c = a % geo.cols;
      const at = seam.axis === 'R' ? `${seam.i + 2}/${c + 2}` : `${r + 2}/${seam.i + 2}`;
      out.push(`<span class="pending" style="grid-area:${at}"><span class="orb t2">2</span></span>`);
    }
  }

  return `<div class="board" role="img" aria-label="${esc(describe(level, state))}" style="grid-template-rows:${rows};grid-template-columns:${cols}">${out.join('')}</div>`;
}

// A strip of boards: start, then one board per move with the move as label.
function strip(level, moves, notes = []) {
  const geo = geometry(level);
  let state = createState(level);
  const frames = [`<figure class="frame">${board(level, state)}<figcaption><b>Start</b>${notes[0] ? `<span>${notes[0]}</span>` : ''}</figcaption></figure>`];
  moves.forEach((m, k) => {
    const { state: next, events } = applyMove(geo, state, m);
    const flash = events.flatMap((e) => (e.type === 'fuse' ? [] : e.type === 'fill' ? [e.goal] : e.type === 'settle' ? [e.to] : []));
    state = next;
    frames.push(`<span class="step" aria-hidden="true">→</span><figure class="frame">${board(level, state, { flash })}<figcaption><b class="mv">${m}</b>${notes[k + 1] ? `<span>${notes[k + 1]}</span>` : ''}</figcaption></figure>`);
  });
  return `<div class="strip-wrap"><div class="strip">${frames.join('')}</div></div>`;
}

function openingsTable(level) {
  const result = solve(level);
  const geo = result.geo;
  const start = createState(level);
  const name = (i) => `[${Math.floor(i / geo.cols)},${i % geo.cols}]`;
  const rows = legalMoves(geo, start).map((m) => {
    const { state, events } = applyMove(geo, start, m);
    const used = 1 + result.remaining(state);
    const what = events.filter((e) => e.type === 'fuse').map((e) => `fuses ${e.cells.map(name).join(' + ')}`).join(', ') || 'nothing reacts';
    const verdict = used === Infinity ? '<span class="pill bad">Dead end</span>' : used === result.par ? '<span class="pill ok">Optimal</span>' : `<span class="pill warn">Detour +${used - result.par}</span>`;
    return `<tr><td class="mono">${m}</td><td>${what}</td><td>${verdict}</td></tr>`;
  });
  return `<div class="table-wrap"><table><thead><tr><th>First move</th><th>What happens</th><th>Verdict</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

// ---------- example levels used only in the rules section ----------
const ex = {
  topLeft: { size: [3, 3], orbs: [{ at: [0, 0], tier: 1 }, { at: [2, 0], tier: 1 }], anchors: [], goals: [[2, 2]] },
  anchor: { size: [3, 3], orbs: [{ at: [0, 0], tier: 1 }, { at: [2, 0], tier: 1 }], anchors: [[2, 0]], goals: [[2, 2]] },
  inert: { size: [3, 3], orbs: [{ at: [0, 0], tier: 1 }, { at: [0, 2], tier: 1 }, { at: [2, 2], tier: 2 }], anchors: [], goals: [[2, 0]] },
  lines: { size: [4, 4], orbs: [{ at: [0, 2], tier: 1 }], anchors: [[2, 3]], goals: [[1, 0]] },
};

const d1 = byId.daily1;
const d2 = byId.daily2;
const s1 = solve(d1);
const s2 = solve(d2);

const template = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8');
const html = template
  .replace('{{EX_TOPLEFT}}', strip(ex.topLeft, ['R1', 'SNIP'], ['', 'Tier-1 + Tier-1 fuse. The new orb waits on the seam.', 'No Anchor: it lands top/left, at [0,0].']))
  .replace('{{EX_ANCHOR}}', strip(ex.anchor, ['R1', 'SNIP'], ['Same layout, Anchor at [2,0].', 'Same fusion.', 'One origin is an Anchor: it lands there.']))
  .replace('{{EX_INERT}}', strip(ex.inert, ['R1', 'SNIP'], ['', 'Tier-1 faces GOAL, Tier-1 faces Tier-2: nothing happens.', 'Snip restores the board. Two moves wasted.']))
  .replace('{{EX_LINES}}', strip(ex.lines, [], ['Only C1 can fold. R1 holds a goal, R2 holds a bare Anchor, C2 holds an orb, and edge lines never fold.']))
  .replace('{{EX_ONESEAM}}', strip(d1, ['R1'], ['', 'Seam closed. The only legal move is SNIP, so C1 must wait.']))
  .replace('{{D1_STRIP}}', strip(d1, s1.solution, ['', 'Fuse. Orb waits on the seam.', 'Lands on the Anchor, in the bottom row.', 'Faces the goal: filled. Won in 3.']))
  .replace('{{D1_OPENINGS}}', openingsTable(d1))
  .replace('{{D2_STRIP}}', strip(d2, s2.solution, ['', 'Fuse top orb with the Anchor orb.', 'Lands on the Anchor at [2,2].', 'One fold, two reactions: fills the right goal and fuses the bottom pair.', 'Lands top/left at [4,2].', 'Faces the left goal: filled. Won in 5.']))
  .replace('{{D2_TRAP}}', strip(d2, ['R3', 'SNIP'], ['', 'Tempting: fuses the Anchor orb with the bottom orb.', 'Now [0,2] and [4,4] can never meet. Dead end: undo or reset.']))
  .replace('{{D2_OPENINGS}}', openingsTable(d2))
  .replace('{{D1_JSON}}', esc(JSON.stringify(d1, null, 2)))
  .replace('{{D2_POSITIONS}}', String(s2.positions))
  .replace('{{BUILT}}', new Date().toISOString().slice(0, 10));

fs.writeFileSync(path.join(HERE, 'seam-spec.html'), html);
console.log('Wrote seam-spec.html');
