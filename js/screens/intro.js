// Spelling-rule introduction shown before a zone's other steps unlock.
// Year 4: painted on a cave wall · Year 5: an old parchment scroll · Year 6: a villain's tablet screen.
import { h, mount, toast, confetti, shuffle } from '../ui.js';
import { speak } from '../speech.js';
import { RULES, genericRule, plain } from '../data/rules.js';
import { findZone, patternSpan, misspellings } from '../worlds.js';
import { zone as zoneProgress, updateZone, addGems, profile } from '../store.js';
import { topBar } from './map.js';
import { go, onLeave } from '../main.js';

// **bold** markup → highlighted text
function rich(text) {
  return String(text).split('**').map((part, i) => (i % 2 ? h('mark', {}, part) : part));
}

function themeFor(found) {
  if (found.kind === 'basecamp') return 'notebook';
  return { 4: 'cave', 5: 'scroll', 6: 'tablet' }[found.world.year] || 'notebook';
}

const DECOR = {
  cave: () => h('div', { class: 'board-decor' }, ['🦣', '🦌', '🖐️'].map((e) => h('span', {}, e))),
  scroll: () => null,
  tablet: (n, total) => h('div', { class: 'tablet-bar' }, h('span', {}, '● ● ●'), h('span', {}, `LAIR-OS ▸ RULE FILE`), h('span', {}, `${n}/${total}`)),
  notebook: () => null,
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export function introScreen(key) {
  const found = findZone(key);
  if (!found) return go('/');
  const { zone: z, world: w, kind } = found;
  const theme = themeFor(found);
  const r = RULES[key] || genericRule(kind);
  const back = kind === 'zone' ? `/world/${w.year}` : kind === 'expedition' ? `/list/expedition/${w.year}` : '/list/basecamp/0';

  // the check question: from the rule, or built from this set's own words
  let q = r.q;
  if (!q) {
    const it = z.words[Math.floor(Math.random() * z.words.length)];
    q = ['Which spelling is correct?', [it.w, ...misspellings(it.w, z, 2)], it.w];
  }
  const slides = [
    { icon: '📜', title: kind === 'zone' ? 'Meet the rule' : r.title, body: r.rule },
    { icon: '🔎', title: 'How to spot it', body: r.spot },
    { icon: '⚠️', title: 'Watch out!', body: r.watch },
    { icon: '📝', title: 'Your words', words: true },
    { icon: '✅', title: 'Quick check', check: true },
  ];
  let i = 0;
  let alive = true;
  onLeave(() => { alive = false; if (window.speechSynthesis) window.speechSynthesis.cancel(); });

  const board = h('div', { class: `rule-board ${theme}` });
  const dots = h('div', { class: 'rule-dots' });

  function render() {
    const s = slides[i];
    dots.replaceChildren(...slides.map((_, j) => h('span', { class: `rd ${j < i ? 'done' : j === i ? 'on' : ''}` })));
    const nextBtn = h('button', { class: 'btn rule-next', disabled: true, onclick: () => { i++; render(); } }, 'Next ▶');
    const listen = (text) => h('button', { class: 'btn btn-small btn-ghost rule-listen', onclick: () => speak(plain(text)) }, '🔊 Read it again');
    let content;

    if (s.words) {
      content = [
        h('p', { class: 'rule-text' }, 'Here are your words. Look for the pattern in each one — tap a word to hear it.'),
        h('div', { class: 'rule-words' }, z.words.map((it, n) => {
          const span = patternSpan(it.w, z.pattern);
          const word = span ? [it.w.slice(0, span[0]), h('mark', {}, it.w.slice(span[0], span[1])), it.w.slice(span[1])] : it.w;
          return h('button', { class: 'rule-word', style: { animationDelay: `${n * 0.15}s` }, onclick: () => speak(it.w) }, word);
        })),
      ];
      speak(`Here are your ${z.words.length} words.`);
      setTimeout(() => { if (alive) nextBtn.disabled = false; }, Math.max(2500, z.words.length * 150 + 800));
    } else if (s.check) {
      const fb = h('div', { class: 'feedback' });
      const slot = h('div', { class: 'rule-finish' });
      const opts = shuffle(q[1]);
      content = [
        h('p', { class: 'rule-text big' }, q[0]),
        h('div', { class: 'choices' }, opts.map((o) => h('button', { class: 'choice rule-choice', onclick: async (e) => {
          const btn = e.currentTarget;
          if (o === q[2]) {
            btn.classList.add('right');
            board.querySelectorAll('.rule-choice').forEach((b) => (b.disabled = true));
            fb.replaceChildren(h('span', { class: 'good' }, '✔ Brilliant — you\'ve got the rule!'));
            speak('Brilliant!');
            const first = !zoneProgress(key).intro;
            await updateZone(key, { intro: true });
            if (first) {
              await addGems(3);
              const el = document.getElementById('gem-count'); if (el) el.textContent = profile().gems;
            }
            confetti(40);
            slot.replaceChildren(
              first ? h('p', { class: 'small' }, '+3 💎 for learning the rule') : null,
              h('button', { class: 'btn btn-big', onclick: () => go(`/learn/${key}`) }, 'Let\'s start learning! ▶'));
          } else {
            btn.classList.add('wrong'); btn.disabled = true;
            board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake');
            fb.replaceChildren(h('span', { class: 'bad' }, 'Not quite — think about the rule and try again.'),
              h('button', { class: 'btn btn-small btn-ghost', onclick: () => { i = 0; render(); } }, '📜 See the rule again'));
            speak('Not quite. Try again.');
          }
        } }, o))),
        fb,
        slot,
      ];
      speak(q[0]);
    } else {
      content = [h('p', { class: 'rule-text' }, rich(s.body)), listen(s.body)];
      // Next unlocks once the rule has been read aloud (and at least 3 seconds have passed)
      Promise.all([speak(`${s.title}. ${plain(s.body)}`), delay(3000)]).then(() => { if (alive && slides[i] === s) nextBtn.disabled = false; });
    }

    board.replaceChildren(
      DECOR[theme](i + 1, slides.length),
      h('div', { class: 'rule-head' }, h('span', { class: 'rule-icon' }, s.icon), h('h2', {}, s.title)),
      ...content,
      h('div', { class: 'rule-nav' },
        i > 0 ? h('button', { class: 'btn btn-ghost btn-small', onclick: () => { i--; render(); } }, '◀ Back') : h('span'),
        s.check ? h('span') : nextBtn),
    );
  }

  mount(topBar(h('div', { class: 'crumb' }, h('button', { class: 'btn btn-small btn-ghost', onclick: () => go(back) }, '◀ Map'))),
    h('main', { class: `page intro-page intro-${theme}` },
      h('div', { class: 'play-head' }, h('h2', {}, '📜 Spelling Rule'), h('span', { class: 'muted' }, `${z.name} · ${z.title}`)),
      dots, board));
  render();
}
