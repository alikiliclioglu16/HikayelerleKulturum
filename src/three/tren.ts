import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PAGE } from './horses';

/**
 * Doğu Ekspresi ile Kars'a: the view sliding by in the compartment window, the compartment's red seats that turn
 * into beds, the fold-down table and the picnic on it, Elif's sketchbook and train drawing, Kerem's binoculars and
 * board game, a sled and the horse sled of Kars, a snowman, a puff of frosty breath and cups of salep.
 *
 * Built in metres facing +z, standing on y = 0, then scaled to the page (PAGE metres → page widths), except the
 * window view, which is built straight in page widths to fit the painted window.
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
function cyl(rt: number, rb: number, h: number, m: THREE.Material, seg = 18) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
}
function box(w: number, h: number, d: number, m: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
}
function rbox(w: number, h: number, d: number, r: number, m: THREE.Material) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m);
}
function ball(r: number, m: THREE.Material, seg = 16) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), m);
}

/* ---------------- the window view ---------------- */

const loader = new THREE.TextureLoader();
/** The landscape strip in the window, `w` × `h` page widths, centred; give it fx "scrollX" to make the train go. */
function windowView(src: string, w: number, h: number, tint = '#FFFFFF') {
  const tex = loader.load(src);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  // the strip is 3000 × 700: show as much of it as fits the window's shape
  tex.repeat.set(w / h / (3000 / 700), 1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: tint }));
  const g = new THREE.Group();
  g.add(m);
  return g;
}
const WIN = { w: 0.56, h: 0.27 };
const VIEW = (name: string) => `/books/dogu-ekspresi/art/manzara-${name}.webp`;

/* ---------------- in the compartment ---------------- */

