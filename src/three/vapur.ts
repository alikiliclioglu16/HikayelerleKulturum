import * as THREE from 'three';
import { PAGE } from './horses';

/**
 * Martı ile Simit: the ferry's deck things drawn in code. The bench, the gull, the bags, the bottle, the bin, the
 * life ring and the broken glass stand in for the Meshy models until those arrive (public/models/vapur/…); the
 * railing and the napkin stay here.
 *
 * Built in metres, facing +z (towards the reader at rotY 0), standing on y = 0 around the origin, then scaled to
 * the page (PAGE metres → page widths).
 */
const mats = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, rough = 0.6, metal = 0) {
  const k = `${color}|${rough}|${metal}`;
  let m = mats.get(k);
  if (!m) mats.set(k, (m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })));
  return m;
}
function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  return b;
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

/** The white railing along the edge of the deck (küpeşte): `len` metres long, a wooden hand rail on top. */
function railing(len = 3.2) {
  const g = new THREE.Group();
  const white = mat('#F4F4F0', 0.45, 0.2);
  const H = 0.95;
  const n = Math.round(len / 0.32);
  for (let i = 0; i <= n; i++) g.add(box(0.035, H, 0.035, white, -len / 2 + (i * len) / n, H / 2));
  for (const y of [0.32, 0.62]) g.add(box(len, 0.025, 0.025, white, 0, y));
  g.add(box(len + 0.06, 0.05, 0.11, mat('#9B6A3C', 0.5), 0, H + 0.02));
  return g;
}

/** The ferry's long wooden bench: slats on an iron frame, seat 45 cm high, a slatted back. */
function ferryBench(len = 1.8) {
  const g = new THREE.Group();
  const wood = mat('#B8834E', 0.6);
  const iron = mat('#2F3A45', 0.45, 0.4);
  for (let i = 0; i < 4; i++) g.add(box(len, 0.03, 0.1, wood, 0, 0.45, -0.18 + i * 0.12));
  for (let i = 0; i < 3; i++) {
    const s = box(len, 0.09, 0.025, wood, 0, 0.6 + i * 0.11, -0.25);
    s.rotation.x = -0.12;
    g.add(s);
  }
  for (const x of [-len / 2 + 0.08, 0, len / 2 - 0.08]) {
    g.add(box(0.05, 0.44, 0.05, iron, x, 0.22, 0.12));
    g.add(box(0.05, 0.85, 0.05, iron, x, 0.42, -0.24));
    g.add(box(0.05, 0.04, 0.42, iron, x, 0.43, -0.05));
  }
  return g;
}

/** A red and white life ring (can simidi), standing up as if hung on the railing. */
function lifeRing() {
  const g = new THREE.Group();
  const R = 0.3;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.TorusGeometry(R, 0.07, 12, 16, Math.PI / 2), mat(i % 2 ? '#F4F1EA' : '#D8342B', 0.5));
    seg.rotation.z = (i * Math.PI) / 2 + Math.PI / 4;
    g.add(seg);
  }
  g.position.y = R + 0.07;
  const o = new THREE.Group();
  o.add(g);
  return o;
}

/**
 * The seagull (Pamuk Kanat): white head and breast, grey wings, a yellow beak; wings spread for gliding. The wings
 * are named so the "glide" idle can flap them now and then.
 */
function gull() {
  const g = new THREE.Group();
  const white = mat('#FBFBF8', 0.6);
  const grey = mat('#9AA6B2', 0.55);
  const dark = mat('#2A2F36', 0.5);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 12).scale(0.9, 0.85, 2.2), white);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), white);
  head.position.set(0, 0.06, 0.24);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.09, 10), mat('#F2C230', 0.4));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.05, 0.34);
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), mat('#D8342B', 0.4));
  spot.position.set(0, 0.035, 0.33);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), dark);
    eye.position.set(s * 0.05, 0.085, 0.28);
    g.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4).scale(1, 1, 0.25), white);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 0.01, -0.27);
  g.add(body, head, beak, spot, tail);
  for (const s of [-1, 1]) {
    const wing = new THREE.Group();
    wing.name = s < 0 ? 'wingL' : 'wingR';
    const inner = box(0.3, 0.02, 0.17, grey, s * 0.15, 0, 0);
    const outer = box(0.28, 0.018, 0.12, grey, s * 0.43, 0, -0.025);
    const tip = box(0.1, 0.016, 0.09, dark, s * 0.6, 0, -0.04);
    wing.add(inner, outer, tip);
    wing.position.set(s * 0.06, 0.03, 0.02);
    g.add(wing);
  }
  // the glide pivot is the body's middle, lifted off the ground
  g.position.y = 0.12;
  const o = new THREE.Group();
  o.add(g);
  return o;
}

