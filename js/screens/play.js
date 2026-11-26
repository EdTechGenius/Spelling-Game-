import { h, mount, toast, confetti, shuffle, sample, normalise, spellInputAttrs } from '../ui.js';
import { speak, dictate } from '../speech.js';
import { DETAILS } from '../data/details.js';
import { findZone, patternSpan, misspellings, missingChallenge } from '../worlds.js';
import { profile, zone as zoneProgress, updateZone, addGems, setNotebook, notebookEntry, logAttempt } from '../store.js';
import { CHALLENGE_SIZE, PRACTISE_SIZE } from '../config.js';
import { topBar, dueForCheck, GAMES } from './map.js';
import { go, onLeave } from '../main.js';

const DEV = new URLSearchParams(location.search).has('dev');
const details = (w) => DETAILS[w] || DETAILS[w.toLowerCase()] || null;

function highlighted(word, zone) {
  const span = patternSpan(word, zone.pattern);
  if (!span) return h('span', { class: 'big-word' }, word);
  return h('span', { class: 'big-word' }, word.slice(0, span[0]), h('mark', {}, word.slice(span[0], span[1])), word.slice(span[1]));
}

function blankedSentence(item) {
  const d = details(item.w);
  if (!d || !d[1]) return null;
  const re = new RegExp(`\\b${item.w.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')}\\b`, 'i');
  if (!re.test(d[1])) return null;
  return d[1].replace(re, '_____');
}

function shell(key, title, ...content) {
  const { zone: z, world: w } = findZone(key);
  const theme = w ? w.theme : { accent: '#2f8fdd', sky: '#dff1ff' };
  mount(topBar(h('div', { class: 'crumb' }, h('button', { class: 'btn btn-small btn-ghost', onclick: () => go(`/zone/${key}`) }, '◀ Zone'))),
    h('main', { class: 'page play-page', style: { '--accent': theme.accent, '--sky': theme.sky } },
      h('div', { class: 'play-head' }, h('h2', {}, title), h('span', { class: 'muted' }, `${z.name} · ${z.title}`)),
      ...content));
}

function bumpGems(n) {
  if (n <= 0) return;
  addGems(n).then(() => {
    const el = document.getElementById('gem-count');
    if (el) el.textContent = String(profile().gems);
  });
  const el = document.getElementById('gem-count');
  if (el) { el.textContent = String(Number(el.textContent) + n); el.parentElement.classList.remove('pop'); void el.offsetWidth; el.parentElement.classList.add('pop'); }
}

function audioButtons(item) {
  return h('div', { class: 'audio-row' },
    h('button', { class: 'btn btn-round', title: 'Hear it', onclick: () => dictate(item, DETAILS) }, '🔊'),
    h('button', { class: 'btn btn-round', title: 'Hear it slowly', onclick: () => dictate(item, DETAILS, { slow: true }) }, '🐢'));
}

// ───────────────────────── LEARN ─────────────────────────

