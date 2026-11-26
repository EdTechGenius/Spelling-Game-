import { h, mount, toast, modal } from '../ui.js';
import { sb, store, profile } from '../store.js';
import { WORLDS, findZone } from '../worlds.js';
import { avatarThumbnail, DEFAULT_AVATAR } from '../avatar.js';
import { topBar } from './map.js';
import { go } from '../main.js';

function notTeacher() {
  mount(topBar(), h('main', { class: 'page' }, h('div', { class: 'card narrow' },
    h('h2', {}, '🧑‍🏫 Teacher dashboard'),
    store.guest ? h('p', {}, 'Sign in with your school Microsoft account to use the teacher dashboard.') :
      h('div', {},
        h('p', {}, 'Your account is not set up as a teacher yet.'),
        h('p', { class: 'muted' }, 'Ask the Spell Quests administrator to add your school email address to the teacher list. Then sign out and back in.')),
    h('button', { class: 'btn', onclick: () => go('/worlds') }, 'Play the game instead ▶'))));
}

export async function teacherScreen(classId) {
  if (profile().role !== 'teacher' || !store.user) return notTeacher();
  if (classId) return classView(classId);

  const list = h('div', { class: 'class-grid' }, h('p', { class: 'muted' }, 'Loading…'));
  mount(topBar(h('div', { class: 'crumb' }, h('b', {}, 'Teacher dashboard'))),
    h('main', { class: 'page teacher' },
      h('div', { class: 'nb-head' }, h('h2', { class: 'page-title' }, '🧑‍🏫 My classes'),
        h('div', {}, h('button', { class: 'btn', onclick: newClass }, '＋ New class'),
          h('button', { class: 'btn btn-ghost', onclick: () => go('/worlds') }, '🎮 Play'))),
      list));

  const { data: classes, error } = await sb.from('classes').select('id, name, year_group, join_code, class_members(count)').eq('teacher_id', store.user.id).order('created_at');
  if (error) { list.replaceChildren(h('p', { class: 'bad' }, error.message)); return; }
  if (!classes.length) { list.replaceChildren(h('p', { class: 'muted' }, 'No classes yet. Create one and share its code with your students.')); return; }
  list.replaceChildren(...classes.map((c) => h('button', { class: 'class-card', onclick: () => go(`/teacher/${c.id}`) },
    h('div', { class: 'cc-year', style: { background: WORLDS[c.year_group].theme.ground } }, WORLDS[c.year_group].icon, ` Year ${c.year_group}`),
    h('h3', {}, c.name),
    h('div', { class: 'code' }, c.join_code),
    h('small', { class: 'muted' }, `${c.class_members[0]?.count || 0} students · class code above`))));
}

function newClass() {
  let name, year = 4;
  const yearBtns = h('div', { class: 'opt-choices' });
  const drawYears = () => yearBtns.replaceChildren(...[4, 5, 6].map((y) => h('button', { class: `pill ${year === y ? 'on' : ''}`, onclick: () => { year = y; drawYears(); } }, `Year ${y}`)));
  drawYears();
  const close = modal(h('form', { onsubmit: async (e) => {
    e.preventDefault();
    const { data, error } = await sb.from('classes').insert({ name: name.value.trim(), year_group: year, teacher_id: store.user.id }).select().single();
    if (error) return toast(error.message, 'bad');
    close();
    modal(h('div', { class: 'center' }, h('h3', {}, `Class ${data.name} created!`), h('p', {}, 'Students join with this code:'), h('div', { class: 'code huge' }, data.join_code)), { onClose: () => teacherScreen() });
  } },
  h('h3', {}, 'New class'),
  name = h('input', { class: 'name-input', placeholder: 'Class name, e.g. 4 Oak', required: true, maxlength: 60 }),
  yearBtns,
  h('button', { class: 'btn', type: 'submit' }, 'Create class')));
  name.focus();
}

