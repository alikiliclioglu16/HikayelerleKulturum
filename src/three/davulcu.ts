import * as THREE from 'three';
import { PAGE } from './horses';

/**
 * Davulcu Dede: the Ramadan drum, the coloured-glass lantern and its spots of light, a street lamp, the
 * neighbourhood's iftar table and its dishes, drawn in code. The lantern, the dishes and Hüseyin dede's drum stand
 * in for the Meshy models until they come (public/models/davulcu/…).
 *
 * Built in metres facing +z, standing on y = 0, then scaled to the page (PAGE metres → page widths).
 */
const mats = new Map<string, THREE.Material>();
function mat(color: string, rough = 0.6, metal = 0, emissive?: string) {
  const k = `${color}|${rough}|${metal}|${emissive}`;
  let m = mats.get(k);
  if (!m) {
    const s = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    if (emissive) {
      s.emissive.set(emissive);
      s.emissiveIntensity = 0.9;
    }
    mats.set(k, (m = s));
  }
  return m;
}
function shadows(g: THREE.Object3D) {
  g.traverse((n) => ((n as THREE.Mesh).castShadow = true));
  return g;
}
function onPage(o: THREE.Object3D, s = PAGE) {
  const g = new THREE.Group();
  o.scale.setScalar(s);
  g.add(shadows(o));
  return g;
}
function cyl(rt: number, rb: number, h: number, m: THREE.Material, seg = 24) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
}

/** The big Ramadan drum: a wooden body, two skins, red cords zig-zagging between the hoops. */
function drum(r = 0.27, w = 0.32) {
  const g = new THREE.Group();
  const body = cyl(r, r, w, mat('#B5651D', 0.55));
  body.rotation.z = Math.PI / 2;
  g.add(body);
  for (const s of [-1, 1]) {
    const skin = cyl(r * 1.02, r * 1.02, 0.012, mat('#F2E6C8', 0.8));
    skin.rotation.z = Math.PI / 2;
    skin.position.x = (s * w) / 2;
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.018, 8, 32), mat('#7A3B12', 0.5));
    hoop.rotation.y = Math.PI / 2;
    hoop.position.x = (s * w) / 2;
    g.add(skin, hoop);
  }
  const cord = mat('#C62828', 0.6);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = ((i + 0.5) / 12) * Math.PI * 2;
    const p0 = new THREE.Vector3(-w / 2, Math.sin(a) * r * 1.03, Math.cos(a) * r * 1.03);
    const p1 = new THREE.Vector3(w / 2, Math.sin(b) * r * 1.03, Math.cos(b) * r * 1.03);
    const len = p0.distanceTo(p1);
    const c = cyl(0.006, 0.006, len, cord, 6);
    c.position.copy(p0).add(p1).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
    g.add(c);
  }
  g.position.y = r;
  const o = new THREE.Group();
  o.add(g);
  return o;
}

/**
 * The drum as the drummer holds it, with its tokmak (the big wooden beater with a felt-wrapped head) over the
 * right skin and the thin çubuk over the left. The tokmak swings down onto the skin with every beat (its group is
 * marked `beater`: the drummer's beat squash turns it, see ToyPerformer).
 */
function drumPlayed(r: number, w: number) {
  const o = drum(r, w);
  const wood = mat('#8A5A2B', 0.5);
  const felt = mat('#EFE6D2', 0.9);
  // tokmak: pivots above the right skin, the stick reaching down to it
  const tokmak = new THREE.Group();
  tokmak.position.set(w / 2 + 0.05, r * 2.15, 0);
  const stick = cyl(0.012, 0.014, r * 1.1, wood, 8);
  stick.position.y = -r * 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), felt);
  head.scale.set(1, 1.2, 1);
  head.position.y = -r * 1.1;
  tokmak.add(stick, head);
  tokmak.rotation.z = 0.35;
  tokmak.userData.beater = { axis: 'z', rest: 0.35, swing: -0.5 };
  // çubuk: a thin switch held against the left skin
  const cubuk = cyl(0.006, 0.006, r * 1.4, wood, 6);
  cubuk.position.set(-w / 2 - 0.04, r * 1.45, 0);
  cubuk.rotation.z = -0.5;
  o.add(tokmak, cubuk);
  return o;
}

