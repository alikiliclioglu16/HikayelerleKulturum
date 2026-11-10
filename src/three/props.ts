import * as THREE from 'three';
import { tulip } from '../art/kit';
import { Pen } from '../art/pen';
import { loadGltf } from '../home3d/actors';

/**
 * A thing from a GLB file to hold in the hands. The group is returned at once and the model drops in when it
 * has loaded; it is scaled to height `h` (page widths). `hang`: the top of the model at the origin, so it
 * hangs below the hand (a bucket); otherwise the model stands on the origin.
 */
function glbHeld(url: string, h: number, data: Record<string, unknown>, hang = false, rotY = 0, tint?: string) {
  const g = new THREE.Group();
  Object.assign(g.userData, data);
  loadGltf(url).then((gltf) => {
    const m = gltf.scene.clone(true);
    m.rotation.y = rotY;
    if (tint)
      m.traverse((n) => {
        const mesh = n as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.map = null;
        mat.color.set(tint);
        mat.roughness = 0.35;
        mesh.material = mat;
      });
    const box = new THREE.Box3().setFromObject(m);
    const s = h / Math.max(1e-6, box.max.y - box.min.y);
    m.scale.setScalar(s);
    const c = box.getCenter(new THREE.Vector3());
    m.position.set(-c.x * s, hang ? -box.max.y * s : -box.min.y * s, -c.z * s);
    m.traverse((n) => ((n as THREE.Mesh).castShadow = true));
    g.add(m);
  });
  return g;
}

/**
 * Pieces of the set built in code, so they fit the characters exactly (sizes in page widths).
 */

function tulipFabric(base: string) {
  const pen = new Pen(512, 1);
  pen.rect(0, 0, 1000, 1000, base);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) tulip(pen, 125 + x * 250 + (y % 2) * 60, 210 + y * 250, 150, (x + y) % 2 ? '#F2B33D' : '#FFFFFF');
  const t = new THREE.CanvasTexture(pen.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const wood = () => new THREE.MeshStandardMaterial({ color: '#A9673A', roughness: 0.6 });

/** A child's bed seen from the side: head board on the left (−x), length along x. */
export function bed(len = 0.46, width = 0.2) {
  const g = new THREE.Group();
  const frameH = 0.05;
  const legs = 0.025;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(len, frameH, width), wood());
  frame.position.y = legs + frameH / 2;
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(len - 0.02, 0.03, width - 0.02), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9 }));
  mattress.position.y = legs + frameH + 0.015;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.2, width + 0.01), wood());
  head.position.set(-len / 2, 0.1, 0);
  const headTop = new THREE.Mesh(new THREE.CylinderGeometry(width / 2 + 0.005, width / 2 + 0.005, 0.025, 24, 1, false, 0, Math.PI), wood());
  headTop.rotation.set(0, 0, Math.PI / 2);
  headTop.rotation.order = 'ZYX';
  headTop.position.set(-len / 2, 0.2, 0);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, width + 0.01), wood());
  foot.position.set(len / 2, 0.06, 0);
  const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 12), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.85 }));
  pillow.scale.set(0.9, 0.38, 1.5);
  pillow.position.set(-len / 2 + 0.06, legs + frameH + 0.04, 0);
  for (const m of [frame, mattress, head, headTop, foot, pillow]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.02, legs, 0.02), wood());
    leg.position.set((x * (len - 0.03)) / 2, legs / 2, (z * (width - 0.03)) / 2);
    g.add(leg);
  }
  g.userData.top = legs + frameH + 0.03;
  return g;
}

/** A soft blue blanket with tulips, draped over the lower part of the bed. */
export function blanket(len = 0.26, width = 0.22) {
  const geo = new THREE.BoxGeometry(len, 0.03, width, 16, 1, 8);
  // round the top and let the sides hang down a little
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i) / (width / 2);
    const y = pos.getY(i);
    pos.setY(i, y + (1 - z * z) * 0.02 - (Math.abs(z) > 0.98 ? 0.06 : 0));
  }
  geo.computeVertexNormals();
  const tex = tulipFabric('#1C3F8C');
  tex.repeat.set(2, 2);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  m.castShadow = true;
  m.receiveShadow = true;
  const fold = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.016, width + 0.004), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9 }));
  fold.position.set(-len / 2, 0.016, 0);
  const g = new THREE.Group();
  g.add(m, fold);
  return g;
}

/** A small bedside table. */
export function nightstand() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.09), wood());
  body.position.y = 0.055;
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.005), new THREE.MeshStandardMaterial({ color: '#7A4526' }));
  drawer.position.set(0, 0.075, 0.046);
  body.castShadow = body.receiveShadow = true;
  g.add(body, drawer);
  return g;
}

