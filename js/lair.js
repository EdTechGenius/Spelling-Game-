// Year 6 Volcano Lair: the student builds a secret lair deep under a volcano.
// The facts link to the Year 6 rocks and soils science topic.
import * as THREE from '../vendor/three.module.min.js';
import { b, cyl, M } from './village.js';

const ERAS = [
  { id: 'hideout', name: 'Secret Hideout', years: 'Dig your way under the volcano', icon: '⛏️', need: 0 },
  { id: 'lab', name: 'Rock Laboratory', years: 'Study the rocks of the Earth', icon: '🔬', need: 3 },
  { id: 'hq', name: 'Villain HQ', years: 'Take control of the volcano', icon: '🦹', need: 3 },
  { id: 'ultimate', name: 'Ultimate Lair', years: 'The most spectacular lair on Earth', icon: '🌋', need: 3 },
];

const BUILDINGS = [
  // Secret Hideout
  { id: 'v6-tunnel', era: 'hideout', name: 'Lava tube entrance', icon: '🕳️', cost: 10, pos: [-2, -18],
    fact: 'Lava tubes are natural tunnels made by volcanoes. The outside of a lava flow cools and hardens into a crust while hot lava keeps flowing inside. When the lava drains away, a long tunnel is left behind.' },
  { id: 'v6-minecart', era: 'hideout', name: 'Mine cart railway', icon: '🛤️', cost: 20, pos: [8, -12],
    fact: 'Miners have used carts on rails for hundreds of years to move heavy rock. Some old Cornish tin mines dug their tunnels so far that they stretched out under the sea bed — miners could hear the waves rolling boulders above their heads!' },
  { id: 'v6-drill', era: 'hideout', name: 'Diamond drill', icon: '💎', cost: 25, pos: [-14, -11],
    fact: 'Diamond is the hardest natural material on Earth. Drills tipped with tiny diamonds can cut through even the toughest rock, which is why they are used to drill tunnels and mines.' },
  { id: 'v6-sorting', era: 'hideout', name: 'Rock sorting table', icon: '🪨', cost: 35, pos: [4, -3],
    fact: 'Scientists sort rocks into three groups depending on how they were made: igneous rocks form from cooled magma or lava, sedimentary rocks form from layers of sediment pressed together, and metamorphic rocks are changed by heat and pressure.' },
  // Rock Laboratory
  { id: 'v6-lava', era: 'lab', name: 'Lava pool', icon: '🔥', cost: 40, pos: [-14, 4],
    fact: 'Melted rock underground is called magma. When it erupts out of a volcano it is called lava, and it can be hotter than 1,000 °C! When lava cools and hardens, it becomes igneous rock such as basalt.' },
  { id: 'v6-fossils', era: 'lab', name: 'Fossil wall', icon: '🦕', cost: 45, pos: [21, -12],
    fact: 'Fossils are found in sedimentary rocks. When a plant or animal dies and is buried by layers of mud or sand, its shape can be preserved in the rock. Mary Anning discovered famous fossils of sea reptiles at Lyme Regis in the early 1800s.' },
  { id: 'v6-press', era: 'lab', name: 'Metamorphic press', icon: '🗜️', cost: 50, pos: [14, -3],
    fact: 'Deep underground, great heat and pressure can change one kind of rock into another. Limestone becomes marble, and mudstone becomes slate — which is used for roof tiles because it splits into thin, waterproof sheets.' },
  { id: 'v6-soil', era: 'lab', name: 'Soil laboratory', icon: '🧪', cost: 55, pos: [-3, 11],
    fact: 'Soil is a mixture of tiny pieces of rock, humus (rotted plants and animals), air and water. It forms very slowly — it can take hundreds of years to make a layer of soil just a few centimetres thick.' },
  { id: 'v6-crystals', era: 'lab', name: 'Crystal cavern', icon: '🔮', cost: 70, pos: [-21, -4],
    fact: 'Crystals grow bigger when molten rock or mineral-rich water cools very slowly. In the Cave of the Crystals in Mexico, giant crystals have grown more than 10 metres long — longer than a bus!' },
  // Villain HQ
  { id: 'v6-control', era: 'hq', name: 'Control room', icon: '🖥️', cost: 70, pos: [9, 6],
    fact: 'Volcanologists — scientists who study volcanoes — use machines called seismometers to detect tiny earthquakes. These can warn that magma is moving underground and that an eruption might be coming.' },
  { id: 'v6-mole', era: 'hq', name: 'Mole drilling machine', icon: '🚜', cost: 85, pos: [20, 8],
    fact: 'The deepest hole ever drilled, the Kola Superdeep Borehole in Russia, reached over 12 kilometres down. That sounds deep, but it is still only a small part of the way through the Earth\'s crust!' },
  { id: 'v6-vault', era: 'hq', name: 'Gem vault', icon: '💰', cost: 90, pos: [-13, 13],
    fact: 'Gemstones are minerals that are cut and polished to make them sparkle. Rubies and sapphires are actually the same mineral, called corundum — tiny amounts of other elements give them their different colours.' },
  // Ultimate Lair
  { id: 'v6-spring', era: 'ultimate', name: 'Volcanic hot spring', icon: '♨️', cost: 90, pos: [6, 13],
    fact: 'Hot springs form where underground water is heated by magma. In Iceland, this geothermal heat is piped into towns and heats about nine out of ten homes.' },
  { id: 'v6-moat', era: 'ultimate', name: 'Lava moat and bridge', icon: '🌉', cost: 100, pos: [0, 18],
    fact: 'When lava cools very quickly, crystals don\'t have time to grow and it becomes a shiny black glass called obsidian. Ancient people chipped obsidian into blades that were sharper than steel.' },
  { id: 'v6-elevator', era: 'ultimate', name: 'Earth core elevator', icon: '🛗', cost: 110, pos: [-6, -7],
    fact: 'The Earth is made of layers: the thin crust we live on, the hot mantle, the liquid outer core and the solid inner core. The inner core is about as hot as the surface of the Sun!' },
  { id: 'v6-rocket', era: 'ultimate', name: 'Rocket launch pad', icon: '🚀', cost: 150, pos: [22, -1],
    fact: 'Earth is not the only planet with volcanoes. Olympus Mons on Mars is the biggest volcano in the solar system — about two and a half times as tall as Mount Everest!' },
];

