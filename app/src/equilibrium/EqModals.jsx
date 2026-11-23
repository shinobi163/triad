import Modal from '../components/Modal.jsx';
import { ResultActions, Stat, StatRow } from '../components/Results.jsx';
import { formatTime } from '../format.js';
import { beams, scoreFor, shareText, torques } from './levels.js';

export function EqRulesModal({ onClose }) {
  return (
    <Modal title="How to play Equilibrium" onClose={onClose}>
      <ol className="list-decimal space-y-3 pl-5 text-[0.95rem] leading-snug marker:font-bold marker:text-emerald-600">
        <li>Tap a weight, then tap an empty hook to hang it. Tap a hung weight to take it back.</li>
        <li>
          Each side of a beam pulls with <b>weight × distance</b>. The ticks on a beam count the distance.
        </li>
        <li>A lower beam pulls with the total weight hanging from it.</li>
        <li>Balance every beam: it turns <b className="text-emerald-600">green</b>. Try to do it in as few placements as there are hooks.</li>
      </ol>
      <p className="mt-4 rounded-lg bg-black/5 p-3 text-sm">
        Example: 6 at distance 2 balances 12 at distance 1, because 6 × 2 = 12 × 1.
      </p>
    </Modal>
  );
}

const beamName = (id) => (id === 'main' ? 'Top beam' : 'Lower beam');

export function EqResultsModal({ level, state, weights, onClose, onNext, onHome }) {
  const score = scoreFor({ elapsed: state.elapsed, moves: state.moves, hints: state.hints, par: level.par });
  return (
    <Modal title="Perfect balance!" onClose={onClose}>
      {state.qa ? (
        <p className="-mt-2 mb-3 text-xs font-semibold uppercase tracking-wider text-fire">Solved with QA key — not scored</p>
      ) : (
        <p className="-mt-2 mb-4 text-sm text-ink/70">{state.moves <= level.par ? 'Balanced on the first try.' : `${state.moves - level.par} extra placements.`}</p>
      )}
      <StatRow>
        <Stat label="Time" value={formatTime(state.elapsed)} />
        <Stat label="Placed" value={`${state.moves}/${level.par}`} />
        <Stat label="Hints" value={state.hints} />
        <Stat label="Score" value={state.qa ? '—' : score} />
      </StatRow>
      <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-ink/60">Why it balances</h3>
      <ul className="mt-2 space-y-1 font-mono text-sm">
        {beams(level.beam).map(({ id, beam }) => {
          const t = torques(beam, weights);
          return (
            <li key={id}>
              <span className="font-sans font-semibold">{beamName(id)}:</span> {t.left} = {t.right}
            </li>
          );
        })}
      </ul>
      <ResultActions shareText={() => shareText(level, state)} onNext={onNext} onHome={onHome} />
    </Modal>
  );
}
