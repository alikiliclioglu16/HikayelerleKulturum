import * as THREE from 'three';

/**
 * A room's door drawn in code, in page widths: the frame stands centred on its place; the leaf is a thing of its
 * own whose origin is the hinge, so turning it (the "turn" act, `face` degrees) swings the door open.
 */
const W = 0.24; // the opening
const H = 0.52;
const T = 0.03; // frame width

function m(color: string, rough = 0.6) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough });
}

function frame() {
  const g = new THREE.Group();
  const wood = m('#F3EDE2', 0.55);
  const post = new THREE.BoxGeometry(T, H + T, T * 1.4);
  for (const x of [-(W + T) / 2, (W + T) / 2]) {
    const p = new THREE.Mesh(post, wood);
    p.position.set(x, (H + T) / 2, 0);
    g.add(p);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(W + 2 * T, T, T * 1.4), wood);
  top.position.y = H + T / 2;
  g.add(top);
  g.traverse((n) => ((n as THREE.Mesh).castShadow = true));
  return g;
}

function leaf(color: string) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.016), m(color, 0.5));
  body.position.set(W / 2, H / 2, 0);
  g.add(body);
  // two sunk panels on each side and a brass knob
  const panel = m(new THREE.Color(color).multiplyScalar(0.9).getStyle(), 0.55);
  for (const side of [1, -1])
    for (const [y, h] of [
      [H * 0.7, H * 0.38],
      [H * 0.26, H * 0.3],
    ]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(W * 0.7, h, 0.004), panel);
      p.position.set(W / 2, y, side * 0.009);
      g.add(p);
    }
  const brass = new THREE.MeshStandardMaterial({ color: '#D8B24A', metalness: 0.7, roughness: 0.3 });
  for (const side of [1, -1]) {
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 8), brass);
    k.position.set(W * 0.86, H * 0.48, side * 0.016);
    g.add(k);
  }
  g.traverse((n) => ((n as THREE.Mesh).castShadow = true));
  return g;
}

/** An invisible box to tap or point at (a part of a painted set piece that needs its own name). */
function spot() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), new THREE.MeshBasicMaterial({ visible: false }));
  b.position.y = 0.07;
  g.add(b);
  return g;
}

export const ROOM_PROPS: Record<string, () => THREE.Object3D> = {
  kapiCercevesi: frame,
  kapiKanadi: () => leaf('#E9E1D3'),
  spot,
};

/** Where the hinge of a door whose frame stands at (x, z) turned `rotY` degrees is, on the page. */
export const DOOR_HALF_WIDTH = W / 2;

/**
 * The inside wall around a big window, for a page whose picture is the view outside (the night sky): a low wall
 * under the sill, posts on both sides, a lintel, thin white glazing bars and two curtains. 1 page wide.
 */
function windowWall() {
  const g = new THREE.Group();
  const wall = m('#F1E3CC', 0.8);
  const wood = m('#FBF7EF', 0.5);
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, y, z);
    b.castShadow = true;
    b.receiveShadow = true;
    g.add(b);
  };
  add(1.04, 0.2, 0.04, 0, 0.1, 0, wall); // under the sill
  add(1.08, 0.025, 0.09, 0, 0.21, 0.02, wood); // the sill
  for (const x of [-0.49, 0.49]) add(0.08, 0.86, 0.05, x, 0.43, 0, wall);
  add(1.04, 0.08, 0.05, 0, 0.82, 0, wall);
  // the frame and its glazing bars
  for (const x of [-0.44, 0, 0.44]) add(0.018, 0.6, 0.02, x, 0.5, 0.01, wood);
  for (const y of [0.215, 0.5, 0.78]) add(0.9, 0.018, 0.02, 0, y, 0.01, wood);
  // curtains gathered at the sides
  const cloth = m('#2E6BB8', 0.85);
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.66, 10, 1), cloth);
    c.position.set(s * 0.41, 0.5, 0.05);
    c.castShadow = true;
    g.add(c);
  }
  add(0.98, 0.012, 0.012, 0, 0.84, 0.06, m('#C9A24A', 0.4)); // the rail
  return g;
}

/** A long low cushion to sit on in front of the window. */
function windowSeat() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.15), m('#E9DCC6', 0.7));
  base.position.y = 0.035;
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.15), m('#C2413A', 0.85));
  cushion.position.y = 0.085;
  g.add(base, cushion);
  for (const x of [-0.17, 0.17]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.04), m('#E7B84B', 0.85));
    p.position.set(x, 0.13, -0.05);
    p.rotation.x = -0.25;
    g.add(p);
  }
  g.traverse((n) => ((n as THREE.Mesh).castShadow = true));
  return g;
}

Object.assign(ROOM_PROPS, { pencereDuvari: windowWall, pencereMinderi: windowSeat });