async function classView(classId) {
  const body = h('div', {}, h('p', { class: 'muted' }, 'Loading…'));
  mount(topBar(h('div', { class: 'crumb' }, h('button', { class: 'btn btn-small btn-ghost', onclick: () => go('/teacher') }, '◀ Classes'))),
    h('main', { class: 'page teacher' }, body));

  const { data: cls, error } = await sb.from('classes').select('*').eq('id', classId).single();
  if (error) { body.replaceChildren(h('p', { class: 'bad' }, error.message)); return; }
  const { data: members } = await sb.from('class_members').select('student_id, joined_at, profiles(id, display_name, gems, avatar, updated_at)').eq('class_id', classId);
  const students = (members || []).map((m) => m.profiles).filter(Boolean).sort((a, b) => a.display_name.localeCompare(b.display_name));
  const ids = students.map((s) => s.id);
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [zp, nb, wa] = ids.length ? await Promise.all([
    sb.from('zone_progress').select('*').in('student_id', ids),
    sb.from('notebook').select('student_id, status').in('student_id', ids),
    sb.from('word_attempts').select('student_id, word, correct, created_at').in('student_id', ids).gte('created_at', since).limit(5000),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];

  const world = WORLDS[cls.year_group];
  const prog = {}; // sid -> zoneKey -> row
  for (const r of zp.data || []) (prog[r.student_id] ||= {})[r.zone_key] = r;
  const mastered = {}; const tricky = {};
  for (const r of nb.data || []) { if (r.status === 'mastered') mastered[r.student_id] = (mastered[r.student_id] || 0) + 1; if (r.status === 'tricky') tricky[r.student_id] = (tricky[r.student_id] || 0) + 1; }
  const lastActive = {}; const wrongWords = {};
  for (const r of wa.data || []) {
    if (!lastActive[r.student_id] || r.created_at > lastActive[r.student_id]) lastActive[r.student_id] = r.created_at;
    if (!r.correct) wrongWords[r.word] = (wrongWords[r.word] || 0) + 1;
  }
  const topWrong = Object.entries(wrongWords).sort((a, b) => b[1] - a[1]).slice(0, 15);

  const table = h('div', { class: 'heat-wrap' }, h('table', { class: 'heat' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Student'), world.zones.map((z) => h('th', { title: `${z.name} — ${z.title}` }, z.num)),
      h('th', {}, '📓'), h('th', {}, '🔧'), h('th', {}, '💎'), h('th', {}, 'Last active'))),
    h('tbody', {}, students.length ? students.map((s) => h('tr', {},
      h('td', { class: 'stu' }, h('img', { src: avatarThumbnail({ ...DEFAULT_AVATAR, ...(s.avatar || {}) }, 64), alt: '' }), s.display_name),
      world.zones.map((z) => { const r = prog[s.id]?.[z.key]; const st = r?.best_stars || 0; return h('td', { class: `cell s${st} ${r && !st ? 'started' : ''}`, title: r ? `${z.name}: ${st}★, practised ${r.practise_count}×` : 'not started' }, st ? '★'.repeat(st) : r ? '·' : ''); }),
      h('td', {}, mastered[s.id] || 0), h('td', {}, tricky[s.id] || 0), h('td', {}, s.gems),
      h('td', { class: 'small' }, lastActive[s.id] ? new Date(lastActive[s.id]).toLocaleDateString('en-GB') : '—'))) :
      h('tr', {}, h('td', { colspan: 23, class: 'muted' }, `No students yet. Share the code ${cls.join_code}.`)))));

  function csv() {
    const rows = [['Student', ...world.zones.map((z) => `Z${z.num} ${z.title}`), 'Notebook words', 'Tricky words', 'Gems']];
    for (const s of students) rows.push([s.display_name, ...world.zones.map((z) => prog[s.id]?.[z.key]?.best_stars || 0), mastered[s.id] || 0, tricky[s.id] || 0, s.gems]);
    const blob = new Blob([rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `spell-quests-${cls.name}.csv` }); a.click();
  }

  body.replaceChildren(
    h('div', { class: 'nb-head' },
      h('div', {}, h('h2', { class: 'page-title' }, `${world.icon} ${cls.name}`), h('span', { class: 'muted' }, `Year ${cls.year_group} · ${students.length} students`)),
      h('div', { class: 'code-box' }, h('small', {}, 'Class code'), h('div', { class: 'code' }, cls.join_code))),
    h('div', { class: 'nav-row left' },
      h('button', { class: 'btn btn-ghost', onclick: csv }, '⬇️ Download spreadsheet'),
      h('button', { class: 'btn btn-ghost', onclick: () => manage(cls, students) }, '👥 Manage students')),
    h('h3', { class: 'section-title' }, 'Progress by zone (best stars)'),
    table,
    h('h3', { class: 'section-title' }, 'Most misspelt words (last 30 days)'),
    topWrong.length ? h('div', { class: 'word-chips' }, topWrong.map(([w, n]) => {
      const f = Object.values(WORLDS).flatMap((x) => x.zones).find((z) => z.words.some((it) => it.w === w));
      return h('span', { class: 'chip tricky', title: f ? `${f.name} — ${f.title}` : '' }, `${w} ×${n}`);
    })) : h('p', { class: 'muted' }, 'Nothing yet — data appears as students play.'),
  );
  void findZone;
}

function manage(cls, students) {
  const close = modal(h('div', {},
    h('h3', {}, `Students in ${cls.name}`),
    students.length ? h('ul', { class: 'manage-list' }, students.map((s) => h('li', {}, s.display_name,
      h('button', { class: 'btn btn-small btn-danger', onclick: async () => {
        if (!confirm(`Remove ${s.display_name} from ${cls.name}? Their progress is kept.`)) return;
        const { error } = await sb.from('class_members').delete().eq('class_id', cls.id).eq('student_id', s.id);
        if (error) return toast(error.message, 'bad');
        close(); toast('Removed'); classView(cls.id);
      } }, 'Remove')))) : h('p', { class: 'muted' }, 'No students yet.'),
    h('button', { class: 'btn btn-danger', onclick: async () => {
      if (!confirm(`Delete the class ${cls.name}? Students keep their own progress.`)) return;
      const { error } = await sb.from('classes').delete().eq('id', cls.id);
      if (error) return toast(error.message, 'bad');
      close(); go('/teacher');
    } }, '🗑️ Delete class')));
}
