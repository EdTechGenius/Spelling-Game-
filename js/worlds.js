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
    theme: { sky: '#3a2f4f', ground: '#5b4a5e', ground2: '#4a3b4d', path: '#d8743a', accent: '#ff7b2e' },
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

// For "Missing Letters": blank out the pattern (or a tricky chunk) and give choices
export function missingChallenge(word, zone) {
  const span = patternSpan(word, zone.pattern);
  if (span && zone.confuse?.length >= 2) {
    const answer = word.slice(span[0], span[1]);
    const choices = new Set([answer]);
    for (const c of zone.confuse) { if (choices.size >= 3) break; if (c !== answer && c !== '') choices.add(c); }
    if (choices.size >= 2) return { before: word.slice(0, span[0]), after: word.slice(span[1]), answer, choices: [...choices] };
  }
  // fallback: hide 2 letters from the middle, choices are letter pairs
  const letters = word.replace(/[^a-z]/gi, '');
  if (letters.length < 4) return null;
  const start = 1 + Math.floor(Math.random() * Math.max(1, word.length - 3));
  const answer = word.slice(start, start + 2);
  if (/[^a-z]/i.test(answer)) return null;
  const choices = new Set([answer]);
  const swaps = [answer[1] + answer[0], answer[0] + answer[0], answer[0] + 'e', 'i' + answer[1], answer[0] + 'a'];
  for (const s of swaps) { if (choices.size >= 3) break; if (s !== answer) choices.add(s); }
  return { before: word.slice(0, start), after: word.slice(start + 2), answer, choices: [...choices] };
}
