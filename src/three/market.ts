import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PAGE } from './horses';

/**
 * Türk Marketinde Bir Gün: the shop counter with its till, a little display stand, labelled packets (lentils,
 * tarhana, a small and a big packet of olives with their price tags, a box of chocolates), the shopping list, dollar
 * notes, the wallet, the receipt and the shopping bag.
 *
 * Built in metres facing +z, standing on y = 0, then scaled to the page (PAGE metres → page widths).
 */
const mats = new Map<string, THREE.Material>();
function mat(color: string, rough = 0.6, metal = 0) {
  const k = `${color}|${rough}|${metal}`;
  let m = mats.get(k);
  if (!m) mats.set(k, (m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })));
  return m;
}
function onPage(o: THREE.Object3D, s = PAGE) {
  const g = new THREE.Group();
  o.scale.setScalar(s);
  o.traverse((n) => ((n as THREE.Mesh).castShadow = true));
  g.add(o);
  return g;
}
function box(w: number, h: number, d: number, m: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
}
function rbox(w: number, h: number, d: number, r: number, m: THREE.Material) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m);
}

/** A canvas label: a coloured card with one or two lines of text. */
const labels = new Map<string, THREE.CanvasTexture>();
function label(text: string, bg: string, fg = '#FFFFFF', w = 256, h = 160) {
  const k = `${text}|${bg}|${fg}|${w}|${h}`;
  let t = labels.get(k);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const lines = text.split('\n');
    const size = Math.min(64, (h * 0.8) / lines.length);
    g.font = `bold ${size}px "Baloo 2", "Comic Sans MS", sans-serif`;
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.05));
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    labels.set(k, t);
  }
  return t;
}
function face(tex: THREE.Texture, w: number, h: number) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
}

