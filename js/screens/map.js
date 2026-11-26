import { h, mount, toast, confetti, modal } from '../ui.js';
import { store, profile, classFor, refreshClasses, zone as zoneProgress, notebookAll, notebookEntry, buyItem, saveProfile, signOut } from '../store.js';
import { WORLDS, BASE_CAMP, findZone, patternSpan } from '../worlds.js';
import { info } from '../data/details.js';
import { RULES, shortRule } from '../data/rules.js';
import { speak } from '../speech.js';
import { avatarThumbnail, SHOP, DEFAULT_AVATAR } from '../avatar.js';
import { CHECK_DELAY_DAYS } from '../config.js';
import { go } from '../main.js';

// ───────── shared top bar ─────────

export function topBar(extra) {
  const p = profile();
  const due = dueForCheck().length;
  return h('header', { class: 'topbar' },
    h('button', { class: 'me', onclick: () => go('/avatar'), title: 'Change your look' },
      h('img', { src: avatarThumbnail(p.avatar || DEFAULT_AVATAR, 96), alt: '' }),
      h('span', { class: 'me-name' }, p.name || 'Explorer')),
    extra || h('span'),
    h('div', { class: 'top-actions' },
      h('span', { class: 'gems', title: 'Gems' }, '💎 ', h('b', { id: 'gem-count' }, p.gems)),
      h('button', { class: 'icon-btn', onclick: () => go('/'), title: 'Worlds' }, '🗺️'),
      h('button', { class: 'icon-btn badge-wrap', onclick: () => go('/notebook'), title: 'My spelling notebook' }, '📓',
        due ? h('span', { class: 'badge' }, due) : null),
      p.role === 'teacher' && h('button', { class: 'icon-btn', onclick: () => go('/teacher'), title: 'Teacher dashboard' }, '🧑‍🏫'),
      h('button', { class: 'icon-btn', title: 'Settings', onclick: settings }, '⚙️')));
}

function settings() {
  const close = modal(h('div', {},
    h('h3', {}, 'Settings'),
    store.guest && h('p', { class: 'muted' }, 'You are playing as a guest — progress is only saved on this device.'),
    store.state.classes.length ? h('p', {}, 'Class: ', h('b', {}, store.state.classes.map((c) => c.name).join(', '))) :
      (store.user && h('button', { class: 'btn btn-ghost', onclick: () => { close(); go('/join'); } }, '🏕️ Join a class')),
    h('button', { class: 'btn btn-ghost', onclick: () => { close(); go('/avatar'); } }, '🎨 Change my look'),
    h('button', { class: 'btn btn-danger', onclick: async () => { close(); await signOut(); go('/'); } }, store.guest ? 'Leave guest mode' : 'Sign out'),
  ));
}

// ───────── helpers ─────────

export function dueForCheck(zoneKey) {
  const cutoff = Date.now() - CHECK_DELAY_DAYS * 86400000;
  return notebookAll().filter((e) => (!zoneKey || e.zone === zoneKey) &&
    ((e.status === 'pending' && new Date(e.passedAt).getTime() <= cutoff) || e.status === 'tricky'));
}

// Zones in a student's own year are opened by their teacher for the whole class.
// Teachers, guests and students without a class unlock zones by earning a star in the one before.
export function isUnlocked(world, z) {
  const cls = classFor(world.year);
  if (cls) return (cls.open_zones || []).includes(z.key);
  if (profile().role === 'teacher') return true;
  if (z.num === 1) return true;
  const prev = world.zones[z.num - 2];
  return zoneProgress(prev.key).stars >= 1;
}

const starsText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

// ───────── choose a world ─────────

export function worldsScreen() {
  const p = profile();
  mount(topBar(), h('main', { class: 'page' },
    h('h2', { class: 'page-title' }, `Where to today, ${p.name || 'explorer'}?`),
    h('div', { class: 'world-cards' }, Object.values(WORLDS).map((w) => {
      const done = w.zones.filter((z) => zoneProgress(z.key).stars > 0).length;
      const mine = p.year === w.year;
      return h('button', { class: `world-card ${mine ? 'mine' : ''}`, style: { '--sky': w.theme.sky, '--ground': w.theme.ground, '--accent': w.theme.accent },
        onclick: () => go(`/world/${w.year}`) },
        h('div', { class: 'wc-art' }, h('span', { class: 'wc-icon' }, w.icon), w.deco.slice(0, 5).map((d, i) => h('span', { class: `wc-deco d${i}` }, d))),
        h('div', { class: 'wc-body' },
          h('div', { class: 'wc-year' }, `Year ${w.year}`, mine && h('span', { class: 'tag' }, 'My year')),
          h('h3', {}, w.name), h('p', {}, w.blurb),
          h('div', { class: 'progress' }, h('div', { class: 'bar', style: { width: (done / 18) * 100 + '%' } })),
          h('div', { class: 'small muted' }, `${done} / 18 zones explored`)));
    })),
    h('button', { class: 'basecamp-banner', onclick: () => go('/list/basecamp/0') },
      h('span', { class: 'bc-icon' }, '🏕️'),
      h('div', {}, h('b', {}, 'Base Camp — 200 everyday words'), h('div', { class: 'small' }, 'Quick revision of the words we use all the time.')),
      h('span', { class: 'go' }, '▶')),
  ));
}