export function learnScreen(key) {
  const { zone: z } = findZone(key);
  let i = 0;
  const seen = new Set();
  const card = h('div', { class: 'learn-card' });
  const dots = h('div', { class: 'dots' });

  function render() {
    const it = z.words[i];
    seen.add(i);
    const d = details(it.w);
    let input;
    const feedback = h('div', { class: 'feedback' });
    const wordBox = h('div', { class: 'word-box' }, highlighted(it.w, z));
    const tryArea = h('div', { class: 'try-area hidden' },
      h('p', { class: 'muted' }, 'The word is covered. Write it from memory!'),
      h('form', { class: 'answer-row', onsubmit: (e) => {
        e.preventDefault();
        const ok = normalise(input.value) === normalise(it.w);
        wordBox.classList.remove('covered');
        feedback.replaceChildren(ok ? h('span', { class: 'good' }, '✔ Perfect!') : h('span', { class: 'bad' }, `✘ You wrote “${input.value}”. Look carefully and try again.`));
        if (ok) speak('Well done!');
      } },
      input = h('input', { class: 'answer', ...spellInputAttrs, placeholder: 'type or write here ✏️' }),
      h('button', { class: 'btn', type: 'submit' }, 'Check')),
    );
    card.replaceChildren(
      h('div', { class: 'learn-emoji' }, d?.[2] || '📖'),
      wordBox,
      it.hint && h('div', { class: 'hint' }, it.hint.startsWith('plural') ? it.hint : `short for “${it.hint}”`),
      d && h('div', { class: 'meaning' }, h('b', {}, 'Meaning: '), d[0]),
      d && h('div', { class: 'sentence' }, '💬 ', d[1]),
      h('div', { class: 'audio-row' },
        h('button', { class: 'btn btn-round', onclick: () => speak(it.w) }, '🔊'),
        h('button', { class: 'btn btn-round', onclick: () => speak(it.w, { slow: true }) }, '🐢'),
        d && h('button', { class: 'btn btn-small btn-ghost', onclick: () => speak(d[1]) }, '💬 Hear sentence')),
      h('div', { class: 'lscwc' }, ['👀 Look', '🗣️ Say', '🙈 Cover', '✏️ Write', '✅ Check'].map((s) => h('span', {}, s))),
      h('button', { class: 'btn btn-ghost', onclick: () => { wordBox.classList.add('covered'); tryArea.classList.remove('hidden'); feedback.replaceChildren(); input.value = ''; input.focus(); } }, '🙈 Cover it and have a go'),
      tryArea, feedback,
      h('div', { class: 'nav-row' },
        h('button', { class: 'btn btn-ghost', disabled: i === 0 ? true : null, onclick: () => { i--; render(); } }, '◀'),
        h('span', { class: 'muted' }, `${i + 1} / ${z.words.length}`),
        i < z.words.length - 1 ?
          h('button', { class: 'btn', onclick: () => { i++; render(); } }, 'Next ▶') :
          h('button', { class: 'btn', onclick: finish }, 'Finish ✔')));
    dots.replaceChildren(...z.words.map((_, j) => h('span', { class: `dot ${j === i ? 'on' : seen.has(j) ? 'seen' : ''}`, onclick: () => { i = j; render(); } })));
    speak(it.w);
  }
  async function finish() {
    const first = !zoneProgress(key).learn;
    await updateZone(key, { learn: true });
    if (first) { bumpGems(5); toast('Learning complete! +5 💎', 'good'); }
    confetti(30);
    go(`/zone/${key}`);
  }
  shell(key, '📖 Learn', dots, card);
  render();
}

// ───────────────────────── PRACTISE ─────────────────────────

