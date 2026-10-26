import * as THREE from 'three';
import { tulip } from '../art/kit';
import { Pen } from '../art/pen';

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

export const PROPS: Record<string, () => THREE.Object3D> = {
  bed: () => bed(0.58, 0.25),
  blanket: () => blanket(0.3, 0.26),
  nightstand,
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
