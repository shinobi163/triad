// Finds Poise levels with exactly one answer, one per category pair below.
// For every 3-hook mobile (one hook on one side, a small beam on the other)
// and every choice of four word lengths per side, it works out which length
// triples balance, keeps the setups with exactly one, and spreads the days
// across as many different mobile shapes as it can.
//   node poise/generate.mjs        prints the levels as JSON
// Paste the picks into puzzles.json; check.mjs re-verifies them.
import { solve } from './engine.mjs';
import { loadLexicon } from '../words/lexicon.mjs';

export const CATEGORIES = {
  Animals: ['CAT', 'DOG', 'PIG', 'BEAR', 'LION', 'GOAT', 'HORSE', 'TIGER', 'ZEBRA', 'RABBIT', 'MONKEY', 'DONKEY', 'GIRAFFE', 'HAMSTER'],
  Sports: ['GOLF', 'POLO', 'JUDO', 'RUGBY', 'TENNIS', 'BOXING', 'HOCKEY', 'SOCCER', 'CRICKET', 'ARCHERY', 'CYCLING'],
  Birds: ['OWL', 'EMU', 'CROW', 'DOVE', 'HAWK', 'EAGLE', 'ROBIN', 'STORK', 'PARROT', 'PIGEON', 'PENGUIN', 'OSTRICH'],
  Fish: ['COD', 'EEL', 'CARP', 'PIKE', 'TUNA', 'TROUT', 'BASS', 'SALMON', 'HERRING', 'SARDINE'],
  'Body parts': ['ARM', 'LEG', 'EYE', 'EAR', 'HAND', 'KNEE', 'NECK', 'FOOT', 'ELBOW', 'THUMB', 'ANKLE', 'FINGER', 'WRIST', 'STOMACH'],
  Clothing: ['HAT', 'CAP', 'SOCK', 'COAT', 'SHIRT', 'SCARF', 'SKIRT', 'JACKET', 'GLOVES', 'SWEATER'],
  Weather: ['FOG', 'HAIL', 'RAIN', 'SNOW', 'WIND', 'STORM', 'SLEET', 'CLOUD', 'BREEZE', 'THUNDER'],
  Vegetables: ['PEA', 'YAM', 'LEEK', 'KALE', 'BEAN', 'ONION', 'CARROT', 'POTATO', 'TURNIP', 'CABBAGE', 'LETTUCE', 'SPINACH'],
  Instruments: ['DRUM', 'HARP', 'TUBA', 'FLUTE', 'BANJO', 'CELLO', 'GUITAR', 'VIOLIN', 'TRUMPET'],
  Furniture: ['BED', 'COT', 'SOFA', 'DESK', 'STOOL', 'CHAIR', 'TABLE', 'COUCH', 'CABINET', 'DRESSER'],
  Metals: ['TIN', 'GOLD', 'IRON', 'ZINC', 'LEAD', 'STEEL', 'BRASS', 'SILVER', 'COPPER', 'BRONZE', 'NICKEL'],
  Trees: ['OAK', 'ASH', 'ELM', 'FIR', 'YEW', 'PINE', 'BIRCH', 'MAPLE', 'CEDAR', 'WILLOW', 'SPRUCE', 'CYPRESS'],
  Jobs: ['CHEF', 'COOK', 'NURSE', 'PILOT', 'BAKER', 'JUDGE', 'DOCTOR', 'FARMER', 'DENTIST', 'TEACHER', 'PLUMBER'],
  Drinks: ['TEA', 'MILK', 'SODA', 'JUICE', 'WATER', 'COCOA', 'COFFEE', 'CIDER'],
  Planets: ['MARS', 'EARTH', 'VENUS', 'SATURN', 'URANUS', 'JUPITER', 'NEPTUNE', 'MERCURY'],
  Gems: ['RUBY', 'OPAL', 'JADE', 'PEARL', 'TOPAZ', 'GARNET', 'EMERALD', 'DIAMOND'],
  Vehicles: ['CAR', 'BUS', 'VAN', 'CAB', 'TAXI', 'TRAM', 'TRAIN', 'TRUCK', 'YACHT', 'TRACTOR', 'SCOOTER'],
  Flowers: ['IRIS', 'LILY', 'ROSE', 'TULIP', 'DAISY', 'POPPY', 'LOTUS', 'ORCHID', 'DAHLIA', 'PANSY', 'PETUNIA'],
  Kitchen: ['POT', 'PAN', 'WOK', 'CUP', 'FORK', 'BOWL', 'KNIFE', 'SPOON', 'LADLE', 'KETTLE', 'TOASTER', 'BLENDER'],
  Insects: ['ANT', 'BEE', 'FLY', 'GNAT', 'MOTH', 'WASP', 'FLEA', 'LOUSE', 'BEETLE', 'HORNET', 'LOCUST'],
  Colours: ['RED', 'TAN', 'BLUE', 'PINK', 'GREY', 'GREEN', 'BROWN', 'BLACK', 'WHITE', 'PURPLE', 'YELLOW', 'MAROON'],
  Countries: ['PERU', 'CUBA', 'CHAD', 'IRAN', 'INDIA', 'JAPAN', 'KENYA', 'NEPAL', 'SPAIN', 'CHINA', 'FRANCE', 'BRAZIL', 'CANADA', 'MEXICO', 'IRELAND', 'GERMANY'],
  Shapes: ['OVAL', 'CUBE', 'CONE', 'CIRCLE', 'SQUARE', 'SPHERE', 'PRISM', 'PYRAMID'],
};

