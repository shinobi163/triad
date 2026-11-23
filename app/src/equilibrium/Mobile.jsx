import { isBalanced, paintFor, radiusFor, tilt } from './levels.js';

// Drawing units (SVG px).
const U = 46;          // one unit of arm length
const STRING = 62;     // hanger length
const SLOT_R = 26;     // room reserved for the biggest disc
const SWING = 'transform 700ms cubic-bezier(.34,1.45,.64,1)';   // slight overshoot, like a real mobile

// Bounding box of a beam drawn level, relative to its pivot.
function extent(beam) {
  let minX = 0;
  let maxX = 0;
  let maxY = 0;
  for (const side of ['left', 'right']) {
    const x = (side === 'left' ? -1 : 1) * beam[side].arm * U;
    if (beam[side].beam) {
      const e = extent(beam[side].beam);
      minX = Math.min(minX, x + e.minX);
      maxX = Math.max(maxX, x + e.maxX);
      maxY = Math.max(maxY, STRING + e.maxY);
    } else {
      minX = Math.min(minX, x - SLOT_R);
      maxX = Math.max(maxX, x + SLOT_R);
      maxY = Math.max(maxY, STRING + 2 * SLOT_R);
    }
  }
  return { minX, maxX, maxY };
}

function Slot({ level, slot, weight, selected, locked, onTap }) {
  const label = weight == null ? `Empty hook ${slot}` : `Hook ${slot}: weight ${weight}${locked ? ', locked by hint' : ''}`;
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTap(slot);
    }
  };
  if (weight == null) {
    return (
      <g role="button" tabIndex={0} aria-label={label} onClick={() => onTap(slot)} onKeyDown={onKey} className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-fire">
        <circle cx={0} cy={SLOT_R - 4} r={22} fill="var(--eq-bg)" stroke={selected ? '#E4572E' : '#9A948C'} strokeWidth={selected ? 3.5 : 2} strokeDasharray="5 4" />
        <text x={0} y={SLOT_R} textAnchor="middle" fontSize="13" fontWeight="700" fill="#9A948C">{slot}</text>
      </g>
    );
  }
  const r = radiusFor(weight);
  const paint = paintFor(level, weight);
  return (
    <g role="button" tabIndex={0} aria-label={label} onClick={() => onTap(slot)} onKeyDown={onKey} className={locked ? 'outline-none' : 'cursor-pointer outline-none'}>
      <circle cx={0} cy={r} r={r} fill={paint.fill} stroke={selected ? '#E4572E' : locked ? '#10B981' : 'none'} strokeWidth={4} />
      <text x={0} y={r + 6} textAnchor="middle" fontSize="17" fontWeight="800" fill={paint.text}>{weight}</text>
    </g>
  );
}

function Beam({ level, beam, weights, ui, depth }) {
  const angle = tilt(beam, weights);
  const balanced = isBalanced(beam, weights);
  const color = balanced ? '#10B981' : '#1B1B1B';
  const leftX = -beam.left.arm * U;
  const rightX = beam.right.arm * U;

  return (
    <g style={{ transform: `rotate(${angle}deg)`, transition: SWING }}>
      <line x1={leftX} y1={0} x2={rightX} y2={0} stroke={color} strokeWidth={depth === 0 ? 6 : 5} strokeLinecap="round" style={{ transition: 'stroke 300ms' }} />
      {/* one tick per unit of arm length, so distances can be read off the beam */}
      {Array.from({ length: beam.left.arm + beam.right.arm + 1 }, (_, k) => leftX + k * U)
        .filter((x) => x !== 0)
        .map((x) => <line key={x} x1={x} y1={-5} x2={x} y2={5} stroke={color} strokeWidth={2} style={{ transition: 'stroke 300ms' }} />)}
      <circle cx={0} cy={0} r={6} fill="var(--eq-bg)" stroke={color} strokeWidth={3} style={{ transition: 'stroke 300ms' }} />
      {['left', 'right'].map((side) => {
        const x = side === 'left' ? leftX : rightX;
        const arm = beam[side];
        return (
          <g key={side} transform={`translate(${x} 0)`}>
            {/* counter-rotate so hangers always hang straight down */}
            <g style={{ transform: `rotate(${-angle}deg)`, transition: SWING }}>
              <line x1={0} y1={0} x2={0} y2={STRING} stroke="#6E675F" strokeWidth={1.5} />
              <g transform={`translate(0 ${STRING})`}>
                {arm.beam ? (
                  <Beam level={level} beam={arm.beam} weights={weights} ui={ui} depth={depth + 1} />
                ) : (
                  <Slot
                    level={level}
                    slot={arm.slot}
                    weight={weights[arm.slot]}
                    selected={ui.selectedSlot === arm.slot}
                    locked={ui.locked[arm.slot]}
                    onTap={ui.onTapSlot}
                  />
                )}
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
}

export default function Mobile({ level, weights, ui }) {
  const e = extent(level.beam);
  const pad = 34;   // room for the swing
  const top = 46;   // ceiling + hanger above the main pivot
  const width = e.maxX - e.minX + pad * 2;
  const height = top + e.maxY + pad;
  return (
    <svg
      viewBox={`${e.minX - pad} ${-top} ${width} ${height}`}
      className="mx-auto block h-auto w-full max-w-[26rem]"
      role="group"
      aria-label="Hanging mobile"
    >
      <line x1={-30} y1={-top + 8} x2={30} y2={-top + 8} stroke="#1B1B1B" strokeWidth={3} strokeLinecap="round" />
      <line x1={0} y1={-top + 8} x2={0} y2={0} stroke="#6E675F" strokeWidth={1.5} />
      <Beam level={level} beam={level.beam} weights={weights} ui={ui} depth={0} />
    </svg>
  );
}