/** A plastic bag floating in the sea, half under the water. */
function floatingBag() {
  const g = new THREE.Group();
  const film = new THREE.MeshStandardMaterial({ color: '#EEF3F7', roughness: 0.25, transparent: true, opacity: 0.85 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10).scale(1.3, 0.45, 1), film);
  b.position.y = 0.02;
  for (const s of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), film);
    handle.position.set(s * 0.08, 0.08, 0.04);
    handle.rotation.y = 0.3 * s;
    g.add(handle);
  }
  const print = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8).scale(1.2, 0.3, 1), mat('#3B7BD6', 0.4));
  print.position.set(0.05, 0.08, 0.05);
  g.add(b, print);
  return g;
}

/** The paper simit bag: brown paper, folded top. */
function simitBag() {
  const g = new THREE.Group();
  const paper = mat('#D9B98A', 0.85);
  g.add(box(0.25, 0.3, 0.1, paper, 0, 0.15));
  g.add(box(0.25, 0.05, 0.06, mat('#C9A574', 0.85), 0, 0.32));
  const label = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 20), mat('#B5651D', 0.7));
  label.position.set(0, 0.16, 0.052);
  g.add(label);
  return g;
}

/** A small bottle of water with a blue cap. */
function bottle() {
  const g = new THREE.Group();
  const clear = new THREE.MeshStandardMaterial({ color: '#CFE8F7', roughness: 0.15, transparent: true, opacity: 0.75 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.15, 16), clear);
  b.position.y = 0.075;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.03, 0.03, 16), clear);
  neck.position.y = 0.165;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.018, 12), mat('#2F6BD8', 0.4));
  cap.name = 'cap';
  cap.position.y = 0.19;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.05, 16), mat('#3AA0D8', 0.5));
  label.position.y = 0.08;
  g.add(b, neck, cap, label);
  return g;
}

/** The ferry's metal rubbish bin with a swing lid. */
function bin() {
  const g = new THREE.Group();
  const steel = mat('#B9C2CA', 0.35, 0.6);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.8, 24), steel);
  body.position.y = 0.4;
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.225, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#2F5F9E', 0.4, 0.3));
  lid.position.y = 0.8;
  const slot = box(0.2, 0.06, 0.05, mat('#1D2833', 0.6), 0, 0.88, 0.17);
  g.add(body, lid, slot);
  return g;
}

/** A broken tea glass on the deck: the cup on its side and three shards. */
function brokenGlass() {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: '#E8C890', roughness: 0.1, transparent: true, opacity: 0.7 });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.08, 14, 1, true), glass);
  cup.rotation.z = Math.PI / 2;
  cup.position.y = 0.03;
  g.add(cup);
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.018 + i * 0.004), glass);
    s.position.set(0.06 + i * 0.03, 0.006, (i % 2 ? 1 : -1) * 0.03);
    s.rotation.set(i, i * 2, 0);
    s.scale.y = 0.3;
    g.add(s);
  }
  return g;
}

/** A paper napkin caught by the wind, a little crumpled. */
function napkin() {
  const geo = new THREE.PlaneGeometry(0.25, 0.25, 4, 4);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 18) * 0.02 + Math.cos(p.getY(i) * 14) * 0.015);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.95, side: THREE.DoubleSide }));
  m.rotation.x = -1.1;
  m.position.y = 0.1;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

/** A sesame simit, held in one hand. */
function simit() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.022, 10, 24), mat('#B5651D', 0.75));
  g.add(ring);
  return g;
}

/** Things standing on the page (page widths). */
export const VAPUR_PROPS: Record<string, () => THREE.Object3D> = {
  korkuluk: () => onPage(railing()),
  vapurSirasi: () => onPage(ferryBench()),
  canSimidi: () => onPage(lifeRing()),
  marti: () => onPage(gull()),
  plastikPoset: () => onPage(floatingBag()),
  simitPosetiYerde: () => onPage(simitBag()),
  copKutusu: () => onPage(bin()),
  kirikBardak: () => onPage(brokenGlass()),
  peceteUcan: () => onPage(napkin()),
  suSisesiYerde: () => onPage(bottle()),
};

function held(o: THREE.Object3D, data: Record<string, unknown>) {
  const g = onPage(o);
  Object.assign(g.userData, data);
  return g;
}

/** Things held in the hands (see HELD in props.ts). */
export const VAPUR_HELD: Record<string, () => THREE.Object3D> = {
  simit: () => {
    const g = held(simit(), { word: 'simit', hand: 'R' });
    g.rotation.x = 1.2;
    return g;
  },
  simitPoseti: () => held(simitBag(), { word: 'simit poşeti', atHeight: 0.4, ahead: 0.22 }),
  suSisesi: () => held(bottle(), { word: 'şişe', hand: 'R' }),
  pecete: () => held(napkin(), { word: 'peçete', hand: 'R' }),
};
