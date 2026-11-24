import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PAGE } from './horses';

/**
 * Dedemin Köyünde İmece: the village things drawn in code — the family car, chickens, the wheat field and its
 * sheaves, sickles, baskets, the water jug and glasses, grain sacks, the threshing heap, the millstones and the
 * flour, the tandır and its bread, Osman amca's walking stick, a little fence and a pile of autumn leaves.
 *
 * Built in metres facing +z, standing on y = 0, then scaled to the page (PAGE metres → page widths).
 */
const mats = new Map<string, THREE.Material>();
function mat(color: string, rough = 0.6, metal = 0, emissive?: string, ei = 0.8) {
  const k = `${color}|${rough}|${metal}|${emissive}|${ei}`;
  let m = mats.get(k);
  if (!m) {
    const s = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    if (emissive) {
      s.emissive.set(emissive);
      s.emissiveIntensity = ei;
    }
    mats.set(k, (m = s));
  }
  return m;
}
function onPage(o: THREE.Object3D, s = PAGE) {
  const g = new THREE.Group();
  o.scale.setScalar(s);
  o.traverse((n) => ((n as THREE.Mesh).castShadow = true));
  g.add(o);
  return g;
}
function cyl(rt: number, rb: number, h: number, m: THREE.Material, seg = 20) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
}
function box(w: number, h: number, d: number, m: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
}
function ball(r: number, m: THREE.Material, seg = 16) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), m);
}
/** A simple seeded random, so a field looks the same every time. */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/* ---------------- the car ---------------- */

/** Clear car glass: the people inside are seen through it. */
const carGlass = new THREE.MeshStandardMaterial({ color: '#CFEAF7', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false });

/**
 * A round little family car seen from the side: red body, a white roof, windows, four wheels. Faces +x.
 * `open`: the cabin is clear glass under a white roof on thin posts, so the family can be seen sitting inside.
 */
function car(open = false) {
  const g = new THREE.Group();
  const red = mat('#C8382C', 0.35, 0.2);
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.5, 0.95, 4, 0.16), red);
  body.position.y = 0.46;
  let cabin: THREE.Object3D;
  if (open) {
    const white = mat('#F4F1EA', 0.4);
    cabin = new THREE.Group();
    // a tall cabin (they sit upright in it, heads under the roof)
    const roof = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.08, 0.9, 3, 0.03), white);
    roof.position.set(-0.15, 1.34, 0);
    cabin.add(roof);
    for (const x of [-0.72, -0.15, 0.42])
      for (const z of [-0.42, 0.42]) {
        const post = box(0.05, 0.64, 0.05, white);
        post.position.set(x, 1.02, z);
        cabin.add(post);
      }
    // the inside: dark seats with their backs, seen through the glass
    const seat = mat('#4A3B35', 0.8);
    for (const x of [0.02, -0.5]) {
      const back = box(0.08, 0.32, 0.8, seat);
      back.position.set(x - 0.16, 0.86, 0);
      cabin.add(back);
    }
    for (const z of [-0.45, 0.45]) {
      const side = box(1.14, 0.56, 0.01, carGlass);
      side.position.set(-0.15, 1.02, z);
      cabin.add(side);
    }
  } else {
    cabin = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.5, 0.86, 4, 0.14), mat('#F4F1EA', 0.4));
    cabin.position.set(-0.15, 0.88, 0);
    const glass = mat('#9FD3EE', 0.1, 0.1, '#6FB4D8', 0.25);
    for (const z of [-0.435, 0.435]) {
      for (const x of [-0.43, 0.1]) {
        const w = box(0.42, 0.28, 0.01, glass);
        w.position.set(x, 0.92, z);
        g.add(w);
      }
    }
  }
  const front = box(0.01, open ? 0.56 : 0.3, 0.72, open ? carGlass : mat('#9FD3EE', 0.1, 0.1, '#6FB4D8', 0.25));
  front.position.set(0.43, open ? 1.02 : 0.92, 0);
  const bumper = mat('#5A5A5A', 0.5, 0.4);
  for (const x of [-1.07, 1.07]) {
    const b = box(0.06, 0.12, 0.9, bumper);
    b.position.set(x, 0.3, 0);
    g.add(b);
  }
  g.add(body, cabin, front);
  const tyre = mat('#2B2B2B', 0.8);
  const hub = mat('#D9D9D9', 0.3, 0.6);
  for (const x of [-0.66, 0.66])
    for (const z of [-0.45, 0.45]) {
      const w = cyl(0.22, 0.22, 0.16, tyre, 24);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, 0.22, z);
      const h = cyl(0.1, 0.1, 0.17, hub, 16);
      h.rotation.x = Math.PI / 2;
      h.position.set(x, 0.22, z);
      g.add(w, h);
    }
  for (const z of [-0.3, 0.3]) {
    const lamp = ball(0.07, mat('#FFF4C2', 0.3, 0, '#FFE58A', 0.6));
    lamp.position.set(1.04, 0.52, z);
    g.add(lamp);
  }
  return g;
}

