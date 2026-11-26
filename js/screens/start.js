import { h, mount, toast, spellInputAttrs } from '../ui.js';
import { store, startGuest, signInMicrosoft, signInEmail, joinClass, saveProfile, profile } from '../store.js';
import { ALLOW_GUEST } from '../config.js';
import { createAvatarView, DEFAULT_AVATAR, OPTIONS, ITEMS } from '../avatar.js';
import { WORLDS } from '../worlds.js';
import { go, onLeave } from '../main.js';

const LABEL = {
  skin: 'Skin', eyes: 'Eyes', hair: 'Hair', hairColour: 'Hair colour', top: 'Top', sleeves: 'Sleeves',
  bottom: 'Bottoms', bottomColour: 'Bottoms colour', shoes: 'Shoes', hat: 'Headwear', hatColour: 'Headwear colour',
};

export function welcomeScreen() {
  let emailBox;
  const emailForm = h('form', { class: 'email-form hidden', onsubmit: async (e) => {
    e.preventDefault();
    const email = emailBox.value.trim();
    if (!email) return;
    try { await signInEmail(email); toast('Check your email for a sign-in link ✉️', 'good'); }
    catch (err) { toast(err.message, 'bad'); }
  } },
  emailBox = h('input', { type: 'email', placeholder: 'your.name@school.org', required: true, autocomplete: 'email', autocapitalize: 'none' }),
  h('button', { class: 'btn', type: 'submit' }, 'Send link'));

  mount(h('div', { class: 'welcome' },
    h('div', { class: 'welcome-sky' }, ...['☁️', '☁️', '☁️'].map((c, i) => h('span', { class: `cloud c${i}` }, c))),
    h('div', { class: 'welcome-card' },
      h('div', { class: 'logo' }, h('span', { class: 'logo-block' }, 'S'), h('span', { class: 'logo-block b2' }, 'Q'),
        h('div', {}, h('h1', {}, 'Spell Quests'), h('p', { class: 'tagline' }, 'Explore. Spell. Collect. Build.'))),
      h('div', { class: 'world-strip' }, Object.values(WORLDS).map((w) =>
        h('div', { class: 'world-chip', style: { background: w.theme.ground } }, h('span', {}, w.icon), `Year ${w.year}`))),
      h('button', { class: 'btn btn-ms', onclick: async () => {
        try { await signInMicrosoft(); } catch (e) { toast('Microsoft sign-in is not switched on yet — ask your teacher. (' + e.message + ')', 'bad'); }
      } }, h('span', { class: 'ms-logo' }, h('i'), h('i'), h('i'), h('i')), 'Continue with Microsoft'),
      h('button', { class: 'btn btn-ghost', onclick: () => emailForm.classList.toggle('hidden') }, '✉️ Sign in with an email link'),
      emailForm,
      ALLOW_GUEST && h('button', { class: 'btn btn-link', onclick: () => { startGuest(); go('/'); } },
        'Just try it out (progress saved on this device only)'),
    ),
  ));
}

export function joinScreen() {
  let input;
  const submit = async (e) => {
    e.preventDefault();
    try {
      const c = await joinClass(input.value);
      toast(`Welcome to ${c.class_name}! 🎉`, 'good');
      go('/');
    } catch (err) { toast(err.message, 'bad'); }
  };
  mount(h('div', { class: 'centre-page' },
    h('div', { class: 'card narrow' },
      h('h2', {}, '🏕️ Join your class'),
      h('p', {}, 'Type the class code your teacher gave you.'),
      h('form', { onsubmit: submit, class: 'join-form' },
        input = h('input', { class: 'code-input', placeholder: 'FOX-123', maxlength: 9, ...spellInputAttrs, autocapitalize: 'characters' }),
        h('button', { class: 'btn', type: 'submit' }, 'Join ▶')),
      h('button', { class: 'btn btn-link', onclick: () => { try { sessionStorage.setItem('skipJoin', '1'); } catch {} go('/'); } }, 'I don\'t have a code yet'),
    )));
  input.focus();
}

