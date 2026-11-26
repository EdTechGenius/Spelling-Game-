// Year 4 Stone Age village: buildings, eras, history facts and the 3D blocky scene.
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { buildAvatar } from './avatar.js';

// ───────── Eras and buildings ─────────
// Each era unlocks when you have built `need` buildings from the era before.

const ERAS = [
  { id: 'old', name: 'Old Stone Age', years: 'Hunter-gatherers · before about 4000 BC in Britain', icon: '🔥', need: 0 },
  { id: 'new', name: 'New Stone Age', years: 'First farmers · about 4000–2500 BC', icon: '🌾', need: 3 },
  { id: 'bronze', name: 'Bronze Age', years: 'Metal workers · about 2500–800 BC', icon: '🥉', need: 3 },
  { id: 'iron', name: 'Iron Age', years: 'Hillforts and chariots · about 800 BC–AD 43', icon: '⚔️', need: 3 },
];

const BUILDINGS = [
  // Old Stone Age
  { id: 'v4-campfire', era: 'old', name: 'Campfire', icon: '🔥', cost: 10, pos: [0, 0],
    fact: 'Fire was one of the most important discoveries in human history. Early people in Britain used it to keep warm, cook their food and scare away wild animals such as wolves and bears.' },
  { id: 'v4-leanto', era: 'old', name: 'Lean-to shelter', icon: '⛺', cost: 20, pos: [-7, -5],
    fact: 'Hunter-gatherers moved from place to place following herds of animals, so they built quick shelters from wooden poles covered with animal skins that could be packed up and carried.' },
  { id: 'v4-rack', era: 'old', name: 'Drying rack', icon: '🦌', cost: 25, pos: [7, -5],
    fact: 'Meat and fish were dried or smoked over fires so they would last longer. Animal skins were stretched, scraped and dried to make clothes, bags and shelters — nothing was wasted.' },
  { id: 'v4-cave', era: 'old', name: 'Cave art rock', icon: '🎨', cost: 35, pos: [-19, -9],
    fact: 'At Creswell Crags in England, archaeologists discovered pictures of animals carved into cave walls about 13,000 years ago. It is the oldest cave art ever found in Britain.' },
  // New Stone Age
  { id: 'v4-field', era: 'new', name: 'Wheat field', icon: '🌾', cost: 40, pos: [-14, 9],
    fact: 'Farming arrived in Britain about 6,000 years ago. Instead of moving around, people began to stay in one place, clearing forests to grow wheat and barley.' },
  { id: 'v4-sheep', era: 'new', name: 'Sheep pen', icon: '🐑', cost: 45, pos: [-2, 11],
    fact: 'New Stone Age farmers kept sheep, cattle, goats and pigs. The animals gave them meat, milk, wool and leather — a much more reliable food supply than hunting.' },
  { id: 'v4-stonehouse', era: 'new', name: 'Stone house', icon: '🪨', cost: 60, pos: [9, 7],
    fact: 'At Skara Brae in Orkney, Scotland, you can still visit stone houses more than 5,000 years old. Inside are stone beds, stone shelves and a fireplace in the middle of the floor.' },
  { id: 'v4-pottery', era: 'new', name: 'Pottery fire pit', icon: '🏺', cost: 50, pos: [15, -3],
    fact: 'Farmers needed containers to store and cook their food, so they shaped pots from clay and hardened them in very hot fires. Pieces of these pots help archaeologists date ancient sites.' },
  { id: 'v4-circle', era: 'new', name: 'Stone circle', icon: '🗿', cost: 100, pos: [19, 10],
    fact: 'Stonehenge was built in stages, starting about 5,000 years ago. Some of its smaller stones were dragged and floated about 150 miles from the Preseli Hills in Wales — without any machines!' },
  // Bronze Age
  { id: 'v4-roundhouse', era: 'bronze', name: 'Roundhouse', icon: '🛖', cost: 70, pos: [-15, -1],
    fact: 'Roundhouses had walls of wattle and daub — woven sticks covered in a sticky mix of mud, straw and animal dung — and a thick thatched roof. A fire burned in the centre to keep the family warm.' },
  { id: 'v4-bronze', era: 'bronze', name: 'Bronze workshop', icon: '🥉', cost: 80, pos: [4, -11],
    fact: 'Bronze is made by melting copper and tin together. Cornwall had lots of tin, so British bronze was traded across Europe and made into tools, weapons and jewellery.' },
  { id: 'v4-loom', era: 'bronze', name: 'Weaving loom', icon: '🧶', cost: 60, pos: [-5, -11],
    fact: 'People spun sheep\'s wool into thread and wove it into cloth on tall upright looms. Heavy clay weights hung from the threads to keep them tight while they worked.' },
  // Iron Age
  { id: 'v4-forge', era: 'iron', name: 'Iron forge', icon: '⚒️', cost: 100, pos: [13, -11],
    fact: 'Iron reached Britain about 2,800 years ago. Iron ore was much easier to find than copper and tin, so strong iron tools such as ploughs and axes soon became common.' },
  { id: 'v4-granary', era: 'iron', name: 'Granary', icon: '🌽', cost: 70, pos: [22, -4],
    fact: 'Iron Age farmers stored grain in small huts raised up on wooden legs. This kept the grain dry and made it harder for mice and rats to reach it.' },
  { id: 'v4-chariot', era: 'iron', name: 'Chariot', icon: '🐎', cost: 120, pos: [3, 5],
    fact: 'Iron Age warriors raced into battle on light, two-wheeled chariots pulled by ponies. Some important people were even buried with their chariots, which archaeologists have found in Yorkshire.' },
  { id: 'v4-hillfort', era: 'iron', name: 'Hillfort walls', icon: '🏰', cost: 150, pos: [0, 0],
    fact: 'Iron Age people protected their villages with hillforts — huge earth banks, deep ditches and tall wooden fences. Maiden Castle in Dorset is one of the biggest hillforts in Europe.' },
];