/**
 * One of the car's doors (the side facing the reader), its own thing so it can swing open: a red panel with a
 * window, the hinge at its front edge (the origin), the door reaching back along +x. Same scale as the car.
 */
function carDoor() {
  const g = new THREE.Group();
  const red = mat('#C8382C', 0.35, 0.2);
  const panel = new THREE.Mesh(new RoundedBoxGeometry(0.53, 0.44, 0.035, 2, 0.015), red);
  panel.position.set(0.265, 0.47, 0);
  const frame = box(0.53, 0.04, 0.03, red);
  frame.position.set(0.265, 1.28, 0);
  const pane = box(0.47, 0.56, 0.01, carGlass);
  pane.position.set(0.265, 0.98, 0);
  const handle = box(0.09, 0.025, 0.03, mat('#D9D9D9', 0.3, 0.6));
  handle.position.set(0.42, 0.6, 0.025);
  g.add(panel, frame, pane, handle);
  return g;
}

/** A village dirt road (in page widths, lying on the page): sandy, with two wheel ruts and grassy edges. */
function dirtRoad(len: number, width: number) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const x = c.getContext('2d')!;
  x.fillStyle = '#B5864F';
  x.fillRect(0, 0, 512, 96);
  const r = rng(7);
  for (let i = 0; i < 900; i++) {
    x.fillStyle = r() < 0.5 ? 'rgba(120,90,50,0.25)' : 'rgba(240,220,170,0.3)';
    x.fillRect(r() * 512, r() * 96, 2 + r() * 3, 1 + r() * 2);
  }
  x.fillStyle = 'rgba(95,62,32,0.55)';
  x.fillRect(0, 26, 512, 10);
  x.fillRect(0, 60, 512, 10);
  x.fillStyle = '#7FA650';
  for (let i = 0; i < 160; i++) {
    const y = r() < 0.5 ? r() * 8 : 88 + r() * 8;
    x.fillRect(r() * 512, y, 3, 4 + r() * 5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, width), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.002;
  m.receiveShadow = true;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

/** A stone village house with a red tiled roof, a wooden door and a window. */
function stoneHouse() {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new RoundedBoxGeometry(2.6, 2.0, 2.0, 2, 0.06), mat('#CDB797', 0.9));
  wall.position.y = 1.0;
  g.add(wall);
  const r = rng(3);
  for (let i = 0; i < 26; i++) {
    const st = box(0.3 + r() * 0.25, 0.16 + r() * 0.1, 0.02, mat(r() < 0.5 ? '#B89E7C' : '#DCC8A8', 0.95));
    st.position.set(-1.1 + r() * 2.2, 0.2 + r() * 1.6, 1.005);
    g.add(st);
  }
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.9, 3, 1), mat('#B8492F', 0.7));
  roof.rotation.z = Math.PI / 2;
  roof.rotation.x = Math.PI;
  roof.scale.set(1, 1, 1.25);
  roof.position.y = 2.45;
  g.add(roof);
  const door = box(0.55, 1.0, 0.05, mat('#7A4A26', 0.7));
  door.position.set(-0.6, 0.5, 1.02);
  const win = box(0.6, 0.5, 0.05, mat('#5E8FB0', 0.3));
  win.position.set(0.55, 1.15, 1.02);
  const sill = box(0.7, 0.06, 0.1, mat('#E8DCC2', 0.8));
  sill.position.set(0.55, 0.88, 1.05);
  g.add(door, win, sill);
  return g;
}

