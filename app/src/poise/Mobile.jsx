// The hanging mobile, drawn in SVG. Each beam tips by its torque imbalance and
// turns green once balanced; words hang as tags sized by their letters.
import { isBalanced, slotIds, tilt } from '../../../poise/engine.mjs';

// Drawing units (SVG px).
const U = 40;          // one unit of arm length
const STRING = 56;     // hanger length
const TAG_W = 92;      // room reserved for the widest tag
const TAG_H = 34;
const SWING = 'transform 700ms cubic-bezier(.34,1.45,.64,1)';   // slight overshoot, like a real mobile
export const SIDE_TINT = { left: '#C2410C', right: '#1D4ED8' }; // Fruit / Colours tag colours

const tagWidth = (word) => 24 + word.length * 11;

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
      minX = Math.min(minX, x - TAG_W / 2);
      maxX = Math.max(maxX, x + TAG_W / 2);
      maxY = Math.max(maxY, STRING + TAG_H + 4);
    }
  }
  return { minX, maxX, maxY };
}

function Hook({ slot, word, side, selected, onTap }) {
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTap(slot);
    }
  };
  const common = { role: 'button', tabIndex: 0, onClick: () => onTap(slot), onKeyDown: onKey, className: 'cursor-pointer outline-none' };
  if (word == null) {
    return (
      <g {...common} aria-label={`Empty hook ${slot}`}>
        <rect x={-30} y={0} width={60} height={TAG_H} rx={10} fill="#fff" stroke={selected ? '#121212' : '#A3A3A3'} strokeWidth={selected ? 3 : 2} strokeDasharray="5 4" />
        <text x={0} y={TAG_H / 2 + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#A3A3A3">{slot}</text>
      </g>
    );
  }
  const w = tagWidth(word);
  return (
    <g {...common} aria-label={`Hook ${slot}: ${word}, ${word.length} letters`}>
      <rect x={-w / 2} y={0} width={w} height={TAG_H} rx={10} fill={SIDE_TINT[side]} stroke={selected ? '#121212' : 'none'} strokeWidth={3} />
      <text x={0} y={TAG_H / 2 + 5} textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="ui-monospace, monospace" letterSpacing="1">{word}</text>
    </g>
  );
}

// "6×3=18": letters hanging from a side × its distance = its pull. Shown once
// everything under that side is hung, so players see the rule at work.
function pullLabel(arm, weights) {
  const slots = arm.beam ? slotIds(arm.beam) : [arm.slot];
  if (slots.some((s) => weights[s] == null)) return null;
  const hanging = slots.reduce((sum, s) => sum + weights[s], 0);
  return `${hanging}×${arm.arm}=${hanging * arm.arm}`;
}

function Beam({ beam, weights, placed, ui, side, depth }) {
  const angle = tilt(beam, weights);
  const color = isBalanced(beam, weights) ? '#16A34A' : '#121212';
  const leftX = -beam.left.arm * U;
  const rightX = beam.right.arm * U;

  return (
    <g style={{ transform: `rotate(${angle}deg)`, transition: SWING }}>
      <line x1={leftX} y1={0} x2={rightX} y2={0} stroke={color} strokeWidth={depth === 0 ? 6 : 5} strokeLinecap="round" style={{ transition: 'stroke 300ms' }} />
      {/* one tick per unit of arm length, so distances can be read off the beam */}
      {Array.from({ length: beam.left.arm + beam.right.arm + 1 }, (_, k) => leftX + k * U)
        .filter((x) => x !== 0)
        .map((x) => <line key={x} x1={x} y1={-5} x2={x} y2={5} stroke={color} strokeWidth={2} style={{ transition: 'stroke 300ms' }} />)}
      <circle cx={0} cy={0} r={6} fill="#fff" stroke={color} strokeWidth={3} style={{ transition: 'stroke 300ms' }} />
      {['left', 'right'].map((s) => {
        const x = s === 'left' ? leftX : rightX;
        const arm = beam[s];
        const armSide = side ?? s;   // below the top beam, everything keeps its top-level side
        const pull = pullLabel(arm, weights);
        return (
          <g key={s} transform={`translate(${x} 0)`}>
            {/* counter-rotate so hangers always hang straight down */}
            <g style={{ transform: `rotate(${-angle}deg)`, transition: SWING }}>
              {depth === 0 && (
                <text x={0} y={-14} textAnchor="middle" fontSize="12" fontWeight="800" letterSpacing="1.5" fill={SIDE_TINT[s]}>
                  {ui.categories[s].toUpperCase()}
                </text>
              )}
              {pull && (
                <text x={0} y={depth === 0 ? -32 : -12} textAnchor="middle" fontSize="15" fontWeight="700" fill={color} fontFamily="ui-monospace, monospace">
                  {pull}
                </text>
              )}
              <line x1={0} y1={0} x2={0} y2={STRING} stroke="#737373" strokeWidth={1.5} />
              <g transform={`translate(0 ${STRING})`}>
                {arm.beam ? (
                  <Beam beam={arm.beam} weights={weights} placed={placed} ui={ui} side={armSide} depth={depth + 1} />
                ) : (
                  <Hook slot={arm.slot} word={placed[arm.slot]} side={armSide} selected={ui.selectedSlot === arm.slot} onTap={ui.onTapSlot} />
                )}
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
}

export default function Mobile({ beam, weights, placed, ui }) {
  const e = extent(beam);
  const pad = 30;   // room for the swing
  const top = 76;   // ceiling, hanger, pulls and category labels above the main pivot
  return (
    <svg
      viewBox={`${e.minX - pad} ${-top} ${e.maxX - e.minX + pad * 2} ${top + e.maxY + pad}`}
      className="mx-auto block h-auto w-full max-w-[26rem]"
      role="group"
      aria-label="Hanging mobile"
    >
      <line x1={-30} y1={-top + 6} x2={30} y2={-top + 6} stroke="#121212" strokeWidth={3} strokeLinecap="round" />
      <line x1={0} y1={-top + 6} x2={0} y2={0} stroke="#737373" strokeWidth={1.5} />
      <Beam beam={beam} weights={weights} placed={placed} ui={ui} depth={0} />
    </svg>
  );
}
