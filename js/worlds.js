import { LISTS } from './data/lists.js';

export const WORLDS = {
  4: {
    year: 4, name: 'Stone Age Lands', short: 'Stone Age', icon: '🪨',
    blurb: 'Forests, plains and caves. Earn furs, tools and turn your camp into a village!',
    theme: { sky: '#bfe6ff', ground: '#8fcf6b', ground2: '#78b85a', path: '#d9c08a', accent: '#c46b2c' },
    zones: LISTS.y4, expedition: LISTS.s34,
    deco: ['🌲', '🌳', '🪨', '🦣', '🌲', '🔥', '🦌', '🌳', '🛖', '🪨'],
  },
  5: {
    year: 5, name: 'Outback Expedition', short: 'Outback', icon: '🦘',
    blurb: 'Red sand, gorges and billabongs. Become a ranger and build a wildlife sanctuary!',
    theme: { sky: '#ffe2b8', ground: '#e0894a', ground2: '#c9733a', path: '#f3d29b', accent: '#a84a1f' },
    zones: LISTS.y5, expedition: LISTS.s56,
    deco: ['🌵', '🦘', '🪨', '🐨', '🌿', '☀️', '🦎', '🌵', '🐍', '🪨'],
  },
  6: {
    year: 6, name: 'Volcano Depths', short: 'Volcano', icon: '🌋',
    blurb: 'Volcanoes, sky islands and caves. Mine gems and build your secret underground lair!',
    theme: { panel: '#ffe9db', sky: '#3a2f4f', ground: '#5b4a5e', ground2: '#4a3b4d', path: '#d8743a', accent: '#ff7b2e' },
    zones: LISTS.y6, expedition: LISTS.s56,
    deco: ['🌋', '💎', '🪨', '🔥', '⛰️', '🦇', '💎', '🪨', '🌋', '🔥'],
  },
};

export const BASE_CAMP = LISTS.hfw;

// Find any zone (world zone, expedition or base camp) by key
export function findZone(key) {
  for (const w of Object.values(WORLDS)) {
    const z = w.zones.find((x) => x.key === key) || w.expedition.find((x) => x.key === key);
    if (z) return { zone: z, world: w, kind: z.key.startsWith('s') ? 'expedition' : 'zone' };
  }
  const z = BASE_CAMP.find((x) => x.key === key);
  if (z) return { zone: z, world: null, kind: 'basecamp' };
  return null;
}

// ───────── pattern helpers ─────────

// Returns [start, end] of the zone's spelling pattern inside the word, or null
export function patternSpan(word, patterns) {
  const w = word.toLowerCase();
  for (const p of patterns || []) {
    try {
      const re = new RegExp(p.replace(/^\^/, '^').replace(/\$$/, '$'));
      const m = re.exec(w);
      if (m && m[0].length) return [m.index, m.index + m[0].length];
    } catch { /* ignore bad pattern */ }
  }
  return null;
}

const VOWELS = 'aeiou';

// Plausible wrong spellings for "Spot the Glitch"
export function misspellings(word, zone, n = 2) {
  const w = word;
  const out = new Set();
  const add = (s) => { if (s && s !== w && s.length > 1 && !/\s{2}/.test(s)) out.add(s); };
  const span = patternSpan(w, zone.pattern);
  if (span && zone.confuse?.length) {
    const part = w.slice(span[0], span[1]);
    for (const alt of zone.confuse) if (alt !== part) add(w.slice(0, span[0]) + alt + w.slice(span[1]));
  }
  // double ↔ single letters
  for (let i = 0; i < w.length - 1; i++) if (w[i] === w[i + 1] && /[a-z]/.test(w[i])) add(w.slice(0, i) + w.slice(i + 1));
  for (let i = 1; i < w.length - 1; i++) if (!VOWELS.includes(w[i]) && /[a-z]/.test(w[i]) && w[i] !== w[i - 1] && w[i] !== w[i + 1]) { add(w.slice(0, i) + w[i] + w.slice(i)); break; }
  // vowel swaps
  for (let i = 1; i < w.length; i++) {
    if (VOWELS.includes(w[i])) {
      for (const v of 'aeiou') if (v !== w[i]) { add(w.slice(0, i) + v + w.slice(i + 1)); break; }
    }
  }
  // swap two neighbouring letters
  for (let i = 1; i < w.length - 2; i += 2) add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
  const arr = [...out];
  // prefer the pattern-based mistakes first, then a random mix
  const patternBased = arr.slice(0, Math.max(0, (zone.confuse?.length || 0) - 1));
  const rest = arr.slice(patternBased.length).sort(() => Math.random() - 0.5);
  return [...patternBased.sort(() => Math.random() - 0.5), ...rest].slice(0, n);
}

// ───────── Missing Pieces ─────────
// Hides a different "tricky bit" each round: the zone's pattern, a word ending,
// a vowel sound or a double letter — each with believable wrong choices.