// ───────── models ─────────

const ROCK = '#4a3f4c', ROCK2 = '#5d5160', BASALT = '#2f2a33', METAL = '#8d949c', STEEL = '#5d6470';
const glowMats = new Map();
function G(c) { if (!glowMats.has(c)) glowMats.set(c, new THREE.MeshBasicMaterial({ color: c })); return glowMats.get(c); }
function crystal(g, x, z, h, c, tilt = 0) { const m = b(g, 0.7, h, 0.7, G(c), x, 0, z); m.rotation.z = tilt; m.rotation.y = 0.6; return m; }

const MODELS = {
  'v6-tunnel'(g, anim) {
    b(g, 9, 6, 2, ROCK2, 0, 0, 0);
    b(g, 4, 4.2, 2.2, '#140f16', 0, 0, 0.1);
    b(g, 4.8, 0.6, 2.4, ROCK, 0, 4.2, 0.1);
    for (const x of [-2.6, 2.6]) { b(g, 0.3, 2, 0.3, '#6b4423', x, 0, 1.4); const f = b(g, 0.6, 0.6, 0.6, G('#ffb347'), x, 2, 1.4); anim.push((t) => { f.scale.y = 1 + Math.sin(t * 10 + x) * 0.2; }); }
  },
  'v6-minecart'(g, anim) {
    for (const z of [-0.7, 0.7]) b(g, 12, 0.2, 0.25, STEEL, 0, 0.2, z);
    for (let x = -5.5; x <= 5.5; x += 1) b(g, 0.4, 0.2, 2, '#6b4423', x, 0, 0);
    const cart = new THREE.Group(); g.add(cart);
    b(cart, 2.2, 1.3, 1.8, '#7a6a5a', 0, 0.5, 0); b(cart, 1.8, 0.4, 1.4, '#9b59b6', 0, 1.6, 0); b(cart, 0.6, 0.6, 0.6, G('#5fd3e8'), 0.4, 1.9, 0.2);
    for (const [x, z] of [[-0.7, -0.8], [0.7, -0.8], [-0.7, 0.8], [0.7, 0.8]]) b(cart, 0.5, 0.5, 0.2, '#2b2b2b', x, 0.2, z);
    anim.push((t) => { cart.position.x = Math.sin(t * 0.5) * 4.5; });
  },
  'v6-drill'(g, anim) {
    for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) b(g, 0.4, 7, 0.4, METAL, x, 0, z);
    b(g, 3.8, 0.5, 3.8, STEEL, 0, 7, 0); b(g, 2, 1.6, 2, '#f6c52b', 0, 4.5, 0);
    const bit = new THREE.Group(); bit.position.y = 1.2; g.add(bit);
    b(bit, 0.6, 3.3, 0.6, METAL, 0, 0, 0); b(bit, 0.9, 0.6, 0.9, G('#e8f7ff'), 0, -0.2, 0);
    b(g, 3.4, 0.3, 3.4, BASALT, 0, 0, 0);
    anim.push((t) => { bit.rotation.y = t * 6; bit.position.y = 1 + Math.sin(t * 2) * 0.3; });
  },
  'v6-sorting'(g) {
    b(g, 5, 0.3, 2.6, '#8a5a34', 0, 1.6, 0);
    for (const [x, z] of [[-2.2, -1], [2.2, -1], [-2.2, 1], [2.2, 1]]) b(g, 0.3, 1.6, 0.3, '#6b4423', x, 0, z);
    [['#3b3b3f', -1.6], ['#d9c09a', 0], ['#e8e6e1', 1.6]].forEach(([c, x]) => { b(g, 1.3, 0.2, 1.8, '#f4f1ea', x, 1.9, 0); b(g, 0.6, 0.5, 0.6, c, x - 0.2, 2.1, 0.2); b(g, 0.4, 0.3, 0.4, c, x + 0.3, 2.1, -0.3); });
    // signs: igneous / sedimentary / metamorphic colour flags
    [['#e2574c', -1.6], ['#f6d04d', 0], ['#2f8fdd', 1.6]].forEach(([c, x]) => { b(g, 0.1, 0.8, 0.1, '#5d4a3a', x, 1.9, -0.8); b(g, 0.6, 0.4, 0.05, c, x + 0.3, 2.4, -0.8); });
  },
  'v6-lava'(g, anim) {
    b(g, 8.6, 0.6, 6.6, BASALT, 0, 0, 0);
    const lava = b(g, 7.4, 0.3, 5.4, G('#ff6a1a'), 0, 0.5, 0);
    const blobs = [];
    for (let i = 0; i < 5; i++) blobs.push(b(g, 0.8, 0.4, 0.8, G('#ffd34d'), -2.5 + i * 1.3, 0.6, (i % 2 ? 1 : -1) * 1.2));
    const light = new THREE.PointLight(0xff6a1a, 60, 18); light.position.set(0, 2.5, 0); g.add(light);
    anim.push((t) => { lava.material = G(Math.sin(t * 3) > 0 ? '#ff6a1a' : '#ff7d2e'); blobs.forEach((bl, i) => { bl.position.y = 0.6 + Math.max(0, Math.sin(t * 2 + i * 1.7)) * 0.4; }); light.intensity = 50 + Math.sin(t * 5) * 12; });
  },
  'v6-fossils'(g) {
    const layers = ['#d9b98a', '#c9a374', '#b88f62', '#d1b083', '#a77f55'];
    layers.forEach((c, i) => b(g, 8, 1.3, 2, c, 0, i * 1.3, 0));
    // ammonite spirals and a skeleton picked out in pale bone
    const bone = '#f3ead6';
    for (const [x, y] of [[-2.6, 1.6], [2.4, 4.2]]) { b(g, 1, 1, 0.1, bone, x, y, 1.02); b(g, 0.5, 0.5, 0.12, '#a77f55', x + 0.15, y + 0.25, 1.04); }
    b(g, 3.6, 0.25, 0.1, bone, 0, 3, 1.02);
    for (let i = 0; i < 5; i++) b(g, 0.15, 0.8, 0.1, bone, -1.3 + i * 0.65, 2.6, 1.02);
    b(g, 0.8, 0.6, 0.1, bone, 2, 3, 1.02); b(g, 1.4, 0.2, 0.1, bone, -2.3, 2.9, 1.02);
    b(g, 0.3, 2, 0.3, '#6b4423', 4.6, 0, 1.6); b(g, 0.5, 0.3, 0.3, METAL, 4.6, 2, 1.6); // pickaxe
  },
  'v6-press'(g, anim) {
    b(g, 4.6, 0.8, 3.4, STEEL, 0, 0, 0);
    for (const x of [-1.9, 1.9]) b(g, 0.6, 6, 0.6, METAL, x, 0.8, 0);
    b(g, 4.6, 0.8, 1.4, STEEL, 0, 6.8, 0);
    const ram = b(g, 2.8, 0.8, 2, '#c0392b', 0, 3.5, 0);
    const rock = b(g, 1.6, 1, 1.4, '#d9d6cf', 0, 0.8, 0);
    anim.push((t) => { const k = (Math.sin(t * 1.4) + 1) / 2; ram.position.y = 2.6 + k * 2.6; rock.material = M(k < 0.15 ? '#f4f2ee' : '#d9d6cf'); });
  },
  'v6-soil'(g) {
    b(g, 5, 2.6, 3.6, '#e8e6e1', 0, 0, 0); b(g, 5.4, 0.4, 4, '#2f8fdd', 0, 2.6, 0);
    b(g, 1.2, 1.8, 0.1, '#3a2c22', 0, 0, 1.81);
    // soil column jars: layers of rock, humus, water
    for (let i = 0; i < 3; i++) {
      const x = -1.8 + i * 1.8;
      b(g, 0.9, 0.5, 0.9, '#7a7d84', x, 0, 3); b(g, 0.9, 0.5, 0.9, '#6b4a2b', x, 0.5, 3); b(g, 0.9, 0.3, 0.9, '#3d2a1a', x, 1, 3); b(g, 0.9, 0.3, 0.9, '#8fd3ff', x, 1.3, 3);
    }
    b(g, 0.8, 0.8, 0.1, '#9fd8f0', -1.6, 1.2, 1.81); b(g, 0.8, 0.8, 0.1, '#9fd8f0', 1.6, 1.2, 1.81);
  },
  'v6-crystals'(g, anim) {
    b(g, 6, 4, 6, ROCK, 0, 0, 0); b(g, 4.4, 3, 4.4, ROCK2, 0, 4, 0);
    b(g, 2.6, 3, 0.4, '#140f16', 1, 0, 3.01);
    const cs = [];
    [[-2, 3.4, 3, '#b07cff', 0.3], [-1, 4, 2.2, '#5fd3e8', -0.2], [3.5, 1.5, 2.6, '#ff7ac8', 0.25], [3.6, -1, 1.8, '#b07cff', -0.3], [-3.6, -1.5, 2.4, '#5fd3e8', 0.2]].forEach(([x, z, h, c, tilt]) => cs.push(crystal(g, x, z, h, c, tilt)));
    const light = new THREE.PointLight(0xb07cff, 30, 14); light.position.set(0, 2, 4); g.add(light);
    anim.push((t) => { light.intensity = 24 + Math.sin(t * 2) * 8; });
  },
  'v6-control'(g, anim) {
    b(g, 7, 3.4, 4.4, '#3b4250', 0, 0, 0); b(g, 7.4, 0.4, 4.8, '#262b34', 0, 3.4, 0);
    b(g, 6, 1.6, 0.1, G('#1d3b4f'), 0, 1.3, 2.21);
    const screens = [];
    for (let i = 0; i < 3; i++) screens.push(b(g, 1.6, 1.2, 0.12, G('#3cff9a'), -2 + i * 2, 1.5, 2.25));
    b(g, 6.4, 1, 1.2, STEEL, 0, 0, 3.2);
    const btn = []; for (let i = 0; i < 6; i++) btn.push(b(g, 0.3, 0.2, 0.3, G(['#e2574c', '#f6d04d', '#6cc04a'][i % 3]), -2.4 + i * 0.95, 1, 3.2));
    b(g, 0.3, 3, 0.3, METAL, 2.8, 3.8, 0); const dish = b(g, 1.6, 0.3, 1.6, '#c9cfd6', 2.8, 6.8, 0);
    anim.push((t) => { screens.forEach((s, i) => { s.material = G(Math.sin(t * 2 + i * 2) > 0 ? '#3cff9a' : '#2fd3ff'); }); dish.rotation.y = t; btn.forEach((x, i) => { x.visible = Math.sin(t * 4 + i) > -0.5; }); });
  },
  'v6-mole'(g, anim) {
    b(g, 5, 2.2, 2.6, '#c0392b', 0, 0.8, 0); b(g, 2.2, 1.4, 2.2, '#a93226', -1.2, 3, 0);
    b(g, 0.1, 0.8, 1.6, G('#9fd8f0'), -0.09, 3.3, 0).position.x = -0.09;
    for (const z of [-1.4, 1.4]) b(g, 5.2, 1, 0.6, '#2b2b2b', 0, 0, z);
    const drill = new THREE.Group(); drill.position.set(3, 1.9, 0); g.add(drill);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 8), M(METAL)); cone.rotation.z = -Math.PI / 2; cone.position.x = 1.5; drill.add(cone);
    anim.push((t) => { drill.rotation.x = t * 8; });
  },
  'v6-vault'(g, anim) {
    b(g, 7, 4.4, 4, '#4b5058', 0, 0, 0); b(g, 7.4, 0.5, 4.4, '#3a3f46', 0, 4.4, 0);
    const door = cyl(g, 1.7, 1.7, 0.4, 16, '#b8bec6', 0, 0.4, 2.1); door.rotation.x = Math.PI / 2; door.position.set(0, 2.2, 2.2);
    for (let i = 0; i < 4; i++) { const spoke = b(g, 0.15, 1.6, 0.15, '#5d6470', 0, 1.4, 2.45); spoke.rotation.z = (i / 4) * Math.PI; spoke.position.y = 2.2 - 0.8; }
    const pile = [['#e2574c', -2.8, 3], ['#2f8fdd', -2, 3.4], ['#6cc04a', 2.4, 3.1], ['#f6d04d', 3, 3.5], ['#b07cff', 2.2, 3.7]];
    const gems = pile.map(([c, x, z]) => b(g, 0.6, 0.6, 0.6, G(c), x, 0, z));
    anim.push((t) => gems.forEach((gm, i) => { gm.rotation.y = t + i; }));
  },
  'v6-spring'(g, anim) {
    b(g, 6, 0.6, 5, ROCK2, 0, 0, 0); b(g, 5, 0.35, 4, '#7fd6e0', 0, 0.4, 0);
    const steam = [];
    for (let i = 0; i < 6; i++) steam.push(b(g, 0.7, 0.7, 0.7, '#e9eef2', -1.6 + (i % 3) * 1.6, 1, i < 3 ? -0.8 : 0.8));
    anim.push((t) => steam.forEach((s, i) => { const k = (t * 0.6 + i * 0.37) % 2; s.position.y = 1 + k * 2.2; s.scale.setScalar(1 - k * 0.35); }));
  },
  'v6-moat'(g, anim) {
    // a glowing lava channel across the front of the lair, with an obsidian bridge
    const lava = b(g, 54, 0.3, 3, G('#ff6a1a'), 0, 0, 0);
    b(g, 54, 0.6, 0.6, BASALT, 0, 0, -1.8); b(g, 54, 0.6, 0.6, BASALT, 0, 0, 1.8);
    b(g, 4, 0.7, 4.6, '#121014', 0, 0.3, 0);
    for (const x of [-2, 2]) for (const z of [-2, 2]) b(g, 0.4, 1.6, 0.4, '#121014', x, 0.9, z);
    for (const x of [-18, 0.1, 18]) { const l = new THREE.PointLight(0xff6a1a, 40, 16); l.position.set(x, 2, 0); g.add(l); }
    anim.push((t) => { lava.material = G(Math.sin(t * 2.5) > 0 ? '#ff6a1a' : '#ff8a3d'); });
  },
  'v6-elevator'(g, anim) {
    for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) b(g, 0.35, 9, 0.35, METAL, x, 0, z);
    b(g, 3.8, 0.4, 3.8, STEEL, 0, 9, 0);
    b(g, 3.6, 0.3, 3.6, '#181418', 0, 0, 0);
    // layers of the Earth sign
    const sign = new THREE.Group(); sign.position.set(2.6, 0, 2.2); g.add(sign);
    b(sign, 0.2, 2.6, 0.2, STEEL, 0, 0, 0);
    [['#6b4a2b', 1.6], ['#e2574c', 1.2], ['#f2a057', 0.8], ['#f6d04d', 0.4]].forEach(([c, s]) => { const d = cyl(sign, s, s, 0.08, 16, c, 0, 2.8, 0.1); d.rotation.x = Math.PI / 2; d.position.set(0, 3.6, 0.1 + (1.6 - s) * 0.05); });
    const car = new THREE.Group(); g.add(car);
    b(car, 3, 2.6, 3, '#d5dae0', 0, 0, 0); b(car, 2.2, 1.6, 0.1, G('#9fd8f0'), 0, 0.6, 1.51);
    anim.push((t) => { car.position.y = 0.3 + ((Math.sin(t * 0.5) + 1) / 2) * 5.8; });
  },
  'v6-rocket'(g, anim) {
    b(g, 6, 0.5, 6, STEEL, 0, 0, 0);
    for (const [x, z] of [[-2.4, 0], [2.4, 0]]) b(g, 0.5, 9, 0.5, '#e2574c', x, 0.5, z);
    const r = new THREE.Group(); r.position.y = 0.5; g.add(r);
    cyl(r, 1.2, 1.2, 7, 12, '#f4f4f2', 0, 1, 0);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.4, 12), M('#e2574c')); nose.position.y = 9.2; r.add(nose);
    for (const a of [0, 2.1, 4.2]) { const fin = b(r, 0.2, 2, 1.4, '#e2574c', Math.cos(a) * 1.2, 0.8, Math.sin(a) * 1.2); fin.rotation.y = -a; }
    const win = cyl(r, 0.45, 0.45, 0.2, 12, '#5fd3e8', 0, 6, 1.15); win.rotation.x = Math.PI / 2; win.position.set(0, 6, 1.18);
    const flame = b(r, 1.4, 1, 1.4, G('#ffb347'), 0, 0, 0);
    anim.push((t) => { flame.scale.y = 0.6 + Math.abs(Math.sin(t * 12)) * 0.6; r.position.y = 0.5 + Math.abs(Math.sin(t * 6)) * 0.08; });
  },
};

