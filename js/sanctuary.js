// Year 5 Outback Wildlife Sanctuary: the student is a ranger who builds a sanctuary in the outback.
import * as THREE from '../vendor/three.module.min.js';
import { b, cyl, M } from './village.js';

const ERAS = [
  { id: 'camp', name: 'Ranger Camp', years: 'Set up your base in the outback', icon: '⛺', need: 0 },
  { id: 'rescue', name: 'Rescue Centre', years: 'Care for injured and orphaned animals', icon: '🩹', need: 3 },
  { id: 'sanctuary', name: 'Wildlife Sanctuary', years: 'Protect rare and endangered animals', icon: '🦘', need: 3 },
  { id: 'park', name: 'Outback Discovery Park', years: 'Share the wonders of the outback with visitors', icon: '🌏', need: 3 },
];

const BUILDINGS = [
  // Ranger Camp
  { id: 'v5-tent', era: 'camp', name: 'Ranger tent', icon: '⛺', cost: 10, pos: [-6, -6],
    fact: 'Rangers look after Australia\'s national parks and wildlife. Many Indigenous ranger groups care for Country across Australia, combining knowledge passed down for thousands of years with modern science.' },
  { id: 'v5-tank', era: 'camp', name: 'Rainwater tank', icon: '💧', cost: 20, pos: [5, -7],
    fact: 'Some parts of the outback get less than 250 millimetres of rain in a whole year — that\'s less than a quarter of London\'s rainfall. Every drop that falls on the roof is collected in a tank.' },
  { id: 'v5-solar', era: 'camp', name: 'Solar panels', icon: '☀️', cost: 25, pos: [13, -8],
    fact: 'Australia receives more sunshine per square metre than any other continent. Remote stations far from any power lines use solar panels to make their own electricity.' },
  { id: 'v5-ute', era: 'camp', name: '4WD ranger truck', icon: '🛻', cost: 35, pos: [-9, 3],
    fact: 'Many outback roads are rough dirt tracks, and the next town can be hundreds of kilometres away. Drivers always carry extra fuel, water, food and spare tyres in case they break down.' },
  // Rescue Centre
  { id: 'v5-kangaroo', era: 'rescue', name: 'Kangaroo paddock', icon: '🦘', cost: 40, pos: [-16, 9],
    fact: 'The red kangaroo is the largest marsupial in the world. When a baby kangaroo — called a joey — is born, it is only about the size of a jellybean, and it crawls into its mother\'s pouch to grow.' },
  { id: 'v5-koala', era: 'rescue', name: 'Koala gum trees', icon: '🐨', cost: 45, pos: [-19, -6],
    fact: 'Koalas eat almost nothing but eucalyptus (gum) leaves. The leaves give them very little energy, so koalas sleep for up to 20 hours a day!' },
  { id: 'v5-wombat', era: 'rescue', name: 'Wombat burrow', icon: '🕳️', cost: 50, pos: [-7, 13],
    fact: 'Wombats dig long burrows with their strong claws. Their pouch faces backwards so it doesn\'t fill with soil — and amazingly, wombats produce cube-shaped poo!' },
  { id: 'v5-emu', era: 'rescue', name: 'Emu enclosure', icon: '🐦', cost: 55, pos: [6, 11],
    fact: 'Emus cannot fly, but they can run at up to 50 kilometres per hour. Unusually, it is the father emu who sits on the eggs for about eight weeks and then cares for the chicks.' },
  { id: 'v5-hospital', era: 'rescue', name: 'Wildlife hospital', icon: '🏥', cost: 80, pos: [16, 3],
    fact: 'Wildlife carers nurse injured and orphaned animals until they are strong enough to return to the wild. Orphaned joeys are kept warm in soft cloth bags that work like a mother\'s pouch.' },
  // Wildlife Sanctuary
  { id: 'v5-billabong', era: 'sanctuary', name: 'Billabong', icon: '🦆', cost: 70, pos: [-2, -13],
    fact: 'A billabong is a pool left behind when a river changes its course or dries up. The word comes from Wiradjuri, an Aboriginal language from New South Wales. Billabongs are vital drinking spots for wildlife.' },
  { id: 'v5-bilby', era: 'sanctuary', name: 'Bilby burrows', icon: '🐰', cost: 75, pos: [17, 13],
    fact: 'The greater bilby is an endangered desert marsupial with huge ears and a long nose. Many Australians buy chocolate Easter bilbies instead of Easter bunnies to help raise money to protect them.' },
  { id: 'v5-echidna', era: 'sanctuary', name: 'Echidna log', icon: '🦔', cost: 60, pos: [22, -3],
    fact: 'Echidnas and platypuses are monotremes — the only mammals in the world that lay eggs. An echidna uses its long sticky tongue to slurp up ants and termites.' },
  // Outback Discovery Park
  { id: 'v5-windmill', era: 'park', name: 'Windmill and trough', icon: '💨', cost: 70, pos: [23, 7],
    fact: 'On huge outback cattle stations, metal windmills use the wind to pump water up from deep underground, so cattle and wildlife have water to drink even in the driest months.' },
  { id: 'v5-stars', era: 'park', name: 'Stargazing tower', icon: '🔭', cost: 90, pos: [10, -15],
    fact: 'With almost no light pollution, the outback has some of the darkest skies on Earth. Aboriginal astronomers noticed the "Emu in the Sky" — a shape made by dark dust clouds in the Milky Way — and used it to know when emus were laying their eggs.' },
  { id: 'v5-culture', era: 'park', name: 'Visitor & culture centre', icon: '🏛️', cost: 100, pos: [-14, -15],
    fact: 'Aboriginal and Torres Strait Islander peoples have cared for this land for at least 65,000 years — the oldest continuing cultures on Earth. At Uluru, the Anangu Traditional Owners asked visitors not to climb the rock because it is sacred to them, and the climb was closed for good in 2019.' },
  { id: 'v5-airstrip', era: 'park', name: 'Flying doctor airstrip', icon: '✈️', cost: 150, pos: [0, -25],
    fact: 'The Royal Flying Doctor Service began in 1928. Its planes fly doctors and nurses to people living hundreds of kilometres from the nearest hospital, and it still helps thousands of people every day.' },
];

