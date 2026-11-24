import * as THREE from 'three';
import { PAGE } from './horses';

/**
 * Mangala Turnuvası: the wooden mangala board (two rows of six pits and a treasure at each end), its glassy
 * stones, the tournament table, the coffee table at home and the stone box, drawn in code.
 *
 * The board and its stones are built straight in page widths (they are shown bigger than life so the pits read
 * on the page); the furniture in metres, scaled by PAGE. Stones lie in pits by a layout name, so a page can show
 * the board before and after a move and single stones can hop between pits (book.json gives their offsets with
 * the same numbers as BOARD below).
 *
 *   taslar:4,4,4,4,4,4|4,4,4,4,4,4|0|0   far row (x from left to right), near row, left treasure, right treasure
 */
export const BOARD = {
  L: 0.31,
  W: 0.1,
  H: 0.022,
  pitX: [-0.1, -0.06, -0.02, 0.02, 0.06, 0.1],
  rowZ: { far: -0.026, near: 0.026 },
  treasureX: 0.132,
  stone: 0.0062,
};

const mats = new Map<string, THREE.Material>();
function mat(color: string, rough = 0.6, metal = 0) {
  const k = `${color}|${rough}|${metal}`;
  let m = mats.get(k);
  if (!m) mats.set(k, (m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })));
  return m;
}
const STONE_COLORS = ['#D32F2F', '#1E88E5', '#43A047', '#FDD835', '#FB8C00', '#8E24AA', '#F5F5F5'];
let stoneGeo: THREE.BufferGeometry | null = null;
function stone(color: string) {
  stoneGeo ??= new THREE.SphereGeometry(BOARD.stone, 14, 10).scale(1, 0.62, 1);
  const m = new THREE.Mesh(stoneGeo, mat(color, 0.18, 0.05));
  m.castShadow = true;
  return m;
}

/** A stadium (a rectangle with round ends) w long and d deep, as a 2D shape centred on the origin. */
function stadium(w: number, d: number) {
  const r = d / 2;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -r);
  s.lineTo(w / 2 - r, -r);
  s.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-w / 2 + r, r);
  s.absarc(-w / 2 + r, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  return s;
}

/** The board: a carved wooden tray with a light rim, twelve round pits and two long treasures. */
function board() {
  const { L, W, H, pitX, rowZ, treasureX } = BOARD;
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(stadium(L, W), { depth: H - 0.004, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3, curveSegments: 24 });
  geo.rotateX(-Math.PI / 2);
  const body = new THREE.Mesh(geo, mat('#B9783C', 0.5));
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const hollow = mat('#6B3E1C', 0.85);
  const rim = mat('#D9A066', 0.45);
  for (const z of [rowZ.far, rowZ.near])
    for (const x of pitX) {
      const pit = new THREE.Mesh(new THREE.CircleGeometry(0.016, 24), hollow);
      pit.rotation.x = -Math.PI / 2;
      pit.position.set(x, H + 0.0005, z);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0018, 6, 24), rim);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, H + 0.0005, z);
      g.add(pit, ring);
    }
  for (const s of [-1, 1]) {
    const tr = new THREE.Mesh(new THREE.ShapeGeometry(stadium(0.078, 0.028), 16), hollow);
    tr.rotation.x = -Math.PI / 2;
    tr.rotation.z = Math.PI / 2;
    tr.position.set(s * treasureX, H + 0.0005, 0);
    g.add(tr);
  }
  // a little carved tulip in the middle of each long side
  for (const z of [-W / 2 - 0.0035, W / 2 + 0.0035]) {
    const tulip = new THREE.Mesh(new THREE.CircleGeometry(0.006, 3), mat('#8E2B24', 0.6));
    tulip.position.set(0, H * 0.5, z);
    if (z < 0) tulip.rotation.y = Math.PI;
    g.add(tulip);
  }
  return g;
}

/** Where the k-th of n stones lies in a pit (a little spiral, piling up when there are many). */
function inPit(k: number) {
  if (k === 0) return [0, 0, 0];
  const layer = Math.floor((k - 1) / 7);
  const j = (k - 1) % 7;
  const a = j * 0.9 + layer * 0.5;
  const r = 0.0075 + (j % 2) * 0.0012;
  return [Math.cos(a) * r, layer * 0.006 + (layer ? 0.003 : 0), Math.sin(a) * r];
}
function inTreasure(k: number) {
  const row = Math.floor(k / 2);
  const layer = Math.floor(row / 6);
  const z = -0.027 + (row % 6) * 0.011;
  const x = (k % 2 ? 0.006 : -0.006) + (layer ? 0.003 : 0);
  return [x, layer * 0.006, z];
}

/** Stones lying in the pits and treasures by a layout (see the comment at the top). */
function stones(layout: string) {
  const [far, near, left, right] = layout.split('|');
  const g = new THREE.Group();
  const { H, pitX, rowZ, treasureX, stone: r } = BOARD;
  let c = 0;
  const put = (x: number, z: number, off: number[]) => {
    const s = stone(STONE_COLORS[(c++ * 5) % STONE_COLORS.length]);
    s.position.set(x + off[0], H + r * 0.5 + off[1], z + off[2]);
    g.add(s);
  };
  for (const [row, z] of [[far, rowZ.far], [near, rowZ.near]] as const)
    (row ?? '').split(',').forEach((n, i) => {
      for (let k = 0; k < Number(n || 0); k++) put(pitX[i], z, inPit(k));
    });
  for (const [n, x] of [[left, -treasureX], [right, treasureX]] as const) for (let k = 0; k < Number(n || 0); k++) put(x, 0, inTreasure(k));
  return g;
}

