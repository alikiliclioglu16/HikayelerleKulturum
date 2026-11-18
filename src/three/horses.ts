import * as THREE from 'three';

/**
 * Kapadokya'nın Güzel Atları: toy-like horses, the wire and the vet's things drawn in code. They stand in for the
 * Meshy models until those arrive (tay-yatan, tay-ayakta, kisrak, veteriner-cantasi, su-matarasi); then the book
 * and CHARACTERS point at the GLB files instead and only the wire stays here.
 *
 * Built in metres, facing +z (towards the reader at rotY 0), standing on y = 0 around the origin; things are
 * scaled to the page (PAGE metres → page widths), characters to their height by the toy loader.
 */
export const PAGE = 0.324; // Elif, 122 cm, is 0.395 page widths tall

interface HorseLook {
  shoulder: number; // height at the withers
  bodyR: number;
  bodyLen: number; // the straight part of the barrel
  legR: number;
  headLen: number;
  coat: string;
  mane: string;
  muzzle: string;
  blaze?: boolean;
  halter?: boolean;
  /** White bandage on the right front leg. */
  bandage?: boolean;
  /** Lying down, the right front leg stretched forward. */
  lying?: boolean;
}

const mats = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, rough = 0.7) {
  const k = `${color}/${rough}`;
  let m = mats.get(k);
  if (!m) mats.set(k, (m = new THREE.MeshStandardMaterial({ color, roughness: rough })));
  return m;
}

/** A capsule from a to b. */
function limb(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) {
  const d = b.clone().sub(a);
  const g = new THREE.CapsuleGeometry(r, Math.max(0.001, d.length()), 6, 12);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}