/** A round village tree: a trunk and a crown of leaves. */
function villageTree(seed = 1) {
  const g = new THREE.Group();
  const trunk = cyl(0.12, 0.18, 1.6, mat('#7A5233', 0.85), 10);
  trunk.position.y = 0.8;
  g.add(trunk);
  const r = rng(seed);
  for (let i = 0; i < 5; i++) {
    const leaf = ball(0.55 + r() * 0.3, mat(i % 2 ? '#5E9B45' : '#71AE52', 0.85), 12);
    leaf.position.set((r() - 0.5) * 0.9, 1.9 + r() * 0.6, (r() - 0.5) * 0.7);
    g.add(leaf);
  }
  return g;
}

/** Flowing water (page widths, flat or standing): blue with light ripples on a tile that slides (fx "flowX"/"rainfall"). */
function water(len: number, width: number, standing = false) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const x = c.getContext('2d')!;
  const grd = x.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, '#3E8FD0');
  grd.addColorStop(0.5, '#5DB0E8');
  grd.addColorStop(1, '#3E8FD0');
  x.fillStyle = grd;
  x.fillRect(0, 0, 256, 64);
  const r = rng(11);
  x.strokeStyle = 'rgba(255,255,255,0.7)';
  x.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const y = 4 + r() * 56;
    const x0 = r() * 256;
    x.beginPath();
    x.moveTo(x0, y);
    x.quadraticCurveTo(x0 + 10, y - 3, x0 + 22, y);
    x.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(standing ? 1 : Math.max(1, len / width / 3), standing ? 2 : 1);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(len, width),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92 }),
  );
  if (standing) {
    m.rotation.z = Math.PI / 2;
    m.position.y = len / 2;
  } else {
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.004;
  }
  const g = new THREE.Group();
  g.add(m);
  return g;
}

/* ---------------- chickens ---------------- */

/** A plump hen: white or brown, red comb and wattle, yellow beak and legs. Faces +z. */
function hen(color = '#F5F1E8') {
  const g = new THREE.Group();
  const feathers = mat(color, 0.85);
  const body = ball(0.17, feathers);
  body.scale.set(0.85, 0.8, 1.15);
  body.position.y = 0.26;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 10), feathers);
  tail.rotation.x = -2.3;
  tail.position.set(0, 0.36, -0.17);
  const head = ball(0.08, feathers);
  head.position.set(0, 0.44, 0.15);
  const red = mat('#D32F2F', 0.6);
  const comb = box(0.025, 0.06, 0.09, red);
  comb.position.set(0, 0.53, 0.15);
  const wattle = ball(0.025, red);
  wattle.position.set(0, 0.38, 0.22);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 8), mat('#F2B21B', 0.5));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.44, 0.24);
  const eye = mat('#1B1B1B', 0.3);
  for (const s of [-1, 1]) {
    const e = ball(0.012, eye, 8);
    e.position.set(s * 0.055, 0.46, 0.2);
    const leg = cyl(0.012, 0.012, 0.14, mat('#F2B21B', 0.5), 6);
    leg.position.set(s * 0.05, 0.07, 0.02);
    g.add(e, leg);
  }
  g.add(body, tail, head, comb, wattle, beak);
  return g;
}

/* ---------------- wheat ---------------- */