export function eraUnlocked(world, eraIndex, owned) {
  if (eraIndex === 0) return true;
  const prev = world.eras[eraIndex - 1];
  const builtPrev = world.buildings.filter((x) => x.era === prev.id && owned.includes(x.id)).length;
  return eraUnlocked(world, eraIndex - 1, owned) && builtPrev >= world.eras[eraIndex].need;
}

export function currentEra(world, owned) {
  let idx = 0;
  for (let i = 0; i < world.eras.length; i++) if (eraUnlocked(world, i, owned)) idx = i;
  return idx;
}

// ───────── Voxel building helpers ─────────

const mats = new Map();
export const M = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c })); return mats.get(c); };
// box with its BOTTOM at y
export function b(g, w, h, d, c, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? M(c) : c);
  m.position.set(x, y + h / 2, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true;
  g.add(m); return m;
}
export function cyl(g, rt, rb, h, seg, c, x, y, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c));
  m.position.set(x, y + h / 2, z); m.castShadow = true; g.add(m); return m;
}

const WOOD = '#7a5230', DARK_WOOD = '#5b3b20', STONE = '#8d9096', STONE2 = '#a5a8ad', HIDE = '#c9a271', THATCH = '#d9b45a', MUD = '#a47b52';

function paintingTexture() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 16;
  const x = c.getContext('2d');
  x.fillStyle = '#9a9a9e'; x.fillRect(0, 0, 32, 16);
  x.fillStyle = '#b5482c';
  // mammoth
  x.fillRect(3, 5, 8, 4); x.fillRect(2, 4, 3, 3); x.fillRect(1, 7, 1, 4); x.fillRect(4, 9, 1, 3); x.fillRect(9, 9, 1, 3); x.fillRect(5, 4, 5, 1);
  // deer
  x.fillStyle = '#7a3b1e';
  x.fillRect(17, 7, 6, 3); x.fillRect(23, 5, 2, 3); x.fillRect(24, 2, 1, 3); x.fillRect(22, 3, 1, 2); x.fillRect(18, 10, 1, 3); x.fillRect(22, 10, 1, 3);
  // hand print
  x.fillStyle = '#d98a3a'; x.fillRect(27, 10, 3, 3); x.fillRect(27, 8, 1, 2); x.fillRect(29, 8, 1, 2); x.fillRect(30, 11, 1, 1);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map: t });
}

