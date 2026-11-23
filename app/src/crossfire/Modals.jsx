import Modal from '../components/Modal.jsx';
import { ResultActions, Stat, StatRow } from '../components/Results.jsx';
import { MAX_CHECKS, dictionaryUrl, formatTime, scoreFor, shareText } from './logic.js';

export function RulesModal({ onClose }) {
  return (
    <Modal title="How to play Crossfire" onClose={onClose}>
      <ul className="space-y-3 text-[0.95rem] leading-snug">
        <li>Put a bank word in each dashed slot. Every slot word must make a real word with <b>all three</b> of its neighbors.</li>
        <li>
          Words read <b>left to right →</b> and <b>top to bottom ↓</b>. A slot under <b>CROSS</b> makes <b>CROSS___</b>; a slot left of{' '}
          <b>HOUSE</b> makes <b>___HOUSE</b>.
        </li>
        <li>Tap a word, then tap a slot. Tap a filled slot to send its word back.</li>
        <li>
          <b>Test Circuit</b> scores each slot: <span className="rounded bg-ok px-1.5 py-0.5 text-white">3/3</span> correct (it locks),{' '}
          <span className="rounded bg-trap px-1.5 py-0.5">2/3 trap</span> one link fails, <span className="rounded bg-bad px-1.5 py-0.5 text-white">red</span> two or more fail.
          The arrows show which links worked.
        </li>
        <li>You get {MAX_CHECKS} checks. The Master puzzle hides one decoy word in the bank.</li>
      </ul>
    </Modal>
  );
}


export function ResultsModal({ level, state, onClose, onNext, onHome }) {
  const won = state.status === 'won';
  const checksUsed = state.history.length;
  const score = won ? scoreFor({ elapsed: state.elapsed, checksUsed, hints: state.hints }) : 0;

  return (
    <Modal title={won ? 'Circuit complete!' : 'Out of checks'} onClose={onClose}>
      {state.qa && <p className="-mt-2 mb-3 text-xs font-semibold uppercase tracking-wider text-fire">Solved with QA key — not scored</p>}
      {!won && <p className="-mt-2 mb-4 text-sm text-ink/70">The board now shows the solution.</p>}

      <StatRow>
        <Stat label="Time" value={formatTime(state.elapsed)} />
        <Stat label="Checks" value={`${checksUsed}/${MAX_CHECKS}`} />
        <Stat label="Hints" value={state.hints} />
        <Stat label="Score" value={state.qa ? '—' : score} />
      </StatRow>

      <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-ink/60">The 12 words · check them in Merriam-Webster</h3>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        {level.solutionWords.map((w) => (
          <li key={w}>
            <a href={dictionaryUrl(w)} target="_blank" rel="noopener noreferrer" className="font-semibold tracking-wide underline decoration-rule underline-offset-4 hover:decoration-fire">
              {w}
            </a>
          </li>
        ))}
      </ul>
      {level.decoy && (
        <p className="mt-3 text-sm text-ink/70">
          Decoy: <b>{level.decoy}</b>
        </p>
      )}

      <ResultActions shareText={() => shareText(level, state)} onNext={onNext} onHome={onHome} />
    </Modal>
  );
}
