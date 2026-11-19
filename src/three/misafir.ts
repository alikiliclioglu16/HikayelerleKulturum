import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PAGE } from './horses';

/**
 * Kapıdaki Yolcu: a rainy evening at grandma's in İzmir — falling rain in a doorway and in the street, the coat
 * stand, wet shoes and the slippers by the door, the umbrella, a blanket, soup bowls and the bread basket, a tin
 * of cookies for the road, toys on the rug and Can's "please knock" card for his door.
 *
 * Built in metres facing +z, standing on y = 0, then scaled to the page (PAGE metres → page widths), except the
 * rain curtains, which are built straight in page widths to fit a doorway or the whole street.
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

/* ---------------- rain ---------------- */

let rainCanvas: HTMLCanvasElement | null = null;
/** Thin light streaks on a transparent tile; the tile scrolls down (fx "rainfall") so the rain falls. */
function rainTexture(rx: number, ry: number) {
  if (!rainCanvas) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const g = c.getContext('2d')!;
    let s = 11;
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    g.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const x = r() * 128;
      const y = r() * 256;
      const len = 14 + r() * 22;
      g.strokeStyle = `rgba(220,235,255,${0.35 + r() * 0.4})`;
      g.lineWidth = 1 + r() * 1.2;
      for (const dy of [0, -256, 256]) {
        g.beginPath();
        g.moveTo(x, y + dy);
        g.lineTo(x - len * 0.12, y + dy + len);
        g.stroke();
      }
    }
    rainCanvas = c;
  }
  const t = new THREE.CanvasTexture(rainCanvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** A curtain of falling rain w × h page widths, its bottom on y = 0 (give the model fx "rainfall"). */
function rain(w: number, h: number) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: rainTexture(w / 0.16, h / 0.32), transparent: true, depthWrite: false, opacity: 0.9 }),
  );
  m.position.y = h / 2;
  m.renderOrder = 2;
  g.add(m);
  return g;
}

/* ---------------- by the door ---------------- */