// ───────── world map ─────────

export function worldScreen(year, refreshed = false) {
  const w = WORLDS[year];
  if (!w) return go('/');
  const cls = classFor(year);
  if (!refreshed) refreshClasses().then((changed) => { if (changed && location.hash === `#/world/${year}`) worldScreen(year, true); });
  const cols = 6;
  const nodes = w.zones.map((z, i) => {
    const row = Math.floor(i / cols);
    const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
    return { z, x: 8 + col * (84 / (cols - 1)), y: 14 + row * 33 };
  });
  const firstLocked = w.zones.find((z) => !isUnlocked(w, z));
  const current = cls ? w.zones.find((z) => z.key === cls.current_zone) : w.zones.find((z) => isUnlocked(w, z) && zoneProgress(z.key).stars === 0);

  const map = h('div', { class: 'map', style: { '--sky': w.theme.sky, '--ground': w.theme.ground, '--ground2': w.theme.ground2, '--path': w.theme.path, '--accent': w.theme.accent } });
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.classList.add('map-path');
  const pl = document.createElementNS(svgNS, 'polyline');
  pl.setAttribute('points', nodes.map((n) => `${n.x},${n.y}`).join(' '));
  svg.append(pl); map.append(svg);

  // scenery
  const bands = [5, 31, 64, 94];
  for (let i = 0; i < 20; i++) {
    const d = w.deco[i % w.deco.length];
    map.append(h('span', { class: 'deco', style: { left: ((i * 37 + 11) % 94) + 3 + '%', top: bands[i % 4] + ((i * 7) % 5) - 2 + '%', fontSize: 22 + ((i * 7) % 14) + 'px' } }, d));
  }

  for (const { z, x, y } of nodes) {
    const prog = zoneProgress(z.key);
    const open = isUnlocked(w, z);
    map.append(h('button', {
      class: `node ${open ? '' : 'locked'} ${z === current ? 'current' : ''} ${prog.stars ? 'done' : ''}`,
      style: { left: x + '%', top: y + '%' },
      onclick: () => open ? go(`/zone/${z.key}`) : toast(cls ? 'Your teacher will unlock this zone soon 🔒' : 'Get at least 1 star in the zone before to unlock this one 🔒'),
    },
    cls && z === current && h('span', { class: 'week-badge' }, '⭐ This week'),
    h('span', { class: 'node-tile' }, open ? z.num : '🔒'),
    h('span', { class: 'node-name' }, z.name),
    h('span', { class: 'node-stars' }, open ? starsText(prog.stars) : '')));
  }
  void firstLocked;

  const due = dueForCheck().filter((e) => e.zone.startsWith(`y${year}`) || e.zone.startsWith('s') || e.zone.startsWith('hfw')).length;
  mount(topBar(h('div', { class: 'crumb' }, h('button', { class: 'btn btn-small btn-ghost', onclick: () => go('/') }, '◀ Worlds'))),
    h('main', { class: 'page world-page' },
      h('div', { class: 'world-head', style: { '--accent': w.theme.accent } },
        h('h2', {}, `${w.icon} ${w.name}`), h('span', { class: 'muted' }, `Year ${w.year}`)),
      map,
      h('div', { class: 'side-places' },
        h('button', { class: 'place', onclick: () => go(`/list/expedition/${year}`) }, h('span', {}, '⭐'), h('b', {}, 'Expedition'), h('small', {}, 'Statutory words')),
        h('button', { class: 'place', onclick: () => go('/list/basecamp/0') }, h('span', {}, '🏕️'), h('b', {}, 'Base Camp'), h('small', {}, '200 everyday words')),
        year === 4 && h('button', { class: 'place place-feature', onclick: () => go('/village/4') }, h('span', {}, '🛖'), h('b', {}, 'My Village'), h('small', {}, 'Build through the ages')),
        year === 5 && h('button', { class: 'place place-feature', onclick: () => go('/village/5') }, h('span', {}, '🦘'), h('b', {}, 'My Sanctuary'), h('small', {}, 'Rescue and care for wildlife')),
        year === 6 && h('button', { class: 'place place-feature', onclick: () => go('/village/6') }, h('span', {}, '🌋'), h('b', {}, 'My Volcano Lair'), h('small', {}, 'Dig, discover and build')),
        h('button', { class: 'place', onclick: () => go(`/shop/${year}`) }, h('span', {}, SHOP[year].icon), h('b', {}, SHOP[year].name), h('small', {}, 'Spend your gems')),
        h('button', { class: 'place', onclick: () => go('/notebook') }, h('span', {}, '📓'), h('b', {}, 'My notebook'), h('small', {}, due ? `${due} words to check!` : 'Words I can spell')),
      )));
}

