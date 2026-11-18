import * as THREE from 'three';
import { PAGE } from './horses';

/**
 * Karagöz ile Hacivat'ın Gölgesi: the shadow-play screen (a wooden booth with a white cloth), the light that makes
 * it glow, the oil lamp behind it and grandma's parcel, drawn in code. The puppets themselves are pictures
 * (`proc: "panel"` in book.json), as flat as the real leather ones.
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
      s.emissiveIntensity = 1;
    }
    mats.set(k, (m = s));
  }
  return m;
}
function onPage(o: THREE.Object3D, s = PAGE, shadow = true) {
  const g = new THREE.Group();
  o.scale.setScalar(s);
  if (shadow) o.traverse((n) => ((n as THREE.Mesh).castShadow = true));
  g.add(o);
  return g;
}
function box(w: number, h: number, d: number, m: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
}

/** The screen's cloth size and height (metres): the puppets on it are placed from these. */
export const PERDE = { w: 1.5, h: 1.0, bottom: 0.56 };

let glowTex: THREE.Texture | null = null;
/** The cloth lit from behind: warm and bright in the middle, darker towards the edges, with a faint weave. */
function glowTexture() {
  if (!glowTex) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 342;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(256, 190, 20, 256, 171, 330);
    grd.addColorStop(0, '#FFF6D8');
    grd.addColorStop(0.45, '#FBE3A6');
    grd.addColorStop(0.85, '#E9B867');
    grd.addColorStop(1, '#C98E45');
    g.fillStyle = grd;
    g.fillRect(0, 0, c.width, c.height);
    g.globalAlpha = 0.05;
    g.fillStyle = '#8A5A22';
    for (let y = 0; y < c.height; y += 3) g.fillRect(0, y, c.width, 1);
    for (let x = 0; x < c.width; x += 3) g.fillRect(x, 0, 1, c.height);
    glowTex = new THREE.CanvasTexture(c);
    glowTex.colorSpace = THREE.SRGBColorSpace;
  }
  return glowTex;
}

/**
 * The puppet booth: two posts and a carved top beam framing a white cloth, a wooden apron below it (the puppeteers
 * hide behind it) and two feet. `lit`: the cloth glows (the lamp behind it is on).
 */
function booth(lit: boolean) {
  const g = new THREE.Group();
  const wood = mat('#8B5A2B', 0.55);
  const dark = mat('#5E3A1A', 0.6);
  const { w, h, bottom } = PERDE;
  const top = bottom + h;
  for (const s of [-1, 1]) {
    const post = box(0.07, top + 0.1, 0.07, wood);
    post.position.set(s * (w / 2 + 0.035), (top + 0.1) / 2, 0);
    const foot = box(0.09, 0.05, 0.42, dark);
    foot.position.set(s * (w / 2 + 0.035), 0.025, 0);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), mat('#C9A227', 0.4, 0.4));
    knob.position.set(s * (w / 2 + 0.035), top + 0.14, 0);
    g.add(post, foot, knob);
  }
  const beam = box(w + 0.2, 0.09, 0.08, wood);
  beam.position.set(0, top + 0.045, 0);
  const sill = box(w + 0.14, 0.05, 0.1, wood);
  sill.position.set(0, bottom - 0.025, 0.01);
  // the apron: a red cloth with a golden border hanging below the screen
  const apron = box(w + 0.07, bottom - 0.05, 0.02, mat('#9E1B1B', 0.85));
  apron.position.set(0, (bottom - 0.05) / 2, 0);
  const band = box(w + 0.07, 0.04, 0.024, mat('#D4A62A', 0.45, 0.3));
  band.position.set(0, bottom - 0.1, 0);
  g.add(beam, sill, apron, band);
  for (let i = 0; i < 7; i++) {
    const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), mat('#D4A62A', 0.45, 0.3));
    d.scale.set(1, 1.4, 0.4);
    d.position.set(-w / 2 + 0.12 + (i * (w - 0.24)) / 6, (bottom - 0.1) / 2, 0.014);
    g.add(d);
  }
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    lit ? new THREE.MeshBasicMaterial({ map: glowTexture() }) : mat('#EFE8D8', 0.95),
  );
  cloth.position.set(0, bottom + h / 2, lit ? 0.004 : 0);
  cloth.castShadow = false;
  g.add(cloth);
  // the back of the cloth (seen from behind, where the puppeteers stand)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat('#E6DCC6', 0.95));
  back.rotation.y = Math.PI;
  back.position.set(0, bottom + h / 2, -0.004);
  g.add(back);
  return g;
}

