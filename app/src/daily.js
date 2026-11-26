// Which day's puzzles to show. Wits #1 is START; each local midnight is the
// next number. Every game keeps a list of days and shows `pick(list, n)`.
export const START = '2026-11-26';

const MS_PER_DAY = 86_400_000;
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startDate = () => {
  const [y, m, d] = START.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Wits number for a date (1 on START). Rounding absorbs daylight-saving hours.
export const dayNumber = (date = new Date()) => Math.max(1, Math.round((midnight(date) - startDate()) / MS_PER_DAY) + 1);

export const dateOf = (n) => {
  const d = startDate();
  d.setDate(d.getDate() + n - 1);
  return d;
};

// Day n's entry. If the list runs out, it starts again from the top rather
// than breaking; `npm run check` warns well before that happens.
export const pick = (list, n) => list[(n - 1) % list.length];