// ───────── a zone (Learn → Practise → Challenge → Check) ─────────

export const GAMES = [
  { id: 'builder', name: 'Block Builder', icon: '🧱', desc: 'Listen and build the word — avoid the extra blocks!' },
  { id: 'missing', name: 'Missing Pieces', icon: '🧩', desc: 'Choose the missing letters.' },
  { id: 'glitch', name: 'Spot the Glitch', icon: '👾', desc: 'Find the correct spelling.' },
  { id: 'detective', name: 'Sentence Detective', icon: '🔎', desc: 'Read the clue and find the missing word.' },
  { id: 'pyramid', name: 'Pyramid Builder', icon: '🔺', desc: 'Build the word one letter at a time.' },
  { id: 'speed', name: 'Speed Run', icon: '⏱️', desc: 'Spell as many as you can in 60 seconds.' },
];

export function zoneScreen(key) {
  const found = findZone(key);
  if (!found) return go('/');
  const { zone: z, world: w, kind } = found;
  if (kind === 'zone' && !isUnlocked(w, z)) { toast('This zone is still locked 🔒'); return go(`/world/${w.year}`); }
  const prog = zoneProgress(key);
  // Every zone starts with its spelling-rule introduction (no skipping)
  if (!prog.intro) { location.replace(`#/intro/${key}`); return; }
  const due = dueForCheck(key).length;
  const waiting = notebookAll().filter((e) => e.zone === key && e.status === 'pending').length - dueForCheck(key).filter((e) => e.status === 'pending').length;
  const back = kind === 'zone' ? `/world/${w.year}` : kind === 'expedition' ? `/list/expedition/${w.year}` : '/list/basecamp/0';
  const theme = w ? w.theme : { accent: '#2f8fdd', sky: '#dff1ff' };

  const step = (n, icon, title, desc, status, onclick, cls = '') =>
    h('button', { class: `step ${cls}`, onclick }, h('span', { class: 'step-num' }, n), h('span', { class: 'step-icon' }, icon),
      h('b', {}, title), h('small', {}, desc), status && h('span', { class: 'step-status' }, status));

  mount(topBar(h('div', { class: 'crumb' }, h('button', { class: 'btn btn-small btn-ghost', onclick: () => go(back) }, '◀ Map'))),
    h('main', { class: 'page zone-page', style: { '--accent': theme.accent, '--sky': theme.panel || theme.sky } },
      h('div', { class: 'zone-head' },
        h('div', { class: 'zone-num' }, kind === 'basecamp' ? '🏕️' : kind === 'expedition' ? '⭐' : z.num),
        h('div', {}, h('h2', {}, z.name), h('div', { class: 'pattern-tag' }, kind === 'zone' ? `Spelling focus: ${z.title}` : z.title)),
        h('button', { class: 'btn btn-small btn-ghost rule-replay', onclick: () => go(`/intro/${key}`) }, '📜 Spelling rule'),
        h('div', { class: 'zone-stars' }, starsText(prog.stars))),
      h('div', { class: 'steps' },
        step(1, '📖', 'Learn', 'Hear, see and try each word', prog.learn ? '✔ done' : '', () => go(`/learn/${key}`), prog.learn ? 'complete' : ''),
        step(2, '⛏️', 'Practise', 'Mini-games to earn gems', prog.practise ? `✔ ${prog.practise} played` : '', () => pickGame(key), prog.practise ? 'complete' : ''),
        step(3, '🚪', 'Challenge Gate', 'Spell the words you hear', prog.stars ? starsText(prog.stars) : '', () => go(`/challenge/${key}`), prog.stars ? 'complete' : ''),
        step(4, '🔍', 'Check', due ? `${due} words ready to check!` : waiting > 0 ? `${waiting} words come back in ${CHECK_DELAY_DAYS} days` : 'Pass the Challenge first',
          prog.check ? '✔ done' : '', () => due ? go(`/check/${key}`) : toast(waiting > 0 ? 'Your words are resting. Come back in a couple of days to check them! ⏳' : 'Pass the Challenge Gate first 🚪'),
          `${prog.check ? 'complete' : ''} ${due ? 'ready' : 'waiting'}`)),
      h('h3', { class: 'section-title' }, 'Words in this zone ', h('small', { class: 'muted' }, '— tap a word to see what it means')),
      h('div', { class: 'word-chips' }, z.words.map((it) => {
        const e = notebookEntry(key, it.w);
        const icon = !e ? '' : e.status === 'mastered' ? '✅' : e.status === 'tricky' ? '🔧' : '⏳';
        return h('button', { class: `chip chip-btn ${e ? e.status : ''}`, onclick: () => wordCard(it, z) }, icon && h('span', {}, icon + ' '), it.w);
      })),
      h('p', { class: 'muted small legend' }, '⏳ passed the Challenge, waiting for Check · ✅ in your notebook · 🔧 tricky — keep practising'),
    ));
}