/** A red compartment seat (a bench for two) with a high back; `bed`: made up for the night with a pillow and a quilt. */
function seat(bed = false) {
  const g = new THREE.Group();
  const red = mat('#A61C2B', 0.75);
  const cream = mat('#EDE3CF', 0.6);
  const base = box(0.55, 0.38, 1.0, cream);
  base.position.y = 0.19;
  const cushion = rbox(0.55, 0.12, 1.0, 0.04, red);
  cushion.position.y = 0.44;
  const back = rbox(0.12, 0.6, 1.0, 0.04, red);
  back.position.set(-0.24, 0.8, 0);
  g.add(base, cushion, back);
  if (bed) {
    const pillow = rbox(0.4, 0.1, 0.28, 0.05, mat('#FFFFFF', 0.9));
    pillow.position.set(0.02, 0.55, -0.34);
    const quilt = rbox(0.52, 0.06, 0.7, 0.03, mat('#2E5E9E', 0.9));
    quilt.position.set(0.0, 0.53, 0.12);
    const fold = box(0.52, 0.02, 0.12, mat('#FFFFFF', 0.9));
    fold.position.set(0.0, 0.565, -0.17);
    g.add(pillow, quilt, fold);
  }
  return g;
}
/** The fold-down table under the window, on one leg. */
function foldTable() {
  const g = new THREE.Group();
  const top = rbox(0.7, 0.04, 0.42, 0.015, mat('#C9A27A', 0.5));
  top.position.y = 0.7;
  const leg = cyl(0.02, 0.025, 0.68, mat('#9AA0A6', 0.3, 0.6), 10);
  leg.position.y = 0.34;
  const foot = cyl(0.12, 0.12, 0.02, mat('#9AA0A6', 0.3, 0.6), 18);
  foot.position.y = 0.01;
  g.add(top, leg, foot);
  return g;
}
/** The picnic on the table: a plate of sandwiches, apples, a plate of pişi and a bottle of water. */
function picnic() {
  const g = new THREE.Group();
  const plate = (x: number, z: number) => {
    const p = cyl(0.11, 0.09, 0.015, mat('#FFFFFF', 0.4), 24);
    p.position.set(x, 0.008, z);
    g.add(p);
  };
  plate(-0.18, 0);
  for (let i = 0; i < 3; i++) {
    const bread = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 3), mat('#E8C79A', 0.8));
    bread.position.set(-0.2 + (i % 2) * 0.05, 0.03 + i * 0.022, (i - 1) * 0.02);
    bread.rotation.y = i * 0.8;
    const lettuce = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.006, 3), mat('#7CB342', 0.7));
    lettuce.position.copy(bread.position);
    lettuce.position.y += 0.012;
    lettuce.rotation.y = bread.rotation.y;
    g.add(bread, lettuce);
  }
  for (const [x, z, c] of [[0.02, -0.06, '#C62828'], [0.08, -0.02, '#7CB342'], [0.04, 0.05, '#C62828']] as const) {
    const a = ball(0.035, mat(c, 0.4));
    a.position.set(x, 0.035, z);
    const stem = cyl(0.003, 0.003, 0.02, mat('#5D4037', 0.8), 4);
    stem.position.set(x, 0.072, z);
    g.add(a, stem);
  }
  plate(0.22, 0.02);
  for (let i = 0; i < 4; i++) {
    const p = ball(0.04, mat('#E3B062', 0.7));
    p.scale.set(1.2, 0.45, 1);
    p.position.set(0.19 + (i % 2) * 0.06, 0.025 + Math.floor(i / 2) * 0.02, -0.02 + (i % 2) * 0.03);
    g.add(p);
  }
  const bottle = cyl(0.03, 0.03, 0.2, new THREE.MeshStandardMaterial({ color: '#BFE3F5', transparent: true, opacity: 0.6, roughness: 0.1 }), 14);
  bottle.position.set(0.0, 0.1, 0.12);
  const cap = cyl(0.015, 0.015, 0.025, mat('#1E88E5', 0.4), 10);
  cap.position.set(0.0, 0.212, 0.12);
  g.add(bottle, cap);
  return g;
}
/** A lunch box with a clear lid and half a sandwich inside. */
function lunchBox() {
  const g = new THREE.Group();
  const b = rbox(0.18, 0.06, 0.12, 0.015, mat('#4CAF50', 0.4));
  b.position.y = 0.03;
  const lid = rbox(0.185, 0.015, 0.125, 0.006, new THREE.MeshStandardMaterial({ color: '#E8F5E9', transparent: true, opacity: 0.6 }));
  lid.position.y = 0.067;
  const half = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 3), mat('#E8C79A', 0.8));
  half.position.y = 0.05;
  g.add(b, half, lid);
  return g;
}
/** Kerem's board game box. */
function gameBox() {
  const g = new THREE.Group();
  const b = rbox(0.3, 0.05, 0.3, 0.01, mat('#1E5FA8', 0.5));
  b.position.y = 0.025;
  g.add(b);
  const colors = ['#E53935', '#FBC02D', '#43A047', '#FFFFFF'];
  for (let i = 0; i < 4; i++) {
    const sq = box(0.1, 0.002, 0.1, mat(colors[i], 0.5));
    sq.position.set(i % 2 ? 0.06 : -0.06, 0.051, i < 2 ? -0.06 : 0.06);
    g.add(sq);
  }
  return g;
}
/** A pair of binoculars. */
function binoculars() {
  const g = new THREE.Group();
  const black = mat('#2B2B2B', 0.4);
  for (const x of [-0.035, 0.035]) {
    const t = cyl(0.028, 0.032, 0.11, black, 14);
    t.rotation.x = Math.PI / 2;
    t.position.set(x, 0, 0);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.026, 14), mat('#7FB8E0', 0.1, 0.3));
    lens.position.set(x, 0, 0.056);
    g.add(t, lens);
  }
  const bridge = box(0.04, 0.02, 0.04, black);
  g.add(bridge);
  return g;
}
let sketchTex: THREE.CanvasTexture | null = null;
/** Elif's drawing of the train, red and white among white hills. */
function trainDrawing() {
  if (!sketchTex) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 180;
    const g = c.getContext('2d')!;
    g.fillStyle = '#FFFDF5';
    g.fillRect(0, 0, 256, 180);
    g.fillStyle = '#BFD9EE';
    g.fillRect(0, 0, 256, 90);
    g.fillStyle = '#FFFFFF';
    g.beginPath();
    g.moveTo(0, 120);
    g.quadraticCurveTo(70, 50, 140, 110);
    g.quadraticCurveTo(200, 60, 256, 100);
    g.lineTo(256, 180);
    g.lineTo(0, 180);
    g.fill();
    g.strokeStyle = '#6B7B8C';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(10, 150);
    g.lineTo(246, 150);
    g.stroke();
    for (let i = 0; i < 3; i++) {
      g.fillStyle = '#FFFFFF';
      g.fillRect(30 + i * 68, 108, 62, 38);
      g.fillStyle = '#D32F2F';
      g.fillRect(30 + i * 68, 128, 62, 8);
      g.fillStyle = '#7FB8E0';
      g.fillRect(38 + i * 68, 114, 16, 10);
      g.fillRect(62 + i * 68, 114, 16, 10);
    }
    g.fillStyle = '#E8833A';
    g.beginPath();
    g.arc(220, 30, 16, 0, Math.PI * 2);
    g.fill();
    sketchTex = new THREE.CanvasTexture(c);
    sketchTex.colorSpace = THREE.SRGBColorSpace;
  }
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.21), new THREE.MeshStandardMaterial({ map: sketchTex, roughness: 0.8, side: THREE.DoubleSide }));
  paper.position.y = 0.105;
  g.add(paper);
  return g;
}
/** Elif's sketchbook, closed, with a pencil. */
function sketchbook() {
  const g = new THREE.Group();
  const cover = rbox(0.24, 0.03, 0.18, 0.006, mat('#7B4BB7', 0.6));
  cover.position.y = 0.015;
  const spiral = cyl(0.006, 0.006, 0.18, mat('#BDBDBD', 0.3, 0.6), 6);
  spiral.rotation.x = Math.PI / 2;
  spiral.position.set(-0.12, 0.02, 0);
  const pencil = cyl(0.006, 0.006, 0.17, mat('#FBC02D', 0.5), 6);
  pencil.rotation.z = Math.PI / 2;
  pencil.position.set(0.02, 0.036, 0.05);
  g.add(cover, spiral, pencil);
  return g;
}