function ball(at: THREE.Vector3, r: number, m: THREE.Material, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m);
  mesh.position.copy(at);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function horse(o: HorseLook) {
  const g = new THREE.Group();
  const coat = mat(o.coat, 0.65);
  const dark = mat(o.mane, 0.8);
  const light = mat(o.muzzle, 0.7);
  const hoof = mat('#3B2A22', 0.6);
  const R = o.bodyR;
  const half = o.bodyLen / 2;
  const by = o.lying ? R * 0.92 : o.shoulder - R * 0.55; // barrel centre height
  // barrel
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(R, o.bodyLen, 8, 16), coat);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, by, 0);
  g.add(body);
  // legs
  const legTop = by - R * 0.45;
  const lr = o.legR;
  const xs = R * 0.55;
  const legs: [number, number][] = [
    [xs, half * 0.85],
    [-xs, half * 0.85],
    [xs, -half * 0.95],
    [-xs, -half * 0.95],
  ];
  legs.forEach(([x, z], i) => {
    if (o.lying) {
      if (i === 1) {
        // the right front leg (the horse's right is -x) stretched forward along the ground
        const a = V(x, R * 0.5, z + R * 0.3);
        const b = V(x - 0.02, lr * 1.1, z + R + o.shoulder * 0.42);
        g.add(limb(a, b, lr, coat));
        g.add(limb(b, b.clone().add(V(0, 0, 0.05)), lr * 1.15, hoof));
        return;
      }
      // folded under the body
      const a = V(x * 1.2, lr * 1.2, z);
      const b = V(x * 1.25, lr * 1.2, z + (i < 2 ? -1 : 1) * o.shoulder * 0.22);
      g.add(limb(a, b, lr, coat));
      return;
    }
    const top = V(x, legTop, z);
    const knee = V(x, legTop * 0.45, z + (i < 2 ? 0.01 : -0.02));
    const foot = V(x, 0.05, z);
    g.add(limb(top, knee, lr * 1.25, coat), limb(knee, foot, lr, coat));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(lr * 1.15, lr * 1.3, 0.07, 12), hoof));
    g.children[g.children.length - 1].position.set(x, 0.035, z);
    if (o.bandage && i === 1) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(lr * 1.35, lr * 1.35, legTop * 0.22, 12), mat('#F4F1EA', 0.9));
      band.position.set(x, legTop * 0.28, z);
      g.add(band);
    }
  });
  // neck and head
  const neckA = V(0, by + R * 0.45, half + R * 0.15);
  const neckB = V(0, by + R + o.headLen * 0.85, half + R * 0.15 + o.headLen * 0.7);
  g.add(limb(neckA, neckB, R * 0.55, coat));
  const headTop = neckB.clone().add(V(0, R * 0.15, 0));
  const nose = headTop.clone().add(V(0, -o.headLen * 0.55, o.headLen * 0.8));
  g.add(limb(headTop, nose, o.headLen * 0.3, coat));
  g.add(ball(nose, o.headLen * 0.33, light, 1, 0.85, 1.05));
  // ears
  for (const s of [1, -1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(o.headLen * 0.13, o.headLen * 0.38, 8), coat);
    ear.position.copy(headTop).add(V(s * o.headLen * 0.16, o.headLen * 0.3, -o.headLen * 0.05));
    ear.rotation.z = -s * 0.25;
    g.add(ear);
    // eyes
    const eye = ball(headTop.clone().add(V(s * o.headLen * 0.27, -o.headLen * 0.05, o.headLen * 0.22)), o.headLen * 0.07, mat('#1C1410', 0.3));
    g.add(eye);
    const spark = ball(eye.position.clone().add(V(s * o.headLen * 0.02, o.headLen * 0.03, o.headLen * 0.05)), o.headLen * 0.02, mat('#FFFFFF', 0.2));
    g.add(spark);
  }
  if (o.blaze) {
    const blaze = new THREE.Mesh(new THREE.BoxGeometry(o.headLen * 0.12, o.headLen * 0.05, o.headLen * 0.7), mat('#F6EFE4', 0.8));
    blaze.position.copy(headTop).lerp(nose, 0.45).add(V(0, o.headLen * 0.27, 0));
    blaze.lookAt(nose.clone().add(V(0, o.headLen * 0.27, 0)));
    g.add(blaze);
  }
  // mane along the neck and a forelock
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const p = neckA.clone().lerp(neckB, i / steps).add(V(0, R * 0.42, -R * 0.38));
    g.add(ball(p, R * 0.26, dark, 0.55, 1.1, 1));
  }
  g.add(ball(headTop.clone().add(V(0, o.headLen * 0.18, o.headLen * 0.12)), o.headLen * 0.18, dark, 0.8, 0.7, 1));
  // tail
  const tailA = V(0, by + R * 0.4, -half - R * 0.75);
  const tailB = o.lying ? V(R * 0.9, 0.04, -half - R * 1.5) : V(0, by - R * 1.6, -half - R * 1.25);
  g.add(limb(tailA, tailB, R * 0.22, dark));
  g.add(ball(tailB, R * 0.25, dark, 1, 1.4, 1));
  if (o.halter) {
    const band = mat('#2A3A5C', 0.5);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(o.headLen * 0.34, o.headLen * 0.04, 6, 20), band);
    ring.position.copy(headTop).lerp(nose, 0.62);
    ring.lookAt(nose);
    g.add(ring);
    const cheek = new THREE.Mesh(new THREE.TorusGeometry(o.headLen * 0.3, o.headLen * 0.035, 6, 20), band);
    cheek.position.copy(headTop).add(V(0, -o.headLen * 0.05, o.headLen * 0.05));
    cheek.rotation.y = Math.PI / 2;
    g.add(cheek);
    // a short rope hanging from the halter
    const a = ring.position.clone().add(V(0, -o.headLen * 0.32, 0));
    g.add(limb(a, a.clone().add(V(0.02, -o.shoulder * 0.35, 0.06)), 0.012, mat('#C9A46A', 0.9)));
  }
  g.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.isMesh) m.castShadow = true;
  });
  return g;
}

const FOAL: HorseLook = { shoulder: 1.0, bodyR: 0.19, bodyLen: 0.42, legR: 0.042, headLen: 0.34, coat: '#C06A2E', mane: '#7A3816', muzzle: '#E8C6A0', blaze: true };
const MARE: HorseLook = { shoulder: 1.5, bodyR: 0.33, bodyLen: 0.85, legR: 0.07, headLen: 0.52, coat: '#9A4F24', mane: '#4E2410', muzzle: '#D9B08C', blaze: true, halter: true };

/** Builders in metres (for the toy loader, which scales a character to its height). */
export const horseModels = {
  tay: () => horse({ ...FOAL, bandage: true }),
  kisrak: () => horse(MARE),
  /** Duman, the grey horse of the village (Dedemin Köyünde İmece). */
  duman: () => horse({ ...MARE, coat: '#A9ADB2', mane: '#5E6166', muzzle: '#E2E2E2', blaze: false }),
  tayYatan: () => horse({ ...FOAL, lying: true }),
};