/** Only the glowing cloth, to switch the light on in front of a dark screen. */
function glow() {
  const { w, h, bottom } = PERDE;
  const g = new THREE.Group();
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: glowTexture() }));
  cloth.position.set(0, bottom + h / 2, 0.006);
  g.add(cloth);
  return g;
}

/** An oil lamp: a brass foot, a glass chimney with a warm flame inside. */
function lamp(on = true) {
  const g = new THREE.Group();
  const brass = mat('#C9A227', 0.35, 0.6);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.04, 20), brass);
  foot.position.y = 0.02;
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 12), brass);
  bowl.scale.set(1, 0.7, 1);
  bowl.position.y = 0.1;
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.05, 0.16, 18, 1, true),
    new THREE.MeshStandardMaterial({ color: '#FFF3D0', transparent: true, opacity: 0.45, roughness: 0.1, side: THREE.DoubleSide }),
  );
  glass.position.y = 0.23;
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), on ? mat('#FFD27A', 0.3, 0, '#FFB52E') : mat('#5A4A3A', 0.8));
  flame.scale.set(1, 1.7, 1);
  flame.position.y = 0.2;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 18, Math.PI), brass);
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(0.09, 0.1, 0);
  g.add(foot, bowl, glass, flame, handle);
  return g;
}

/** Grandma's parcel: an open cardboard box with its flaps up, tape and a postage label, tissue paper inside. */
function parcel() {
  const g = new THREE.Group();
  const card = mat('#C8955A', 0.85);
  const w = 0.5, h = 0.26, d = 0.36, t = 0.012;
  const bottom = box(w, t, d, card);
  bottom.position.y = t / 2;
  g.add(bottom);
  for (const [x, z, bw, bd] of [[0, d / 2, w, t], [0, -d / 2, w, t], [w / 2, 0, t, d], [-w / 2, 0, t, d]] as const) {
    const side = box(bw, h, bd, card);
    side.position.set(x, h / 2, z);
    g.add(side);
  }
  // the four flaps, opened outwards
  for (const [x, z, fw, fd, ax, sgn] of [
    [0, d / 2, w, 0.17, 'x', 1],
    [0, -d / 2, w, 0.17, 'x', -1],
    [w / 2, 0, 0.17, d, 'z', -1],
    [-w / 2, 0, 0.17, d, 'z', 1],
  ] as const) {
    const flap = box(ax === 'x' ? fw : fw, t, ax === 'x' ? fd : fd, card);
    const hinge = new THREE.Group();
    hinge.position.set(x, h, z);
    flap.position.set(ax === 'z' ? -sgn * fw / 2 : 0, 0, ax === 'x' ? sgn * fd / 2 : 0);
    hinge.add(flap);
    if (ax === 'x') hinge.rotation.x = sgn * 1.15;
    else hinge.rotation.z = sgn * 1.15;
    g.add(hinge);
  }
  const tape = box(0.07, 0.003, d + 0.004, mat('#E8D7A8', 0.5));
  tape.position.set(0, h - 0.04, 0);
  tape.rotation.x = Math.PI / 2;
  tape.scale.set(1, 1, 0.3);
  const label = box(0.16, 0.1, 0.004, mat('#FAF6EC', 0.8));
  label.position.set(-0.1, h * 0.5, d / 2 + 0.008);
  const stamp = box(0.04, 0.05, 0.004, mat('#C62828', 0.6));
  stamp.position.set(-0.05, h * 0.55, d / 2 + 0.011);
  const tissue = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), mat('#F6C9D3', 0.95));
  tissue.scale.set(1.1, 0.35, 0.8);
  tissue.position.y = h - 0.03;
  g.add(label, stamp, tissue);
  return g;
}

/** Things standing on the page (page widths). */
export const KARAGOZ_PROPS: Record<string, () => THREE.Object3D> = {
  hayalPerdesi: () => onPage(booth(true)),
  hayalPerdesiSonuk: () => onPage(booth(false)),
  perdeIsigi: () => onPage(glow(), PAGE, false),
  gazLambasi: () => onPage(lamp()),
  paket: () => onPage(parcel()),
};

function held(o: THREE.Object3D, data: Record<string, unknown>, s = PAGE) {
  const g = onPage(o, s);
  Object.assign(g.userData, data);
  return g;
}

/** Things held in the hands (see HELD in props.ts). */
export const KARAGOZ_HELD: Record<string, () => THREE.Object3D> = {
  lamba: () => held(lamp(), { word: 'lamba', hand: 'R' }, PAGE * 1.2),
};