/** A packet with a printed front: `name` on a coloured band, optionally a price tag on a stick. */
function packet(name: string, color: string, w: number, h: number, d: number, price?: string) {
  const g = new THREE.Group();
  const body = rbox(w, h, d, Math.min(w, d) * 0.15, mat(color, 0.5));
  body.position.y = h / 2;
  const front = face(label(name, '#FFFFFF', color), w * 0.86, h * 0.42);
  front.position.set(0, h * 0.55, d / 2 + 0.002);
  g.add(body, front);
  if (price) {
    const tag = face(label(price, '#FFE082', '#C62828', 200, 110), 0.13, 0.07);
    tag.position.set(0, h + 0.07, 0);
    const stick = box(0.006, 0.05, 0.006, mat('#9E9E9E', 0.4));
    stick.position.set(0, h + 0.025, 0);
    g.add(tag, stick);
  }
  return g;
}
/** A see-through bag of olives (dark and green) with a label. */
function olives(big: boolean) {
  const w = big ? 0.26 : 0.16, h = big ? 0.3 : 0.18, d = big ? 0.1 : 0.07;
  const g = packet(big ? 'ZEYTİN\n1 kg' : 'ZEYTİN\n250 g', '#556B2F', w, h, d, big ? '$9' : '$3');
  for (let i = 0; i < (big ? 10 : 5); i++) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mat(i % 3 ? '#2E2A24' : '#7A8B2F', 0.3));
    o.scale.set(1, 1.3, 1);
    o.position.set(-w / 2 + 0.03 + ((i * 0.37) % 1) * (w - 0.06), 0.03 + (i % 3) * 0.02, d / 2 + 0.004);
    g.add(o);
  }
  return g;
}
/** The shop counter: a wooden top on a teal front panel, the till and a little box of lokum on it. */
function counter() {
  const g = new THREE.Group();
  const top = rbox(1.8, 0.06, 0.6, 0.02, mat('#C9935A', 0.5));
  top.position.y = 0.93;
  const body = box(1.74, 0.9, 0.55, mat('#3E7C77', 0.6));
  body.position.y = 0.45;
  const panel = box(1.5, 0.6, 0.01, mat('#4C928C', 0.6));
  panel.position.set(0, 0.48, 0.28);
  g.add(top, body, panel);
  const till = new THREE.Group();
  const base = rbox(0.38, 0.14, 0.32, 0.02, mat('#B0BEC5', 0.4, 0.3));
  base.position.y = 0.07;
  const screen = box(0.2, 0.12, 0.02, mat('#263238', 0.3));
  screen.position.set(0, 0.22, -0.08);
  screen.rotation.x = -0.3;
  const glow = face(label('$ 14', '#1B5E20', '#C8E6C9', 200, 120), 0.17, 0.09);
  glow.position.set(0, 0.22, -0.068);
  glow.rotation.x = -0.3;
  const keys = box(0.26, 0.02, 0.14, mat('#ECEFF1', 0.5));
  keys.position.set(0, 0.15, 0.06);
  till.add(base, screen, glow, keys);
  till.position.set(-0.5, 0.96, -0.02);
  const lokum = rbox(0.24, 0.07, 0.16, 0.02, mat('#F8BBD0', 0.5));
  lokum.position.set(0.55, 0.995, 0.02);
  g.add(till, lokum);
  return g;
}
/** A small wooden display table with the two olive packets on it. */
function oliveStand() {
  const g = new THREE.Group();
  const top = box(0.9, 0.04, 0.5, mat('#A0673A', 0.5));
  top.position.y = 0.7;
  g.add(top);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const leg = box(0.04, 0.7, 0.04, mat('#7A4A26', 0.6));
      leg.position.set(sx * 0.4, 0.35, sz * 0.2);
      g.add(leg);
    }
  return g;
}
/** A shopping list on lined paper. */
let listTex: THREE.CanvasTexture | null = null;
function shoppingList() {
  if (!listTex) {
    const c = document.createElement('canvas');
    c.width = 200;
    c.height = 280;
    const g = c.getContext('2d')!;
    g.fillStyle = '#FFFDF5';
    g.fillRect(0, 0, 200, 280);
    g.strokeStyle = '#BBDEFB';
    for (let y = 50; y < 280; y += 40) {
      g.beginPath();
      g.moveTo(10, y);
      g.lineTo(190, y);
      g.stroke();
    }
    g.fillStyle = '#1C3F8C';
    g.font = 'bold 26px "Comic Sans MS", sans-serif';
    ['Liste', '• peynir', '• zeytin', '• simit', '• çay', '• mercimek'].forEach((t, i) => g.fillText(t, 18, 34 + i * 40));
    listTex = new THREE.CanvasTexture(c);
    listTex.colorSpace = THREE.SRGBColorSpace;
  }
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.28), new THREE.MeshStandardMaterial({ map: listTex, roughness: 0.8, side: THREE.DoubleSide }));
  p.position.y = 0.14;
  g.add(p);
  return g;
}
/** Dollar notes: `n` green notes fanned out (or lying flat with `flat`). */
function notes(n: number, flat = false, text = '$10') {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const note = face(label(text, '#85BB65', '#1B4D1B', 220, 100), 0.16, 0.07);
    if (flat) {
      note.rotation.x = -Math.PI / 2;
      note.position.set(i * 0.02, 0.002 + i * 0.002, i * 0.01);
    } else {
      note.position.set(i * 0.025, 0.035 + i * 0.006, i * 0.002);
      note.rotation.z = -0.15 + i * 0.15;
    }
    (note.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    g.add(note);
  }
  return g;
}
/** A small wallet with a snap. */
function wallet() {
  const g = new THREE.Group();
  const b = rbox(0.12, 0.08, 0.025, 0.012, mat('#C62828', 0.5));
  b.position.y = 0.04;
  const snap = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.006, 12), mat('#E0C27A', 0.3, 0.7));
  snap.rotation.x = Math.PI / 2;
  snap.position.set(0, 0.055, 0.014);
  g.add(b, snap);
  return g;
}
/** The receipt: a long white strip with lines and the total. */
function receipt() {
  const g = new THREE.Group();
  const p = face(label('FİŞ\npeynir · zeytin\nsimit · çay\nmercimek\nTOPLAM $14', '#FFFFFF', '#333333', 200, 360), 0.09, 0.16);
  (p.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  p.position.y = 0.08;
  g.add(p);
  return g;
}
/** A cloth shopping bag with two handles, the shopping peeping out. */
function bag(full = false) {
  const g = new THREE.Group();
  const cloth = mat('#E8D5B0', 0.9);
  const b = rbox(0.34, 0.36, 0.14, 0.02, cloth);
  b.position.y = 0.18;
  const print = face(label('MARKET', '#E8D5B0', '#C62828', 220, 90), 0.24, 0.09);
  print.position.set(0, 0.2, 0.071);
  g.add(b, print);
  for (const x of [-0.08, 0.08]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 14, Math.PI), cloth);
    h.position.set(x, 0.36, 0);
    g.add(h);
  }
  if (full) {
    const simit = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.022, 8, 18), mat('#C68642', 0.7));
    simit.position.set(-0.08, 0.38, 0);
    const tea = rbox(0.08, 0.14, 0.05, 0.01, mat('#C62828', 0.5));
    tea.position.set(0.07, 0.4, 0);
    g.add(simit, tea);
  }
  return g;
}
/** A full shopping basket of the week's food. */
function basketFull() {
  const g = new THREE.Group();
  const wire = mat('#C62828', 0.4, 0.3);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.3, 1, 1, 1), new THREE.MeshStandardMaterial({ color: '#C62828', wireframe: true }));
  b.position.y = 0.11;
  const bottom = box(0.45, 0.01, 0.3, wire);
  bottom.position.y = 0.005;
  g.add(b, bottom);
  const items = [packet('PEYNİR', '#F5F5F5', 0.14, 0.06, 0.1), packet('MERCİMEK', '#E65100', 0.12, 0.16, 0.06), packet('ÇAY', '#C62828', 0.1, 0.15, 0.06), olives(false)];
  items.forEach((it, i) => {
    it.position.set(-0.15 + i * 0.1, 0.01, (i % 2) * 0.05 - 0.02);
    it.scale.setScalar(0.9);
    g.add(it);
  });
  return g;
}

