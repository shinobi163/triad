import { useCallback, useEffect, useRef, useState } from 'react';
import Mobile from './Mobile.jsx';
import { EqResultsModal, EqRulesModal } from './EqModals.jsx';
import { useEquilibrium } from './useEquilibrium.js';
import { beams, isBalanced, paintFor, slotIds, tilt, weightsOf } from './levels.js';
import AdModal from '../components/AdModal.jsx';
import { LevelTabs, QaBar, SHOW_QA, TopBar, useFirstVisit } from '../components/GameChrome.jsx';

// One line above the mobile that explains whatever the player just caused.
function instruction(level, weights, state) {
  if (state.status === 'won') return 'Perfect balance.';
  const filled = level.slots.filter((s) => weights[s] != null).length;
  if (filled === 0) return level.master ? 'Balance both beams. One weight is a decoy.' : 'Hang a weight on every hook so each beam balances.';
  // Lowest beams first: fix those before the beam they hang from.
  const loaded = beams(level.beam)
    .reverse()
    .filter(({ beam }) => slotIds(beam).every((s) => weights[s] != null));
  const off = loaded.find(({ beam }) => !isBalanced(beam, weights));
  if (off) {
    const name = off.id === 'main' ? 'top beam' : 'lower beam';
    const side = tilt(off.beam, weights) > 0 ? 'right' : 'left';
    return `The ${name} tips ${side}: that side's weight × distance is bigger.`;
  }
  if (loaded.length) return 'That beam balances. A lower beam pulls with its total weight.';
  return 'Each side pulls with weight × distance. Count the ticks for distance.';
}

export default function Equilibrium({ level, levels, onSelectLevel, onHome }) {
  const firstVisit = useFirstVisit('triad-seen-rules-equilibrium');
  const [modal, setModal] = useState(firstVisit ? 'rules' : null);
  const [qaOpen, setQaOpen] = useState(false);
  const [selected, setSelected] = useState(null);   // { idx } or { slot }
  const [state, dispatch] = useEquilibrium(level, { paused: modal === 'rules' || modal === 'ad' });

  const weights = weightsOf(level, state.placed);
  const finished = state.status !== 'playing';
  const used = new Set(Object.values(state.placed).filter((v) => v != null));

  const prevStatus = useRef(state.status);
  useEffect(() => {
    if (prevStatus.current === 'playing' && finished) {
      setSelected(null);
      setTimeout(() => setModal('results'), 900);   // let the beams settle first
    }
    prevStatus.current = state.status;
  }, [state.status, finished]);

  const tapWeight = (idx) => {
    if (finished) return;
    if (selected?.slot) {
      dispatch({ type: 'place', slot: selected.slot, idx });
      setSelected(null);
    } else {
      setSelected(selected?.idx === idx ? null : { idx });
    }
  };

  const tapSlot = (slot) => {
    if (finished || state.locked[slot]) return;
    if (selected?.idx != null) {
      dispatch({ type: 'place', slot, idx: selected.idx });
      setSelected(null);
    } else if (state.placed[slot] != null) {
      dispatch({ type: 'remove', slot });
    } else {
      setSelected(selected?.slot === slot ? null : { slot });
    }
  };

  const onHintDone = useCallback(() => {
    dispatch({ type: 'hint' });
    setSelected(null);
    setModal(null);
  }, [dispatch]);
  const closeModal = useCallback(() => setModal(null), []);
  const nextLevel = levels[levels.indexOf(level) + 1];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#FAF9F6]" style={{ '--eq-bg': '#FAF9F6' }}>
      <TopBar title="Equilibrium" elapsed={state.elapsed} onRules={() => setModal('rules')} onHome={onHome} qaOpen={qaOpen} onToggleQa={() => setQaOpen((o) => !o)} />

      {SHOW_QA && qaOpen && (
        <QaBar disabled={finished} onAutoSolve={() => dispatch({ type: 'autoSolve' })}>
          {level.slots.map((s) => `${s}=${level.solution[s]}`).join('  ')}
        </QaBar>
      )}

      <LevelTabs levels={levels} level={level} onSelect={onSelectLevel} />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-6">
        <p className="mx-auto mb-2 mt-5 min-h-[3rem] max-w-sm text-center text-[0.95rem] text-ink/80" aria-live="polite">
          {instruction(level, weights, state)}
        </p>

        <Mobile level={level} weights={weights} ui={{ selectedSlot: selected?.slot, locked: state.locked, onTapSlot: tapSlot }} />

        {/* Weight bank */}
        <div className="mx-auto mt-4 flex flex-wrap justify-center gap-3" aria-label="Weights">
          {level.bank.map((w, idx) => {
            const paint = paintFor(level, w);
            const isUsed = used.has(idx);
            const isSel = selected?.idx === idx;
            const size = `${2.4 + w * 0.12}rem`;
            return (
              <button
                key={idx}
                type="button"
                disabled={isUsed || finished}
                onClick={() => tapWeight(idx)}
                aria-pressed={isSel}
                aria-label={`Weight ${w}`}
                style={isUsed ? { width: size, height: size } : { width: size, height: size, background: paint.fill, color: paint.text }}
                className={`grid place-items-center self-center rounded-full text-lg font-extrabold transition ${
                  isUsed ? 'border-2 border-dashed border-black/15 text-transparent' : 'shadow-sm hover:-translate-y-0.5'
                } ${isSel ? 'ring-4 ring-fire ring-offset-2' : ''}`}
              >
                {w}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center font-mono text-sm tabular-nums text-ink/70">
          Placed <b className="text-ink">{state.moves}</b> · Par {level.par}
        </p>

        <div className="mx-auto mt-auto flex w-full max-w-[22rem] gap-2 pt-6">
          {finished ? (
            <button type="button" onClick={() => setModal('results')} className="flex-1 rounded-full bg-ink py-3 font-bold text-white">
              Results
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { dispatch({ type: 'clear' }); setSelected(null); }}
                className="flex-1 rounded-full border-2 border-ink py-3 text-sm font-bold hover:bg-black/5"
              >
                Clear
              </button>
              <button type="button" onClick={() => setModal('ad')} className="flex-1 rounded-full bg-ink py-3 text-sm font-bold text-white hover:bg-ink/85">
                📺 Hint
              </button>
            </>
          )}
        </div>
      </main>

      {modal === 'rules' && <EqRulesModal onClose={closeModal} />}
      {modal === 'ad' && <AdModal onDone={onHintDone} onCancel={closeModal} />}
      {modal === 'results' && (
        <EqResultsModal
          onHome={onHome}
          level={level}
          state={state}
          weights={weights}
          onClose={closeModal}
          onNext={nextLevel && (() => { setModal(null); onSelectLevel(nextLevel); })}
        />
      )}
    </div>
  );
}