const STALK = '#D9B24C';
const EAR = '#E8C35A';
/** A strip of standing wheat `w` × `d` metres: hundreds of stalks with heavy ears, slightly bent. */
function wheatField(w = 2.8, d = 0.45, h = 0.85, seed = 3) {
  const g = new THREE.Group();
  const r = rng(seed);
  const n = Math.round(w * d * 330);
  const stalkGeo = new THREE.CylinderGeometry(0.006, 0.009, 1, 4);
  stalkGeo.translate(0, 0.5, 0);
  const earGeo = new THREE.CapsuleGeometry(0.018, 0.08, 3, 6);
  const stalks = new THREE.InstancedMesh(stalkGeo, mat(STALK, 0.8), n);
  const ears = new THREE.InstancedMesh(earGeo, mat(EAR, 0.7), n);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * w;
    const z = (r() - 0.5) * d;
    const hh = h * (0.85 + r() * 0.3);
    e.set((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, hh, 1));
    stalks.setMatrixAt(i, m);
    const top = new THREE.Vector3(0, hh, 0).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
    e.set(e.x + 0.35, r() * 6, e.z);
    q.setFromEuler(e);
    m.compose(top, q, new THREE.Vector3(1, 1, 1));
    ears.setMatrixAt(i, m);
  }
  stalks.castShadow = ears.castShadow = true;
  g.add(stalks, ears);
  return g;
}

/** A sheaf of wheat standing up, tied in the middle. */
function sheaf(seed = 5) {
  const g = new THREE.Group();
  const r = rng(seed);
  const stalk = mat(STALK, 0.8);
  const ear = mat(EAR, 0.7);
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const rr = 0.05 * Math.sqrt(r());
    const tilt = 0.12 + rr * 2.5;
    const s = cyl(0.007, 0.007, 0.75, stalk, 4);
    const p = new THREE.Group();
    p.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
    p.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    s.position.y = 0.375;
    const top = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.08, 3, 6), ear);
    top.position.y = 0.78;
    p.add(s, top);
    g.add(p);
  }
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), mat('#A06A2C', 0.7));
  tie.rotation.x = Math.PI / 2;
  tie.position.y = 0.38;
  g.add(tie);
  return g;
}
/** A few sheaves standing together on the cut field. */
function sheaves() {
  const g = new THREE.Group();
  [[-0.9, 0.05], [-0.5, -0.1], [-0.1, 0.08], [0.35, -0.05], [0.8, 0.06]].forEach(([x, z], i) => {
    const s = sheaf(7 + i);
    s.position.set(x, 0, z);
    s.rotation.y = i;
    g.add(s);
  });
  // stubble between them
  const r = rng(9);
  const stub = mat('#C9A24A', 0.9);
  for (let i = 0; i < 120; i++) {
    const s = cyl(0.006, 0.006, 0.06, stub, 4);
    s.position.set((r() - 0.5) * 2.6, 0.03, (r() - 0.5) * 0.45);
    g.add(s);
  }
  return g;
}

/* ---------------- tools, baskets, water ---------------- */