const VOWEL_ALTS = {
  a: ['e', 'u', 'o'], e: ['a', 'i', 'u'], i: ['e', 'y', 'a'], o: ['a', 'u', 'e'], u: ['o', 'a', 'oo'], y: ['i', 'ie', 'ey'],
  ea: ['ee', 'e', 'ae'], ee: ['ea', 'e', 'ie'], ie: ['ei', 'ee', 'y'], ei: ['ie', 'ee', 'ai'], ou: ['ow', 'o', 'u'],
  ai: ['ay', 'a', 'ei'], oa: ['o', 'ow', 'oe'], au: ['or', 'aw', 'o'], oo: ['u', 'ou', 'o'], io: ['eo', 'o', 'iou'],
  ia: ['ea', 'a', 'ya'], ue: ['ew', 'u', 'oo'], ay: ['ai', 'a', 'ey'], ey: ['y', 'ee', 'ay'], oi: ['oy', 'oe', 'i'],
};
const ENDINGS = [
  ['ssion', ['tion', 'sion']], ['tion', ['sion', 'shun']], ['sion', ['tion', 'shun']], ['cian', ['tion', 'shun']],
  ['ious', ['eous', 'ous']], ['eous', ['ious', 'us']], ['ous', ['us', 'ious']], ['able', ['ible', 'abel']], ['ible', ['able', 'ibel']],
  ['ary', ['ery', 'ory']], ['ery', ['ary', 'ory']], ['ory', ['ary', 'ery']], ['ment', ['mant', 'mint']], ['ence', ['ance', 'ense']],
  ['ance', ['ence', 'anse']], ['ent', ['ant', 'int']], ['ant', ['ent', 'int']], ['ally', ['ly', 'aly']], ['ily', ['ly', 'ely']],
  ['ly', ['ley', 'lly']], ['ful', ['full', 'fel']], ['less', ['les', 'lis']], ['ness', ['nes', 'niss']], ['ture', ['cher', 'chure']],
  ['ure', ['er', 'or']], ['our', ['or', 'ur']], ['ist', ['est', 'ast']], ['ise', ['ize', 'ice']], ['ate', ['ait', 'et']],
  ['ive', ['iv', 'eve']], ['ic', ['ick', 'ik']], ['al', ['el', 'le']], ['le', ['el', 'al']], ['el', ['le', 'al']], ['et', ['it', 'ett']],
  ['ing', ['in', 'eing']], ['ed', ['d', 't']], ['er', ['a', 'or']], ['or', ['er', 'our']], ['dge', ['ge', 'j']], ['ge', ['dge', 'j']],
];
const DOUBLE_ALTS = { ss: ['s', 'c'], ll: ['l', 'le'], cc: ['c', 'ck'], ff: ['f', 'ph'], mm: ['m', 'mb'], pp: ['p', 'b'], rr: ['r', 'wr'],
  tt: ['t', 'd'], nn: ['n', 'kn'], dd: ['d', 't'], gg: ['g', 'dg'], bb: ['b', 'p'], zz: ['z', 's'] };

function candidates(word, zone) {
  const w = word.toLowerCase();
  const out = [];
  const add = (kind, start, end, alts) => {
    const answer = word.slice(start, end);
    const choices = [...new Set([answer, ...alts.filter((a) => a !== answer)])].slice(0, 3);
    if (choices.length >= 2 && start >= 0 && end > start) out.push({ kind, start, end, answer, choices });
  };
  const span = patternSpan(word, zone.pattern);
  if (span && zone.confuse?.length >= 2) add('pattern', span[0], span[1], zone.confuse);
  const overlapsPattern = (st, en) => span && st < span[1] && en > span[0];
  const addOther = (kind, st, en, alts) => { if (!overlapsPattern(st, en)) add(kind, st, en, alts); };
  for (const [end, alts] of ENDINGS) {
    if (w.endsWith(end) && w.length > end.length + 1) { addOther('ending', w.length - end.length, w.length, alts); break; }
  }
  const dbl = /([b-df-hj-np-tv-z])\1/g;
  let m;
  while ((m = dbl.exec(w))) if (DOUBLE_ALTS[m[0]]) addOther('double', m.index, m.index + 2, DOUBLE_ALTS[m[0]]);
  const vow = /[aeiouy]+/g;
  while ((m = vow.exec(w))) {
    if (m.index === 0 && m[0].length === w.length) continue;
    const v = m[0].length <= 3 ? m[0] : null;
    const alts = v && (VOWEL_ALTS[v] || (v.length === 1 ? null : VOWEL_ALTS[v[0]]?.map((x) => x + v.slice(1))));
    if (alts && m.index > 0) addOther('vowel', m.index, m.index + m[0].length, alts);
  }
  return out;
}

export function missingChallenge(word, zone, round = 0) {
  if (!/^[a-z' -]+$/i.test(word) || word.length < 3) return null;
  const all = candidates(word, zone);
  if (!all.length) return null;
  // rotate through kinds so the answer isn't the same pattern every time
  // the zone's pattern on every third round; other rounds hide a different tricky bit
  const others = ['vowel', 'ending', 'double'];
  const r = Math.floor(round / 3) + round;
  const rotated = round % 3 === 0 ? ['pattern', ...others] : [...others.slice(r % 3), ...others.slice(0, r % 3), 'pattern'];
  for (const kind of rotated) {
    const opts = all.filter((c) => c.kind === kind);
    if (opts.length) {
      const c = opts[Math.floor(Math.random() * opts.length)];
      return { before: word.slice(0, c.start), after: word.slice(c.end), answer: c.answer, choices: c.choices, kind };
    }
  }
  return null;
}