const MODELS = {
  'v4-campfire'(g, anim) {
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; b(g, 0.9, 0.6, 0.9, i % 2 ? STONE : STONE2, Math.cos(a) * 1.7, 0, Math.sin(a) * 1.7); }
    b(g, 3, 0.5, 0.5, DARK_WOOD, 0, 0.1, 0, 0.6); b(g, 3, 0.5, 0.5, WOOD, 0, 0.3, 0, -0.6);
    const flames = new THREE.Group(); g.add(flames);
    b(flames, 1.2, 1.4, 1.2, '#f2a057', 0, 0.5, 0); b(flames, 0.7, 1.2, 0.7, '#f6d04d', 0, 1.6, 0); b(flames, 0.35, 0.6, 0.35, '#fff2a8', 0, 2.6, 0);
    anim.push((t) => { flames.scale.y = 1 + Math.sin(t * 9) * 0.12; flames.rotation.y = t * 1.5; });
    // log seats
    b(g, 2.6, 0.7, 0.8, WOOD, 0, 0, 3.6); b(g, 0.8, 0.7, 2.6, WOOD, -3.6, 0, 0);
  },
  'v4-leanto'(g) {
    b(g, 0.4, 4, 0.4, WOOD, -2.5, 0, 1.5); b(g, 0.4, 4, 0.4, WOOD, 2.5, 0, 1.5); b(g, 5.6, 0.4, 0.4, WOOD, 0, 3.8, 1.5);
    const roof = b(g, 5.8, 0.3, 4.6, HIDE, 0, 1.8, -0.3); roof.rotation.x = -0.75;
    b(g, 4.5, 0.2, 2.5, '#8d6b4a', 0, 0, 0); // bedding hide
  },
  'v4-rack'(g) {
    for (const x of [-2.4, 2.4]) { const p1 = b(g, 0.3, 4, 0.3, WOOD, x, 0, -0.6); p1.rotation.x = 0.25; const p2 = b(g, 0.3, 4, 0.3, WOOD, x, 0, 0.6); p2.rotation.x = -0.25; }
    b(g, 5.4, 0.3, 0.3, WOOD, 0, 3.6, 0);
    [-1.6, -0.6, 0.4, 1.4].forEach((x, i) => b(g, 0.5, 1.6, 0.15, i % 2 ? '#8a3324' : '#6b2a1c', x, 2, 0));
    b(g, 2.2, 0.1, 1.6, HIDE, 3.6, 2.2, 0, 0.2);
  },
  'v4-cave'(g) {
    b(g, 12, 7, 5, STONE, 0, 0, -1); b(g, 9, 3, 4, STONE2, -1, 7, -1.5); b(g, 4, 2, 3, STONE, 3, 10, -1.5);
    b(g, 3, 4, 0.2, '#2a2620', -3.5, 0, 1.55); // cave mouth
    const art = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), paintingTexture());
    art.position.set(2.5, 3.8, 1.52); g.add(art);
  },
  'v4-field'(g) {
    b(g, 11, 0.3, 7, '#6b4a2b', 0, 0, 0);
    for (let x = -4.5; x <= 4.5; x += 1.5) for (let z = -2.6; z <= 2.6; z += 1.3) b(g, 0.35, 1.3, 0.35, (x + z) % 2 ? '#e2c25b' : '#d4ad3f', x, 0.3, z);
  },
  'v4-sheep'(g, anim) {
    for (let x = -4; x <= 4; x += 2) { b(g, 0.35, 1.6, 0.35, WOOD, x, 0, -3); b(g, 0.35, 1.6, 0.35, WOOD, x, 0, 3); }
    for (let z = -1; z <= 1; z += 2) { b(g, 0.35, 1.6, 0.35, WOOD, -4, 0, z); b(g, 0.35, 1.6, 0.35, WOOD, 4, 0, z); }
    b(g, 8.4, 0.25, 0.25, WOOD, 0, 1.1, -3); b(g, 8.4, 0.25, 0.25, WOOD, 0, 1.1, 3); b(g, 0.25, 0.25, 6, WOOD, -4, 1.1, 0); b(g, 0.25, 0.25, 6, WOOD, 4, 1.1, 0);
    [[-2, -1], [1, 1], [2.2, -1.4]].forEach(([x, z], i) => {
      const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = i * 1.3; g.add(s);
      b(s, 1.6, 1, 1, '#f3efe6', 0, 0.6, 0); b(s, 0.6, 0.6, 0.6, '#3b3530', 1, 0.9, 0);
      for (const [lx, lz] of [[-0.5, -0.3], [-0.5, 0.3], [0.5, -0.3], [0.5, 0.3]]) b(s, 0.2, 0.6, 0.2, '#3b3530', lx, 0, lz);
      anim.push((t) => { s.position.y = Math.abs(Math.sin(t * 2 + i)) * 0.15; });
    });
  },
  'v4-stonehouse'(g) {
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; if (i === 3) continue; b(g, 1.5, 2.2, 1, i % 2 ? STONE : STONE2, Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2, -a); }
    cyl(g, 3.6, 3.8, 0.8, 10, '#6f8f45', 0, 2.2, 0); cyl(g, 2.2, 3.4, 0.7, 10, '#7fa352', 0, 3, 0);
  },
  'v4-pottery'(g, anim) {
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; b(g, 0.8, 0.5, 0.8, STONE, Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5); }
    b(g, 1.6, 0.4, 1.6, '#f2a057', 0, 0, 0);
    const pots = [[2.8, 0.6], [3.2, -0.8], [-2.8, 0.9]];
    pots.forEach(([x, z], i) => { cyl(g, 0.5, 0.35, 1, 8, i === 1 ? '#a6603a' : '#c47a4a', x, 0, z); cyl(g, 0.4, 0.5, 0.3, 8, '#b56d42', x, 1, z); });
    const smoke = new THREE.Group(); g.add(smoke);
    for (let i = 0; i < 3; i++) b(smoke, 0.6, 0.6, 0.6, '#d9d9d9', 0, 1 + i * 1.2, 0);
    anim.push((t) => { smoke.children.forEach((s, i) => { s.position.y = 1 + ((t * 0.8 + i * 1.2) % 3.6); s.material.opacity = 0.8; }); });
  },
  'v4-circle'(g) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      b(g, 1.1, 4 + (i % 3) * 0.4, 0.8, i % 2 ? STONE : '#7b7e84', Math.cos(a) * 4.2, 0, Math.sin(a) * 4.2, -a);
    }
    b(g, 2.8, 0.7, 0.9, STONE2, 4.2 * Math.cos(0.31), 4.2, 4.2 * Math.sin(0.31), -0.31 - Math.PI / 2);
    b(g, 1.4, 2, 1, '#7b7e84', 0, 0, 0);
  },
  'v4-roundhouse'(g) {
    cyl(g, 3.6, 3.6, 2.8, 12, MUD, 0, 0, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5, 4.5, 12), M(THATCH)); roof.position.y = 2.8 + 2.25; roof.castShadow = true; g.add(roof);
    b(g, 1.4, 2, 0.6, '#3d2a1a', 0, 0, 3.4);
    b(g, 0.3, 2.4, 0.3, WOOD, -0.9, 0, 3.6); b(g, 0.3, 2.4, 0.3, WOOD, 0.9, 0, 3.6); b(g, 2.1, 0.3, 0.3, WOOD, 0, 2.3, 3.6);
  },
  'v4-bronze'(g, anim) {
    for (const [x, z] of [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]]) b(g, 0.35, 3.4, 0.35, WOOD, x, 0, z);
    b(g, 6, 0.4, 5, THATCH, 0, 3.4, 0);
    b(g, 1.8, 1.6, 1.8, '#9c6b45', -1, 0, -0.5);
    const glow = b(g, 0.9, 0.4, 0.9, '#ff8a3d', -1, 1.6, -0.5);
    b(g, 1, 0.9, 0.6, '#5a5e66', 1.5, 0, 0.8); b(g, 1.3, 0.3, 0.7, '#c98a3b', 1.5, 0.9, 0.8); // anvil + bronze bar
    anim.push((t) => { glow.material = M(Math.sin(t * 6) > 0 ? '#ff8a3d' : '#ffb347'); });
  },
  'v4-loom'(g) {
    cyl(g, 2.4, 2.4, 2.2, 10, MUD, -1.5, 0, -1);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 3, 10), M(THATCH)); roof.position.set(-1.5, 2.2 + 1.5, -1); g.add(roof);
    b(g, 0.3, 3.4, 0.3, WOOD, 1.8, 0, 1.6); b(g, 0.3, 3.4, 0.3, WOOD, 4.2, 0, 1.6); b(g, 2.8, 0.3, 0.3, WOOD, 3, 3.2, 1.6);
    ['#c0392b', '#e6c26b', '#2f8fdd', '#6cc04a', '#e6c26b', '#c0392b'].forEach((c, i) => b(g, 0.25, 2.2, 0.1, c, 2.1 + i * 0.42, 1, 1.6));
    for (let i = 0; i < 6; i++) b(g, 0.3, 0.3, 0.3, '#8a7a6a', 2.1 + i * 0.42, 0.6, 1.6);
  },
  'v4-forge'(g, anim) {
    b(g, 5, 3, 4, STONE, 0, 0, 0); b(g, 5.4, 0.6, 4.4, '#5d4a3a', 0, 3, 0);
    b(g, 1.2, 3, 1.2, STONE2, 1.6, 3, -1);
    b(g, 1.6, 1.8, 0.2, '#ff7a2e', -1, 0, 2.05);
    b(g, 1.2, 1, 0.7, '#3f434a', -1, 0, 3.4); b(g, 1.6, 0.35, 0.8, '#4b5058', -1, 1, 3.4);
    const smoke = new THREE.Group(); g.add(smoke);
    for (let i = 0; i < 4; i++) b(smoke, 0.8, 0.8, 0.8, '#bdbdbd', 1.6, 6, -1);
    anim.push((t) => smoke.children.forEach((s, i) => { s.position.y = 6.4 + ((t * 1.2 + i * 1.1) % 4.4); s.position.x = 1.6 + Math.sin(t + i) * 0.4; }));
  },
  'v4-granary'(g) {
    for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) b(g, 0.4, 2, 0.4, WOOD, x, 0, z);
    b(g, 3.6, 2.2, 3.6, MUD, 0, 2, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.4, 4), M(THATCH)); roof.position.y = 4.2 + 1.2; roof.rotation.y = Math.PI / 4; g.add(roof);
    const ladder = b(g, 0.8, 2.4, 0.2, WOOD, 0, 0, 2.6); ladder.rotation.x = -0.35;
  },
  'v4-chariot'(g) {
    for (const z of [-1.1, 1.1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.25, 10), M(DARK_WOOD)); w.rotation.x = Math.PI / 2; w.position.set(0, 0.9, z); g.add(w); }
    b(g, 1.8, 0.3, 2, WOOD, 0, 0.9, 0); b(g, 0.25, 1, 2, WOOD, -0.8, 1.2, 0);
    b(g, 3.2, 0.2, 0.2, WOOD, 2.3, 1.1, 0);
    const pony = new THREE.Group(); pony.position.set(4.4, 0, 0); g.add(pony);
    b(pony, 2, 1.1, 0.9, '#6b4423', 0, 1.2, 0); b(pony, 0.6, 1.1, 0.6, '#6b4423', 1, 1.8, 0); b(pony, 0.9, 0.5, 0.5, '#5a381c', 1.4, 2.6, 0);
    for (const [x, z] of [[-0.7, -0.3], [-0.7, 0.3], [0.7, -0.3], [0.7, 0.3]]) b(pony, 0.25, 1.2, 0.25, '#4a2e17', x, 0, z);
    b(pony, 0.2, 0.9, 0.2, '#2b1a0d', -1.1, 1.4, 0);
  },
  'v4-hillfort'(g) {
    // wooden palisade around the edge of the village, with a gateway at the front
    const W = 27, Dz = 18;
    const post = (x, z) => b(g, 0.7, 3.2 + ((Math.abs(x * 7 + z * 3)) % 3) * 0.15, 0.7, (Math.round(x + z) % 2) ? WOOD : DARK_WOOD, x, 0, z);
    for (let x = -W; x <= W; x += 1.4) { post(x, -Dz); if (Math.abs(x) > 3) post(x, Dz); }
    for (let z = -Dz; z <= Dz; z += 1.4) { post(-W, z); post(W, z); }
    // earth bank
    b(g, W * 2 + 3, 0.8, 1.6, '#6f8f45', 0, 0, -Dz - 1.4); b(g, W * 2 + 3, 0.8, 1.6, '#6f8f45', -W / 2 - 3.5, 0, Dz + 1.4).scale.x = 0.42;
    b(g, W * 2 + 3, 0.8, 1.6, '#6f8f45', W / 2 + 3.5, 0, Dz + 1.4).scale.x = 0.42;
    // gate towers
    for (const x of [-3.2, 3.2]) { b(g, 1.8, 5, 1.8, WOOD, x, 0, Dz); b(g, 2.2, 0.4, 2.2, DARK_WOOD, x, 5, Dz); }
    b(g, 8.2, 0.6, 0.8, DARK_WOOD, 0, 4.4, Dz);
  },
};

