// Blocky 3D avatar built from cubes with three.js
import * as THREE from '../vendor/three.module.min.js';

export const DEFAULT_AVATAR = {
  skin: '#e6ad86', eyes: '#3a2a1a', hair: 'short', hairColour: '#3b2a1e',
  top: '#2f8fdd', sleeves: 'short', bottom: 'shorts', bottomColour: '#263d66',
  shoes: '#f4f1ec', hat: 'none', hatColour: '#e2574c', glasses: false, cheeks: true,
  outfit: null, neck: null, tool: null,
};

export const OPTIONS = {
  skin: ['#f6d5bd', '#efc19f', '#e6ad86', '#d79f73', '#c4875f', '#a56b47', '#8a5634', '#6a3f26'],
  eyes: ['#3a2a1a', '#5a3a22', '#2e6b46', '#2a5ea8', '#1f2329'],
  hair: ['short', 'long', 'bun', 'ponytail', 'curly', 'spiky', 'bob', 'bald'],
  hairColour: ['#1f2329', '#3b2a1e', '#6a4126', '#8b4a20', '#c98a3b', '#e6c26b', '#b5432c', '#9aa0a6', '#7a5fc9', '#2f9e9a'],
  top: ['#e2574c', '#f2a057', '#f6d04d', '#6cc04a', '#2bb3a8', '#2f8fdd', '#1f5fa8', '#7f5cc4', '#ff9ec7', '#f6f3ee', '#343a45', '#263d66', '#b8a07e', '#c74f9c'],
  sleeves: ['short', 'long'],
  bottom: ['trousers', 'shorts', 'skirt', 'joggers'],
  bottomColour: ['#263d66', '#343a45', '#b8a07e', '#1f5fa8', '#7f5cc4', '#e2574c', '#6cc04a', '#ff9ec7', '#5d6b78'],
  shoes: ['#f4f1ec', '#343a45', '#e2574c', '#1f5fa8', '#f6d04d', '#ff9ec7', '#6cc04a'],
  hat: ['none', 'cap', 'beanie', 'headband', 'headphones'],
  hatColour: ['#e2574c', '#f2a057', '#f6d04d', '#6cc04a', '#2bb3a8', '#2f8fdd', '#1f5fa8', '#7f5cc4', '#ff9ec7', '#f6f3ee', '#343a45'],
};

// Items bought with gems, grouped by world shop
export const SHOP = {
  4: { name: 'Stone Age Trading Post', icon: '🪨', items: [
    { id: 'fur-tunic', slot: 'outfit', name: 'Fur tunic', cost: 30, icon: '🦫' },
    { id: 'bone-necklace', slot: 'neck', name: 'Bone necklace', cost: 20, icon: '🦴' },
    { id: 'fur-hood', slot: 'hat', name: 'Wolf-fur hood', cost: 40, icon: '🐺' },
    { id: 'flint-axe', slot: 'tool', name: 'Flint axe', cost: 35, icon: '🪓' },
    { id: 'spear', slot: 'tool', name: 'Hunting spear', cost: 60, icon: '🔱' },
    { id: 'mammoth-cloak', slot: 'outfit', name: 'Mammoth cloak', cost: 120, icon: '🦣' },
    { id: 'antler-headdress', slot: 'hat', name: 'Antler headdress', cost: 100, icon: '🦌' },
    { id: 'torch', slot: 'tool', name: 'Fire torch', cost: 80, icon: '🔥' },
  ] },
  5: { name: 'Outback Ranger Station', icon: '🦘', items: [
    { id: 'ranger-hat', slot: 'hat', name: 'Ranger hat', cost: 30, icon: '🤠' },
    { id: 'ranger-shirt', slot: 'outfit', name: 'Ranger shirt', cost: 40, icon: '👕' },
    { id: 'compass', slot: 'tool', name: 'Compass', cost: 35, icon: '🧭' },
    { id: 'binoculars', slot: 'neck', name: 'Binoculars', cost: 50, icon: '🔭' },
  ] },
  6: { name: 'Volcano Lair Supplies', icon: '🌋', items: [
    { id: 'hard-hat', slot: 'hat', name: 'Miner\'s hard hat', cost: 30, icon: '⛑️' },
    { id: 'pickaxe', slot: 'tool', name: 'Crystal pickaxe', cost: 40, icon: '⛏️' },
    { id: 'lab-coat', slot: 'outfit', name: 'Lab coat', cost: 60, icon: '🥼' },
    { id: 'villain-cape', slot: 'neck', name: 'Villain cape', cost: 120, icon: '🦹' },
  ] },
};
export const ITEMS = Object.fromEntries(Object.values(SHOP).flatMap((s) => s.items).map((i) => [i.id, i]));