/** A sickle: a wooden handle and a curved steel blade. Held in the right hand, blade forward. */
function sickle() {
  const g = new THREE.Group();
  const handle = cyl(0.016, 0.018, 0.16, mat('#8B5A2B', 0.6), 8);
  handle.position.y = 0.08;
  const blade = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 4, 20, Math.PI * 1.1), mat('#BFC5CC', 0.25, 0.8));
  blade.scale.set(1, 1, 2.2);
  blade.position.set(0.13, 0.17, 0);
  g.add(handle, blade);
  return g;
}
/** A wicker basket with two handles. */
function basket(empty = true) {
  const g = new THREE.Group();
  const wicker = mat('#C99A5B', 0.85);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.2, 20, 1, true), wicker);
  (b.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  b.position.y = 0.1;
  const bottom = cyl(0.14, 0.14, 0.015, wicker);
  bottom.position.y = 0.008;
  g.add(b, bottom);
  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.145 + i * 0.013, 0.006, 4, 24), mat('#A97C42', 0.8));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.03 + i * 0.05;
    g.add(band);
  }
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 12, Math.PI), wicker);
    h.position.set(s * 0.19, 0.2, 0);
    h.rotation.y = Math.PI / 2;
    g.add(h);
  }
  if (!empty) {
    const fill = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(EAR, 0.8));
    fill.scale.y = 0.4;
    fill.position.y = 0.17;
    g.add(fill);
  }
  return g;
}
/** A clay water jug with a handle. */
function jug() {
  const g = new THREE.Group();
  const clay = mat('#B5562E', 0.65);
  const body = ball(0.12, clay);
  body.scale.y = 1.15;
  body.position.y = 0.15;
  const neck = cyl(0.04, 0.06, 0.1, clay, 14);
  neck.position.y = 0.3;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.01, 6, 16), clay);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.35;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 14, Math.PI * 1.2), clay);
  handle.position.set(0.1, 0.24, 0);
  handle.rotation.z = -1.2;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.008, 6, 24), mat('#F2E6C8', 0.6));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.17;
  g.add(body, neck, lip, handle, band);
  return g;
}
/** A row of glasses of water on a white cloth spread on the ground. */
function glasses(n = 6) {
  const g = new THREE.Group();
  const cloth = box(0.32 * n * 0.5 + 0.2, 0.01, 0.42, mat('#F3EEE2', 0.9));
  cloth.position.y = 0.005;
  g.add(cloth);
  const glass = new THREE.MeshStandardMaterial({ color: '#E8F6FF', transparent: true, opacity: 0.55, roughness: 0.05 });
  const water = mat('#7CC4EC', 0.1, 0, '#4FA5D6', 0.2);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.16;
    const gl = cyl(0.04, 0.034, 0.11, glass, 14);
    gl.position.set(x, 0.065, i % 2 ? 0.06 : -0.06);
    const w = cyl(0.036, 0.032, 0.07, water, 14);
    w.position.set(x, 0.045, i % 2 ? 0.06 : -0.06);
    g.add(gl, w);
  }
  return g;
}

/* ---------------- grain, sacks, the mill ---------------- */