function stoneAgeScenery(scene) {
  // ground and river
  const ground = new THREE.Mesh(new THREE.BoxGeometry(80, 2, 64), M('#8fcf6b'));
  ground.position.y = -1; ground.receiveShadow = true; scene.add(ground);
  const river = new THREE.Mesh(new THREE.BoxGeometry(80, 0.3, 4), new THREE.MeshLambertMaterial({ color: '#4aa3df' }));
  river.position.set(0, 0.05, -22); scene.add(river);
  // grass tufts / flowers
  const g = new THREE.Group(); scene.add(g);
  for (let i = 0; i < 70; i++) {
    const x = ((i * 37) % 76) - 38, z = ((i * 53) % 60) - 30;
    if (Math.abs(x) < 26 && Math.abs(z) < 17) continue;
    if (i % 3 === 0) tree(g, x, z, i); else b(g, 0.5, 0.4, 0.5, i % 2 ? '#78b85a' : '#f6d04d', x, 0, z);
  }
  // a few trees inside the camp
  [[-22, 14], [23, -14], [-23, -15], [10, 14]].forEach(([x, z], i) => tree(g, x, z, i));
  // distant hills
  for (const [x, z, s] of [[-30, -34, 10], [-8, -36, 14], [18, -35, 11], [36, -32, 8]]) {
    const hgt = new THREE.Mesh(new THREE.ConeGeometry(s, s * 0.9, 6), M('#6fae55')); hgt.position.set(x, s * 0.45 - 1, z); scene.add(hgt);
  }
}

