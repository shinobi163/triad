// Shared by the checkers: how long each game's list of days lasts.
// Wits #1 is START (keep in step with app/src/daily.js).
export const START = '2026-11-26';
const WARN_DAYS = 7;

export function reportRunway(game, count) {
  const [y, m, d] = START.split('-').map(Number);
  const last = new Date(y, m - 1, d + count - 1);
  const today = new Date();
  const left = Math.round((last - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
  const when = last.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  console.log(`  ${game}: ${count} days, last new puzzle ${when}${left < WARN_DAYS ? `  ⚠ only ${Math.max(0, left)} days left: add more` : ''}`);
}
