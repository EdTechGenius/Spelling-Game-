import { h, mount, toast, confetti, shuffle, sample, normalise, spellInputAttrs } from '../ui.js';
import { speak, dictate } from '../speech.js';
import { info } from '../data/details.js';
import { findZone, patternSpan, misspellings, missingChallenge } from '../worlds.js';
import { profile, zone as zoneProgress, updateZone, addGems, setNotebook, notebookEntry, logAttempt } from '../store.js';
import { CHALLENGE_SIZE, PRACTISE_SIZE } from '../config.js';
import { topBar, dueForCheck, GAMES } from './map.js';
import { go, onLeave } from '../main.js';

const DEV = new URLSearchParams(location.search).has('dev');

function highlighted(word, zone) {
  const span = patternSpan(word, zone.pattern);
  if (!span) return h('span', { class: 'big-word' }, word);
  return h('span', { class: 'big-word' }, word.slice(0, span[0]), h('mark', {}, word.slice(span[0], span[1])), word.slice(span[1]));
}

export function blankedSentence(item) {
  const d = info(item.w);
  if (!d || !d.sentence) return null;
  const re = new RegExp(`(^|[^A-Za-z'])(${item.w.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')})(?=$|[^A-Za-z'])`, 'i');
  if (!re.test(d.sentence)) return null;
  return d.sentence.replace(re, '$1_____');
}

