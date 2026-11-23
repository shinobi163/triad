// A single text box for typing a word or title. Enter (or the button)
// submits; the parent says whether to shake via the `shake` counter.
import { useEffect, useRef, useState } from 'react';

export default function WordInput({ onSubmit, maxLength, placeholder, buttonLabel = 'Enter', shake = 0, disabled, autoFocus = true }) {
  const [value, setValue] = useState('');
  const [shaking, setShaking] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    if (!shake) return undefined;
    setShaking(true);
    const id = setTimeout(() => setShaking(false), 260);
    return () => clearTimeout(id);
  }, [shake]);

  const submit = (e) => {
    e.preventDefault();
    const word = value.trim().toUpperCase();
    if (!word || disabled) return;
    // The parent decides; clear only when it accepts (returns true).
    if (onSubmit(word) !== false) setValue('');
    input.current?.focus();
  };

  return (
    <form onSubmit={submit} className={`flex gap-2 ${shaking ? 'animate-shake' : ''}`}>
      <input
        ref={input}
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-label={placeholder}
        className="min-w-0 flex-1 rounded-xl border-2 border-ink/20 bg-white px-4 py-3 font-mono text-lg uppercase tracking-[0.2em] outline-none placeholder:tracking-normal placeholder:text-ink/35 focus:border-ink disabled:opacity-50"
      />
      <button type="submit" disabled={disabled} className="rounded-xl bg-ink px-5 font-bold text-white hover:bg-ink/85 disabled:opacity-40">
        {buttonLabel}
      </button>
    </form>
  );
}