/** A wooden garden bench (seat 0.1 high), facing +Z. */
export function bench(len = 0.52) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: '#8A5A34', roughness: 0.75 });
  const iron = new THREE.MeshStandardMaterial({ color: '#2F3A35', roughness: 0.5, metalness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(len, 0.008, 0.026), paint);
    slat.position.set(0, 0.1, -0.032 + i * 0.03);
    g.add(slat);
  }
  for (let i = 0; i < 2; i++) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(len, 0.026, 0.008), paint);
    back.position.set(0, 0.135 + i * 0.036, -0.05);
    back.rotation.x = -0.12;
    g.add(back);
  }
  for (const x of [-len / 2 + 0.03, len / 2 - 0.03]) {
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.1, 0.012), iron);
    front.position.set(x, 0.05, 0.03);
    const rear = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.2, 0.012), iron);
    rear.position.set(x, 0.1, -0.05);
    rear.rotation.x = -0.12;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.01, 0.1), iron);
    arm.position.set(x, 0.13, -0.01);
    g.add(front, rear, arm);
  }
  g.traverse((o) => ((o as THREE.Mesh).castShadow = (o as THREE.Mesh).receiveShadow = true));
  return g;
}

/** A photograph of a carrot with a white border, standing up (0.13 wide). */
export function photo() {
  const c = document.createElement('canvas');
  c.width = 200;
  c.height = 240;
  const g = c.getContext('2d')!;
  g.fillStyle = '#FFFFFF';
  g.fillRect(0, 0, 200, 240);
  const sky = g.createLinearGradient(0, 14, 0, 186);
  sky.addColorStop(0, '#9ED6F5');
  sky.addColorStop(1, '#E9F6D8');
  g.fillStyle = sky;
  g.fillRect(14, 14, 172, 172);
  g.fillStyle = '#7CB850';
  g.fillRect(14, 140, 172, 46);
  g.fillStyle = '#F07C22';
  g.beginPath();
  g.moveTo(70, 70);
  g.quadraticCurveTo(120, 60, 132, 72);
  g.lineTo(78, 168);
  g.closePath();
  g.fill();
  g.fillStyle = '#3F9A3A';
  for (const [x, a] of [[126, -0.5], [134, 0], [140, 0.5]] as [number, number][]) {
    g.save();
    g.translate(x, 70);
    g.rotate(a);
    g.beginPath();
    g.ellipse(0, -18, 6, 18, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.fillStyle = '#3A4466';
  g.font = '700 22px Andika, sans-serif';
  g.textAlign = 'center';
  g.fillText('havuç', 100, 222);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.156), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide }));
  m.position.y = 0.078;
  m.castShadow = true;
  const grp = new THREE.Group();
  grp.add(m);
  return grp;
}

export const PROPS: Record<string, () => THREE.Object3D> = {
  bed: () => bed(0.58, 0.25),
  blanket: () => blanket(0.3, 0.26),
  nightstand,
  bench: () => bench(),
  photo,
};

/* ---------------- things the characters hold ---------------- */

import { CULTURE_BUILDERS } from '../home3d/culture';

function culture(id: string, h: number) {
  const b = CULTURE_BUILDERS[id];
  const o = b ? b.build() : new THREE.Group();
  const box = new THREE.Box3().setFromObject(o);
  const s = h / Math.max(0.001, box.max.y - box.min.y);
  o.scale.setScalar(s);
  o.position.y = -box.min.y * s;
  const g = new THREE.Group();
  g.add(o);
  return g;
}

function tray(w: number, color = '#C9CED6') {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2 - 0.004, 0.008, 28), new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.35 }));
  m.castShadow = true;
  return m;
}