export function practiseScreen(key, gameId) {
  if (!gameId || gameId === 'random') gameId = GAMES[Math.floor(Math.random() * GAMES.length)].id;
  const game = GAMES.find((g) => g.id === gameId) || GAMES[0];
  const { zone: z } = findZone(key);
  if (game.id === 'speed') return speedRun(key, z, game);

  const items = sample(z.words, Math.min(PRACTISE_SIZE, z.words.length));
  let idx = 0, score = 0;
  const stage = h('div', { class: 'game-stage' });
  const bar = h('div', { class: 'progress' }, h('div', { class: 'bar' }));

  function next(correct, it, typed) {
    logAttempt(key, it.w, typed, correct, game.id);
    if (correct) { score++; bumpGems(1); }
    idx++;
    bar.firstChild.style.width = (idx / items.length) * 100 + '%';
    setTimeout(() => (idx < items.length ? round() : done()), correct ? 700 : 1600);
  }

  function round() {
    const it = items[idx];
    const status = h('div', { class: 'feedback' });
    const reveal = (ok) => status.replaceChildren(ok ? h('span', { class: 'good' }, '✔ Brilliant!') : h('span', { class: 'bad' }, '✘ It\'s spelt: ', h('b', {}, it.w)));

    if (game.id === 'builder' || game.id === 'craft') {
      const letters = [...it.w];
      let pool = game.id === 'builder' ? shuffle([...letters, ...sample('abcdefghijklmnoprstuvwy'.split('').filter((c) => !letters.includes(c)), 3)]) : shuffle(letters);
      if (game.id === 'craft' && pool.join('') === it.w && letters.length > 1) pool = [...pool.slice(1), pool[0]];
      const built = [];
      const slots = h('div', { class: 'slots' });
      const tiles = h('div', { class: 'tiles' });
      const d = details(it.w);
      function draw() {
        slots.replaceChildren(...letters.map((_, j) => h('span', { class: `slot ${built[j] ? 'filled' : ''}` }, built[j]?.c || '')));
        tiles.replaceChildren(...pool.map((c, j) => h('button', { class: `tile ${used.has(j) ? 'used' : ''}`, disabled: used.has(j) ? true : null, onclick: () => {
          used.add(j); built.push({ c, i: j }); draw();
          if (built.length === letters.length) {
            const typed = built.map((b) => b.c).join('');
            const ok = typed === it.w;
            slots.classList.add(ok ? 'right' : 'wrong'); reveal(ok); next(ok, it, typed);
          }
        } }, c)));
      }
      const used = new Set();
      const undo = h('button', { class: 'btn btn-small btn-ghost', onclick: () => { const b = built.pop(); if (b) { used.delete(b.i); draw(); } } }, '⌫ Undo');
      draw();
      stage.replaceChildren(
        h('p', { class: 'instruction' }, game.id === 'builder' ? 'Listen, then build the word with the blocks.' : 'Unscramble the letters to craft the word.'),
        game.id === 'craft' && d ? h('div', { class: 'clue' }, `${d[2] || ''} ${d[0]}`) : null,
        audioButtons(it), slots, tiles, undo, status);
      if (game.id === 'builder') dictate(it, DETAILS);
    }

    if (game.id === 'missing') {
      const m = missingChallenge(it.w, z);
      if (!m) { idx++; return idx < items.length ? round() : done(); }
      const gap = h('span', { class: 'gap' }, '?');
      stage.replaceChildren(
        h('p', { class: 'instruction' }, 'Which letters are missing?'),
        audioButtons(it),
        h('div', { class: 'big-word gapped' }, m.before, gap, m.after),
        h('div', { class: 'choices' }, shuffle(m.choices).map((c) => h('button', { class: 'choice', onclick: (e) => {
          const ok = c === m.answer;
          gap.textContent = c; gap.classList.add(ok ? 'right' : 'wrong');
          e.currentTarget.classList.add(ok ? 'right' : 'wrong');
          stage.querySelectorAll('.choice').forEach((b) => (b.disabled = true));
          reveal(ok); next(ok, it, m.before + c + m.after);
        } }, c || '(nothing)'))),
        status);
      dictate(it, DETAILS);
    }

    if (game.id === 'glitch') {
      const wrong = misspellings(it.w, z, 2);
      const opts = shuffle([it.w, ...wrong]);
      stage.replaceChildren(
        h('p', { class: 'instruction' }, 'Two of these have a glitch. Tap the correct spelling!'),
        audioButtons(it),
        h('div', { class: 'choices column' }, opts.map((c) => h('button', { class: 'choice wide', onclick: (e) => {
          const ok = c === it.w;
          e.currentTarget.classList.add(ok ? 'right' : 'wrong');
          stage.querySelectorAll('.choice').forEach((b) => { b.disabled = true; if (b.textContent === it.w) b.classList.add('right'); });
          reveal(ok); next(ok, it, c);
        } }, c))),
        status);
      dictate(it, DETAILS);
    }
  }

  async function done() {
    const p = zoneProgress(key);
    await updateZone(key, { practise: p.practise + 1 });
    if (score === items.length) confetti();
    stage.replaceChildren(h('div', { class: 'result' },
      h('div', { class: 'result-big' }, `${score} / ${items.length}`),
      h('p', {}, `You earned ${score} 💎`),
      h('div', { class: 'nav-row' },
        h('button', { class: 'btn btn-ghost', onclick: () => go(`/zone/${key}`) }, 'Back to zone'),
        h('button', { class: 'btn', onclick: () => practiseScreen(key, 'random') }, '🎲 Another game'),
        h('button', { class: 'btn', onclick: () => practiseScreen(key, game.id) }, '↻ Play again'))));
  }

  shell(key, `${game.icon} ${game.name}`, bar, stage);
  round();
}