/** A wooden coat stand with two coats and a scarf hanging on it. */
function coatStand(coats = true) {
  const g = new THREE.Group();
  const wood = mat('#6E4423', 0.55);
  const pole = cyl(0.025, 0.03, 1.75, wood, 10);
  pole.position.y = 0.875;
  g.add(pole);
  for (let i = 0; i < 3; i++) {
    const foot = box(0.4, 0.03, 0.04, wood);
    foot.rotation.y = (i * Math.PI) / 3;
    foot.position.y = 0.03;
    g.add(foot);
  }
  for (let i = 0; i < 4; i++) {
    const hook = cyl(0.012, 0.012, 0.16, wood, 6);
    hook.rotation.z = Math.PI / 2.6;
    hook.rotation.y = (i * Math.PI) / 2;
    hook.position.set(Math.cos((i * Math.PI) / 2) * 0.05, 1.68, -Math.sin((i * Math.PI) / 2) * 0.05);
    g.add(hook);
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), wood);
  knob.position.y = 1.78;
  g.add(knob);
  if (coats) {
    for (const [x, color, len] of [[-0.12, '#3B4A63', 0.95], [0.12, '#8C3B2E', 0.8]] as const) {
      const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, len, 12, 1, true), mat(color, 0.85));
      (coat.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      coat.position.set(x, 1.66 - len / 2, 0.04);
      const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(color, 0.85));
      shoulders.position.set(x, 1.66, 0.04);
      g.add(coat, shoulders);
    }
    const scarf = box(0.08, 0.6, 0.02, mat('#E3B23C', 0.8));
    scarf.position.set(0, 1.35, 0.1);
    g.add(scarf);
  }
  return g;
}
/** A pair of shoes side by side (wet ones, a little darker, or the ones left by the door). */
function shoes(color = '#5B3A29') {
  const g = new THREE.Group();
  for (const x of [-0.06, 0.06]) {
    const sole = rbox(0.09, 0.03, 0.24, 0.012, mat('#2B2B2B', 0.7));
    sole.position.set(x, 0.015, 0);
    const upper = rbox(0.085, 0.07, 0.2, 0.03, mat(color, 0.35));
    upper.position.set(x, 0.06, -0.015);
    g.add(sole, upper);
  }
  return g;
}
/** A pair of soft slippers, pom-poms on top. */
function slippers(color = '#C2185B') {
  const g = new THREE.Group();
  for (const x of [-0.06, 0.06]) {
    const sole = rbox(0.09, 0.025, 0.22, 0.012, mat('#F3E9D8', 0.8));
    sole.position.set(x, 0.013, 0);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(color, 0.9));
    top.scale.set(0.9, 0.7, 1.3);
    top.position.set(x, 0.025, 0.04);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), mat('#FFFFFF', 0.95));
    pom.position.set(x, 0.065, 0.07);
    g.add(sole, top, pom);
  }
  return g;
}
/** A big open umbrella on a crooked handle. */
function umbrella(color = '#1F5F8B') {
  const g = new THREE.Group();
  const shaft = cyl(0.01, 0.01, 0.95, mat('#2B2B2B', 0.4, 0.5), 8);
  shaft.position.y = 0.475;
  const crook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), mat('#6E4423', 0.5));
  crook.rotation.z = Math.PI;
  crook.position.set(0.05, 0, 0);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.28, 8, 1, true), mat(color, 0.5));
  (canopy.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  canopy.position.y = 0.88;
  const tip = cyl(0.008, 0.008, 0.1, mat('#2B2B2B', 0.4), 6);
  tip.position.y = 1.06;
  g.add(shaft, crook, canopy, tip);
  return g;
}
/** A folded umbrella leaning on the wall, dripping. */
function umbrellaClosed(color = '#1F5F8B') {
  const g = new THREE.Group();
  const shaft = cyl(0.01, 0.01, 0.9, mat('#2B2B2B', 0.4, 0.5), 8);
  shaft.position.y = 0.45;
  const cloth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.6, 8), mat(color, 0.5));
  cloth.rotation.x = Math.PI;
  cloth.position.y = 0.45;
  const crook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), mat('#6E4423', 0.5));
  crook.position.set(0.05, 0.9, 0);
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshStandardMaterial({ color: '#9CC7E8', roughness: 0.05, transparent: true, opacity: 0.55 }));
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(-0.08, 0.003, 0.05);
  g.add(shaft, cloth, crook, puddle);
  g.rotation.z = 0.18;
  return g;
}

/* ---------------- at the table ---------------- */