/* ---------------- snow ---------------- */

/** A wooden sled with red runners. */
function sled() {
  const g = new THREE.Group();
  const wood = mat('#A0673A', 0.55);
  for (let i = 0; i < 4; i++) {
    const slat = box(0.08, 0.025, 0.85, wood);
    slat.position.set(-0.15 + i * 0.1, 0.2, 0);
    g.add(slat);
  }
  const red = mat('#C62828', 0.4, 0.3);
  for (const x of [-0.16, 0.16]) {
    const runner = box(0.03, 0.03, 0.95, red);
    runner.position.set(x, 0.03, 0);
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 12, Math.PI), red);
    curl.rotation.y = Math.PI / 2;
    curl.position.set(x, 0.12, 0.47);
    curl.rotation.z = Math.PI / 2;
    for (const z of [-0.3, 0.3]) {
      const post = box(0.025, 0.18, 0.03, red);
      post.position.set(x, 0.11, z);
      g.add(post);
    }
    g.add(runner, curl);
  }
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 4, 16, Math.PI), mat('#E0C27A', 0.8));
  rope.position.set(0, 0.2, 0.47);
  rope.rotation.x = -Math.PI / 2;
  g.add(rope);
  return g;
}
/** The horse sled of Kars: a painted box sled with a seat and a rug, its shafts reaching forward (+z) to a horse. */
function horseSled() {
  const g = new THREE.Group();
  const body = rbox(1.1, 0.45, 1.6, 0.06, mat('#1F5F8B', 0.5));
  body.position.y = 0.55;
  const trim = box(1.12, 0.06, 1.62, mat('#E3B23C', 0.4, 0.3));
  trim.position.y = 0.78;
  const seat = rbox(1.0, 0.35, 0.4, 0.05, mat('#A61C2B', 0.8));
  seat.position.set(0, 0.85, -0.5);
  const rug = box(1.0, 0.04, 0.9, mat('#C0392B', 0.9));
  rug.position.set(0, 0.815, 0.15); // above the gold trim (their tops met and flickered)
  g.add(body, trim, seat, rug);
  const steel = mat('#5A5A5A', 0.3, 0.7);
  for (const x of [-0.45, 0.45]) {
    const runner = box(0.05, 0.05, 1.9, steel);
    runner.position.set(x, 0.05, 0.05);
    const shaft = cyl(0.02, 0.02, 1.4, mat('#6E4423', 0.6), 6);
    shaft.rotation.x = Math.PI / 2 - 0.15;
    shaft.position.set(x * 0.8, 0.6, 1.4);
    for (const z of [-0.5, 0.5]) {
      const post = box(0.04, 0.3, 0.04, steel);
      post.position.set(x, 0.2, z);
      g.add(post);
    }
    g.add(runner, shaft);
  }
  for (let i = 0; i < 3; i++) {
    const bell = ball(0.04, mat('#E3B23C', 0.3, 0.6), 10);
    bell.position.set(-0.2 + i * 0.2, 0.8, 0.82);
    g.add(bell);
  }
  return g;
}
/** A snowman: three balls of snow, coal eyes, a carrot nose, a red scarf and a stick arm waving. */
function snowman() {
  const g = new THREE.Group();
  const snow = mat('#FAFCFF', 0.9);
  const s1 = ball(0.32, snow, 20);
  s1.position.y = 0.28;
  const s2 = ball(0.23, snow, 20);
  s2.position.y = 0.72;
  const s3 = ball(0.16, snow, 18);
  s3.position.y = 1.03;
  const coal = mat('#222222', 0.6);
  for (const x of [-0.055, 0.055]) {
    const e = ball(0.022, coal, 8);
    e.position.set(x, 1.07, 0.14);
    g.add(e);
  }
  for (let i = 0; i < 3; i++) {
    const b = ball(0.025, coal, 8);
    b.position.set(0, 0.62 + i * 0.12, 0.22 - Math.abs(i - 1) * 0.01);
    g.add(b);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 10), mat('#F57C00', 0.5));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.02, 0.22);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 20), mat('#C62828', 0.8));
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 0.9;
  const tail = box(0.08, 0.25, 0.03, mat('#C62828', 0.8));
  tail.position.set(0.1, 0.78, 0.16);
  tail.rotation.z = 0.2;
  g.add(s1, s2, s3, nose, scarf, tail);
  const wood = mat('#5D4037', 0.8);
  for (const sgn of [-1, 1]) {
    const arm = cyl(0.012, 0.012, 0.42, wood, 5);
    arm.position.set(sgn * 0.36, 0.86, 0);
    arm.rotation.z = sgn * (sgn > 0 ? -0.9 : 1.2);
    g.add(arm);
  }
  return g;
}
/** A little cloud of frosty breath. */
function breath() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.75, roughness: 1 });
  [[0, 0, 0, 0.05], [0.045, 0.015, 0, 0.04], [0.08, 0.035, 0, 0.03], [0.02, 0.035, 0, 0.035]].forEach(([x, y, z, r]) => {
    const b = ball(r, m, 10);
    b.position.set(x, y, z);
    g.add(b);
  });
  return g;
}
/** A cup of hot salep on a saucer, cinnamon on the foam. */
function salepCup() {
  const g = new THREE.Group();
  const saucer = cyl(0.075, 0.06, 0.012, mat('#FFFFFF', 0.35), 22);
  saucer.position.y = 0.006;
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.038, 0.07, 20, 1, true), mat('#FFFFFF', 0.35));
  (cup.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  cup.position.y = 0.047;
  const bottom = cyl(0.038, 0.038, 0.005, mat('#FFFFFF', 0.35), 16);
  bottom.position.y = 0.014;
  const salep = new THREE.Mesh(new THREE.CircleGeometry(0.047, 20), mat('#F3E7D3', 0.7));
  salep.rotation.x = -Math.PI / 2;
  salep.position.y = 0.075;
  const cinnamon = new THREE.Mesh(new THREE.CircleGeometry(0.02, 12), mat('#8D5524', 0.8));
  cinnamon.rotation.x = -Math.PI / 2;
  cinnamon.position.y = 0.076;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 12), mat('#FFFFFF', 0.35));
  handle.position.set(0.058, 0.05, 0);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.003, 6, 22), mat('#C62828', 0.4));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.072;
  g.add(saucer, cup, bottom, salep, cinnamon, handle, band);
  return g;
}
/** A copper tray with salep cups. */
function salepTray(n = 4) {
  const g = new THREE.Group();
  const tray = cyl(0.26, 0.26, 0.015, mat('#C27C3A', 0.3, 0.6), 28);
  tray.position.y = 0.008;
  g.add(tray);
  for (let i = 0; i < n; i++) {
    const c = salepCup();
    const a = (i / n) * Math.PI * 2;
    c.position.set(Math.cos(a) * 0.14, 0.015, Math.sin(a) * 0.14);
    g.add(c);
  }
  return g;
}
/** A low round tray table (a sini on legs) for the salep. */
function lowTable() {
  const g = new THREE.Group();
  const top = cyl(0.45, 0.45, 0.03, mat('#C27C3A', 0.3, 0.6), 30);
  top.position.y = 0.32;
  const base = cyl(0.3, 0.36, 0.3, mat('#7A4A26', 0.6), 16);
  base.position.y = 0.15;
  g.add(top, base);
  return g;
}