/** Each returns a group sized for a character about 0.4–0.55 tall; userData: word, hand ('R' for one hand), atHeight, ahead. */
export const HELD: Record<string, () => THREE.Object3D> = {
  // Nasreddin Hoca ve Kazan
  kitap: () => glbHeld('/models/masal/dede-kitap.glb', 0.075, { word: 'kitap', atHeight: 0.42, ahead: 0.2 }),
  /** The same book held up open in front of the face, as when reading aloud. */
  okunanKitap: () => {
    const g = glbHeld('/models/masal/dede-kitap.glb', 0.085, { word: 'kitap', atHeight: 0.46, ahead: 0.2 });
    g.rotation.x = -0.9;
    return g;
  },
  /** A small camera held up to the eye. */
  fotoMakinesi: () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.032, 0.022), new THREE.MeshStandardMaterial({ color: '#2A2F3A', roughness: 0.45 }));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.016, 20), new THREE.MeshStandardMaterial({ color: '#111318', roughness: 0.2, metalness: 0.5 }));
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.018;
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.008, 20), new THREE.MeshStandardMaterial({ color: '#5AA7E6', roughness: 0.05, metalness: 0.6 }));
    glass.position.z = 0.027;
    const flash = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.007, 0.004), new THREE.MeshStandardMaterial({ color: '#F4F4F0', emissive: '#FFFFFF', emissiveIntensity: 0.4 }));
    flash.position.set(-0.015, 0.011, 0.012);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.006, 0.024), new THREE.MeshStandardMaterial({ color: '#D2372C' }));
    strap.position.y = 0.019;
    g.add(body, lens, glass, flash, strap);
    Object.assign(g.userData, { word: 'fotoğraf makinesi', atHeight: 0.62, ahead: 0.18 });
    return g;
  },
  /** A slice of washed carrot. */
  havucDilimi: () => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.004, 18), new THREE.MeshStandardMaterial({ color: '#F07C22', roughness: 0.5 }));
    m.rotation.x = Math.PI / 2;
    g.add(m);
    Object.assign(g.userData, { word: 'havuç', hand: 'R' });
    return g;
  },
  kazan: () => glbHeld('/models/masal/kazan.glb', 0.085, { word: 'kazan', atHeight: 0.4, ahead: 0.22 }),
  tencere: () => glbHeld('/models/masal/tencere.glb', 0.06, { word: 'tencere', atHeight: 0.45, ahead: 0.2 }),
  // Keloğlan ve Üç Tohum
  tohum: () => glbHeld('/models/masal/tohum.glb', 0.034, { word: 'tohum', hand: 'R' }),
  kova: () => glbHeld('/models/kenney/bucket.glb', 0.06, { word: 'kova', hand: 'R' }, true),
  sebze: () => glbHeld('/models/masal/lahana.glb', 0.06, { word: 'lahana', atHeight: 0.45, ahead: 0.2 }),
  // 23 Nisan Şenliği
  balon: () => glbHeld('/models/23-nisan/balon.glb', 0.24, { word: 'balon', hand: 'R' }, false, 0, '#E3262E'),
  balonBeyaz: () => glbHeld('/models/23-nisan/balon.glb', 0.24, { word: 'balon', hand: 'R' }, false, 0, '#F6F2EA'),
  resim: () => glbHeld('/models/23-nisan/elif-resim.glb', 0.1, { word: 'resim', atHeight: 0.42, ahead: 0.2 }),
  davul: () => glbHeld('/models/culture/davul.glb', 0.11, { word: 'davul', atHeight: 0.36, ahead: 0.22 }),
  kart: () => glbHeld('/models/23-nisan/dilek-karti.glb', 0.085, { word: 'dilek kartı', hand: 'R' }),
  baklavaTepsisi: () => {
    const g = new THREE.Group();
    const t = tray(0.13, '#B9773E');
    const b = culture('baklava', 0.035);
    b.position.y = 0.004;
    g.add(t, b);
    Object.assign(g.userData, { word: 'baklava', atHeight: 0.52, ahead: 0.32 });
    return g;
  },
  cayTepsisi: () => {
    const g = new THREE.Group();
    g.add(tray(0.12));
    for (const x of [-0.03, 0, 0.03]) {
      const c = culture('cay', 0.035);
      c.position.set(x, 0.004, x === 0 ? -0.012 : 0.01);
      g.add(c);
    }
    Object.assign(g.userData, { word: 'çay', atHeight: 0.52, ahead: 0.3 });
    return g;
  },
  tabaklar: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.006, 24), new THREE.MeshStandardMaterial({ color: i === 2 ? '#FFFFFF' : '#E6EEF5', roughness: 0.4 }));
      p.position.y = i * 0.007;
      g.add(p);
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.002, 6, 24), new THREE.MeshStandardMaterial({ color: '#1C3F8C' }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.018;
    g.add(rim);
    Object.assign(g.userData, { word: 'tabak', atHeight: 0.5, ahead: 0.32 });
    return g;
  },
  lokumKutusu: () => {
    const g = culture('lokum', 0.05);
    Object.assign(g.userData, { word: 'lokum', atHeight: 0.46, ahead: 0.32 });
    return g;
  },
  sekerKasesi: () => {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(
      new THREE.LatheGeometry([[0, 0], [0.03, 0.002], [0.045, 0.02], [0.05, 0.035]].map(([x, y]) => new THREE.Vector2(x, y)), 24),
      new THREE.MeshStandardMaterial({ color: '#1FA4A0', roughness: 0.4, side: THREE.DoubleSide }),
    );
    g.add(bowl);
    const cols = ['#D2372C', '#F2B33D', '#F28DB2', '#1C3F8C', '#7FC46A', '#FFFFFF'];
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.3 }));
      const a = (i / 14) * Math.PI * 6;
      const r = 0.012 + (i % 3) * 0.01;
      c.scale.set(1.5, 0.8, 1);
      c.position.set(Math.cos(a) * r, 0.03 + (i % 2) * 0.006, Math.sin(a) * r);
      g.add(c);
    }
    Object.assign(g.userData, { word: 'bayram şekeri', atHeight: 0.4, ahead: 0.26 });
    return g;
  },
  harclik: () => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.002, 0.022), new THREE.MeshStandardMaterial({ color: '#FFF6DE' }));
    const g = new THREE.Group();
    g.add(m);
    Object.assign(g.userData, { word: 'harçlık', hand: 'R' });
    return g;
  },
  /** One piece of lokum, taken from the plate. */
  lokum: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.016), new THREE.MeshStandardMaterial({ color: '#F7C6D9', roughness: 0.85 })));
    Object.assign(g.userData, { word: 'lokum', hand: 'R' });
    return g;
  },
  /** Elif's little pink bow-shaped hair clip. */
  toka: () => {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: '#F06FA0', roughness: 0.45 });
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.016, 12), mat);
      wing.rotation.z = (s * Math.PI) / 2;
      wing.position.x = s * 0.008;
      g.add(wing);
    }
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), new THREE.MeshStandardMaterial({ color: '#F2B33D', roughness: 0.3, metalness: 0.3 })));
    Object.assign(g.userData, { word: 'toka', hand: 'R' });
    return g;
  },
  /** A stack of folded white napkins. */
  peceteler: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const n = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.005, 0.05), new THREE.MeshStandardMaterial({ color: i % 2 ? '#FFFFFF' : '#F4F1EA', roughness: 0.95 }));
      n.position.y = i * 0.0055;
      n.rotation.y = (i % 2) * 0.12;
      g.add(n);
    }
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.024, 0.008), new THREE.MeshStandardMaterial({ color: '#D2372C', roughness: 0.6 }));
    band.position.y = 0.01;
    g.add(band);
    Object.assign(g.userData, { word: 'peçete', atHeight: 0.46, ahead: 0.28 });
    return g;
  },
  /** One bayram candy in a twisted wrapper. */
  seker: () => {
    const g = new THREE.Group();
    const wrap = new THREE.MeshStandardMaterial({ color: '#F2B33D', roughness: 0.3 });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8).scale(1.3, 0.85, 0.85), wrap));
    for (const s of [-1, 1]) {
      const end = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.01, 8), wrap);
      end.rotation.z = (s * Math.PI) / 2;
      end.position.x = s * 0.014;
      g.add(end);
    }
    Object.assign(g.userData, { word: 'bayram şekeri', hand: 'R' });
    return g;
  },
  /** Elif's blue colouring pencil. */
  kalem: () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.05, 6), new THREE.MeshStandardMaterial({ color: '#2F6BD8', roughness: 0.5 }));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.01, 6), new THREE.MeshStandardMaterial({ color: '#E9C99A', roughness: 0.8 }));
    tip.position.y = 0.03;
    const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0013, 0.004, 6), new THREE.MeshStandardMaterial({ color: '#1E4FB0' }));
    lead.position.y = 0.0365;
    g.add(body, tip, lead);
    g.rotation.z = 0.5;
    Object.assign(g.userData, { word: 'boya kalemi', hand: 'R' });
    return g;
  },
  /** The little model of the Grand National Assembly building that babaanne shows on the video call. */
  maket: () => glbHeld('/models/23-nisan/meclis.glb', 0.09, { word: 'Meclis', atHeight: 0.42, ahead: 0.22 }),
  lokumTabagi: () => {
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.006, 24), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.4 }));
    g.add(p);
    const cols = ['#F7C6D9', '#FFFFFF', '#F7C6D9', '#CDEFD9'];
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.014), new THREE.MeshStandardMaterial({ color: cols[i % 4], roughness: 0.8 }));
      c.position.set(-0.016 + (i % 3) * 0.016, 0.009 + Math.floor(i / 3) * 0.012, (i % 2) * 0.01 - 0.005);
      g.add(c);
    }
    Object.assign(g.userData, { word: 'lokum', atHeight: 0.5, ahead: 0.3 });
    return g;
  },
};