/** A plain wooden chair, seat 0.45 m high. */
function chair() {
  const g = new THREE.Group();
  const wood = mat('#8D5A32', 0.55);
  const seat = box(0.42, 0.04, 0.4, wood);
  seat.position.y = 0.45;
  g.add(seat);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const leg = box(0.035, 0.45, 0.035, wood);
      leg.position.set(sx * 0.18, 0.225, sz * 0.17);
      g.add(leg);
    }
  for (const sx of [-1, 1]) {
    const post = box(0.035, 0.45, 0.035, wood);
    post.position.set(sx * 0.18, 0.69, -0.18);
    g.add(post);
  }
  const back = box(0.4, 0.14, 0.03, wood);
  back.position.set(0, 0.84, -0.18);
  g.add(back);
  return g;
}
/** A soup bowl of red lentil soup, a lemon slice on top. */
function soupBowl() {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#F6F1E7', 0.35));
  (bowl.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  bowl.position.y = 0.09;
  const soup = new THREE.Mesh(new THREE.CircleGeometry(0.082, 20), mat('#D9772B', 0.5));
  soup.rotation.x = -Math.PI / 2;
  soup.position.y = 0.075;
  const lemon = new THREE.Mesh(new THREE.CircleGeometry(0.02, 12), mat('#F5D547', 0.5));
  lemon.rotation.x = -Math.PI / 2;
  lemon.position.set(0.025, 0.077, 0.01);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.004, 6, 24), mat('#1C5FA8', 0.4));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.06;
  g.add(bowl, soup, lemon, band);
  return g;
}
/** Soup bowls in a row along a table, spaced `gap` metres. */
function soupRow(n = 4, gap = 0.32) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const b = soupBowl();
    b.position.x = (i - (n - 1) / 2) * gap;
    g.add(b);
  }
  return g;
}
/** A small basket of sliced bread. */
function breadBasket() {
  const g = new THREE.Group();
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.08, 18, 1, true), mat('#C99A5B', 0.85));
  (basket.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  basket.position.y = 0.04;
  const bottom = cyl(0.11, 0.11, 0.01, mat('#C99A5B', 0.85));
  bottom.position.y = 0.005;
  const cloth = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), mat('#D94B4B', 0.9));
  cloth.rotation.x = -Math.PI / 2;
  cloth.position.y = 0.05;
  g.add(basket, bottom, cloth);
  for (let i = 0; i < 4; i++) {
    const slice = rbox(0.12, 0.09, 0.025, 0.02, mat('#E7C38C', 0.8));
    slice.position.set(-0.04 + i * 0.026, 0.1, -0.02 + i * 0.012);
    slice.rotation.set(-0.3, 0.2 * i, 0);
    const crust = rbox(0.125, 0.095, 0.02, 0.02, mat('#B8742E', 0.7));
    crust.position.copy(slice.position);
    crust.rotation.copy(slice.rotation);
    crust.position.z -= 0.004;
    g.add(crust, slice);
  }
  return g;
}
/** A tin box of cookies, lid open, tied with a ribbon. */
function cookieTin() {
  const g = new THREE.Group();
  const tin = cyl(0.13, 0.13, 0.07, mat('#2E6DA4', 0.35, 0.4), 24);
  tin.position.y = 0.035;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.006, 6, 24), mat('#D4A62A', 0.3, 0.6));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.07;
  g.add(tin, rim);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const c = cyl(0.035, 0.035, 0.015, mat(i % 2 ? '#D9A55A' : '#C88A3F', 0.8), 14);
    c.position.set(i === 6 ? 0 : Math.cos(a) * 0.075, 0.075, i === 6 ? 0 : Math.sin(a) * 0.075);
    c.rotation.x = (i % 3) * 0.1;
    g.add(c);
  }
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.008, 6, 12), mat('#D32F2F', 0.6));
  bow.position.set(0, 0.09, 0.12);
  g.add(bow);
  return g;
}
/** A folded wool blanket with stripes. */
function blanket() {
  const g = new THREE.Group();
  const cols = ['#B23A48', '#F2E6C8', '#B23A48', '#2E6DA4', '#B23A48'];
  cols.forEach((c, i) => {
    const s = box(0.45 / cols.length, 0.12, 0.3, mat(c, 0.95));
    s.position.set(-0.225 + (i + 0.5) * (0.45 / cols.length), 0.06, 0);
    g.add(s);
  });
  return g;
}
/* ---------------- the children's room ---------------- */

/** Toys on the rug: a block tower, a ball, a doll's teapot and two cups. */
function toys() {
  const g = new THREE.Group();
  const cols = ['#E53935', '#FBC02D', '#1E88E5', '#43A047', '#8E24AA'];
  for (let i = 0; i < 5; i++) {
    const b = rbox(0.12, 0.12, 0.12, 0.015, mat(cols[i], 0.5));
    b.position.set(-0.35 + (i % 2) * 0.02, 0.06 + i * 0.12, 0);
    b.rotation.y = i * 0.3;
    g.add(b);
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), mat('#FF7043', 0.4));
  ball.position.set(0.35, 0.11, 0.1);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.111, 0.012, 6, 24), mat('#FFFFFF', 0.4));
  stripe.position.copy(ball.position);
  stripe.rotation.y = 0.6;
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), mat('#F8BBD0', 0.4));
  pot.scale.y = 0.85;
  pot.position.set(0, 0.06, 0.05);
  const spout = cyl(0.01, 0.018, 0.07, mat('#F8BBD0', 0.4), 8);
  spout.rotation.z = -0.9;
  spout.position.set(0.075, 0.08, 0.05);
  g.add(ball, stripe, pot, spout);
  for (const x of [-0.12, 0.12]) {
    const cup = cyl(0.03, 0.025, 0.04, mat('#FFFFFF', 0.4), 12);
    cup.position.set(x, 0.02, 0.18);
    g.add(cup);
  }
  return g;
}