/** In metres: where the stretched right front leg of the lying foal is caught in the wire. */
export const FOAL_LEG = new THREE.Vector3(-FOAL.bodyR * 0.55 - 0.01, 0.05, FOAL.bodyLen / 2 * 0.85 + FOAL.bodyR + FOAL.shoulder * 0.32);

function onPage(o: THREE.Object3D, s = PAGE) {
  const g = new THREE.Group();
  o.scale.setScalar(s);
  g.add(o);
  return g;
}

/** A tangle of old fence wire: a few loose loops and two strands. */
function wire() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#A7ACB4', metalness: 0.6, roughness: 0.3 });
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 80; i++) {
    const a = (i / 80) * Math.PI * 2 * 3.2;
    const r = 0.085 + 0.02 * Math.sin(i * 0.7);
    pts.push(V(Math.cos(a) * r, 0.06 + Math.sin(a) * r * 0.75, (i / 80 - 0.5) * 0.24));
  }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.009, 6), m));
  for (const [ax, az, bx, bz] of [
    [0.08, 0.1, 0.5, 0.42],
    [-0.07, -0.1, -0.48, -0.36],
  ]) {
    const c = new THREE.CatmullRomCurve3([V(ax, 0.06, az), V((ax + bx) / 2, 0.03, (az + bz) / 2 + 0.05), V(bx, 0.01, bz)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 30, 0.008, 6), m));
  }
  g.traverse((n) => ((n as THREE.Mesh).castShadow = true));
  return g;
}

/** The vet's bag: a doctor's bag with a handle and a white cross. */
function vetBag() {
  const g = new THREE.Group();
  const w = 0.4, d = 0.2, h = 0.26;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(d / 2, w - d, 6, 14), mat('#7A2E2A', 0.55));
  body.rotation.z = Math.PI / 2;
  body.scale.set(h / d, 1, 1);
  body.position.y = h / 2;
  g.add(body);
  const clasp = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.02, d * 1.04), mat('#C9A24A', 0.4));
  clasp.position.y = h * 0.86;
  g.add(clasp);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16, Math.PI), mat('#3A1A16', 0.5));
  handle.position.y = h * 0.98;
  g.add(handle);
  for (const [sx, sy] of [
    [0.1, 0.03],
    [0.03, 0.1],
  ]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.01), mat('#FFFFFF', 0.6));
    c.position.set(0, h * 0.5, d * 0.66);
    g.add(c);
  }
  g.traverse((n) => ((n as THREE.Mesh).castShadow = true));
  return g;
}

/** A metal water bottle with a strap. */
function canteen() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 18), mat('#3F7F6A', 0.45));
  body.position.y = 0.1;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 12), mat('#D9D9D9', 0.35));
  cap.position.y = 0.22;
  g.add(body, cap);
  return g;
}

/** A phone held to the ear. */
function phone() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.012), mat('#22262E', 0.4));
  b.position.y = 0.075;
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.13), new THREE.MeshStandardMaterial({ color: '#6FB7E8', emissive: '#3A8AC0', emissiveIntensity: 0.4 }));
  s.position.set(0, 0.075, 0.007);
  g.add(b, s);
  return g;
}

/** Things standing on the page (page widths). */
export const HORSE_PROPS: Record<string, () => THREE.Object3D> = {
  tayYatan: () => onPage(horseModels.tayYatan()),
  tayAyakta: () => onPage(horseModels.tay()),
  kisrakModel: () => onPage(horseModels.kisrak()),
  tel: () => onPage(wire()),
  vetCantasi: () => onPage(vetBag()),
  matara: () => onPage(canteen()),
};

/** Things held in the hands (see HELD in props.ts). */
export const HORSE_HELD: Record<string, () => THREE.Object3D> = {
  vetCantasi: () => {
    const g = onPage(vetBag());
    Object.assign(g.userData, { word: 'veteriner çantası', hand: 'R' });
    return g;
  },
  matara: () => {
    const g = onPage(canteen());
    Object.assign(g.userData, { word: 'su matarası', hand: 'R' });
    return g;
  },
  telefon: () => {
    // a little bigger than life, so it shows beside the toy's big head when held to the ear
    const g = onPage(phone(), PAGE * 1.5);
    g.rotation.x = -0.3;
    Object.assign(g.userData, { word: 'telefon', hand: 'R' });
    return g;
  },
};