/** A coloured-glass lantern: a brass frame, red, blue, green and amber panes, a light inside. */
function lantern(lit = true) {
  const g = new THREE.Group();
  const brass = mat('#C9A227', 0.35, 0.7);
  const panes = ['#E53935', '#1E88E5', '#43A047', '#FFB300', '#8E24AA', '#00ACC1'];
  const R = 0.08;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.083, 0.17), new THREE.MeshStandardMaterial({ color: panes[i], emissive: lit ? panes[i] : '#000', emissiveIntensity: 0.8, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    p.position.set(Math.sin(a) * R * 0.87, 0.14, Math.cos(a) * R * 0.87);
    p.rotation.y = a;
    p.name = 'pane';
    g.add(p);
  }
  const base = cyl(R, R * 0.9, 0.03, brass, 6);
  base.position.y = 0.04;
  g.add(base);
  const top = new THREE.Mesh(new THREE.ConeGeometry(R * 1.05, 0.09, 6), brass);
  top.position.y = 0.27;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 16), brass);
  ring.position.y = 0.34;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: lit ? '#FFF3C4' : '#888' }));
  core.position.y = 0.14;
  g.add(top, ring, core);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const rod = cyl(0.005, 0.005, 0.2, brass, 6);
    rod.position.set(Math.sin(a) * R, 0.14, Math.cos(a) * R);
    g.add(rod);
  }
  return g;
}

/** Spots of coloured light on a wall: soft round blobs in the lantern's colours (lie in the xy plane). */
function lightSpots() {
  const g = new THREE.Group();
  const cols = ['#FF5252', '#448AFF', '#69F0AE', '#FFD740', '#E040FB', '#18FFFF'];
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const grd = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = grd;
  x.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      // normal blending: added light would wash out on a bright wall, these coloured spots stay visible
      new THREE.MeshBasicMaterial({ color: cols[i % cols.length], map: tex, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    const a = i * 2.4;
    const r = 0.25 + (i % 5) * 0.12;
    m.position.set(Math.cos(a) * r * 1.6, 0.9 + Math.sin(a) * r, 0);
    m.scale.setScalar(0.18 + (i % 3) * 0.07);
    g.add(m);
  }
  return g;
}

/** An old iron street lamp with a warm glowing glass. */
function streetLamp() {
  const g = new THREE.Group();
  const iron = mat('#2E3440', 0.5, 0.5);
  const pole = cyl(0.04, 0.06, 3.0, iron, 12);
  pole.position.y = 1.5;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.3, 6), new THREE.MeshStandardMaterial({ color: '#FFE08A', emissive: '#FFC94A', emissiveIntensity: 1.2 }));
  head.position.y = 3.15;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 6), iron);
  cap.position.y = 3.38;
  g.add(pole, head, cap);
  return g;
}

/** The long iftar table: a red cloth over it, place settings of plates, glasses and napkins. */
function iftarTable(len = 3.0) {
  const g = new THREE.Group();
  const wood = mat('#8D5A2B', 0.6);
  const top = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.8), wood);
  top.position.y = 0.72;
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(len + 0.06, 0.012, 0.86), mat('#C62828', 0.85));
  cloth.position.y = 0.752;
  const runner = new THREE.Mesh(new THREE.BoxGeometry(len - 0.1, 0.004, 0.22), mat('#F5E6C8', 0.85));
  runner.position.y = 0.76;
  g.add(top, cloth, runner);
  for (const x of [-len / 2 + 0.08, len / 2 - 0.08])
    for (const z of [-0.33, 0.33]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), wood);
      leg.position.set(x, 0.36, z);
      g.add(leg);
    }
  const plate = mat('#FFFFFF', 0.35);
  for (let i = 0; i < Math.floor(len / 0.5); i++) {
    const x = -len / 2 + 0.3 + i * 0.5;
    for (const z of [-0.26, 0.26]) {
      const p = cyl(0.11, 0.09, 0.015, plate, 20);
      p.position.set(x, 0.765, z);
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.09, 12), new THREE.MeshStandardMaterial({ color: '#E1F5FE', transparent: true, opacity: 0.6, roughness: 0.1 }));
      gl.position.set(x + 0.16, 0.8, z * 0.85);
      g.add(p, gl);
    }
  }
  return g;
}