// ───────── models ─────────

const RED = '#c9622f', SAND = '#e3a15e', GUM_TRUNK = '#e8e2d6', GUM_LEAF = '#7f9a63', METAL = '#b8bec6', WOOD = '#8a5a34';

function gumTree(g, x, z, s = 1) {
  b(g, 0.7 * s, 5 * s, 0.7 * s, GUM_TRUNK, x, 0, z);
  b(g, 0.4 * s, 2 * s, 0.4 * s, GUM_TRUNK, x + 0.8 * s, 3.6 * s, z, 0.5);
  b(g, 3.2 * s, 1.4 * s, 3 * s, GUM_LEAF, x, 4.8 * s, z); b(g, 2.2 * s, 1.2 * s, 2.2 * s, '#8eab70', x + 1 * s, 5.8 * s, z + 0.5 * s);
}
function fence(g, w, d, col = WOOD) {
  b(g, w, 0.08, d, '#c9b56a', 0, 0, 0); // patch of dry grass inside the pen
  for (let x = -w / 2; x <= w / 2; x += 2) { b(g, 0.3, 1.4, 0.3, col, x, 0, -d / 2); b(g, 0.3, 1.4, 0.3, col, x, 0, d / 2); }
  for (let z = -d / 2 + 2; z < d / 2; z += 2) { b(g, 0.3, 1.4, 0.3, col, -w / 2, 0, z); b(g, 0.3, 1.4, 0.3, col, w / 2, 0, z); }
  b(g, w, 0.15, 0.15, '#c8c8c8', 0, 1, -d / 2); b(g, w, 0.15, 0.15, '#c8c8c8', 0, 1, d / 2);
  b(g, 0.15, 0.15, d, '#c8c8c8', -w / 2, 1, 0); b(g, 0.15, 0.15, d, '#c8c8c8', w / 2, 1, 0);
}
function kangaroo(g, x, z, ry, anim, k) {
  const r = new THREE.Group(); r.position.set(x, 0, z); r.rotation.y = ry; g.add(r);
  b(r, 1.2, 1.6, 0.9, '#7e4a2e', 0, 0.9, 0).rotation.z = -0.35;
  b(r, 0.5, 1.1, 0.7, '#ead2b0', 0.45, 1.1, 0).rotation.z = -0.35; // pale belly
  b(r, 0.6, 0.6, 0.6, '#7e4a2e', 0.6, 2.4, 0); b(r, 0.5, 0.3, 0.4, '#6b3d25', 1.05, 2.4, 0);
  b(r, 0.15, 0.5, 0.2, '#6b3d25', 0.5, 3, -0.15); b(r, 0.15, 0.5, 0.2, '#6b3d25', 0.5, 3, 0.15);
  b(r, 1.8, 0.35, 0.35, '#74432a', -1.2, 0.4, 0).rotation.z = 0.3;
  b(r, 1, 0.35, 0.4, '#6b3d25', 0.2, 0, -0.3); b(r, 1, 0.35, 0.4, '#6b3d25', 0.2, 0, 0.3);
  anim.push((t) => { r.position.y = Math.max(0, Math.sin(t * 4 + k)) * 0.9; });
}

