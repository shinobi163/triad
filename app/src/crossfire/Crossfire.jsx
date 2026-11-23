import { useCallback, useEffect, useRef, useState } from 'react';
import Board from './Board.jsx';
import { ResultsModal, RulesModal } from './Modals.jsx';
import AdModal from '../components/AdModal.jsx';
import { LevelTabs, QaBar, SHOW_QA, TopBar, useFirstVisit } from '../components/GameChrome.jsx';
import { useCrossfire } from './useCrossfire.js';
import { SLOTS } from './logic.js';

export default function Crossfire({ level, levels, onSelectLevel, onHome }) {
  const firstVisit = useFirstVisit('triad-seen-rules');
  const [modal, setModal] = useState(firstVisit ? 'rules' : null);
  const [qaOpen, setQaOpen] = useState(false);
  const [selected, setSelected] = useState(null);   // { word } or { slot }
  const [state, dispatch] = useCrossfire(level, { paused: modal === 'rules' || modal === 'ad' });

  const finished = state.status !== 'playing';
  const placedWords = new Set(Object.values(state.placed).filter(Boolean));
  const allFilled = SLOTS.every((s) => state.placed[s]);
  // Re-testing an unchanged board would just burn a check.
  const unchanged = SLOTS.every((s) => state.results[s]?.word === state.placed[s]);

  // Open the results the moment the game ends (not when reloading a finished game).
  const prevStatus = useRef(state.status);
  useEffect(() => {
    if (prevStatus.current === 'playing' && finished) {
      setSelected(null);
      setTimeout(() => setModal('results'), 450);   // let the tiles animate first
    }
    prevStatus.current = state.status;
  }, [state.status, finished]);

  const tapWord = (word) => {
    if (finished) return;
    if (selected?.slot) {
      dispatch({ type: 'place', slot: selected.slot, word });
      setSelected(null);
    } else {
      setSelected(selected?.word === word ? null : { word });
    }
  };

  const tapSlot = (slot) => {
    if (selected?.word) {
      dispatch({ type: 'place', slot, word: selected.word });
      setSelected(null);
    } else if (state.placed[slot]) {
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
    <div className="flex min-h-[100dvh] flex-col">
      <TopBar
        title="Crossfire"
        elapsed={state.elapsed}
        onRules={() => setModal('rules')}
        onHome={onHome}
        qaOpen={qaOpen}
        onToggleQa={() => setQaOpen((o) => !o)}
      />

      {SHOW_QA && qaOpen && (
        <QaBar disabled={finished} onAutoSolve={() => dispatch({ type: 'autoSolve' })}>
          {SLOTS.map((s) => `${s}=${level.solution[s]}`).join('  ')}
          {level.decoy && `  decoy=${level.decoy}`}
        </QaBar>
      )}

      <LevelTabs levels={levels} level={level} onSelect={onSelectLevel} />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-6">
        <p className="mb-5 mt-5 text-center text-[0.95rem] text-ink/80">
          Place each word so it joins all three neighbors, reading → and ↓{level.master ? ' — one word is a decoy.' : '.'}
        </p>

        <Board level={level} state={state} selectedSlot={selected?.slot} onTapSlot={tapSlot} />

        {/* Word bank */}
        <div className="mx-auto mt-6 flex max-w-[22rem] flex-wrap justify-center gap-2" aria-label="Word bank">
          {level.bank.map((w) => {
            const used = placedWords.has(w);
            const isSel = selected?.word === w;
            return (
              <button
                key={w}
                type="button"
                disabled={used || finished}
                onClick={() => tapWord(w)}
                aria-pressed={isSel}
                className={`min-w-[4.5rem] rounded-md border-2 px-3 py-2 text-sm font-bold tracking-wide transition ${
                  used
                    ? 'border-dashed border-rule text-transparent'
                    : isSel
                      ? 'border-fire bg-fire text-white'
                      : 'border-ink bg-white hover:bg-black/5'
                }`}
              >
                {w}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-xs uppercase tracking-wider text-ink/60" aria-live="polite">
          {finished
            ? state.status === 'won' ? 'Solved' : 'Out of checks'
            : `${'⚡'.repeat(state.checksLeft)}${'·'.repeat(4 - state.checksLeft)}  ${state.checksLeft} check${state.checksLeft === 1 ? '' : 's'} left`}
        </p>

        {/* Action bar */}
        <div className="mx-auto mt-auto flex w-full max-w-[22rem] gap-2 pt-6">
          {finished ? (
            <button type="button" onClick={() => setModal('results')} className="flex-1 rounded-full bg-ink py-3 font-bold text-white">
              📖 Results & words
            </button>
          ) : (
            <>
              <button type="button" onClick={() => { dispatch({ type: 'clear' }); setSelected(null); }} className="rounded-full border-2 border-ink px-4 py-3 text-sm font-bold hover:bg-black/5">
                Clear
              </button>
              <button type="button" onClick={() => setModal('ad')} className="rounded-full border-2 border-ink px-4 py-3 text-sm font-bold hover:bg-black/5">
                📺 Hint
              </button>
              <button
                type="button"
                disabled={!allFilled || unchanged}
                onClick={() => { dispatch({ type: 'test' }); setSelected(null); }}
                className="flex-1 rounded-full bg-fire py-3 text-sm font-bold text-white transition disabled:bg-rule disabled:text-ink/40"
              >
                TEST CIRCUIT ⚡
              </button>
            </>
          )}
        </div>
      </main>

      {modal === 'rules' && <RulesModal onClose={closeModal} />}
      {modal === 'ad' && <AdModal onDone={onHintDone} onCancel={closeModal} />}
      {modal === 'results' && (
        <ResultsModal
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