/** A bowl of lentil soup. */
function soup() {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#2E6DB4', 0.4));
  bowl.rotation.x = Math.PI;
  bowl.position.y = 0.08;
  const s = cyl(0.074, 0.074, 0.01, mat('#E07B22', 0.7), 18);
  s.position.y = 0.07;
  g.add(bowl, s);
  return g;
}

/** A boat-shaped Ramadan pide with sesame and a shiny egg-washed crust. */
function pide() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 10).scale(2.1, 0.4, 1), mat('#C98A3E', 0.5));
  b.position.y = 0.035;
  for (let i = 0; i < 4; i++) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.14), mat('#8E5A22', 0.7));
    groove.position.set(-0.12 + i * 0.08, 0.072, 0);
    g.add(groove);
  }
  g.add(b);
  return g;
}

/** Güllaç on a round tray: white layers, pomegranate seeds on top. */
function gullac() {
  const g = new THREE.Group();
  const tray = cyl(0.21, 0.2, 0.02, mat('#C0C6CC', 0.3, 0.7), 28);
  tray.position.y = 0.01;
  const cake = cyl(0.17, 0.17, 0.05, mat('#FAF6EC', 0.7), 28);
  cake.position.y = 0.045;
  g.add(tray, cake);
  const red = mat('#C2185B', 0.3);
  for (let i = 0; i < 22; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), red);
    const a = i * 2.39;
    const r = 0.03 + (i % 6) * 0.022;
    s.position.set(Math.cos(a) * r, 0.073, Math.sin(a) * r);
    g.add(s);
  }
  return g;
}

/** Things standing on the page (page widths). */
export const DAVULCU_PROPS: Record<string, () => THREE.Object3D> = {
  ramazanDavulu: () => onPage(drum()),
  renkliFener: () => onPage(lantern()),
  renkliFenerSonuk: () => onPage(lantern(false)),
  fenerBenekleri: () => onPage(lightSpots()),
  sokakLambasi: () => onPage(streetLamp()),
  iftarMasasi: () => onPage(iftarTable()),
  iftarMasasiKisa: () => onPage(iftarTable(2.1)),
  corbaKasesi: () => onPage(soup()),
  pide: () => onPage(pide()),
  gullacTepsisi: () => onPage(gullac()),
};

function held(o: THREE.Object3D, data: Record<string, unknown>, s = PAGE) {
  const g = onPage(o, s);
  Object.assign(g.userData, data);
  return g;
}

/** Things held in the hands (see HELD in props.ts). */
export const DAVULCU_HELD: Record<string, () => THREE.Object3D> = {
  // the drum hangs in front of the drummer's belly
  ramazanDavulu: () => held(drumPlayed(0.22, 0.26), { word: 'davul', atHeight: 0.34, ahead: 0.2 }),
  // the little drum Hüseyin dede gave Can, played held in front of him
  kucukDavulEl: () => held(drumPlayed(0.15, 0.17), { word: 'davul', atHeight: 0.36, ahead: 0.2 }),
  fener: () => held(lantern(), { word: 'fener', hand: 'R' }, PAGE * 1.3),
  fenerIkiEl: () => held(lantern(), { word: 'fener', atHeight: 0.36, ahead: 0.2 }, PAGE * 1.3),
  corbaKasesi: () => held(soup(), { word: 'çorba', atHeight: 0.42, ahead: 0.22 }, PAGE * 1.4),
  pide: () => held(pide(), { word: 'pide', atHeight: 0.42, ahead: 0.22 }, PAGE * 1.3),
  gullacTepsisi: () => held(gullac(), { word: 'güllaç', atHeight: 0.42, ahead: 0.24 }),
};