/** A heap of stones (48 of them poured on the table to be counted). */
function heap(n = 48) {
  const g = new THREE.Group();
  const r = BOARD.stone;
  for (let k = 0; k < n; k++) {
    const layer = k < 26 ? 0 : k < 40 ? 1 : 2;
    const j = layer === 0 ? k : layer === 1 ? k - 26 : k - 40;
    const ring = layer === 0 ? 0.03 : layer === 1 ? 0.02 : 0.009;
    const a = j * 2.39996;
    const rr = ring * Math.sqrt((j + 0.5) / (layer === 0 ? 26 : layer === 1 ? 14 : 8));
    const s = stone(STONE_COLORS[(k * 3) % STONE_COLORS.length]);
    s.position.set(Math.cos(a) * rr, r * 0.5 + layer * r * 1.05, Math.sin(a) * rr);
    s.rotation.y = a;
    g.add(s);
  }
  return g;
}

/** A plain tournament table: a wooden top on four legs, a white runner down the middle. */
function table(w = 1.3, d = 0.8, h = 0.72) {
  const g = new THREE.Group();
  const wood = mat('#8D5A32', 0.55);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), wood);
  top.position.y = h - 0.02;
  top.receiveShadow = true;
  g.add(top);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, h - 0.04, 0.05), mat('#6E4423', 0.6));
      leg.position.set(sx * (w / 2 - 0.06), (h - 0.04) / 2, sz * (d / 2 - 0.06));
      g.add(leg);
    }
  const runner = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.004, d * 0.5), mat('#F3EEE2', 0.9));
  runner.position.y = h + 0.002;
  runner.receiveShadow = true;
  g.add(runner);
  return g;
}

/** A low coffee table at home, round-cornered, with a carved apron. */
function coffeeTable() {
  const g = new THREE.Group();
  const wood = mat('#A0673A', 0.5);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.62), wood);
  top.position.y = 0.43;
  top.receiveShadow = true;
  const apron = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.54), mat('#7A4A26', 0.55));
  apron.position.y = 0.37;
  g.add(top, apron);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.41, 12), mat('#7A4A26', 0.55));
      leg.position.set(sx * 0.52, 0.205, sz * 0.24);
      g.add(leg);
    }
  return g;
}

/** The stone box: a small wooden box with its lid open behind it, a few stones showing. */
function stoneBox() {
  const g = new THREE.Group();
  const wood = mat('#B9783C', 0.5);
  const w = 0.07, d = 0.045, h = 0.03, t = 0.004;
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), wood);
  bottom.position.y = t / 2;
  g.add(bottom);
  for (const [x, z, bw, bd] of [[0, d / 2, w, t], [0, -d / 2, w, t], [w / 2, 0, t, d], [-w / 2, 0, t, d]] as const) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), wood);
    s.position.set(x, h / 2, z);
    g.add(s);
  }
  const lid = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), mat('#A0673A', 0.5));
  const hinge = new THREE.Group();
  hinge.position.set(0, h, -d / 2);
  lid.position.set(0, 0, -d / 2);
  hinge.add(lid);
  hinge.rotation.x = -1.9;
  g.add(hinge);
  for (let k = 0; k < 9; k++) {
    const s = stone(STONE_COLORS[k % STONE_COLORS.length]);
    s.position.set(-0.024 + (k % 5) * 0.012, h - 0.006, -0.008 + Math.floor(k / 5) * 0.014);
    g.add(s);
  }
  return g;
}

/** A golden ring around a pit (or a treasure, `long`): the pit the story is counting or talking about. */
function marker(long = false) {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: '#FFD54A', transparent: true, opacity: 0.95 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0028, 8, 32), m);
  ring.rotation.x = Math.PI / 2;
  if (long) ring.scale.set(0.95, 2.3, 1);
  ring.position.y = BOARD.H + 0.002;
  g.add(ring);
  return g;
}

function onPage(o: THREE.Object3D, s = PAGE) {
  const g = new THREE.Group();
  o.scale.setScalar(s);
  o.traverse((n) => ((n as THREE.Mesh).castShadow = true));
  g.add(o);
  return g;
}

/** The board carried in both hands (Ahmet dede brings it to the table). */
export const MANGALA_HELD: Record<string, () => THREE.Object3D> = {
  mangalaEl: () => {
    const g = new THREE.Group();
    g.add(board());
    Object.assign(g.userData, { word: 'mangala', atHeight: 0.42, ahead: 0.26 });
    return g;
  },
};

/** Things standing on the page (page widths). */
export const MANGALA_PROPS: Record<string, () => THREE.Object3D> = {
  mangala: board,
  tasYigini: () => heap(),
  tasKutusu: stoneBox,
  kuyuIsareti: () => marker(),
  hazineIsareti: () => marker(true),
  turnuvaMasasi: () => onPage(table()),
  sehpa: () => onPage(coffeeTable()),
};

/** Props whose name carries their arrangement: `taslar:<layout>` (stones on the board), `tas:<n>` (one stone). */
export function mangalaProp(name: string): THREE.Object3D | null {
  if (name.startsWith('taslar:')) return stones(name.slice(7));
  if (name.startsWith('tas:')) {
    const g = new THREE.Group();
    const s = stone(STONE_COLORS[Number(name.slice(4)) % STONE_COLORS.length]);
    s.position.y = BOARD.stone * 0.5;
    g.add(s);
    return g;
  }
  return null;
}