/** A grain sack, tied at the top. `flour`: white and dusty. */
function sack(flour = false, open = false) {
  const g = new THREE.Group();
  const cloth = mat(flour ? '#F1ECE0' : '#C8AA78', 0.95);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.25, 6, 16), cloth);
  body.scale.set(1, 1, 0.75);
  body.position.y = 0.32;
  g.add(body);
  if (open) {
    const top = cyl(0.17, 0.2, 0.06, cloth, 18);
    top.position.y = 0.6;
    const flourTop = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#FBFAF5', 0.95));
    flourTop.scale.y = 0.45;
    flourTop.position.y = 0.6;
    g.add(top, flourTop);
  } else {
    const neck = cyl(0.06, 0.12, 0.12, cloth, 12);
    neck.position.y = 0.62;
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 6, 14), mat('#7A4A26', 0.7));
    tie.rotation.x = Math.PI / 2;
    tie.position.y = 0.6;
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.1, 10), cloth);
    tuft.position.y = 0.71;
    tuft.rotation.x = Math.PI;
    g.add(neck, tie, tuft);
  }
  if (!flour) {
    const stripe = box(0.3, 0.03, 0.005, mat('#3E6FB0', 0.8));
    stripe.position.set(0, 0.36, 0.155);
    g.add(stripe);
  }
  return g;
}
function sackStack(n = 4) {
  const g = new THREE.Group();
  const spots = [[-0.22, 0, 0], [0.22, 0, 0], [0, 0, -0.3], [0, 0.42, -0.05]];
  for (let i = 0; i < n; i++) {
    const s = sack();
    s.position.set(spots[i][0], spots[i][1], spots[i][2]);
    s.rotation.y = i * 0.7;
    if (i === 3) s.rotation.z = Math.PI / 2.2;
    g.add(s);
  }
  return g;
}
/** The threshing heap: a mound of golden grain beside a pile of straw. */
function threshing() {
  const g = new THREE.Group();
  const grain = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#D9A441', 0.9));
  grain.scale.y = 0.55;
  const straw = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#EAD18A', 0.95));
  straw.scale.set(1, 0.7, 0.8);
  straw.position.set(-0.75, 0, -0.15);
  const r = rng(4);
  for (let i = 0; i < 40; i++) {
    const s = cyl(0.006, 0.006, 0.3, mat('#E3C673', 0.9), 4);
    s.position.set(-0.75 + (r() - 0.5) * 0.9, 0.2 + r() * 0.15, -0.15 + (r() - 0.5) * 0.7);
    s.rotation.set(r() * 3, r() * 3, r() * 3);
    g.add(s);
  }
  const fork = cyl(0.015, 0.015, 1.3, mat('#8B5A2B', 0.6), 6);
  fork.position.set(0.5, 0.55, 0.1);
  fork.rotation.z = 0.5;
  g.add(grain, straw, fork);
  return g;
}
/** The lower millstone in its wooden frame, with the flour spout in front. */
function millBase() {
  const g = new THREE.Group();
  const frame = box(1.2, 0.5, 1.0, mat('#8B5A2B', 0.65));
  frame.position.y = 0.25;
  const stone = cyl(0.45, 0.45, 0.16, mat('#9A948B', 0.9), 32);
  stone.position.y = 0.58;
  const spout = box(0.14, 0.06, 0.3, mat('#A0673A', 0.6));
  spout.position.set(0, 0.42, 0.62);
  spout.rotation.x = 0.35;
  const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.06, 0.35, 4, 1, true), mat('#A0673A', 0.6));
  (hopper.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  hopper.rotation.y = Math.PI / 4;
  hopper.position.y = 1.05;
  const legs = mat('#6E4423', 0.6);
  for (const s of [-1, 1]) {
    const post = box(0.06, 0.6, 0.06, legs);
    post.position.set(s * 0.3, 1.0, 0);
    g.add(post);
  }
  const bar = box(0.66, 0.05, 0.05, legs);
  bar.position.y = 1.3;
  const grain = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#D9A441', 0.9));
  grain.scale.y = 0.4;
  grain.position.y = 1.18;
  g.add(frame, stone, spout, hopper, bar, grain);
  return g;
}
/** The upper millstone (it turns, see fx "spin"): a grey stone with a hole and grooves. */
function millTop() {
  const g = new THREE.Group();
  const stone = cyl(0.44, 0.44, 0.15, mat('#B0AA9F', 0.9), 32);
  stone.position.y = 0.075;
  const hole = cyl(0.07, 0.07, 0.16, mat('#4A453E', 0.9), 16);
  hole.position.y = 0.076;
  g.add(stone, hole);
  for (let i = 0; i < 8; i++) {
    const groove = box(0.35, 0.01, 0.025, mat('#8E887E', 0.9));
    groove.position.set(Math.cos((i * Math.PI) / 4) * 0.25, 0.152, Math.sin((i * Math.PI) / 4) * 0.25);
    groove.rotation.y = -(i * Math.PI) / 4;
    g.add(groove);
  }
  return g;
}
/** A soft heap of flour. */
function flourHeap() {
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#FBFAF5', 0.95));
  h.scale.y = 0.5;
  const g = new THREE.Group();
  g.add(h);
  return g;
}
/** A low wooden fence: where the children stand and watch. */
function fence(len = 1.6) {
  const g = new THREE.Group();
  const wood = mat('#9A6A3A', 0.7);
  const n = Math.round(len / 0.4) + 1;
  for (let i = 0; i < n; i++) {
    const p = box(0.06, 0.55, 0.06, wood);
    p.position.set(-len / 2 + (i * len) / (n - 1), 0.275, 0);
    g.add(p);
  }
  for (const y of [0.22, 0.45]) {
    const rail = box(len + 0.1, 0.05, 0.03, wood);
    rail.position.set(0, y, 0.03);
    g.add(rail);
  }
  return g;
}

/* ---------------- the tandır and the bread ---------------- */