function lairScenery(scene) {
  const ground = new THREE.Mesh(new THREE.BoxGeometry(110, 2, 90), M('#4d4249'));
  ground.position.y = -1; ground.receiveShadow = true; scene.add(ground);
  const g = new THREE.Group(); scene.add(g);
  // cavern walls on three sides (left, right and back), leaving the front open for the camera
  for (let x = -34; x <= 34; x += 4) {
    const hgt = 14 + ((x * 7) % 9 + 9) % 9;
    b(g, 4.2, hgt, 6, (x / 4) % 2 ? ROCK : ROCK2, x, 0, -24);
  }
  for (let z = -22; z <= 14; z += 4) {
    const hgt = 11 + ((z * 5) % 7 + 7) % 7;
    b(g, 6, hgt, 4.2, (z / 4) % 2 ? ROCK : ROCK2, -32, 0, z);
    b(g, 6, hgt, 4.2, (z / 4) % 2 ? ROCK2 : ROCK, 32, 0, z);
  }
  // stalactites hanging from the overhang and stalagmites on the floor
  for (let i = 0; i < 18; i++) {
    const x = -30 + i * 3.5;
    b(g, 0.8, 2 + (i % 4), 0.8, ROCK2, x, -1 + 18 - (2 + (i % 4)), -21);
  }
  for (const [x, z, h] of [[-27, 10, 3], [27, -16, 4], [26, 14, 2.5], [-26, -18, 3.5], [12, 16, 2], [-20, 16, 2.6]]) b(g, 1, h, 1, ROCK2, x, 0, z);
  // glowing crystals and lava cracks in the floor
  const cols = ['#b07cff', '#5fd3e8', '#ff7ac8'];
  for (let i = 0; i < 26; i++) {
    const x = ((i * 37) % 60) - 30, z = ((i * 53) % 40) - 20;
    if (Math.abs(x) < 25 && Math.abs(z) < 16) continue;
    crystal(g, x, z, 1 + (i % 3) * 0.7, cols[i % 3], (i % 2 ? 0.3 : -0.3));
  }
  for (const [x, z, w, r] of [[-24, 6, 6, 0.4], [24, -8, 8, -0.3], [-22, -16, 5, 0.9]]) { const c = b(g, w, 0.08, 0.35, G('#ff6a1a'), x, 0, z); c.rotation.y = r; }
  // the volcano rising above the cavern
  const volcano = new THREE.Mesh(new THREE.ConeGeometry(30, 22, 10), M('#3f3440'));
  volcano.position.set(0, 26, -40); scene.add(volcano);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 1, 10), G('#ff6a1a')); top.position.set(0, 36.8, -40); scene.add(top);
}

export const VOLCANO = {
  year: 6, title: 'My Volcano Lair', icon: '🌋', prefix: 'v6-',
  intro: 'Deep beneath the volcano lies the perfect spot for a secret lair. Spend your gems to dig, discover the science of rocks — and build the most spectacular lair on Earth!',
  sky: '#2a1f2e', fogNear: 80, fogFar: 160,
  lighting: { sky: 0xffe6dc, ground: 0x4a3040, hemi: 1.7, sunColor: 0xffc9a8, sun: 1.6 },
  eras: ERAS, buildings: BUILDINGS, models: MODELS,
  scenery: lairScenery, avatarPos: [1, 2], noMarker: ['v6-moat'],
};
