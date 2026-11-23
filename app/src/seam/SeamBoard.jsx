import { useState } from 'react';
import { EMPTY, FILLED, GOAL, T1, T2, legalMoves } from './levels.js';

function Piece({ value, pop }) {
  const anim = pop ? ' animate-pop' : '';
  if (value === T1) return <span className={`grid aspect-square w-[68%] place-items-center rounded-full bg-amethyst text-lg font-bold text-white shadow-sm${anim}`}>1</span>;
  if (value === T2) return <span className={`grid aspect-square w-[68%] place-items-center rounded-full bg-ruby text-lg font-bold text-white shadow-sm${anim}`}>2</span>;
  if (value === GOAL) return <span className="grid aspect-square w-[70%] place-items-center rounded-full border-[3px] border-dashed border-goal text-sm font-bold text-goal">2</span>;
  if (value === FILLED) return <span className={`grid aspect-square w-[70%] place-items-center rounded-full bg-goal text-lg font-bold text-white${anim}`}>✓</span>;
  return null;
}

const PIECE_NAME = { [T1]: 'tier-1 orb', [T2]: 'tier-2 orb', [GOAL]: 'goal', [FILLED]: 'filled goal' };

// Board: a CSS grid whose track sizes animate, so a folded line shrinks into
// the gold thread and its neighbors slide together.
export default function SeamBoard({ level, position, events, moveCount, onMove, disabled }) {
  const [hover, setHover] = useState(null);   // 'R2' / 'C1' while pointing at a line
  const { rows, cols, anchors } = level.geo;
  const seam = position.seam;
  const folds = seam || disabled ? [] : legalMoves(level.geo, position);
  const isFolded = (axis, i) => seam?.axis === axis && seam.i === i;

  const track = (axis, n) => ['var(--gut)', ...Array.from({ length: n }, (_, i) => (isFolded(axis, i) ? 'var(--thread)' : 'var(--cell)'))].join(' ');
  const popped = new Set(events.flatMap((e) => (e.type === 'fill' ? [e.goal] : e.type === 'settle' ? [e.to] : [])));

  const items = [];

  // Fold handles in the gutters.
  for (const m of folds) {
    const axis = m[0];
    const i = Number(m.slice(1));
    items.push(
      <button
        key={`h-${m}`}
        type="button"
        onClick={() => onMove(m)}
        onPointerEnter={() => setHover(m)}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover(m)}
        onBlur={() => setHover(null)}
        aria-label={`Fold ${axis === 'R' ? 'row' : 'column'} ${i + 1}`}
        style={axis === 'R' ? { gridRow: i + 2, gridColumn: 1 } : { gridRow: 1, gridColumn: i + 2 }}
        className="m-auto grid h-7 w-7 place-items-center rounded-full border-2 border-dashed border-thread text-sm font-bold text-thread hover:bg-thread hover:text-white focus-visible:bg-thread focus-visible:text-white focus-visible:outline-none"
      >
        {axis === 'R' ? '⇕' : '⇔'}
      </button>,
    );
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const value = position.grid[i];
      const hidden = isFolded('R', r) || isFolded('C', c);
      const inRow = folds.includes(`R${r}`);
      const inCol = folds.includes(`C${c}`);
      // A cell on exactly one foldable line folds that line when tapped;
      // where two foldable lines cross, the cell is ambiguous, so it stays inert.
      const move = inRow && !inCol ? `R${r}` : inCol && !inRow ? `C${c}` : null;
      const lit = hover && (hover === `R${r}` || hover === `C${c}`);
      const cls = [
        'relative grid place-items-center rounded-md transition-[background-color,opacity] duration-200',
        anchors.has(i) ? 'seam-anchor' : '',
        hidden ? 'pointer-events-none opacity-0' : '',
        inRow || inCol ? 'outline-dashed outline-2 -outline-offset-[3px] outline-thread/70' : '',
        lit ? 'bg-thread/25' : 'bg-cardstock',
      ].join(' ');
      const style = { gridRow: r + 2, gridColumn: c + 2 };
      const label = `Row ${r + 1}, column ${c + 1}${anchors.has(i) ? ', Anchor' : ''}${value !== EMPTY ? `, ${PIECE_NAME[value]}` : ''}`;

      items.push(
        move ? (
          <button
            key={i}
            type="button"
            onClick={() => onMove(move)}
            onPointerEnter={() => setHover(move)}
            onPointerLeave={() => setHover(null)}
            aria-label={`${label}. Fold this ${move[0] === 'R' ? 'row' : 'column'}`}
            className={`${cls} cursor-pointer`}
            style={style}
          />
        ) : (
          <div key={i} className={cls} style={style} aria-label={label} role="img">
            {!hidden && <Piece value={value} pop={popped.has(i)} />}
          </div>
        ),
      );
    }
  }

  if (seam) {
    const rowFold = seam.axis === 'R';
    items.push(
      <button
        key="thread"
        type="button"
        disabled={disabled}
        onClick={() => onMove('SNIP')}
        aria-label="Snip the seam open"
        style={rowFold ? { gridRow: seam.i + 2, gridColumn: '2 / -1' } : { gridColumn: seam.i + 2, gridRow: '2 / -1' }}
        className={`group relative z-10 flex items-center justify-center ${rowFold ? '-my-3' : '-mx-3'}`}
      >
        <span className={`seam-thread block rounded-full bg-thread ${rowFold ? 'h-1 w-full' : 'h-full w-1'}`} />
        <span className={`absolute rounded bg-thread px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 ${rowFold ? '-right-1 -top-4' : '-bottom-5'}`}>
          ✂ snip
        </span>
      </button>,
    );
    for (const [a] of seam.pending) {
      const r = Math.floor(a / cols);
      const c = a % cols;
      items.push(
        <span
          key={`p-${a}-${moveCount}`}
          style={rowFold ? { gridRow: seam.i + 2, gridColumn: c + 2 } : { gridRow: r + 2, gridColumn: seam.i + 2 }}
          className="pointer-events-none z-20 grid place-items-center"
          aria-label="Tier-2 orb waiting on the seam"
          role="img"
        >
          <span className="grid h-[calc(var(--cell)*0.6)] w-[calc(var(--cell)*0.6)] animate-pop place-items-center rounded-full bg-ruby text-base font-bold text-white ring-4 ring-linen">2</span>
        </span>,
      );
    }
  }

  return (
    <div
      className="seam-board mx-auto w-max"
      style={{ '--n': Math.max(rows, cols), gridTemplateRows: track('R', rows), gridTemplateColumns: track('C', cols) }}
    >
      {items}
    </div>
  );
}
