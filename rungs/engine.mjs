// Rungs rules: change exactly one letter per step; every step must be a word.
// Shared by the app and check.mjs.

// Why `next` can't follow `prev`, or null if the step is legal.
//   'length'  different number of letters
//   'same'    nothing changed
//   'letters' more than one letter changed
//   'word'    not in the word list
export function stepError(prev, next, isWord) {
  if (next.length !== prev.length) return 'length';
  let changed = 0;
  for (let i = 0; i < next.length; i++) if (next[i] !== prev[i]) changed++;
  if (changed === 0) return 'same';
  if (changed > 1) return 'letters';
  if (!isWord(next)) return 'word';
  return null;
}

// Shortest ladder from start to end through `words` (a Set), ends included;
// null when there is none.
export function shortestPath(start, end, words) {
  const prev = new Map([[start, null]]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const w = queue[i];
    if (w === end) {
      const path = [];
      for (let at = w; at; at = prev.get(at)) path.unshift(at);
      return path;
    }
    for (let p = 0; p < w.length; p++) {
      for (let c = 65; c <= 90; c++) {
        const n = w.slice(0, p) + String.fromCharCode(c) + w.slice(p + 1);
        if (n !== w && words.has(n) && !prev.has(n)) {
          prev.set(n, w);
          queue.push(n);
        }
      }
    }
  }
  return null;
}
