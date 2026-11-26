// Game state: kept on the device (localStorage) and, when signed in, synced to Supabase.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

const blank = () => ({
  profile: { name: '', role: 'student', year: null, avatar: null, gems: 0, owned: [] },
  classes: [],          // classes the student belongs to
  zones: {},            // zoneKey -> { learn, practise, stars, check }
  notebook: {},         // `${zoneKey}|${word}` -> { status, passedAt, masteredAt }
});

export const store = {
  user: null,           // Supabase user, or null for guest
  guest: false,
  state: blank(),
};

const LS_KEY = () => `spellquests:${store.user ? store.user.id : 'guest'}`;

function saveLocal() {
  try { localStorage.setItem(LS_KEY(), JSON.stringify(store.state)); } catch { /* storage unavailable */ }
}
function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY());
    store.state = raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch { store.state = blank(); }
}

const online = () => !!store.user;
const warn = (what) => ({ error }) => { if (error) console.warn(what, error.message); };

// ───────── Session ─────────

export async function initSession() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    store.user = data.session.user;
    loadLocal();
    await pullFromServer();
    return 'user';
  }
  try { if (localStorage.getItem('spellquests:mode') === 'guest') { startGuest(); return 'guest'; } } catch {}
  return null;
}

export function startGuest() {
  store.user = null; store.guest = true;
  try { localStorage.setItem('spellquests:mode', 'guest'); } catch {}
  loadLocal();
}

export async function signInMicrosoft() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'azure',
    options: { scopes: 'email openid profile', redirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

export async function signInEmail(email) {
  const { error } = await sb.auth.signInWithOtp({
    email, options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

export async function signOut() {
  try { localStorage.removeItem('spellquests:mode'); } catch {}
  if (store.user) await sb.auth.signOut();
  store.user = null; store.guest = false; store.state = blank();
}

async function pullFromServer() {
  const uid = store.user.id;
  const [p, z, n, c] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).single(),
    sb.from('zone_progress').select('*').eq('student_id', uid),
    sb.from('notebook').select('*').eq('student_id', uid),
    sb.from('class_members').select('class_id, classes(id, name, year_group, join_code)').eq('student_id', uid),
  ]);
  if (p.error) { console.warn('profile', p.error.message); return; }
  const s = store.state;
  s.profile = {
    name: p.data.display_name, role: p.data.role, year: p.data.year_group,
    avatar: Object.keys(p.data.avatar || {}).length ? p.data.avatar : null,
    gems: p.data.gems, owned: p.data.owned_items || [],
  };
  s.zones = {};
  for (const r of z.data || []) s.zones[r.zone_key] = { learn: r.learn_done, practise: r.practise_count, stars: r.best_stars, check: r.check_done };
  s.notebook = {};
  for (const r of n.data || []) s.notebook[`${r.zone_key}|${r.word}`] = { status: r.status, passedAt: r.challenge_passed_at, masteredAt: r.mastered_at };
  s.classes = (c.data || []).map((r) => r.classes).filter(Boolean);
  saveLocal();
}

// ───────── Profile ─────────

export function profile() { return store.state.profile; }

export async function saveProfile(patch) {
  Object.assign(store.state.profile, patch);
  saveLocal();
  if (!online()) return;
  const row = { updated_at: new Date().toISOString() };
  if ('name' in patch) row.display_name = patch.name;
  if ('avatar' in patch) row.avatar = patch.avatar;
  if ('year' in patch) row.year_group = patch.year;
  await sb.from('profiles').update(row).eq('id', store.user.id).then(warn('profile'));
}

export async function joinClass(code) {
  const { data, error } = await sb.rpc('join_class', { code });
  if (error) throw new Error(error.message.includes('not found') ? 'That class code was not found. Check it and try again.' : error.message);
  const row = data[0];
  store.state.profile.year = row.year_group;
  await pullFromServer();
  return row;
}

// ───────── Gems & shop ─────────

export async function addGems(n) {
  if (n <= 0) return;
  store.state.profile.gems += n;
  saveLocal();
  if (online()) {
    const { data, error } = await sb.rpc('add_gems', { amount: Math.min(n, 50) });
    if (!error && typeof data === 'number') { store.state.profile.gems = data; saveLocal(); }
  }
}

export async function buyItem(id, cost) {
  const p = store.state.profile;
  if (p.owned.includes(id)) return true;
  if (p.gems < cost) return false;
  if (online()) {
    const { data, error } = await sb.rpc('buy_item', { item: id, cost });
    if (error) { console.warn(error.message); return false; }
    p.gems = data;
  } else {
    p.gems -= cost;
  }
  p.owned = [...p.owned, id];
  saveLocal();
  return true;
}

// ───────── Zone progress ─────────

export function zone(key) {
  return store.state.zones[key] || { learn: false, practise: 0, stars: 0, check: false };
}

export async function updateZone(key, patch) {
  const z = { ...zone(key), ...patch };
  if ('stars' in patch) z.stars = Math.max(zone(key).stars, patch.stars);
  store.state.zones[key] = z;
  saveLocal();
  if (!online()) return;
  await sb.from('zone_progress').upsert({
    student_id: store.user.id, zone_key: key, learn_done: z.learn, practise_count: z.practise,
    best_stars: z.stars, check_done: z.check, updated_at: new Date().toISOString(),
  }).then(warn('zone'));
}

// ───────── Notebook ─────────

export function notebookEntry(zoneKey, word) { return store.state.notebook[`${zoneKey}|${word}`]; }
export function notebookAll() {
  return Object.entries(store.state.notebook).map(([k, v]) => {
    const i = k.indexOf('|');
    return { zone: k.slice(0, i), word: k.slice(i + 1), ...v };
  });
}

export async function setNotebook(zoneKey, word, status) {
  const k = `${zoneKey}|${word}`;
  const prev = store.state.notebook[k] || {};
  const now = new Date().toISOString();
  const e = { ...prev, status };
  if (status === 'pending') e.passedAt = now;
  if (status === 'mastered') e.masteredAt = now;
  // A mastered word stays mastered if it is simply passed again in a Challenge
  if (prev.status === 'mastered' && status === 'pending') return;
  store.state.notebook[k] = e;
  saveLocal();
  if (!online()) return;
  await sb.from('notebook').upsert({
    student_id: store.user.id, zone_key: zoneKey, word, status,
    challenge_passed_at: e.passedAt || null, mastered_at: e.masteredAt || null, updated_at: now,
  }).then(warn('notebook'));
}

export function logAttempt(zoneKey, word, typed, correct, activity) {
  if (!online()) return;
  sb.from('word_attempts').insert({ student_id: store.user.id, zone_key: zoneKey, word, typed, correct, activity }).then(warn('attempt'));
}
