// Streaks. A day counts as played when you finish (or give up on) any of that
// day's games on the day itself; catching up on an earlier day with ‹ doesn't
// count. The streak is the run of played days ending today, or ending
// yesterday if today isn't played yet (it is still alive until midnight).
import { session } from './session.js';
import { dayNumber } from './daily.js';

const KEY = 'played-days';
const playedDays = () => new Set(session.get(KEY) ?? []);

export function markPlayed(day) {
  if (day !== dayNumber()) return;
  const days = playedDays();
  if (days.has(day)) return;
  days.add(day);
  session.set(KEY, [...days].sort((a, b) => a - b));
}

// { current, best, today }: today says whether today is already played.
export function streak() {
  const days = playedDays();
  const now = dayNumber();
  const today = days.has(now);
  let current = 0;
  for (let d = today ? now : now - 1; days.has(d); d--) current++;
  let best = 0;
  let run = 0;
  for (const d of [...days].sort((a, b) => a - b)) {
    run = days.has(d - 1) ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current, best, today };
}