// ───────── building the model ─────────

const matCache = new Map();
function mat(colour) {
  if (!matCache.has(colour)) matCache.set(colour, new THREE.MeshLambertMaterial({ color: colour }));
  return matCache.get(colour);
}
function box(w, hgt, d, colour, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), (Array.isArray(colour) || colour?.isMaterial) ? colour : mat(colour));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function faceTexture(a) {
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const g = c.getContext('2d');
  g.fillStyle = a.skin; g.fillRect(0, 0, 8, 8);
  // fringe
  if (a.hair !== 'bald' && !['fur-hood'].includes(a.hat)) {
    g.fillStyle = a.hairColour;
    g.fillRect(0, 0, 8, 2);
    if (a.hair === 'long' || a.hair === 'bob') { g.fillRect(0, 2, 1, 3); g.fillRect(7, 2, 1, 3); }
    if (a.hair === 'curly' || a.hair === 'spiky') { g.fillRect(1, 2, 2, 1); g.fillRect(5, 2, 1, 1); }
  }
  // eyes
  g.fillStyle = '#ffffff'; g.fillRect(1, 4, 2, 1); g.fillRect(5, 4, 2, 1);
  g.fillStyle = a.eyes; g.fillRect(2, 4, 1, 1); g.fillRect(5, 4, 1, 1);
  // brows
  g.fillStyle = shade(a.hair === 'bald' ? a.skin : a.hairColour, -0.15); g.fillRect(1, 3, 2, 1); g.fillRect(5, 3, 2, 1);
  // mouth
  g.fillStyle = '#9b4a3c'; g.fillRect(3, 6, 2, 1);
  if (a.cheeks) { g.fillStyle = 'rgba(230,110,110,0.55)'; g.fillRect(1, 5, 1, 1); g.fillRect(6, 5, 1, 1); }
  if (a.glasses) {
    g.fillStyle = '#1f2329';
    g.fillRect(0, 4, 1, 1); g.fillRect(7, 4, 1, 1); g.fillRect(3, 4, 2, 1);
    g.fillRect(1, 3, 2, 1); g.fillRect(5, 3, 2, 1); g.fillRect(1, 5, 2, 1); g.fillRect(5, 5, 2, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function furTexture(base, spot) {
  const c = document.createElement('canvas'); c.width = c.height = 8;
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 8, 8);
  g.fillStyle = spot;
  for (const [x, y] of [[1, 1], [5, 2], [2, 5], [6, 6], [3, 3], [0, 7], [7, 0]]) g.fillRect(x, y, 1, 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map: t });
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function buildAvatar(cfg) {
  const a = { ...DEFAULT_AVATAR, ...(cfg || {}) };
  const root = new THREE.Group();
  const skin = a.skin;

  // Clothing colours (shop outfits override)
  let topMat = mat(a.top), sleeveMat = topMat, bottomColour = a.bottomColour;
  if (a.outfit === 'fur-tunic') { topMat = furTexture('#8a5a34', '#6b4325'); sleeveMat = mat(skin); }
  if (a.outfit === 'mammoth-cloak') { topMat = furTexture('#6b4a2e', '#4e3420'); sleeveMat = topMat; bottomColour = '#6b4a2e'; }
  if (a.outfit === 'ranger-shirt') { topMat = mat('#b59a63'); sleeveMat = topMat; }
  if (a.outfit === 'lab-coat') { topMat = mat('#f4f6f8'); sleeveMat = topMat; }
  const longSleeves = a.sleeves === 'long' || a.outfit === 'mammoth-cloak' || a.outfit === 'lab-coat';
  if (a.outfit === 'fur-tunic') sleeveMat = mat(skin);

  // Legs (0..12), body (12..24), head (24..32)
  for (const x of [-2, 2]) {
    const legLen = 12;
    if (a.bottom === 'shorts') {
      box(4, 5, 4, bottomColour, x, 9.5, 0, root);
      box(4, 5, 4, skin, x, 4.5, 0, root);
    } else if (a.bottom === 'skirt') {
      box(4, 10, 4, skin, x, 7, 0, root);
    } else {
      box(4, 10, 4, a.bottom === 'joggers' ? shade(bottomColour, 0.05) : bottomColour, x, 7, 0, root);
      if (a.bottom === 'joggers') box(4.2, 1, 4.2, shade(bottomColour, -0.1), x, 2.5, 0, root);
    }
    box(4.2, 2, 4.6, a.shoes, x, 1, 0.2, root); // shoes
    void legLen;
  }
  if (a.bottom === 'skirt') box(9, 5, 5, bottomColour, 0, 10.5, 0, root);

  // Body
  box(8, 12, 4, topMat, 0, 18, 0, root);
  if (a.outfit === 'fur-tunic') box(8.4, 2, 4.4, '#6b4325', 0, 12.5, 0, root);
  if (a.outfit === 'lab-coat') box(8.3, 4, 4.3, '#f4f6f8', 0, 11, 0, root);

  // Arms (pivot at shoulder so the tool arm can be raised)
  const arms = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 6, 23, 0);
    root.add(pivot);
    if (longSleeves) box(4, 12, 4, sleeveMat, 0, -6, 0, pivot);
    else { box(4, 4, 4, sleeveMat, 0, -2, 0, pivot); box(4, 8, 4, skin, 0, -8, 0, pivot); }
    arms.push(pivot);
  }

  // Head
  const head = new THREE.Group();
  head.position.set(0, 28, 0);
  root.add(head);
  const skinM = mat(skin);
  const faceM = new THREE.MeshLambertMaterial({ map: faceTexture(a) });
  box(8, 8, 8, [skinM, skinM, skinM, skinM, faceM, skinM], 0, 0, 0, head);

  // Hair
  const hc = a.hairColour;
  const hidesHair = a.hat === 'fur-hood' || a.hat === 'beanie';
  if (a.hair !== 'bald' && !hidesHair) {
    box(8.6, 2, 8.6, hc, 0, 3.4, 0, head);                // top
    const backLen = { short: 4, long: 12, bun: 4, ponytail: 4, curly: 6, spiky: 4, bob: 7 }[a.hair] || 4;
    box(8.6, backLen, 1, hc, 0, 4 - backLen / 2, -4.1, head); // back
    const sideLen = { long: 9, bob: 7, curly: 6 }[a.hair] || 3;
    for (const s of [-1, 1]) box(0.8, sideLen, 6, hc, s * 4.2, 4 - sideLen / 2, -1, head);
    if (a.hair === 'bun') box(4, 3, 3, hc, 0, 5, -3, head);
    if (a.hair === 'ponytail') { box(2.4, 2.4, 2, hc, 0, 1.5, -5, head); box(2, 7, 2, hc, 0, -3, -5.4, head); }
    if (a.hair === 'curly') for (const [x, z] of [[-3, 3], [0, 3.5], [3, 3], [-3.5, 0], [3.5, 0], [0, -3]]) box(2.4, 2.4, 2.4, hc, x, 4.6, z, head);
    if (a.hair === 'spiky') for (const [x, z] of [[-3, 2], [0, 2.5], [3, 2], [-2, -1], [2, -1], [0, -3]]) box(1.6, 3, 1.6, hc, x, 5.6, z, head);
  }

  // Hats
  const hatC = a.hatColour;
  if (a.hat === 'cap') { box(8.8, 2.4, 8.8, hatC, 0, 4, 0, head); box(8, 0.6, 4, shade(hatC, -0.1), 0, 3, 6, head); }
  if (a.hat === 'beanie') { box(8.8, 3.6, 8.8, hatC, 0, 3.4, 0, head); box(9, 1.2, 9, shade(hatC, -0.12), 0, 1.8, 0, head); box(2, 1.5, 2, '#ffffff', 0, 6, 0, head); }
  if (a.hat === 'headband') box(8.8, 1.2, 8.8, hatC, 0, 2.4, 0, head);
  if (a.hat === 'headphones') { box(9.6, 1, 2, '#343a45', 0, 4.6, 0, head); for (const s of [-1, 1]) box(1.6, 3.4, 3.4, hatC, s * 4.6, 0.5, 0, head); }
  if (a.hat === 'fur-hood') {
    const fur = furTexture('#8d8f94', '#6e7075');
    box(9.2, 3, 9.2, fur, 0, 3.6, 0, head); box(9.2, 9, 1.2, fur, 0, 0, -4.6, head);
    for (const s of [-1, 1]) { box(1.2, 8, 8, fur, s * 4.6, 0, 0, head); box(1.6, 2, 1.2, '#6e7075', s * 3, 6, 0, head); }
  }
  if (a.hat === 'antler-headdress') {
    box(8.8, 1.4, 8.8, '#8a5a34', 0, 2.8, 0, head);
    for (const s of [-1, 1]) { box(1, 4, 1, '#e8dcc0', s * 3, 6, 0, head); box(3, 1, 1, '#e8dcc0', s * 4, 7.5, 0, head); box(1, 2.5, 1, '#e8dcc0', s * 5.5, 8.5, 0, head); }
  }
  if (a.hat === 'ranger-hat') { box(13, 0.8, 13, '#a07c48', 0, 3, 0, head); box(8.6, 3, 8.6, '#a07c48', 0, 4.8, 0, head); box(8.8, 0.8, 8.8, '#5d4428', 0, 3.8, 0, head); }
  if (a.hat === 'hard-hat') { box(9.2, 3, 9.2, '#f6c52b', 0, 4.2, 0, head); box(10, 0.6, 10, '#e0b020', 0, 2.8, 0.4, head); box(2, 1.6, 0.6, '#fff8c4', 0, 4, 4.8, head); }

  // Necklaces / capes
  if (a.neck === 'bone-necklace') for (const x of [-2.4, -0.8, 0.8, 2.4]) box(1, 1.6, 0.6, '#efe6cf', x, 22.5 - Math.abs(x) * -0.2 - (x === -0.8 || x === 0.8 ? 0.8 : 0), 2.3, root);
  if (a.neck === 'binoculars') { box(1.4, 2.4, 1.4, '#343a45', -1, 20, 2.6, root); box(1.4, 2.4, 1.4, '#343a45', 1, 20, 2.6, root); }
  if (a.neck === 'villain-cape') { box(9, 16, 0.6, '#5b1a6e', 0, 16, -2.6, root); box(10, 2, 5, '#3d0f4a', 0, 23.5, 0, root); }

  // Tool in right hand
  const hand = arms[0];
  if (a.tool) hand.rotation.x = -0.6;
  if (a.tool === 'flint-axe') { box(1, 12, 1, '#8a5a34', 0, -11, 3, hand); box(1.4, 3, 3, '#7d7f86', 0, -6, 4.5, hand); }
  if (a.tool === 'spear') { box(0.8, 22, 0.8, '#8a5a34', 0, -8, 3, hand); box(1.2, 3, 1.2, '#6f7177', 0, 4, 3, hand); }
  if (a.tool === 'torch') { box(1.2, 9, 1.2, '#6b4325', 0, -10, 3, hand); box(2, 2.4, 2, '#f2a057', 0, -5, 3, hand); box(1.2, 1.6, 1.2, '#f6d04d', 0, -3.4, 3, hand); }
  if (a.tool === 'compass') box(2.6, 0.8, 2.6, '#c9a227', 0, -12, 2, hand);
  if (a.tool === 'pickaxe') { box(1, 12, 1, '#8a5a34', 0, -11, 3, hand); box(1, 1.4, 8, '#5fd3e8', 0, -5.6, 3, hand); }

  root.position.y = -16;
  return root;
}