function speedRun(key, z, game) {
  let time = 60, score = 0, timer = 0, current = null, input;
  const clock = h('div', { class: 'clock' }, '60');
  const scoreEl = h('div', { class: 'speed-score' }, '0 ✔');
  const stage = h('div', { class: 'game-stage' });
  let queue = shuffle(z.words);

  function nextWord() {
    if (!queue.length) queue = shuffle(z.words);
    current = queue.pop();
    input.value = '';
    input.focus();
    dictate(current, DETAILS);
  }
  function start() {
    stage.replaceChildren(
      h('div', { class: 'speed-top' }, clock, scoreEl),
      audioButtons({ w: '' }),
      h('form', { class: 'answer-row', onsubmit: (e) => {
        e.preventDefault();
        if (!input.value.trim()) return;
        const ok = normalise(input.value) === normalise(current.w);
        logAttempt(key, current.w, input.value, ok, 'speed');
        if (ok) { score++; scoreEl.textContent = `${score} ✔`; stage.classList.remove('flash-bad'); }
        else { toast(`It's spelt: ${current.w}`, 'bad'); stage.classList.add('flash-bad'); }
        nextWord();
      } },
      input = h('input', { class: 'answer', ...spellInputAttrs, placeholder: 'type or write ✏️' }),
      h('button', { class: 'btn', type: 'submit' }, '⏎')));
    stage.querySelector('.audio-row').replaceChildren(
      h('button', { class: 'btn btn-round', onclick: () => dictate(current, DETAILS) }, '🔊'),
      h('button', { class: 'btn btn-round', onclick: () => dictate(current, DETAILS, { slow: true }) }, '🐢'));
    nextWord();
    timer = setInterval(() => {
      time--; clock.textContent = time;
      if (time <= 10) clock.classList.add('hurry');
      if (time <= 0) finish();
    }, 1000);
  }
  async function finish() {
    clearInterval(timer);
    const p = zoneProgress(key);
    await updateZone(key, { practise: p.practise + 1 });
    bumpGems(Math.min(score, 30));
    if (score >= 8) confetti();
    stage.replaceChildren(h('div', { class: 'result' },
      h('div', { class: 'result-big' }, `${score} words!`),
      h('p', {}, `You earned ${Math.min(score, 30)} 💎`),
      h('div', { class: 'nav-row' },
        h('button', { class: 'btn btn-ghost', onclick: () => go(`/zone/${key}`) }, 'Back to zone'),
        h('button', { class: 'btn', onclick: () => practiseScreen(key, 'speed') }, '↻ Beat your score'))));
  }
  onLeave(() => clearInterval(timer));
  shell(key, `${game.icon} ${game.name}`, stage);
  stage.replaceChildren(h('div', { class: 'result' },
    h('p', { class: 'instruction' }, 'Listen to each word and spell it as fast as you can. You have 60 seconds!'),
    h('button', { class: 'btn btn-big', onclick: start }, 'Start ⏱️')));
}

// ───────────────────── DICTATION (Challenge & Check) ─────────────────────