// Days 2-15, in order. No word may fit both sides of a pair.
export const PAIRS = [
  ['Animals', 'Sports'], ['Birds', 'Fish'], ['Body parts', 'Clothing'], ['Weather', 'Vegetables'],
  ['Instruments', 'Furniture'], ['Metals', 'Trees'], ['Jobs', 'Drinks'], ['Planets', 'Gems'],
  ['Vehicles', 'Flowers'], ['Kitchen', 'Insects'], ['Shapes', 'Animals'], ['Colours', 'Vegetables'],
  ['Countries', 'Instruments'], ['Sports', 'Drinks'],
];

// Small seeded random, so a rerun gives the same levels.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const shuffle = (list, r) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Widest mobile, in arm units, that still reads well on a phone (day 1 is 7).
const MAX_SPAN = 12;
const MIN_LEN = 3;
const MAX_LEN = 7;

// Every 3-hook mobile: hook A alone on one side, a lower beam with hooks B
// and C on the other. Drawn to scale, so the lower beam's inner arm must stay
// on its own side of the top pivot and its inner hook clear of hook A.
function* mobiles() {
  for (const beamSide of ['right', 'left'])
    for (let a = 1; a <= 5; a++)
      for (let b = 1; b <= 5; b++)
        for (let c = 1; c <= 5; c++)
          for (let d = 1; d <= 5; d++) {
            if (c === d) continue; // equal sub-arms just ask for two equal words
            const inner = beamSide === 'right' ? c : d;
            const outer = beamSide === 'right' ? d : c;
            if (inner >= b || a + b - inner < 3 || a + b + outer > MAX_SPAN) continue;
            const hook = { arm: a, slot: 'A' };
            const sub = { arm: b, beam: { left: { arm: c, slot: 'B' }, right: { arm: d, slot: 'C' } } };
            yield { beamSide, a, b, c, d, beam: beamSide === 'right' ? { left: hook, right: sub } : { left: sub, right: hook } };
          }
}

// Every way to choose k items from list.
const choose = (list, k) =>
  k === 0 ? [[]] : list.flatMap((x, i) => choose(list.slice(i + 1), k - 1).map((rest) => [x, ...rest]));

// The balancing (A, B, C) letter counts when hook A's words come from
// `hookLens` and B, C's from `subLens` (each word used once).
function balancing({ a, b, c, d }, hookLens, subLens) {
  const out = [];
  for (const wA of hookLens)
    for (const wB of subLens)
      for (const wC of subLens)
        if (wB !== wC && c * wB === d * wC && a * wA === b * (wB + wC)) out.push([wA, wB, wC]);
  return out;
}

export function generate([left, right], seed, shapeUse) {
  const r = rng(seed);
  const { common } = loadLexicon();
  for (const cat of [left, right]) for (const w of CATEGORIES[cat]) if (!common.has(w)) console.error(`note: ${w} (${cat}) is not in the common list`);
  const byLen = (cat) => {
    const m = new Map();
    for (const w of CATEGORIES[cat]) if (w.length >= MIN_LEN && w.length <= MAX_LEN) m.set(w.length, [...(m.get(w.length) ?? []), w]);
    return m;
  };
  const words = { left: byLen(left), right: byLen(right) };

  // Every (mobile, lengths on each side) with exactly one balancing answer.
  const found = [];
  for (const m of mobiles()) {
    const hookSide = m.beamSide === 'right' ? 'left' : 'right';
    const subSide = m.beamSide;
    for (const hookLens of choose([...words[hookSide].keys()], 4))
      for (const subLens of choose([...words[subSide].keys()], 4)) {
        const ways = balancing(m, hookLens, subLens);
        if (ways.length === 1) found.push({ m, hookSide, subSide, hookLens, subLens, answer: ways[0] });
      }
  }
  if (!found.length) return null;

  // Prefer the shape used least so far, so days look different.
  const key = (f) => JSON.stringify(f.m.beam);
  const least = Math.min(...found.map((f) => shapeUse.get(key(f)) ?? 0));
  const pickFrom = found.filter((f) => (shapeUse.get(key(f)) ?? 0) === least);
  const f = pickFrom[Math.floor(r() * pickFrom.length)];
  shapeUse.set(key(f), least + 1);

  const wordOf = (side, len) => { const ws = words[side].get(len); return ws[Math.floor(r() * ws.length)]; };
  const sideWords = (side, lens) => lens.map((n) => wordOf(side, n)).sort((x, y) => x.length - y.length);
  const bank = Object.fromEntries([
    ...sideWords(f.hookSide, f.hookLens).map((w) => [w, f.hookSide]),
    ...sideWords(f.subSide, f.subLens).map((w) => [w, f.subSide]),
  ]);
  const level = { categories: { left, right }, bank, beam: f.m.beam };
  const { solutions } = solve(level);
  if (solutions.length !== 1) throw new Error(`${left}/${right}: expected one answer, got ${solutions.length}`);
  return { ...level, solution: solutions[0] };
}

// Day 1's shape counts as used, so day 2 onwards try others first.
const shapeUse = new Map([[JSON.stringify({ left: { arm: 3, slot: 'A' }, right: { arm: 2, beam: { left: { arm: 1, slot: 'B' }, right: { arm: 2, slot: 'C' } } } }), 1]]);
console.log(JSON.stringify(PAIRS.map((pair, i) => generate(pair, 1000 + i, shapeUse)), null, 1));
