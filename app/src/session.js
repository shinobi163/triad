// Everything a player does, saved in this browser (localStorage) so a reload
// or a visit tomorrow picks up where they left off. If storage is blocked
// (private mode, cleared site data) it quietly works for this visit only.
import { dayNumber } from './daily.js';

const STORAGE_KEY = 'wits:v1';
const KEEP_DAYS = 60;   // game states older than this are dropped on load

// Keys that belong to a day look like `rungs-12-…`; their day is the number.
const dayOfKey = (key) => {
  const m = /^[a-z]+-(\d+)-/.exec(key);
  return m ? Number(m[1]) : null;
};

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    const oldest = dayNumber() - KEEP_DAYS;
    return new Map(Object.entries(saved).filter(([key]) => (dayOfKey(key) ?? oldest) >= oldest));
  } catch {
    return new Map();
  }
}

const store = load();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(store)));
  } catch {
    // storage full or blocked: keep going in memory
  }
}

export const session = {
  get: (key) => store.get(key),
  set: (key, value) => {
    store.set(key, value);
    save();
  },
};