function dictation({ items, title, activity, onFinish, intro }) {
  let idx = 0;
  const results = [];
  const stage = h('div', { class: 'game-stage dictation' });
  const bar = h('div', { class: 'progress' }, h('div', { class: 'bar' }));

  function round() {
    const { key, item } = items[idx];
    let input;
    const blank = blankedSentence(item);
    if (DEV) window.__sqWord = item.w; // test hook (only with ?dev)
    const fb = h('div', { class: 'feedback' });
    const form = h('form', { class: 'answer-row', onsubmit: (e) => {
      e.preventDefault();
      if (!input.value.trim()) { input.focus(); return; }
      input.disabled = true; form.querySelector('button').disabled = true;
      const ok = normalise(input.value) === normalise(item.w);
      results.push({ key, item, typed: input.value, ok });
      logAttempt(key, item.w, input.value, ok, activity);
      fb.replaceChildren(ok ? h('span', { class: 'good' }, '✔ Correct!') :
        h('span', { class: 'bad' }, '✘ ', h('s', {}, input.value), ' → ', h('b', {}, item.w)));
      idx++;
      bar.firstChild.style.width = (idx / items.length) * 100 + '%';
      setTimeout(() => (idx < items.length ? round() : onFinish(results)), ok ? 900 : 2200);
    } },
    input = h('input', { class: 'answer', ...spellInputAttrs, placeholder: 'type or write the word ✏️' }),
    h('button', { class: 'btn', type: 'submit' }, 'Check'));
    stage.replaceChildren(
      h('div', { class: 'dict-count' }, `Word ${idx + 1} of ${items.length}`),
      h('div', { class: 'listen-big' }, h('button', { class: 'speaker', onclick: () => dictate(item, DETAILS) }, '🔊'),
        h('button', { class: 'btn btn-round', title: 'Slowly', onclick: () => dictate(item, DETAILS, { slow: true }) }, '🐢')),
      item.hint && h('div', { class: 'hint' }, item.hint.startsWith('plural') ? `Write the ${item.hint}` : `Short for “${item.hint}”`),
      blank && h('div', { class: 'sentence' }, '💬 ', blank),
      form, fb);
    input.focus();
    dictate(item, DETAILS);
  }

  stage.replaceChildren(h('div', { class: 'result' },
    intro,
    h('p', { class: 'muted' }, '🎧 Put your headphones on. Tap 🔊 to hear a word again.'),
    h('button', { class: 'btn btn-big', onclick: round }, 'Start ▶')));
  return { stage, bar, title };
}

export function challengeScreen(key) {
  const found = findZone(key);
  const { zone: z, world: w, kind } = found;
  const items = sample(z.words, Math.min(CHALLENGE_SIZE, z.words.length)).map((item) => ({ key, item }));
  const d = dictation({
    items, activity: 'challenge',
    intro: h('div', {}, h('div', { class: 'gate' }, h('div', { class: 'gate-door l' }), h('div', { class: 'gate-door r' }), h('span', { class: 'gate-lock' }, '🔒')),
      h('p', { class: 'instruction' }, `Spell ${items.length} words to open the gate. Get 5 or more right to earn a star!`)),
    onFinish: async (results) => {
      const right = results.filter((r) => r.ok).length;
      const pct = right / results.length;
      const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.5 ? 1 : 0;
      const before = zoneProgress(key).stars;
      await updateZone(key, { stars });
      for (const r of results) await setNotebook(key, r.item.w, r.ok ? 'pending' : 'tricky');
      const gems = right + stars * 5;
      bumpGems(gems);
      if (stars) confetti(stars * 25);
      const nextZone = kind === 'zone' && w.zones[z.num];
      const unlocked = stars > 0 && before === 0 && nextZone;
      d.stage.replaceChildren(h('div', { class: 'result' },
        h('div', { class: `gate ${stars ? 'open' : ''}` }, h('div', { class: 'gate-door l' }), h('div', { class: 'gate-door r' }), h('span', { class: 'gate-lock' }, stars ? '💎' : '🔒')),
        h('div', { class: 'result-stars' }, [0, 1, 2].map((i) => h('span', { class: i < stars ? 'on' : '' }, '★'))),
        h('div', { class: 'result-big' }, `${right} / ${results.length}`),
        h('p', {}, stars ? `The gate is open! You earned ${gems} 💎` : `So close! You earned ${gems} 💎. Practise a bit more and try again.`),
        unlocked && h('p', { class: 'unlock' }, `🔓 New zone unlocked: ${nextZone.name}`),
        h('div', { class: 'review' }, results.map((r) => h('span', { class: `chip ${r.ok ? 'pending' : 'tricky'}` }, r.ok ? '⏳ ' : '🔧 ', r.item.w))),
        h('p', { class: 'muted small' }, '⏳ Correct words come back for a Check in a couple of days — get them right again and they go in your notebook!'),
        h('div', { class: 'nav-row' },
          h('button', { class: 'btn btn-ghost', onclick: () => go(`/zone/${key}`) }, 'Back to zone'),
          unlocked ? h('button', { class: 'btn', onclick: () => go(`/zone/${nextZone.key}`) }, 'Next zone ▶') :
            h('button', { class: 'btn', onclick: () => challengeScreen(key) }, '↻ Try again'))));
    },
  });
  shell(key, '🚪 Challenge Gate', d.bar, d.stage);
}

