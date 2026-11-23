import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';

// Placeholder for a rewarded video ad: counts down, then grants the hint.
export default function AdModal({ onDone, onCancel }) {
  const SECONDS = 3;
  const [left, setLeft] = useState(SECONDS);

  useEffect(() => {
    if (left === 0) {
      onDone();
      return undefined;
    }
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left, onDone]);

  return (
    <Modal title="Sponsored" onClose={onCancel}>
      <div className="flex aspect-video items-center justify-center rounded-lg bg-ink/90 text-center text-sm text-white/80">
        Rewarded video placeholder
      </div>
      <p className="mt-4 text-sm text-ink/70">Rewarded Video · Unlocking hint in {left}s…</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-black/10">
        <div className="h-full bg-fire transition-all duration-1000 ease-linear" style={{ width: `${((SECONDS - left) / SECONDS) * 100}%` }} />
      </div>
    </Modal>
  );
}