/** A clay tandır: a wide round oven, its mouth glowing, a lid leaning beside it. */
function tandir() {
  const g = new THREE.Group();
  const clay = mat('#B98A5E', 0.85);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.65, 28, 1, true), clay);
  (body.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  body.position.y = 0.325;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 28), mat('#C99B6E', 0.8));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.65;
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 28), mat('#FF8A2A', 0.6, 0, '#FF6A10', 1.4));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.45;
  const plinth = cyl(0.62, 0.66, 0.12, mat('#A9A196', 0.9), 28);
  plinth.position.y = 0.06;
  const lid = cyl(0.36, 0.36, 0.05, mat('#7A4A26', 0.7), 24);
  lid.rotation.x = 1.3;
  lid.position.set(0.62, 0.36, -0.1);
  g.add(plinth, body, rim, glow, lid);
  // flat breads stuck inside the wall
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), mat('#D9A05A', 0.8));
    b.position.set(Math.cos(a) * 0.38, 0.55, Math.sin(a) * 0.38);
    b.lookAt(0, 0.55, 0);
    g.add(b);
  }
  return g;
}
/** A wooden kneading trough with a round dough in it. */
function trough(withDough = true) {
  const g = new THREE.Group();
  const wood = mat('#A0673A', 0.6);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.16, 24, 1, true), wood);
  (t.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  t.scale.z = 0.6;
  t.position.y = 0.5;
  const base = box(0.6, 0.42, 0.3, mat('#7A4A26', 0.6));
  base.position.y = 0.21;
  const bottom = cyl(0.3, 0.3, 0.02, wood, 24);
  bottom.scale.z = 0.6;
  bottom.position.y = 0.43;
  const dough = ball(0.17, mat('#F3E3C3', 0.9));
  dough.scale.set(1.2, 0.55, 0.8);
  dough.position.y = 0.5;
  g.add(base, bottom, t);
  if (withDough) g.add(dough);
  return g;
}
/** The dough alone (kneaded in the trough, then baked). */
function doughBall() {
  const dough = ball(0.17, mat('#F3E3C3', 0.9));
  dough.scale.set(1.2, 0.55, 0.8);
  dough.position.y = 0.17 * 0.55;
  const g = new THREE.Group();
  g.add(dough);
  return g;
}
/** A stack of round tandır breads on a cloth. */
function breads() {
  const g = new THREE.Group();
  const cloth = box(0.55, 0.01, 0.55, mat('#E9DDC4', 0.9));
  cloth.position.y = 0.005;
  cloth.rotation.y = 0.4;
  g.add(cloth);
  for (let i = 0; i < 5; i++) {
    const b = cyl(0.2, 0.2, 0.03, mat(i % 2 ? '#D49A55' : '#C98B47', 0.8), 24);
    b.position.set((i % 2) * 0.02, 0.025 + i * 0.03, 0);
    b.rotation.y = i;
    g.add(b);
  }
  return g;
}

/* ---------------- odds and ends ---------------- */

/** Osman amca's walking stick, leaning. */
function stick() {
  const g = new THREE.Group();
  const s = cyl(0.016, 0.018, 0.9, mat('#6E4423', 0.6), 8);
  s.position.y = 0.45;
  const crook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 6, 14, Math.PI), mat('#6E4423', 0.6));
  crook.position.set(0.06, 0.9, 0);
  g.add(s, crook);
  g.rotation.z = 0.25;
  return g;
}
/** A pile of autumn leaves (the shared garden at home, in the children's thoughts). */
function leaves() {
  const g = new THREE.Group();
  const r = rng(12);
  const cols = ['#D9822B', '#C0392B', '#E6B422', '#A0522D', '#E67E22'];
  for (let i = 0; i < 60; i++) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.06, 5), mat(cols[i % cols.length], 0.8));
    const a = r() * Math.PI * 2;
    const rr = 0.35 * Math.sqrt(r());
    l.position.set(Math.cos(a) * rr, 0.02 + (0.35 - rr) * 0.5 * r(), Math.sin(a) * rr * 0.7);
    l.rotation.set(-Math.PI / 2 + (r() - 0.5) * 1.2, r() * 3, r() * 3);
    l.scale.set(1, 1.5, 1);
    (l.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    g.add(l);
  }
  const rake = cyl(0.014, 0.014, 1.1, mat('#8B5A2B', 0.6), 6);
  rake.position.set(0.4, 0.5, 0);
  rake.rotation.z = -0.3;
  g.add(rake);
  return g;
}
/** A log to sit on at the edge of the field. */
function log() {
  const g = new THREE.Group();
  const l = cyl(0.17, 0.17, 1.0, mat('#7A5230', 0.85), 16);
  l.rotation.z = Math.PI / 2;
  l.position.y = 0.17;
  for (const s of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), mat('#C9A06A', 0.8));
    end.position.set(s * 0.501, 0.17, 0);
    end.rotation.y = (s * Math.PI) / 2;
    g.add(end);
  }
  g.add(l);
  return g;
}