// ───────── live viewer ─────────

export function createAvatarView(container, cfg, { autoRotate = true, height } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(20, 40, 30); scene.add(sun);
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 500);
  camera.position.set(0, 4, 82);

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(20, 21, 2.4, 40), new THREE.MeshLambertMaterial({ color: 0xe9dcbc }));
  platform.position.y = -17.2;
  scene.add(platform);

  let model = buildAvatar(cfg);
  scene.add(model);
  let angle = 0.5, dragging = false, lastX = 0, raf = 0, idle = 0;

  function resize() {
    const w = container.clientWidth || 300, hgt = height || container.clientHeight || 300;
    renderer.setSize(w, hgt, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = hgt + 'px';
    camera.aspect = w / hgt; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  const el = renderer.domElement;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', (e) => { if (dragging) { angle += (e.clientX - lastX) * 0.012; lastX = e.clientX; idle = 0; } });
  el.addEventListener('pointerup', () => { dragging = false; });

  function loop() {
    raf = requestAnimationFrame(loop);
    idle++;
    if (autoRotate && !dragging && idle > 90) angle += 0.006;
    model.rotation.y = angle; platform.rotation.y = angle;
    model.position.y = -16 + Math.sin(performance.now() / 600) * 0.25;
    renderer.render(scene, camera);
  }
  loop();

  return {
    update(next) { scene.remove(model); model = buildAvatar(next); scene.add(model); },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); el.remove(); },
  };
}

// Small still picture (data URL) for headers and lists
let thumbRenderer = null;
const thumbCache = new Map();
export function avatarThumbnail(cfg, size = 160, full = false) {
  const key = JSON.stringify(cfg) + size + full;
  if (thumbCache.has(key)) return thumbCache.get(key);
  try {
    if (!thumbRenderer) {
      thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      thumbRenderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    thumbRenderer.setSize(size, size, false);
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(20, 40, 30); scene.add(sun);
    const m = buildAvatar(cfg); m.rotation.y = 0.45; m.position.y = full ? -17 : -26; scene.add(m);
    const cam = new THREE.PerspectiveCamera(30, 1, 1, 200); cam.position.set(0, full ? 1 : 2, full ? 74 : 34);
    thumbRenderer.render(scene, cam);
    const url = thumbRenderer.domElement.toDataURL('image/png');
    thumbCache.set(key, url);
    return url;
  } catch { return ''; }
}