const MODELS = {
  'v5-tent'(g) {
    const l = b(g, 0.2, 3.2, 4.5, '#4d7a3a', -1.1, 0, 0); l.rotation.z = -0.6;
    const r = b(g, 0.2, 3.2, 4.5, '#5b8a44', 1.1, 0, 0); r.rotation.z = 0.6;
    b(g, 2.2, 0.2, 4.5, '#3d5f2e', 0, 0, 0);
    b(g, 3, 0.3, 1.2, '#2f6f9f', 3, 0, 1.5); // swag
    b(g, 0.8, 1, 0.8, WOOD, 3.2, 0, -1.6); // crate
  },
  'v5-tank'(g) {
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b(g, 0.3, 1.4, 0.3, WOOD, x, 0, z);
    b(g, 3, 0.3, 3, WOOD, 0, 1.4, 0);
    const t = cyl(g, 1.6, 1.6, 3.4, 14, METAL, 0, 1.7, 0);
    for (let y = 2; y < 5; y += 0.6) cyl(g, 1.65, 1.65, 0.12, 14, '#9aa1aa', 0, y, 0);
    cyl(g, 1.7, 1.7, 0.3, 14, '#8d949c', 0, 5.1, 0);
    b(g, 0.3, 0.3, 1.2, '#7b8188', 0, 2, 1.8); void t;
  },
  'v5-solar'(g) {
    for (let i = -1; i <= 1; i++) {
      b(g, 0.3, 1.4, 0.3, METAL, i * 3, 0, 0.8); b(g, 0.3, 0.7, 0.3, METAL, i * 3, 0, -0.8);
      const p = b(g, 2.6, 0.15, 2.4, '#20407a', i * 3, 1.1, 0); p.rotation.x = 0.45;
      for (let k = -1; k <= 1; k++) { const line = b(g, 0.05, 0.17, 2.4, '#9fb4d8', i * 3 + k * 0.85, 1.1, 0); line.rotation.x = 0.45; }
    }
  },
  'v5-ute'(g) {
    b(g, 5, 1, 2.4, '#f4f4f2', 0, 0.7, 0); b(g, 2.2, 1, 2.2, '#f4f4f2', 0.9, 1.7, 0);
    b(g, 0.1, 0.7, 1.8, '#2c3e50', 2.01, 1.85, 0); b(g, 1.6, 0.7, 0.1, '#2c3e50', 0.9, 1.85, 1.11); b(g, 1.6, 0.7, 0.1, '#2c3e50', 0.9, 1.85, -1.11);
    b(g, 2.4, 0.2, 2.2, '#5d6470', 0.9, 2.7, 0); // roof rack
    b(g, 2.2, 0.6, 2.2, '#3f6b3a', -1.3, 1.7, 0); // canvas load
    b(g, 4.8, 0.3, 0.2, '#2f8a4a', 0, 1.2, 1.21); // stripe
    for (const [x, z] of [[-1.7, -1.2], [-1.7, 1.2], [1.7, -1.2], [1.7, 1.2]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 12), M('#2b2b2b')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.6, z); g.add(w);
    }
  },
  'v5-kangaroo'(g, anim) {
    fence(g, 10, 8);
    kangaroo(g, -2, -1, 0.4, anim, 0); kangaroo(g, 2, 1.5, 2.6, anim, 1.7); kangaroo(g, 1, -2, -1, anim, 3);
    b(g, 1.6, 0.5, 0.8, '#7b8b98', -3.5, 0, 2.6); // water trough
  },
  'v5-koala'(g, anim) {
    gumTree(g, -2, 0, 1.1); gumTree(g, 2.5, 1, 0.95);
    const koala = (x, y, z, k) => {
      const kg = new THREE.Group(); kg.position.set(x, y, z); g.add(kg);
      b(kg, 0.9, 1, 0.8, '#8f949b', 0, 0, 0); b(kg, 0.9, 0.8, 0.8, '#9aa0a7', 0, 1, 0.1);
      b(kg, 0.4, 0.4, 0.2, '#bfc4ca', -0.45, 1.6, 0.1); b(kg, 0.4, 0.4, 0.2, '#bfc4ca', 0.45, 1.6, 0.1); b(kg, 0.3, 0.3, 0.2, '#2b2b2b', 0, 1.15, 0.5);
      anim.push((t) => { kg.rotation.z = Math.sin(t * 0.8 + k) * 0.05; });
    };
    koala(-1.6, 3.4, 0.4, 0); koala(2.8, 3.1, 1.4, 2);
  },
  'v5-wombat'(g, anim) {
    b(g, 6, 1.2, 4, '#c97a45', 0, 0, 0); b(g, 4, 0.8, 3, '#d08950', 0, 1.2, -0.3);
    b(g, 1.4, 1, 0.3, '#3b2418', -1, 0.1, 2.01);
    const w = new THREE.Group(); w.position.set(1.4, 0, 3); g.add(w);
    b(w, 1.6, 1, 1, '#6b5444', 0, 0.2, 0); b(w, 0.7, 0.7, 0.8, '#5e493b', 0.95, 0.4, 0);
    anim.push((t) => { w.position.x = 1.4 + Math.sin(t * 0.7) * 0.8; });
  },
  'v5-emu'(g, anim) {
    fence(g, 8, 6);
    [[-1.5, 0, 0], [1.6, 1, 2]].forEach(([x, z, k]) => {
      const e = new THREE.Group(); e.position.set(x, 0, z); g.add(e);
      b(e, 1.4, 1.1, 1, '#4b3a2c', 0, 1.6, 0); b(e, 0.3, 1.4, 0.3, '#6a5a4c', 0.6, 2.4, 0); b(e, 0.5, 0.4, 0.4, '#3a2c22', 0.8, 3.7, 0);
      b(e, 0.2, 1.6, 0.2, '#7a6a5a', -0.2, 0, -0.25); b(e, 0.2, 1.6, 0.2, '#7a6a5a', 0.2, 0, 0.25);
      anim.push((t) => { e.position.x = x + Math.sin(t * 0.6 + k) * 1.4; e.rotation.y = Math.cos(t * 0.6 + k) > 0 ? 0 : Math.PI; });
    });
  },
  'v5-hospital'(g) {
    b(g, 7, 3, 5, '#f7f4ee', 0, 0, 0);
    const r1 = b(g, 7.6, 0.3, 3, '#3f8f6a', 0, 3.1, -1.2); r1.rotation.x = 0.3;
    const r2 = b(g, 7.6, 0.3, 3, '#3f8f6a', 0, 3.1, 1.2); r2.rotation.x = -0.3;
    b(g, 1.4, 2.2, 0.2, '#6b4a2c', 0, 0, 2.51);
    b(g, 1.2, 1, 0.2, '#9fd8f0', -2.2, 1.2, 2.51); b(g, 1.2, 1, 0.2, '#9fd8f0', 2.2, 1.2, 2.51);
    // paw-print sign
    b(g, 0.2, 2.6, 0.2, WOOD, 4.5, 0, 3); b(g, 1.8, 1.4, 0.2, '#f6d04d', 4.5, 2.4, 3);
    b(g, 0.6, 0.5, 0.25, '#6b4a2c', 4.5, 2.6, 3); for (const dx of [-0.5, -0.17, 0.17, 0.5]) b(g, 0.25, 0.25, 0.25, '#6b4a2c', 4.5 + dx, 3.25, 3);
  },
  'v5-billabong'(g, anim) {
    const water = M('#3f9bd6');
    [[0, 0, 8, 4], [-2.5, 1.6, 4, 3], [2.8, -1.2, 3.5, 2.6]].forEach(([x, z, w, d]) => b(g, w, 0.25, d, water, x, 0, z));
    b(g, 9, 0.12, 5.4, '#b5d98a', 0, 0, 0.2);
    for (let i = 0; i < 9; i++) b(g, 0.2, 1.2 + (i % 3) * 0.3, 0.2, '#6c8f3e', -4 + i * 0.4, 0, 2.6 - (i % 2) * 0.4);
    const duck = new THREE.Group(); duck.position.set(0, 0.25, 0); g.add(duck);
    b(duck, 0.8, 0.4, 0.5, '#7a5c3a', 0, 0, 0); b(duck, 0.35, 0.35, 0.35, '#2f6b3a', 0.45, 0.3, 0);
    anim.push((t) => { duck.position.x = Math.sin(t * 0.4) * 2.2; duck.position.z = Math.cos(t * 0.4) * 0.8; duck.rotation.y = -t * 0.4; });
    gumTree(g, 5, 2.5, 0.9);
  },
  'v5-bilby'(g, anim) {
    b(g, 5, 0.6, 4, '#e0a463', 0, 0, 0);
    for (const [x, z] of [[-1.4, -0.8], [1.2, 0.9]]) b(g, 0.8, 0.4, 0.8, '#5a3a24', x, 0.4, z);
    const bl = new THREE.Group(); bl.position.set(0, 0.6, 0); g.add(bl);
    b(bl, 1, 0.7, 0.6, '#a9a5a3', 0, 0, 0); b(bl, 0.6, 0.4, 0.4, '#b8b4b1', 0.6, 0.3, 0);
    b(bl, 0.15, 0.7, 0.3, '#e8b5b5', 0.4, 0.75, -0.18); b(bl, 0.15, 0.7, 0.3, '#e8b5b5', 0.4, 0.75, 0.18);
    b(bl, 0.8, 0.15, 0.15, '#2b2b2b', -0.8, 0.2, 0);
    anim.push((t) => { bl.position.y = 0.6 + (Math.sin(t * 1.3) > 0.6 ? 0.25 : 0); });
  },
  'v5-echidna'(g, anim) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 5, 10), M('#7a5a3e')); log.rotation.z = Math.PI / 2; log.position.set(0, 0.9, 0); g.add(log);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 10), M('#3a2618')); hole.rotation.z = Math.PI / 2; hole.position.set(2.55, 0.9, 0); g.add(hole);
    const e = new THREE.Group(); e.position.set(0, 0, 2); g.add(e);
    b(e, 1.4, 0.8, 1, '#5c4433', 0, 0, 0); b(e, 0.8, 0.12, 0.12, '#2b2b2b', 1, 0.2, 0);
    for (let i = 0; i < 8; i++) b(e, 0.12, 0.5, 0.12, '#efe6cf', -0.5 + (i % 4) * 0.33, 0.7, i < 4 ? -0.25 : 0.25);
    anim.push((t) => { e.position.x = Math.sin(t * 0.3) * 1.5; e.rotation.y = Math.cos(t * 0.3) > 0 ? 0 : Math.PI; });
  },
  'v5-windmill'(g, anim) {
    for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) { const l = b(g, 0.15, 7.5, 0.15, '#7d848c', x * 0.6, 0, z * 0.6); l.rotation.set(z * 0.08, 0, -x * 0.08); }
    b(g, 0.6, 0.6, 0.6, '#7d848c', 0, 7.3, 0);
    const fan = new THREE.Group(); fan.position.set(0, 7.6, 0.6); g.add(fan);
    for (let i = 0; i < 12; i++) { const blade = b(fan, 0.35, 1.8, 0.08, '#c9cfd6', 0, 0.4, 0); blade.position.set(Math.sin(i / 12 * Math.PI * 2) * 1.1, Math.cos(i / 12 * Math.PI * 2) * 1.1, 0); blade.rotation.z = -i / 12 * Math.PI * 2; }
    b(g, 0.1, 0.8, 2.4, '#d34a3a', 0, 7.2, -1.2); // tail vane
    b(g, 3.4, 0.8, 1.2, '#8d949c', 2.6, 0, 1.6); b(g, 3.1, 0.1, 0.9, '#3f9bd6', 2.6, 0.75, 1.6);
    anim.push((t) => { fan.rotation.z = t * 2; });
  },
  'v5-stars'(g) {
    for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) b(g, 0.4, 5, 0.4, WOOD, x, 0, z);
    b(g, 4.2, 0.4, 4.2, '#a06b3c', 0, 5, 0);
    for (const [x, z, w, d] of [[0, -2, 4.2, 0.2], [0, 2, 4.2, 0.2], [-2, 0, 0.2, 4.2], [2, 0, 0.2, 4.2]]) b(g, w, 1, d, WOOD, x, 5.4, z);
    const lad = b(g, 0.9, 5.4, 0.2, WOOD, 0, 0, 2.6); lad.rotation.x = -0.3;
    const scope = b(g, 0.5, 0.5, 2.2, '#f4f4f2', 0, 6.2, 0); scope.rotation.x = -0.6;
    b(g, 0.2, 0.9, 0.2, '#5d6470', 0, 5.4, 0.2);
  },
  'v5-culture'(g) {
    b(g, 10, 3, 5, '#d8b48a', 0, 0, 0);
    const roof = b(g, 11, 0.4, 6.4, '#8b4a2b', 0, 3.2, 0.3); roof.rotation.x = 0.12;
    for (let x = -4; x <= 4; x += 2) b(g, 0.4, 3.2, 0.4, '#7a4a2a', x, 0, 3.1);
    b(g, 2, 2.4, 0.2, '#4b2f1c', 0, 0, 2.51);
    b(g, 2.4, 1.2, 0.2, '#9fd8f0', -3, 1.2, 2.51); b(g, 2.4, 1.2, 0.2, '#9fd8f0', 3, 1.2, 2.51);
    b(g, 0.25, 1.2, 0.25, '#7a4a2a', 6.5, 0, 4); b(g, 2.2, 1, 0.2, '#f3e4c8', 6.5, 1.2, 4); // welcome sign
  },
  'v5-airstrip'(g, anim) {
    b(g, 40, 0.1, 5, '#e9c08e', 0, 0, 0);
    for (let x = -18; x <= 18; x += 4) b(g, 1.6, 0.12, 0.3, '#f7f4ee', x, 0, 0);
    const plane = new THREE.Group(); plane.position.set(9, 0, 0); g.add(plane);
    b(plane, 7, 1.2, 1.3, '#f7f4ee', 0, 1, 0); b(plane, 1.6, 0.9, 1.1, '#f7f4ee', 3.8, 1.1, 0);
    b(plane, 1.8, 0.2, 10, '#f7f4ee', 0.6, 1.8, 0); b(plane, 7, 0.25, 1.32, '#2f6fb3', 0, 1.35, 0);
    b(plane, 0.9, 2, 0.2, '#2f6fb3', -3.3, 1.9, 0); b(plane, 1, 0.2, 3, '#f7f4ee', -3.2, 1.6, 0);
    b(plane, 0.2, 1, 0.2, '#2b2b2b', 1, 0, -1.2); b(plane, 0.2, 1, 0.2, '#2b2b2b', 1, 0, 1.2); b(plane, 0.2, 0.8, 0.2, '#2b2b2b', -2.8, 0, 0);
    for (const z of [-3, 3]) { const pr = b(plane, 0.1, 1.6, 0.25, '#3a3a3a', 1.6, 1.5, z); anim.push((t) => { pr.rotation.x = t * 20; }); }
    // windsock
    b(g, 0.2, 4, 0.2, '#7d848c', -16, 0, 3.5);
    const sock = b(g, 1.6, 0.6, 0.6, '#ff7b2e', -15.1, 3.6, 3.5);
    anim.push((t) => { sock.rotation.y = Math.sin(t) * 0.3; });
  },
};