export function checkScreen(key) {
  const all = key === 'all';
  const due = dueForCheck(all ? undefined : key);
  if (!due.length) { toast('Nothing to check right now ⏳'); return go(all ? '/notebook' : `/zone/${key}`); }
  const items = shuffle(due).slice(0, 15).map((e) => {
    const f = findZone(e.zone);
    const item = f?.zone.words.find((x) => x.w === e.word) || { w: e.word };
    return { key: e.zone, item };
  });
  const d = dictation({
    items, activity: 'check',
    intro: h('div', {}, h('div', { class: 'big-emoji' }, '🔍'),
      h('p', { class: 'instruction' }, `Can you still spell them? ${items.length} words to check. Get them right and they go into your notebook!`)),
    onFinish: async (results) => {
      let mastered = 0;
      for (const r of results) {
        const prev = notebookEntry(r.key, r.item.w);
        if (r.ok) {
          const status = prev?.status === 'tricky' ? 'pending' : 'mastered';
          if (status === 'mastered') mastered++;
          await setNotebook(r.key, r.item.w, status);
        } else await setNotebook(r.key, r.item.w, 'tricky');
      }
      for (const zk of new Set(results.map((r) => r.key))) await updateZone(zk, { check: true });
      bumpGems(mastered * 2);
      if (mastered) confetti(40);
      d.stage.replaceChildren(h('div', { class: 'result' },
        h('div', { class: 'big-emoji' }, '📓'),
        h('div', { class: 'result-big' }, `${mastered} new notebook words!`),
        h('p', {}, `+${mastered * 2} 💎`),
        h('div', { class: 'review' }, results.map((r) => h('span', { class: `chip ${r.ok ? 'mastered' : 'tricky'}` }, r.ok ? '✅ ' : '🔧 ', r.item.w))),
        h('div', { class: 'nav-row' },
          h('button', { class: 'btn', onclick: () => go('/notebook') }, '📓 Open my notebook'),
          !all && h('button', { class: 'btn btn-ghost', onclick: () => go(`/zone/${key}`) }, 'Back to zone'))));
    },
  });
  const f = all ? null : findZone(key);
  if (all) {
    mount(topBar(h('div', { class: 'crumb' }, h('button', { class: 'btn btn-small btn-ghost', onclick: () => go('/notebook') }, '◀ Notebook'))),
      h('main', { class: 'page play-page' }, h('div', { class: 'play-head' }, h('h2', {}, '🔍 Check')), d.bar, d.stage));
  } else {
    void f;
    shell(key, '🔍 Check', d.bar, d.stage);
  }
}