/** Things standing on the page (page widths). */
export const KOY_PROPS: Record<string, () => THREE.Object3D> = {
  araba: () => onPage(car(), PAGE * 0.55),
  // the family car big enough to sit in, its glass clear, and its two doors on the reader's side
  arabaAcik: () => onPage(car(true)),
  arabaKapisi: () => onPage(carDoor()),
  yolKoy: () => dirtRoad(0.75, 0.34),
  tasEv: () => onPage(stoneHouse(), PAGE * 0.3),
  agacKoy: () => onPage(villageTree(2), PAGE * 0.36),
  agacKoy2: () => onPage(villageTree(5), PAGE * 0.32),
  dere: () => water(1.0, 0.07),
  suAkisi: () => water(0.3, 0.05, true),
  tavuk: () => onPage(hen(), PAGE * 0.6),
  tavukKahve: () => onPage(hen('#B5652B'), PAGE * 0.6),
  bugdayTarlasi: () => onPage(wheatField()),
  bugdayDemetleri: () => onPage(sheaves()),
  bugdayDemeti: () => onPage(sheaf()),
  orakYerde: () => {
    const g = onPage(sickle());
    g.children[0].rotation.x = -Math.PI / 2;
    g.children[0].position.y = 0.006;
    return g;
  },
  sepetBos: () => onPage(basket()),
  sepetDolu: () => onPage(basket(false)),
  testi: () => onPage(jug()),
  bardaklar: () => onPage(glasses()),
  cuval: () => onPage(sack()),
  cuvallar: () => onPage(sackStack()),
  unCuvali: () => onPage(sack(true, true)),
  harman: () => onPage(threshing()),
  degirmenTasi: () => onPage(millBase()),
  degirmenUstTasi: () => onPage(millTop()),
  unYigini: () => onPage(flourHeap()),
  cit: () => onPage(fence()),
  tandir: () => onPage(tandir()),
  hamurTeknesi: () => onPage(trough()),
  tekneBos: () => onPage(trough(false)),
  hamurTopu: () => onPage(doughBall()),
  tandirEkmekleri: () => onPage(breads()),
  baston: () => onPage(stick()),
  yapraklar: () => onPage(leaves()),
  kutuk: () => onPage(log()),
};

function held(o: THREE.Object3D, data: Record<string, unknown>, s = PAGE) {
  const g = onPage(o, s);
  Object.assign(g.userData, data);
  return g;
}

/** Things held in the hands (see HELD in props.ts). */
export const KOY_HELD: Record<string, () => THREE.Object3D> = {
  orak: () => held(sickle(), { word: 'orak', hand: 'R' }, PAGE * 1.2),
  sepet: () => held(basket(), { word: 'sepet', atHeight: 0.32, ahead: 0.2 }, PAGE * 0.9),
  testiEl: () => held(jug(), { word: 'testi', hand: 'R' }, PAGE * 0.9),
  unCuvaliEl: () => held(sack(true, true), { word: 'un', atHeight: 0.34, ahead: 0.22 }, PAGE * 0.8),
  ekmek: () => held(breads(), { word: 'ekmek', atHeight: 0.4, ahead: 0.22 }, PAGE * 0.8),
  bugdayDemeti: () => held(sheaf(), { word: 'başak', atHeight: 0.3, ahead: 0.18 }, PAGE * 0.8),
};
