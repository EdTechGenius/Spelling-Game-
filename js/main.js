import { initSession, store, sb } from './store.js';
import { welcomeScreen, joinScreen, avatarScreen } from './screens/start.js';
import { worldsScreen, worldScreen, zoneScreen, listScreen, notebookScreen, shopScreen } from './screens/map.js';
import { learnScreen, practiseScreen, challengeScreen, checkScreen } from './screens/play.js';
import { teacherScreen } from './screens/teacher.js';
import { villageScreen } from './screens/village.js';

let cleanup = null;
export function onLeave(fn) { cleanup = fn; }

export function go(path) {
  if (location.hash === '#' + path) route();
  else location.hash = path;
}

function route() {
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [page, a, b] = parts;
  const signedIn = store.user || store.guest;
  const p = store.state.profile;

  if (!signedIn) return welcomeScreen();
  if (page === 'teacher') return teacherScreen(a);
  if (p.role === 'teacher' && !page) return teacherScreen();
  if (store.user && p.role === 'student' && !store.state.classes.length && !sessionStorageGet('skipJoin') && page !== 'join' && page !== 'avatar') return joinScreen();
  if (!p.avatar && page !== 'avatar') return avatarScreen(true);

  switch (page) {
    case 'join': return joinScreen();
    case 'avatar': return avatarScreen(false);
    case 'world': return worldScreen(Number(a));
    case 'zone': return zoneScreen(a);
    case 'list': return listScreen(a, Number(b));
    case 'learn': return learnScreen(a);
    case 'practise': return practiseScreen(a, b);
    case 'challenge': return challengeScreen(a);
    case 'check': return checkScreen(a);
    case 'notebook': return notebookScreen();
    case 'shop': return shopScreen(Number(a));
    case 'village': return villageScreen();
    default: return worldsScreen();
  }
}

function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }

window.addEventListener('hashchange', route);

(async function start() {
  try {
    await initSession();
  } catch (e) {
    console.warn(e);
  }
  sb.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_IN' && !store.user) { await initSession(); route(); }
  });
  // Clear auth leftovers from the address bar after Microsoft / email sign-in
  if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash);
  route();
})();