export function tree(g, x, z, i) {
  b(g, 0.8, 2.2 + (i % 3) * 0.4, 0.8, WOOD, x, 0, z);
  const top = i % 2 ? '#3f8f3a' : '#4f9e44';
  b(g, 3, 2, 3, top, x, 2.2, z); b(g, 2, 1.4, 2, top, x, 4.2, z);
}

export const STONE_AGE = {
  year: 4, title: 'My Stone Age Village', icon: '🛖', prefix: 'v4-',
  intro: 'Spend your gems to grow your camp into a village — and travel through time from the Old Stone Age to the Iron Age!',
  eraWord: 'era', sky: '#bfe6ff', eras: ERAS, buildings: BUILDINGS, models: MODELS,
  scenery: stoneAgeScenery, avatarPos: [2.6, 2.6], noMarker: ['v4-hillfort'],
};

// ───────── The live scene ─────────

export function createVillageView(container, { world, owned, avatar, onPick }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(world.sky);
  scene.fog = new THREE.Fog(world.sky, 70, 130);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8f4e, 1.3));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
  sun.position.set(25, 40, 20); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40 });
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 300);
  camera.position.set(30, 32, 44);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.3; controls.minPolarAngle = 0.3;
  controls.minDistance = 18; controls.maxDistance = 85;
  controls.enablePan = false;

  world.scenery(scene);

  const builds = new Map(); // id -> group
  const anims = [];
  function addBuilding(id, pop = false) {
    const def = world.buildings.find((x) => x.id === id);
    if (!def || builds.has(id) || !world.models[id]) return;
    const g = new THREE.Group();
    g.position.set(def.pos[0], 0, def.pos[1]);
    const local = [];
    world.models[id](g, local);
    g.traverse((o) => { o.userData.buildingId = id; });
    scene.add(g);
    builds.set(id, g);
    local.forEach((fn) => anims.push(fn));
    if (pop) { g.scale.setScalar(0.01); g.userData.popStart = performance.now(); }
  }
  owned.filter((id) => id.startsWith(world.prefix)).forEach((id) => addBuilding(id));

  // the student's explorer stands by the campfire
  let me = null;
  if (avatar) {
    me = buildAvatar(avatar);
    me.scale.setScalar(0.17);
    me.position.set(world.avatarPos[0], 16 * 0.17, world.avatarPos[1]);
    me.rotation.y = 0.6;
    scene.add(me);
  }

  // building plots that can be built next are marked with stakes
  const markers = new THREE.Group(); scene.add(markers);
  function drawMarkers(available) {
    markers.clear();
    for (const def of available) {
      if ((world.noMarker || []).includes(def.id)) continue;
      const m = new THREE.Group(); m.position.set(def.pos[0], 0, def.pos[1]);
      for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) b(m, 0.2, 1, 0.2, '#e8d6a8', x, 0, z);
      b(m, 3.2, 0.08, 0.08, '#f2f2f2', 0, 0.8, -1.5); b(m, 3.2, 0.08, 0.08, '#f2f2f2', 0, 0.8, 1.5);
      b(m, 0.08, 0.08, 3.2, '#f2f2f2', -1.5, 0.8, 0); b(m, 0.08, 0.08, 3.2, '#f2f2f2', 1.5, 0.8, 0);
      m.traverse((o) => { o.userData.buildingId = def.id; });
      markers.add(m);
    }
  }

  // tap a building to see its history card
  const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2();
  let downAt = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects([...builds.values(), markers], true).find((h) => h.object.userData.buildingId);
    if (hit && onPick) onPick(hit.object.userData.buildingId);
  });

  function resize() {
    const w = container.clientWidth || 600, hgt = container.clientHeight || 420;
    renderer.setSize(w, hgt, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = w / hgt; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    const t = performance.now() / 1000;
    anims.forEach((fn) => fn(t));
    for (const g of builds.values()) {
      if (g.userData.popStart) {
        const k = Math.min(1, (performance.now() - g.userData.popStart) / 700);
        const s = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.25 * (1 - k) + (k - 1) * 0 : 1;
        g.scale.setScalar(Math.max(0.01, k * s));
        if (k >= 1) { g.scale.setScalar(1); delete g.userData.popStart; }
      }
    }
    if (me) me.position.y = 16 * 0.17 + Math.abs(Math.sin(t * 1.5)) * 0.15;
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  return {
    build(id) { addBuilding(id, true); },
    markers: drawMarkers,
    focus(id) {
      const def = world.buildings.find((x) => x.id === id);
      if (def) controls.target.set(def.pos[0] * 0.5, 0, def.pos[1] * 0.5);
    },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