function outbackScenery(scene) {
  const ground = new THREE.Mesh(new THREE.BoxGeometry(110, 2, 90), M('#d9874c'));
  ground.position.y = -1; ground.receiveShadow = true; scene.add(ground);
  const g = new THREE.Group(); scene.add(g);
  // spinifex clumps, red rocks and termite mounds
  for (let i = 0; i < 90; i++) {
    const x = ((i * 37) % 100) - 50, z = ((i * 53) % 80) - 40;
    if (Math.abs(x) < 27 && Math.abs(z) < 18) continue;
    if (Math.abs(z + 25) < 4 && Math.abs(x) < 22) continue; // keep the airstrip clear
    if (i % 7 === 0) gumTreeScenery(g, x, z, i);
    else if (i % 5 === 0) { b(g, 1.2, 2.5 + (i % 3), 1.2, '#b8693a', x, 0, z); b(g, 0.7, 1, 0.7, '#b8693a', x, 2.5 + (i % 3), z); }
    else if (i % 4 === 0) b(g, 1.6, 0.8, 1.2, RED, x, 0, z);
    else b(g, 1, 0.6, 1, i % 2 ? '#b7a45a' : '#9f9a4e', x, 0, z);
  }
  // a few spinifex clumps inside the camp
  for (const [x, z] of [[-22, 1], [20, -12], [-3, 2], [12, 15], [-24, 14]]) b(g, 1, 0.6, 1, '#b7a45a', x, 0, z);
  // big red rock on the horizon and distant ranges
  const rock = new THREE.Group(); rock.position.set(-10, 0, -55); scene.add(rock);
  b(rock, 30, 7, 12, '#c4562a', 0, 0, 0); b(rock, 24, 3, 9, '#b84e25', 0, 7, 0); b(rock, 14, 1.5, 6, '#b84e25', 0, 10, 0);
  for (const [x, z, s] of [[30, -52, 9], [45, -40, 7], [-45, -45, 8]]) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(s, s * 0.7, 6), M('#a94f2c')); hill.position.set(x, s * 0.35 - 1, z); scene.add(hill);
  }
}
function gumTreeScenery(g, x, z, i) { gumTree(g, x, z, 0.8 + (i % 3) * 0.15); }

export const OUTBACK = {
  year: 5, title: 'My Outback Sanctuary', icon: '🦘', prefix: 'v5-',
  intro: 'You are an outback ranger! Spend your gems to build a sanctuary where rescued Australian animals can recover and thrive.',
  sky: '#ffd9a8', eras: ERAS, buildings: BUILDINGS, models: MODELS,
  scenery: outbackScenery, avatarPos: [1, 2], noMarker: [],
};