// Pop-up card for one word: picture, word class, meaning, example sentence and audio
export function wordCard(it, z) {
  const d = info(it.w);
  const span = patternSpan(it.w, z.pattern);
  const word = span ? h('span', {}, it.w.slice(0, span[0]), h('mark', {}, it.w.slice(span[0], span[1])), it.w.slice(span[1])) : it.w;
  speak(it.w);
  modal(h('div', { class: 'word-card' },
    h('div', { class: 'wc-picture' }, d?.emoji || '📖'),
    h('div', { class: 'big-word' }, word),
    h('div', { class: 'wc-meta' },
      d?.cls && h('span', { class: 'word-class' }, d.cls),
      h('button', { class: 'btn btn-small', onclick: () => speak(it.w) }, '🔊 Say it'),
      h('button', { class: 'btn btn-small btn-ghost', onclick: () => speak(it.w, { slow: true }) }, '🐢 Slowly')),
    it.hint && h('p', { class: 'hint' }, it.hint.startsWith('plural') ? it.hint : `Short for “${it.hint}”`),
    RULES[z.key] && h('p', { class: 'wc-rule' }, '📜 ', h('b', {}, 'Rule: '), shortRule(RULES[z.key].rule)),
    d ? h('div', {},
      h('h4', {}, '📘 Meaning'), h('p', { class: 'wc-text' }, d.meaning),
      h('h4', {}, '💬 In a sentence'), h('p', { class: 'wc-text sentence' }, d.sentence,
        ' ', h('button', { class: 'btn btn-small btn-ghost', onclick: () => speak(d.sentence) }, '🔊'))) :
      h('p', { class: 'muted' }, 'The meaning for this word is coming soon. Tap 🔊 to hear it.'),
  ));
}

function pickGame(key) {
  const close = modal(h('div', {},
    h('h3', {}, '⛏️ Choose a mini-game'),
    h('div', { class: 'game-grid' }, GAMES.map((g) =>
      h('button', { class: 'game-card', onclick: () => { close(); go(`/practise/${key}/${g.id}`); } },
        h('span', { class: 'game-icon' }, g.icon), h('b', {}, g.name), h('small', {}, g.desc)))),
    h('button', { class: 'btn btn-ghost', onclick: () => { close(); go(`/practise/${key}/random`); } }, '🎲 Surprise me')));
}

// ───────── Base Camp / Expedition lists ─────────

export function listScreen(kind, year) {
  const isBase = kind === 'basecamp';
  const sets = isBase ? BASE_CAMP : WORLDS[year]?.expedition;
  if (!sets) return go('/');
  mount(topBar(h('div', { class: 'crumb' }, h('button', { class: 'btn btn-small btn-ghost', onclick: () => history.back() }, '◀ Back'))),
    h('main', { class: 'page' },
      h('h2', { class: 'page-title' }, isBase ? '🏕️ Base Camp' : `⭐ Expedition — Year ${year}`),
      h('p', { class: 'muted' }, isBase ? 'The 200 high-frequency words. Every explorer needs these!' : 'The statutory spelling words for your year group.'),
      h('div', { class: 'set-grid' }, sets.map((s) => {
        const prog = zoneProgress(s.key);
        return h('button', { class: 'set-card', onclick: () => go(`/zone/${s.key}`) },
          h('b', {}, s.name), h('small', {}, s.words.slice(0, 4).map((x) => x.w).join(', ') + '…'),
          h('span', { class: 'node-stars' }, starsText(prog.stars)));
      }))));
}

