// Everything a player does lives here for this visit only. Leaving a game
// and coming back picks up where they were; closing or reloading the page
// starts every game fresh. Nothing is written to the browser's storage.
const store = new Map();

export const session = {
  get: (key) => store.get(key),
  set: (key, value) => store.set(key, value),
};
