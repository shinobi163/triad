import { useEffect, useRef } from 'react';

export default function Modal({ title, onClose, children, dismissable = true }) {
  const panel = useRef(null);

  useEffect(() => panel.current?.focus(), []);

  useEffect(() => {
    if (!dismissable) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismissable, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      onClick={dismissable ? onClose : undefined}
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-paper p-6 shadow-xl outline-none sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-serif text-2xl font-bold">{title}</h2>
          {dismissable && (
            <button type="button" onClick={onClose} className="-mr-2 -mt-1 rounded p-2 text-xl leading-none hover:bg-black/5" aria-label="Close">
              ×
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