// ───────── Spelling notebook ─────────

export function notebookScreen() {
  const all = notebookAll();
  let tab = 'mastered';
  const body = h('div');
  const tabs = [
    ['mastered', '✅ Words I can spell'],
    ['pending', '⏳ Waiting for Check'],
    ['tricky', '🔧 Tricky words'],
  ];
  function render() {
    const list = all.filter((e) => e.status === tab);
    const groups = {};
    for (const e of list) (groups[e.zone] ||= []).push(e);
    body.replaceChildren(
      h('div', { class: 'tabs' }, tabs.map(([id, label]) =>
        h('button', { class: `tab ${tab === id ? 'on' : ''}`, onclick: () => { tab = id; render(); } }, `${label} (${all.filter((e) => e.status === id).length})`))),
      list.length ? h('div', { class: 'notebook-pages' }, Object.entries(groups).map(([zk, es]) => {
        const f = findZone(zk);
        return h('div', { class: 'nb-group' },
          h('h4', {}, f ? `${f.zone.name} — ${f.zone.title}` : zk),
          h('ul', { class: 'nb-words' }, es.map((e) => h('li', {}, e.word))));
      })) : h('p', { class: 'muted empty' },
        tab === 'mastered' ? 'Pass a Challenge, then its Check a few days later, to add words here.' :
        tab === 'pending' ? 'Words you get right in a Challenge Gate wait here until their Check.' : 'No tricky words — brilliant!'),
    );
  }
  render();
  const due = dueForCheck();
  mount(topBar(h('div', { class: 'crumb' }, h('button', { class: 'btn btn-small btn-ghost', onclick: () => history.back() }, '◀ Back'))),
    h('main', { class: 'page notebook' },
      h('div', { class: 'nb-head' },
        h('h2', { class: 'page-title' }, '📓 My spelling notebook'),
        h('div', {},
          due.length ? h('button', { class: 'btn', onclick: () => go('/check/all') }, `🔍 Check ${due.length} words`) : null,
          h('button', { class: 'btn btn-ghost', onclick: () => window.print() }, '🖨️ Print'))),
      h('p', { class: 'muted print-hide' }, 'Copy your words into your spelling book in class or at home.'),
      body));
}

// ───────── Shop ─────────

export function shopScreen(year) {
  const s = SHOP[year];
  if (!s) return go('/');
  const p = profile();
  const grid = h('div', { class: 'shop-grid' });
  function render() {
    grid.replaceChildren(...s.items.map((it) => {
      const owned = p.owned.includes(it.id);
      const preview = { ...DEFAULT_AVATAR, ...(p.avatar || {}), [it.slot]: it.id };
      return h('div', { class: `shop-item ${owned ? 'owned' : ''}` },
        h('img', { src: avatarThumbnail(preview, 140, true), alt: '' }),
        h('b', {}, `${it.icon} ${it.name}`),
        owned ? h('button', { class: 'btn btn-small btn-ghost', onclick: async () => {
          const av = { ...DEFAULT_AVATAR, ...(p.avatar || {}) };
          av[it.slot] = av[it.slot] === it.id ? (it.slot === 'hat' ? 'none' : null) : it.id;
          await saveProfile({ avatar: av }); toast('Updated your look!', 'good'); render();
        } }, (p.avatar || {})[it.slot] === it.id ? 'Take off' : 'Wear') :
          h('button', { class: 'btn btn-small', disabled: p.gems < it.cost ? true : null, onclick: async () => {
            if (await buyItem(it.id, it.cost)) {
              const av = { ...DEFAULT_AVATAR, ...(p.avatar || {}), [it.slot]: it.id };
              await saveProfile({ avatar: av });
              confetti(); toast(`You got the ${it.name}! 🎉`, 'good');
              document.getElementById('gem-count').textContent = p.gems;
              render();
            } else toast('Not enough gems yet — keep spelling! 💎', 'bad');
          } }, `💎 ${it.cost}`));
    }));
  }
  render();
  mount(topBar(h('div', { class: 'crumb' }, h('button', { class: 'btn btn-small btn-ghost', onclick: () => go(`/world/${year}`) }, '◀ Map'))),
    h('main', { class: 'page' },
      h('h2', { class: 'page-title' }, `${s.icon} ${s.name}`),
      h('p', { class: 'muted' }, 'Earn gems in Practise and the Challenge Gate, then spend them here.'),
      grid));
}