/** Things standing on the page (page widths). */
export const TREN_PROPS: Record<string, () => THREE.Object3D> = {
  pencereBozkir: () => windowView(VIEW('bozkir'), WIN.w, WIN.h),
  pencereKarli: () => windowView(VIEW('karli'), WIN.w, WIN.h),
  pencereGece: () => windowView(VIEW('bozkir'), WIN.w, WIN.h, '#3C4677'),
  koltuk: () => onPage(seat()),
  koltukYatak: () => onPage(seat(true)),
  trenMasasi: () => onPage(foldTable()),
  piknik: () => onPage(picnic()),
  saklamaKabi: () => onPage(lunchBox()),
  kutuOyunu: () => onPage(gameBox()),
  defter: () => onPage(sketchbook()),
  trenResmi: () => onPage(trainDrawing()),
  kizak: () => onPage(sled()),
  atliKizak: () => onPage(horseSled()),
  kardanAdam: () => onPage(snowman()),
  nefes: () => onPage(breath()),
  salepTepsisi: () => onPage(salepTray()),
  sini: () => onPage(lowTable()),
};

function held(o: THREE.Object3D, data: Record<string, unknown>, s = PAGE) {
  const g = onPage(o, s);
  Object.assign(g.userData, data);
  return g;
}

/** Things held in the hands (see HELD in props.ts). */
export const TREN_HELD: Record<string, () => THREE.Object3D> = {
  durbun: () => held(binoculars(), { word: 'dürbün', hand: 'R' }, PAGE * 1.3),
  defterEl: () => held(sketchbook(), { word: 'defter', atHeight: 0.32, ahead: 0.16 }, PAGE * 1.2),
  trenResmiEl: () => held(trainDrawing(), { word: 'resim', atHeight: 0.32, ahead: 0.16 }, PAGE * 1.2),
  salep: () => held(salepCup(), { word: 'salep', atHeight: 0.34, ahead: 0.16 }, PAGE * 1.4),
  salepTepsisiEl: () => held(salepTray(), { word: 'salep', atHeight: 0.42, ahead: 0.24 }),
  sandvic: () => held(lunchBox(), { word: 'saklama kabı', atHeight: 0.32, ahead: 0.16 }, PAGE * 1.1),
};