let cardTex: THREE.CanvasTexture | null = null;
/** Can's card for his door: "Lütfen kapıyı çalın" in big letters, a little drawn door and a knocking hand. */
function doorCard() {
  if (!cardTex) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 340;
    const g = c.getContext('2d')!;
    g.fillStyle = '#FFF8E1';
    g.fillRect(0, 0, 256, 340);
    g.strokeStyle = '#E53935';
    g.lineWidth = 10;
    g.strokeRect(8, 8, 240, 324);
    g.fillStyle = '#1C3F8C';
    g.textAlign = 'center';
    g.font = 'bold 44px "Baloo 2", "Comic Sans MS", sans-serif';
    g.fillText('Lütfen', 128, 76);
    g.fillText('kapıyı', 128, 128);
    g.fillText('çalın', 128, 180);
    // a little door and a hand knocking
    g.fillStyle = '#5B9A8B';
    g.fillRect(70, 205, 60, 105);
    g.fillStyle = '#F2C94C';
    g.beginPath();
    g.arc(118, 260, 5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#F4C7A1';
    g.beginPath();
    g.arc(170, 245, 20, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#E53935';
    g.font = 'bold 30px sans-serif';
    g.fillText('tık', 196, 220);
    g.fillText('tık', 206, 300);
    cardTex = new THREE.CanvasTexture(c);
    cardTex.colorSpace = THREE.SRGBColorSpace;
  }
  const g = new THREE.Group();
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.345), new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.8 }));
  card.position.y = 0.1725;
  const tape = box(0.07, 0.02, 0.002, new THREE.MeshStandardMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.7 }));
  tape.position.set(0, 0.345, 0.002);
  tape.rotation.z = 0.1;
  g.add(card, tape);
  return g;
}

/** Things standing on the page (page widths). */
export const MISAFIR_PROPS: Record<string, () => THREE.Object3D> = {
  yagmurKapi: () => rain(0.3, 0.56),
  yagmurPencere: () => rain(0.2, 0.36),
  yagmurSokak: () => rain(1.0, 0.85),
  portmanto: () => onPage(coatStand()),
  portmantoBos: () => onPage(coatStand(false)),
  ayakkabilar: () => onPage(shoes()),
  ayakkabilarKirmizi: () => onPage(shoes('#B23A2E')),
  terlikler: () => onPage(slippers()),
  terliklerMavi: () => onPage(slippers('#1E88E5')),
  semsiyeKapali: () => onPage(umbrellaClosed()),
  sandalye: () => onPage(chair()),
  corbaKaseleri: () => onPage(soupRow()),
  ekmekSepeti: () => onPage(breadBasket()),
  kurabiyeKutusu: () => onPage(cookieTin()),
  battaniyeKatli: () => onPage(blanket()),
  oyuncaklar: () => onPage(toys()),
  kapiKarti: () => onPage(doorCard()),
};

function held(o: THREE.Object3D, data: Record<string, unknown>, s = PAGE) {
  const g = onPage(o, s);
  Object.assign(g.userData, data);
  return g;
}

/** Things held in the hands (see HELD in props.ts). */
export const MISAFIR_HELD: Record<string, () => THREE.Object3D> = {
  semsiye: () => held(umbrella(), { word: 'şemsiye', hand: 'R' }),
  terlikEl: () => held(slippers('#1E88E5'), { word: 'terlik', atHeight: 0.3, ahead: 0.16 }),
  battaniye: () => held(blanket(), { word: 'battaniye', atHeight: 0.3, ahead: 0.18 }),
  ekmekSepetiEl: () => held(breadBasket(), { word: 'ekmek', atHeight: 0.32, ahead: 0.18 }),
  kurabiyeKutusuEl: () => held(cookieTin(), { word: 'kurabiye', atHeight: 0.36, ahead: 0.2 }),
  kapiKartiEl: () => held(doorCard(), { word: 'kart', atHeight: 0.3, ahead: 0.14 }, PAGE * 0.8),
};