function shell(key, title, ...content) {
  const { zone: z, world: w } = findZone(key);
  const theme = w ? w.theme : { accent: '#2f8fdd', sky: '#dff1ff' };
  mount(topBar(h('div', { class: 'crumb' }, h('button', { class: 'btn btn-small btn-ghost', onclick: () => go(`/zone/${key}`) }, '◀ Zone'))),
    h('main', { class: 'page play-page', style: { '--accent': theme.accent, '--sky': theme.panel || theme.sky } },
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
    h('button', { class: 'btn btn-round', title: 'Hear it', onclick: () => dictate(item) }, '🔊'),
    h('button', { class: 'btn btn-round', title: 'Hear it slowly', onclick: () => dictate(item, { slow: true }) }, '🐢'));
}

// ───────────────────────── LEARN ─────────────────────────
// Each word: look, listen, then cover it and spell it correctly before moving on.

export function learnScreen(key) {
  const { zone: z } = findZone(key);
  let i = 0;
  const passed = new Set();
  const card = h('div', { class: 'learn-card' });
  const dots = h('div', { class: 'dots' });

  function render() {
    const it = z.words[i];
    const d = info(it.w);
    const done = passed.has(i);
    let input, tries = 0;
    const feedback = h('div', { class: 'feedback' });
    const wordBox = h('div', { class: 'word-box' }, highlighted(it.w, z));
    const nextBtn = i < z.words.length - 1 ?
      h('button', { class: 'btn', disabled: done ? null : true, onclick: () => { i++; render(); } }, 'Next ▶') :
      h('button', { class: 'btn', disabled: done ? null : true, onclick: finish }, 'Finish ✔');
    const lockMsg = h('div', { class: `lock-msg ${done ? 'hidden' : ''}` }, '🔒 Spell the word correctly to unlock Next');
    const peekBtn = h('button', { class: 'btn btn-small btn-ghost hidden', type: 'button', onclick: () => {
      wordBox.classList.remove('covered');
      setTimeout(() => { wordBox.classList.add('covered'); input.focus(); }, 2500);
    } }, '👀 Peek for 2 seconds');
    const coverBtn = h('button', { class: 'btn btn-big-ghost', onclick: () => {
      wordBox.classList.add('covered'); tryArea.classList.remove('hidden'); coverBtn.classList.add('hidden');
      feedback.replaceChildren(); input.value = ''; input.focus();
    } }, '🙈 Cover it and write it');
    const tryArea = h('div', { class: 'try-area hidden' },
      h('p', { class: 'muted' }, 'The word is covered. Write it from memory — type it or use your Apple Pencil ✏️'),
      h('form', { class: 'answer-row', onsubmit: (e) => {
        e.preventDefault();
        if (!input.value.trim()) { input.focus(); return; }
        const ok = normalise(input.value) === normalise(it.w);
        logAttempt(key, it.w, input.value, ok, 'learn');
        if (ok) {
          passed.add(i);
          wordBox.classList.remove('covered');
          feedback.replaceChildren(h('span', { class: 'good' }, '✔ Perfect! Next is unlocked.'));
          nextBtn.disabled = false; lockMsg.classList.add('hidden'); peekBtn.classList.add('hidden');
          input.disabled = true;
          speak('Well done!');
          drawDots();
        } else {
          tries++;
          feedback.replaceChildren(h('span', { class: 'bad' }, `✘ Not quite — you wrote “${input.value}”. Try again!`));
          input.select();
          if (tries >= 2) peekBtn.classList.remove('hidden');
        }
      } },
      input = h('input', { class: 'answer', ...spellInputAttrs, placeholder: 'write the word here' }),
      h('button', { class: 'btn', type: 'submit' }, 'Check')),
      peekBtn,
    );
    card.replaceChildren(
      h('div', { class: 'learn-emoji' }, d?.emoji || '📖'),
      wordBox,
      d?.cls && h('div', { class: 'word-class' }, d.cls),
      it.hint && h('div', { class: 'hint' }, it.hint.startsWith('plural') ? it.hint : `short for “${it.hint}”`),
      d && h('div', { class: 'meaning' }, h('b', {}, 'Meaning: '), d.meaning),
      d && h('div', { class: 'sentence' }, '💬 ', d.sentence),
      h('div', { class: 'audio-row' },
        h('button', { class: 'btn btn-round', title: 'Hear the word', onclick: () => speak(it.w) }, '🔊'),
        h('button', { class: 'btn btn-round', title: 'Hear it slowly', onclick: () => speak(it.w, { slow: true }) }, '🐢'),
        d && h('button', { class: 'btn btn-small btn-ghost', onclick: () => speak(d.sentence) }, '💬 Hear sentence')),
      h('div', { class: 'lscwc' }, ['👀 Look', '🗣️ Say', '🙈 Cover', '✏️ Write', '✅ Check'].map((s) => h('span', {}, s))),
      done ? h('div', { class: 'good feedback' }, '✔ You spelt this one correctly') : coverBtn,
      tryArea, feedback,
      h('div', { class: 'nav-row' },
        h('button', { class: 'btn btn-ghost', disabled: i === 0 ? true : null, onclick: () => { i--; render(); } }, '◀'),
        h('span', { class: 'muted' }, `${i + 1} / ${z.words.length}`),
        nextBtn),
      lockMsg);
    drawDots();
    speak(it.w);
  }
  function drawDots() {
    // You can jump back to any word you've passed, or to the next new one
    const reach = Math.max(-1, ...passed) + 1;
    dots.replaceChildren(...z.words.map((_, j) => h('span', {
      class: `dot ${j === i ? 'on' : passed.has(j) ? 'seen' : ''} ${j > reach && !passed.has(j) ? 'locked' : ''}`,
      onclick: () => { if (passed.has(j) || j <= reach) { i = j; render(); } },
    })));
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
  if (game.id === 'pyramid') return pyramidBuilder(key, z, game);

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

    if (game.id === 'builder') {
      const letters = [...it.w];
      const pool = shuffle([...letters, ...sample('abcdefghijklmnoprstuvwy'.split('').filter((c) => !letters.includes(c)), 3)]);
      const built = [];
      const used = new Set();
      const slots = h('div', { class: 'slots' });
      const tiles = h('div', { class: 'tiles' });
      function draw() {
        slots.replaceChildren(...letters.map((_, j) => h('span', { class: `slot ${built[j] ? 'filled' : ''}` }, built[j]?.c || '')));
        tiles.replaceChildren(...pool.map((c, j) => h('button', { class: `tile ${used.has(j) ? 'used' : ''}`, disabled: used.has(j) ? true : null, onclick: () => {
          used.add(j); built.push({ c, i: j }); draw();
          if (built.length === letters.length) {
            const typed = built.map((x) => x.c).join('');
            const ok = typed === it.w;
            slots.classList.add(ok ? 'right' : 'wrong'); reveal(ok); next(ok, it, typed);
          }
        } }, c)));
      }
      const undo = h('button', { class: 'btn btn-small btn-ghost', onclick: () => { const x = built.pop(); if (x) { used.delete(x.i); draw(); } } }, '⌫ Undo');
      draw();
      stage.replaceChildren(
        h('p', { class: 'instruction' }, 'Listen, then build the word. Watch out — there are 3 extra blocks that don\'t belong!'),
        audioButtons(it), slots, tiles, undo, status);
      dictate(it);
    }

    if (game.id === 'detective') {
      const d = info(it.w);
      const blank = blankedSentence(it);
      let input;
      stage.replaceChildren(
        h('p', { class: 'instruction' }, '🔎 Read the clue and the sentence. Which word is missing?'),
        d && h('div', { class: 'clue' }, h('b', {}, `${d.emoji || ''} ${d.cls ? d.cls + ': ' : ''}`), d.meaning),
        blank ? h('div', { class: 'sentence big-sentence' }, blank) : h('p', { class: 'muted' }, 'Tap 🔊 to hear the word in a sentence.'),
        h('div', { class: 'audio-row' },
          h('button', { class: 'btn btn-small btn-ghost', onclick: () => dictate(it) }, '🔊 Need help? Hear it')),
        h('form', { class: 'answer-row', onsubmit: (e) => {
          e.preventDefault();
          if (!input.value.trim()) return;
          const ok = normalise(input.value) === normalise(it.w);
          input.disabled = true;
          reveal(ok); next(ok, it, input.value);
        } },
        input = h('input', { class: 'answer', ...spellInputAttrs, placeholder: 'missing word' }),
        h('button', { class: 'btn', type: 'submit' }, 'Check')),
        status);
      input.focus();
    }

    if (game.id === 'missing') {
      const m = missingChallenge(it.w, z, idx);
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
      dictate(it);
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
      dictate(it);
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

// Pyramid Builder: write the word one extra letter at a time (p, py, pyr …), then reverse it into a diamond
function pyramidBuilder(key, z, game) {
  const items = sample(z.words.filter((x) => x.w.length >= 3), 3);
  let idx = 0, gems = 0;
  const stage = h('div', { class: 'game-stage' });
  const bar = h('div', { class: 'progress' }, h('div', { class: 'bar' }));

  function wordRound() {
    const it = items[idx];
    const w = it.w;
    const rows = [];               // completed rows (strings)
    let phase = 'study';           // study → up → choice → down → done
    let wrong = 0, input;
    const pyramid = h('div', { class: 'pyramid' });
    const prompt = h('p', { class: 'instruction' });
    const fb = h('div', { class: 'feedback' });
    const target = () => (phase === 'up' ? w.slice(0, rows.length + 1) : w.slice(0, w.length - (rows.length - w.length) - 1));
    const form = h('form', { class: 'answer-row hidden', onsubmit: (e) => {
      e.preventDefault();
      const t = target();
      const val = input.value.trim();
      if (!val) return;
      if (normalise(val) === normalise(t)) {
        rows.push(t); wrong = 0; input.value = ''; fb.replaceChildren();
        logAttempt(key, w, val, true, 'pyramid');
        if (phase === 'up' && rows.length === w.length) {
          gems += 2; bumpGems(2);
          phase = 'choice'; confetti(20);
          speak(`${w}. Pyramid complete!`);
        } else if (phase === 'down' && rows.length === w.length * 2 - 1) {
          gems += 2; bumpGems(2);
          phase = 'done'; confetti(40); speak('Diamond complete!');
        }
        draw();
      } else {
        wrong++;
        fb.replaceChildren(h('span', { class: 'bad' }, wrong >= 2 ? `Hint: this row is “${t}”` : '✘ Not quite — check each letter.'));
        input.select();
      }
    } },
    input = h('input', { class: 'answer', ...spellInputAttrs, placeholder: 'next row' }),
    h('button', { class: 'btn', type: 'submit' }, '⏎'));
    const actions = h('div', { class: 'nav-row' });

    function draw() {
      pyramid.replaceChildren(...rows.map((r, n) => h('div', { class: `pyr-row ${n >= w.length ? 'down' : ''}` }, [...r].map((c) => h('span', { class: 'pyr-block' }, c)))));
      form.classList.toggle('hidden', !(phase === 'up' || phase === 'down'));
      actions.replaceChildren();
      if (phase === 'study') {
        prompt.replaceChildren('Look carefully at the word, then build it as a pyramid — one extra letter on each row.');
        pyramid.replaceChildren(h('div', { class: 'study-word' }, highlighted(w, z)));
        actions.append(h('button', { class: 'btn btn-big', onclick: () => { phase = 'up'; draw(); input.focus(); } }, 'Start building 🧱'));
      } else if (phase === 'up') {
        prompt.replaceChildren(`Row ${rows.length + 1} of ${w.length}: type the first ${rows.length + 1} letter${rows.length ? 's' : ''}.`);
        input.focus();
      } else if (phase === 'choice') {
        prompt.replaceChildren('🔺 Pyramid complete! Now turn it into a diamond by taking one letter away on each row.');
        actions.append(
          h('button', { class: 'btn', onclick: () => { phase = 'down'; draw(); input.focus(); } }, '💎 Make a diamond (+2 💎)'),
          h('button', { class: 'btn btn-ghost', onclick: nextWord }, 'Skip ▶'));
      } else if (phase === 'down') {
        prompt.replaceChildren(`Diamond: type the first ${target().length} letter${target().length > 1 ? 's' : ''}.`);
        input.focus();
      } else {
        prompt.replaceChildren('💎 Brilliant diamond!');
        actions.append(h('button', { class: 'btn', onclick: nextWord }, idx < items.length - 1 ? 'Next word ▶' : 'Finish ✔'));
      }
    }
    stage.replaceChildren(h('div', { class: 'muted' }, `Word ${idx + 1} of ${items.length}`), prompt, audioButtons(it), pyramid, form, fb, actions);
    draw();
    speak(w);
  }
  function nextWord() {
    idx++;
    bar.firstChild.style.width = (idx / items.length) * 100 + '%';
    if (idx < items.length) return wordRound();
    const p = zoneProgress(key);
    updateZone(key, { practise: p.practise + 1 });
    stage.replaceChildren(h('div', { class: 'result' },
      h('div', { class: 'big-emoji' }, '🔺💎'),
      h('div', { class: 'result-big' }, `${items.length} pyramids built!`),
      h('p', {}, `You earned ${gems} 💎`),
      h('div', { class: 'nav-row' },
        h('button', { class: 'btn btn-ghost', onclick: () => go(`/zone/${key}`) }, 'Back to zone'),
        h('button', { class: 'btn', onclick: () => practiseScreen(key, 'pyramid') }, '↻ Build more'))));
  }
  shell(key, `${game.icon} ${game.name}`, bar, stage);
  wordRound();
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
    dictate(current);
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
      h('button', { class: 'btn btn-round', onclick: () => dictate(current) }, '🔊'),
      h('button', { class: 'btn btn-round', onclick: () => dictate(current, { slow: true }) }, '🐢'));
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
      h('div', { class: 'listen-big' }, h('button', { class: 'speaker', onclick: () => dictate(item) }, '🔊'),
        h('button', { class: 'btn btn-round', title: 'Slowly', onclick: () => dictate(item, { slow: true }) }, '🐢')),
      item.hint && h('div', { class: 'hint' }, item.hint.startsWith('plural') ? `Write the ${item.hint}` : `Short for “${item.hint}”`),
      blank && h('div', { class: 'sentence' }, '💬 ', blank),
      form, fb);
    input.focus();
    dictate(item);
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