/** Things standing on the page (page widths). */
export const MARKET_PROPS: Record<string, () => THREE.Object3D> = {
  tezgah: () => {
    // a little lower than a real counter, so Hatice teyze shows above it
    const g = onPage(counter());
    g.children[0].scale.y *= 0.82;
    return g;
  },
  zeytinStandi: () => onPage(oliveStand()),
  zeytinBuyuk: () => onPage(olives(true)),
  zeytinKucuk: () => onPage(olives(false)),
  mercimekPaketi: () => onPage(packet('MERCİMEK', '#E65100', 0.16, 0.24, 0.08)),
  tarhanaPaketi: () => onPage(packet('TARHANA', '#B23A48', 0.16, 0.24, 0.08)),
  cikolataKutusu: () => onPage(packet('ÇİKOLATA', '#5D4037', 0.3, 0.2, 0.06, '$12')),
  liste: () => onPage(shoppingList()),
  paraTezgah: () => onPage(notes(1, true)),
  paraUstu: () => onPage(notes(2, true, '$5')),
  cuzdan: () => onPage(wallet()),
  fis: () => onPage(receipt()),
  canta: () => onPage(bag(true)),
  sepetDoluMarket: () => onPage(basketFull()),
};

function held(o: THREE.Object3D, data: Record<string, unknown>, s = PAGE) {
  const g = onPage(o, s);
  Object.assign(g.userData, data);
  return g;
}

/** Things held in the hands (see HELD in props.ts). */
export const MARKET_HELD: Record<string, () => THREE.Object3D> = {
  listeEl: () => held(shoppingList(), { word: 'liste', atHeight: 0.34, ahead: 0.16 }, PAGE * 1.2),
  paraEl: () => held(notes(2, false, '$10'), { word: 'para', hand: 'R' }, PAGE * 1.3),
  cantaEl: () => held(bag(), { word: 'çanta', hand: 'R' }, PAGE * 0.9),
  cantaDolu: () => held(bag(true), { word: 'çanta', hand: 'R' }, PAGE * 0.9),
  sepetMarket: () => held(basketFull(), { word: 'sepet', atHeight: 0.3, ahead: 0.2 }, PAGE * 0.9),
  mercimekEl: () => held(packet('MERCİMEK', '#E65100', 0.16, 0.24, 0.08), { word: 'mercimek', hand: 'R' }, PAGE * 1.1),
  tarhanaEl: () => held(packet('TARHANA', '#B23A48', 0.16, 0.24, 0.08), { word: 'tarhana', hand: 'R' }, PAGE * 1.1),
  zeytinEl: () => held(olives(false), { word: 'zeytin', hand: 'R' }, PAGE * 1.1),
  fisEl: () => held(receipt(), { word: 'fiş', hand: 'R' }, PAGE * 1.3),
  cuzdanEl: () => held(wallet(), { word: 'cüzdan', hand: 'R' }, PAGE * 1.3),
};
