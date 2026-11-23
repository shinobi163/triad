import { useCallback, useEffect, useRef, useState } from 'react';
import SeamBoard from './SeamBoard.jsx';
import { SeamResultsModal, SeamRulesModal } from './SeamModals.jsx';
import { useSeam } from './useSeam.js';
import AdModal from '../components/AdModal.jsx';
import { LevelTabs, QaBar, SHOW_QA, TopBar, useFirstVisit } from '../components/GameChrome.jsx';

// The one line above the board. It teaches the rules as they come up, so the
// player never has to read the whole rulebook first.
function instruction(level, state, position, stuck) {
  if (state.status === 'won') return 'Every goal filled. Nicely stitched.';
  if (stuck) return 'No way forward from here. Undo or reset.';
  const seam = position.seam;
  const did = new Set(state.events.map((e) => e.type));
  if (seam) {
    if (did.has('fuse') && did.has('fill')) return 'A goal filled and two orbs fused. Snip the gold thread to drop the new orb.';
    if (did.has('fuse')) return 'Fused! Tap the gold thread to snip. The new orb drops onto a brass Anchor if it came from one, otherwise top/left.';
    if (did.has('fill')) return 'Goal filled! Snip the thread to keep going.';
    return 'Nothing matched across the seam. Tap the gold thread to snip it open.';
  }
  if (did.has('settle')) return 'Now line that 2 up with a goal and fold again.';
  if (state.moves === 0) return level.master ? 'Two goals this time. Every fold counts.' : 'Tap a dashed row or column to fold it shut.';
  return 'Fold so two 1s, or a 2 and a goal, face each other.';
}

export default function Seam({ level, levels, onSelectLevel, onHome }) {
  const firstVisit = useFirstVisit('triad-seen-rules-seam');
  const [modal, setModal] = useState(firstVisit ? 'rules' : null);
  const [qaOpen, setQaOpen] = useState(false);
  const [state, dispatch, position] = useSeam(level, { paused: modal === 'rules' || modal === 'ad' });

  const finished = state.status !== 'playing';
  const stuck = !finished && level.solver.remaining(position) === Infinity;

  const prevStatus = useRef(state.status);
  useEffect(() => {
    if (prevStatus.current === 'playing' && finished) setTimeout(() => setModal('results'), 500);
    prevStatus.current = state.status;
  }, [state.status, finished]);

  const onHintDone = useCallback(() => {
    dispatch({ type: 'hint' });
    setModal(null);
  }, [dispatch]);
  const closeModal = useCallback(() => setModal(null), []);
  const nextLevel = levels[levels.indexOf(level) + 1];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-linen">
      <TopBar title="Seam" elapsed={state.elapsed} onRules={() => setModal('rules')} onHome={onHome} qaOpen={qaOpen} onToggleQa={() => setQaOpen((o) => !o)} />

      {SHOW_QA && qaOpen && (
        <QaBar disabled={finished} onAutoSolve={() => dispatch({ type: 'autoSolve' })}>
          par {level.par}: {level.solution.join(' → ')}
        </QaBar>
      )}

      <LevelTabs levels={levels} level={level} onSelect={onSelectLevel} />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-6">
        <p className={`mx-auto mb-5 mt-5 min-h-[3rem] max-w-sm text-center text-[0.95rem] ${stuck ? 'font-semibold text-ruby' : 'text-ink/80'}`} aria-live="polite">
          {instruction(level, state, position, stuck)}
        </p>

        <SeamBoard
          level={level}
          position={position}
          events={state.events}
          moveCount={state.moves}
          disabled={finished}
          onMove={(move) => dispatch({ type: 'move', move })}
        />

        <p className="mt-6 text-center font-mono text-sm tabular-nums text-ink/70">
          Moves <b className="text-ink">{state.moves}</b> · Par {level.par}
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
                disabled={state.stack.length < 2}
                onClick={() => dispatch({ type: 'reset' })}
                className="rounded-full border-2 border-ink px-4 py-3 text-sm font-bold hover:bg-black/5 disabled:border-black/15 disabled:text-ink/30"
              >
                Reset
              </button>
              <button type="button" onClick={() => setModal('ad')} className="rounded-full border-2 border-ink px-4 py-3 text-sm font-bold hover:bg-black/5">
                📺 Hint
              </button>
              <button
                type="button"
                disabled={state.stack.length < 2}
                onClick={() => dispatch({ type: 'undo' })}
                className={`flex-1 rounded-full py-3 text-sm font-bold text-white transition disabled:bg-black/10 disabled:text-ink/40 ${stuck ? 'bg-ruby' : 'bg-ink'}`}
              >
                ↩ Undo
              </button>
            </>
          )}
        </div>
      </main>

      {modal === 'rules' && <SeamRulesModal onClose={closeModal} />}
      {modal === 'ad' && <AdModal onDone={onHintDone} onCancel={closeModal} />}
      {modal === 'results' && (
        <SeamResultsModal
          onHome={onHome}
          level={level}
          state={state}
          onClose={closeModal}
          onNext={nextLevel && (() => { setModal(null); onSelectLevel(nextLevel); })}
        />
      )}
    </div>
  );
}
