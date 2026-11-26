import { h, mount, toast, confetti, modal } from '../ui.js';
import { profile, buyItem } from '../store.js';
import { STONE_AGE, eraUnlocked, currentEra, createVillageView } from '../village.js';
import { OUTBACK } from '../sanctuary.js';

export const VILLAGES = { 4: STONE_AGE, 5: OUTBACK };
import { DEFAULT_AVATAR } from '../avatar.js';
import { speak } from '../speech.js';
import { topBar } from './map.js';
import { go, onLeave } from '../main.js';

function factCard(world, def, justBuilt) {
  const era = world.eras.find((e) => e.id === def.era);
  modal(h('div', { class: 'fact-card' },
    h('div', { class: 'fact-icon' }, def.icon),
    h('h3', {}, justBuilt ? `You built the ${def.name}!` : def.name),
    h('div', { class: 'era-tag' }, `${era.icon} ${era.name}`),
    h('h4', {}, '📜 Did you know?'),
    h('p', { class: 'wc-text' }, def.fact),
    h('button', { class: 'btn btn-small btn-ghost', onclick: () => speak(def.fact) }, '🔊 Read it to me')));
}

export function villageScreen(year) {
  const world = VILLAGES[year];
  if (!world) return go('/');
  const ERAS = world.eras, BUILDINGS = world.buildings;
  const p = profile();
  const owned = () => p.owned || [];
  const stage = h('div', { class: 'village-stage' });
  const timeline = h('div', { class: 'era-timeline' });
  const list = h('div', { class: 'build-list' });
  const summary = h('div', { class: 'village-summary' });

  const view = createVillageView(stage, {
    world,
    owned: owned(),
    avatar: { ...DEFAULT_AVATAR, ...(p.avatar || {}) },
    onPick: (id) => {
      const def = BUILDINGS.find((b) => b.id === id);
      if (!def) return;
      if (owned().includes(id)) factCard(world, def);
      else toast(`${def.icon} ${def.name} can be built here — find it in the list below.`);
    },
  });
  onLeave(() => view.dispose());

  function available() {
    return BUILDINGS.filter((b) => !owned().includes(b.id) && eraUnlocked(world, ERAS.findIndex((e) => e.id === b.era), owned()));
  }

  function render() {
    const o = owned();
    const cur = currentEra(world, o);
    const built = BUILDINGS.filter((b) => o.includes(b.id)).length;
    summary.replaceChildren(
      h('b', {}, `${built} / ${BUILDINGS.length} built`),
      h('div', { class: 'progress' }, h('div', { class: 'bar', style: { width: (built / BUILDINGS.length) * 100 + '%' } })),
      h('span', { class: 'muted small' }, 'Drag to spin · pinch to zoom · tap a building to learn about it'));

    timeline.replaceChildren(...ERAS.map((e, i) => {
      const open = eraUnlocked(world, i, o);
      const n = BUILDINGS.filter((b) => b.era === e.id && o.includes(b.id)).length;
      const total = BUILDINGS.filter((b) => b.era === e.id).length;
      return h('div', { class: `era ${open ? 'open' : 'locked'} ${i === cur ? 'current' : ''}` },
        h('span', { class: 'era-icon' }, open ? e.icon : '🔒'),
        h('div', {}, h('b', {}, e.name), h('small', {}, e.years), h('small', { class: 'era-count' }, open ? `${n}/${total} built` : `Build ${e.need} in ${ERAS[i - 1].name} to unlock`)));
    }));

    list.replaceChildren(...ERAS.map((e, i) => {
      const open = eraUnlocked(world, i, o);
      return h('div', { class: `build-era ${open ? '' : 'locked'}` },
        h('h3', {}, `${open ? e.icon : '🔒'} ${e.name}`),
        h('div', { class: 'build-grid' }, BUILDINGS.filter((b) => b.era === e.id).map((def) => {
          const have = o.includes(def.id);
          const canAfford = p.gems >= def.cost;
          return h('div', { class: `build-card ${have ? 'built' : ''}` },
            h('div', { class: 'bc-icon' }, def.icon),
            h('b', {}, def.name),
            have ? h('button', { class: 'btn btn-small btn-ghost', onclick: () => { view.focus(def.id); factCard(world, def); } }, '✔ Built · 📜 Facts') :
              !open ? h('span', { class: 'muted small' }, `🔒 💎 ${def.cost}`) :
                h('button', { class: 'btn btn-small', disabled: canAfford ? null : true, onclick: () => build(def) }, `Build 💎 ${def.cost}`));
        })));
    }));
    view.markers(available());
  }

  async function build(def) {
    const eraBefore = currentEra(world, owned());
    if (!(await buyItem(def.id, def.cost))) { toast('Not enough gems yet — keep spelling to earn more! 💎', 'bad'); return; }
    view.build(def.id);
    view.focus(def.id);
    confetti(50);
    const gemEl = document.getElementById('gem-count');
    if (gemEl) gemEl.textContent = p.gems;
    render();
    const eraAfter = currentEra(world, owned());
    setTimeout(() => {
      factCard(world, def, true);
      if (eraAfter > eraBefore) setTimeout(() => toast(world.year === 4 ? `🎉 A new era begins: the ${ERAS[eraAfter].name}!` : `🎉 New stage unlocked: ${ERAS[eraAfter].name}!`, 'good'), 400);
    }, 750);
  }

  mount(topBar(h('div', { class: 'crumb' }, h('button', { class: 'btn btn-small btn-ghost', onclick: () => go(`/world/${year}`) }, '◀ Map'))),
    h('main', { class: 'page village-page' },
      h('div', { class: 'nb-head' }, h('h2', { class: 'page-title' }, `${world.icon} ${world.title}`), summary),
      h('p', { class: 'muted' }, world.intro),
      timeline, stage, list));
  render();
}
