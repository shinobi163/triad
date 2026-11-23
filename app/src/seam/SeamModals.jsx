import Modal from '../components/Modal.jsx';
import { ResultActions, Stat, StatRow } from '../components/Results.jsx';
import { formatTime } from '../format.js';
import { scoreFor, shareText } from './levels.js';

// "R1" -> "fold row 2": players count from 1, the engine from 0.
const moveName = (m) => (m === 'SNIP' ? 'snip' : `fold ${m[0] === 'R' ? 'row' : 'column'} ${Number(m.slice(1)) + 1}`);

const Orb = ({ tier }) => (
  <span className={`inline-grid h-5 w-5 place-items-center rounded-full align-[-3px] text-[0.7rem] font-bold text-white ${tier === 1 ? 'bg-amethyst' : 'bg-ruby'}`}>{tier}</span>
);
const Goal = () => (
  <span className="inline-grid h-5 w-5 place-items-center rounded-full border-2 border-dashed border-goal align-[-3px] text-[0.65rem] font-bold text-goal">2</span>
);

// Four lines. Everything else is taught by the instruction line during play.
export function SeamRulesModal({ onClose }) {
  return (
    <Modal title="How to play Seam" onClose={onClose}>
      <ol className="list-decimal space-y-3 pl-5 text-[0.95rem] leading-snug marker:font-bold marker:text-thread">
        <li><b>Fold</b> an empty dashed row or column shut. The lines on either side now face each other.</li>
        <li>
          <Orb tier={1} /> facing <Orb tier={1} /> <b>fuse</b> into a <Orb tier={2} />. A <Orb tier={2} /> facing a <Goal /> <b>fills</b> it.
        </li>
        <li>Tap the gold thread to <b>snip</b> it open. A new <Orb tier={2} /> lands on a brass <b>Anchor</b> if it came from one, otherwise top/left.</li>
        <li>Fill every goal. Try to match <b>par</b>. Undo is always there.</li>
      </ol>
    </Modal>
  );
}

export function SeamResultsModal({ level, state, onClose, onNext, onHome }) {
  const score = scoreFor({ elapsed: state.elapsed, moves: state.moves, hints: state.hints, par: level.par });
  const verdict = state.moves <= level.par ? 'Par! Perfect stitching.' : `${state.moves - level.par} over par.`;
  return (
    <Modal title="Every goal filled!" onClose={onClose}>
      {state.qa ? (
        <p className="-mt-2 mb-3 text-xs font-semibold uppercase tracking-wider text-fire">Solved with QA key — not scored</p>
      ) : (
        <p className="-mt-2 mb-4 text-sm text-ink/70">{verdict}</p>
      )}
      <StatRow>
        <Stat label="Time" value={formatTime(state.elapsed)} />
        <Stat label="Moves" value={`${state.moves}/${level.par}`} />
        <Stat label="Hints" value={state.hints} />
        <Stat label="Score" value={state.qa ? '—' : score} />
      </StatRow>
      <p className="mt-4 text-sm text-ink/70">
        Shortest solution: {level.solution.map(moveName).join(' → ')}
      </p>
      <ResultActions shareText={() => shareText(level, state)} onNext={onNext} onHome={onHome} />
    </Modal>
  );
}