export function avatarScreen(firstTime) {
  const p = profile();
  const cfg = { ...DEFAULT_AVATAR, ...(p.avatar || {}) };
  let year = p.year || null;
  let nameInput;

  const preview = h('div', { class: 'avatar-stage' });
  const view = createAvatarView(preview, cfg, { height: 380 });
  onLeave(() => view.dispose());
  const refresh = () => { view.update(cfg); renderRows(); };

  const rows = h('div', { class: 'avatar-rows' });
  function swatchRow(key) {
    return h('div', { class: 'opt-row' }, h('div', { class: 'opt-label' }, LABEL[key]),
      h('div', { class: 'opt-choices' }, OPTIONS[key].map((c) =>
        h('button', { class: `swatch ${cfg[key] === c ? 'on' : ''}`, style: { background: c }, 'aria-label': `${LABEL[key]} ${c}`, onclick: () => { cfg[key] = c; refresh(); } }))));
  }
  function pillRow(key, label = LABEL[key], opts = OPTIONS[key]) {
    return h('div', { class: 'opt-row' }, h('div', { class: 'opt-label' }, label),
      h('div', { class: 'opt-choices' }, opts.map((o) =>
        h('button', { class: `pill ${cfg[key] === o ? 'on' : ''}`, onclick: () => { cfg[key] = o; refresh(); } }, o))));
  }
  function toggleRow(key, label) {
    return h('div', { class: 'opt-row' }, h('div', { class: 'opt-label' }, label),
      h('div', { class: 'opt-choices' }, [false, true].map((v) =>
        h('button', { class: `pill ${!!cfg[key] === v ? 'on' : ''}`, onclick: () => { cfg[key] = v; refresh(); } }, v ? 'yes' : 'no'))));
  }
  function ownedRow() {
    const owned = (p.owned || []).map((id) => ITEMS[id]).filter(Boolean);
    if (!owned.length) return h('div', { class: 'opt-row' }, h('div', { class: 'opt-label' }, 'Gear'),
      h('div', { class: 'muted' }, '🔒 Earn gems in the game to buy furs, tools and more at the shop!'));
    return h('div', { class: 'opt-row' }, h('div', { class: 'opt-label' }, 'My gear'),
      h('div', { class: 'opt-choices' }, owned.map((it) => {
        const on = cfg[it.slot] === it.id;
        return h('button', { class: `pill ${on ? 'on' : ''}`, onclick: () => {
          if (it.slot === 'hat') cfg.hat = on ? 'none' : it.id; else cfg[it.slot] = on ? null : it.id;
          refresh();
        } }, `${it.icon} ${it.name}`);
      })));
  }
  function renderRows() {
    rows.replaceChildren(
      swatchRow('skin'), swatchRow('eyes'), pillRow('hair'), swatchRow('hairColour'),
      swatchRow('top'), pillRow('sleeves'), pillRow('bottom'), swatchRow('bottomColour'), swatchRow('shoes'),
      pillRow('hat'), swatchRow('hatColour'), toggleRow('glasses', 'Glasses'), toggleRow('cheeks', 'Rosy cheeks'),
      ownedRow(),
      !store.state.classes.length && h('div', { class: 'opt-row' }, h('div', { class: 'opt-label' }, 'My year'),
        h('div', { class: 'opt-choices' }, [4, 5, 6].map((y) =>
          h('button', { class: `pill ${year === y ? 'on' : ''}`, onclick: () => { year = y; renderRows(); } }, `${WORLDS[y].icon} Year ${y}`)))),
    );
  }
  renderRows();

  function surprise() {
    for (const k of Object.keys(OPTIONS)) cfg[k] = OPTIONS[k][Math.floor(Math.random() * OPTIONS[k].length)];
    cfg.glasses = Math.random() < 0.25; cfg.cheeks = Math.random() < 0.5;
    refresh();
  }

  async function save() {
    const name = nameInput.value.trim();
    if (!name) { toast('Type your name first ✏️', 'bad'); nameInput.focus(); return; }
    if (!year) { toast('Pick your year group', 'bad'); return; }
    await saveProfile({ avatar: { ...cfg }, name, year });
    go(firstTime ? `/world/${year}` : '/');
  }

  mount(h('div', { class: 'avatar-page' },
    h('div', { class: 'avatar-head' },
      !firstTime && h('button', { class: 'btn btn-small btn-ghost', onclick: () => go('/') }, '◀ Back'),
      h('h2', {}, firstTime ? 'Create your explorer' : 'Change your look'),
      h('button', { class: 'btn btn-small btn-ghost', onclick: surprise }, '🎲 Surprise me')),
    h('div', { class: 'avatar-layout' },
      h('div', { class: 'avatar-left' }, preview,
        nameInput = h('input', { class: 'name-input', placeholder: 'Your first name', maxlength: 20, value: p.name || '', autocomplete: 'off', autocorrect: 'off' }),
        h('p', { class: 'muted small' }, 'Drag your explorer to spin them round.')),
      rows),
    h('div', { class: 'avatar-foot' }, h('button', { class: 'btn btn-big', onclick: save }, firstTime ? 'Let\'s go! ▶' : 'Save ✔')),
  ));
}
