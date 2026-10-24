import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Pen, rng } from '../art/pen';
import { iznikTile, tulip, turkishFlag } from '../art/kit';
import { smooth, pts, lathe, std, phys, mesh, rod, tube, ctex, canvas, tex, V2, V3, type P } from './kit3d';

/**
 * Placeholder 3D models for the culture shelf, built from simple shapes.
 * Each is replaced automatically when a GLB file is given in public/culture/items.json.
 */

const COBALT = '#1C3F8C';
const TURQ = '#1FA4A0';
const RED = '#D2372C';
const SAFFRON = '#F2B33D';
const LEAF = '#3E8E4E';
const GOLD = '#E2B04A';
const PORCELAIN = '#FBFAF6';

const wood = () => std('#9A6136', { roughness: 0.62 });
const woodDark = () => std('#6B3D1F', { roughness: 0.6 });
const brass = () => std('#C99A42', { metalness: 0.9, roughness: 0.3 });
const gold = () => std(GOLD, { metalness: 1, roughness: 0.25 });

function lathePts(points: P[], n = 0) {
  return n ? smooth(points, n) : pts(points);
}

/** A small wooden plinth disc. */
function plinth(r: number, h: number, mat = wood()) {
  return mesh(lathe(pts([[0, 0], [r, 0], [r, h * 0.6], [r * 0.93, h], [0, h]]), 40), mat);
}

/** Stand with a front lip and a back prop, for plates and boards leaning back. */
function leanStand(width: number, propTop: [number, number]) {
  const g = new THREE.Group();
  const w = wood();
  g.add(mesh(new RoundedBoxGeometry(width, 0.02, 0.13, 2, 0.006), w, [0, 0.01, 0]));
  g.add(mesh(new RoundedBoxGeometry(width * 0.92, 0.026, 0.014, 2, 0.005), w, [0, 0.03, 0.05]));
  g.add(rod(V3(0, 0.02, -0.055), V3(0, propTop[0], propTop[1]), 0.007, woodDark()));
  return g;
}

/* ------------------------------------------------------------------ */
/* textures                                                            */
/* ------------------------------------------------------------------ */

function rosette(g: CanvasRenderingContext2D, x: number, y: number, r: number, petal: string, center: string) {
  g.fillStyle = petal;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    g.beginPath();
    g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45, r * 0.22, a, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = center;
  g.beginPath();
  g.arc(x, y, r * 0.24, 0, Math.PI * 2);
  g.fill();
}

/** Porcelain with a cobalt band between v0 and v1 (lathe v runs bottom to top along the profile). */
function porcelainBand(v0: number, v1: number, n = 8) {
  return ctex(512, 256, (g, w, h) => {
    g.fillStyle = PORCELAIN;
    g.fillRect(0, 0, w, h);
    const y0 = (1 - v1) * h;
    const y1 = (1 - v0) * h;
    g.fillStyle = COBALT;
    g.fillRect(0, y0, w, y1 - y0);
    g.fillStyle = GOLD;
    g.fillRect(0, y0 - 5, w, 3);
    g.fillRect(0, y1 + 2, w, 3);
    for (let i = 0; i < n; i++) rosette(g, (i + 0.5) * (w / n), (y0 + y1) / 2, (y1 - y0) * 0.42, '#ffffff', RED);
  });
}

function stoneTex(base: string, line: string, w = 256, h = 256, rows = 16) {
  return (g: CanvasRenderingContext2D) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    g.fillStyle = line;
    const rh = h / rows;
    for (let j = 0; j < rows; j++) {
      g.fillRect(0, j * rh, w, 1.5);
      for (let i = 0; i < 8; i++) g.fillRect(((i + (j % 2) * 0.5) * w) / 8, j * rh, 1.5, rh);
    }
  };
}

/* ------------------------------------------------------------------ */
/* builders                                                            */
/* ------------------------------------------------------------------ */

function cay() {
  const g = new THREE.Group();
  const saucer = lathePts([[0, 0], [0.075, 0], [0.11, 0.01], [0.132, 0.024], [0.128, 0.03], [0.105, 0.018], [0.06, 0.013], [0, 0.013]]);
  g.add(mesh(lathe(saucer, 64), std(RED, { roughness: 0.28 })));
  g.add(mesh(new THREE.TorusGeometry(0.13, 0.0045, 8, 64), std('#ffffff', { roughness: 0.3 }), [0, 0.028, 0], [Math.PI / 2, 0, 0]));
  const outer = smooth([[0.04, 0.013], [0.046, 0.03], [0.039, 0.07], [0.033, 0.1], [0.037, 0.13], [0.05, 0.17], [0.059, 0.205]], 30);
  const inner = smooth([[0.054, 0.205], [0.045, 0.17], [0.032, 0.13], [0.028, 0.1], [0.034, 0.07], [0.04, 0.035], [0.0, 0.03]], 30);
  const glass = mesh(
    lathe([V2(0, 0.013), ...outer, ...inner], 48),
    phys('#ffffff', { roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1 }),
  );
  glass.castShadow = false;
  const teaPts = [...smooth([[0.0, 0.031], [0.039, 0.036], [0.033, 0.07], [0.028, 0.1], [0.032, 0.13], [0.041, 0.16], [0.043, 0.165]], 24), V2(0, 0.165)];
  g.add(mesh(lathe(teaPts, 48), std('#9C3412', { roughness: 0.12, emissive: '#3a0a00', emissiveIntensity: 0.35 })));
  g.add(glass);
  g.add(mesh(new THREE.TorusGeometry(0.0585, 0.0028, 8, 48), gold(), [0, 0.205, 0], [Math.PI / 2, 0, 0]));
  // sugar cube and a little spoon
  g.add(mesh(new RoundedBoxGeometry(0.022, 0.02, 0.022, 2, 0.004), std('#ffffff', { roughness: 0.9 }), [0.085, 0.034, 0.035], [0, 0.4, 0]));
  const spoon = new THREE.Group();
  spoon.add(rod(V3(0, 0, 0), V3(0, 0.1, 0), 0.0025, std('#D9DDE3', { metalness: 1, roughness: 0.25 })));
  spoon.add(mesh(new THREE.SphereGeometry(0.009, 12, 8), std('#D9DDE3', { metalness: 1, roughness: 0.25 }), [0, 0, 0], undefined, [1, 0.35, 1.6]));
  spoon.position.set(-0.08, 0.03, 0.04);
  spoon.rotation.set(Math.PI / 2 - 0.05, 0, 0.9);
  g.add(spoon);
  return g;
}

function caydanlik() {
  const g = new THREE.Group();
  const steel = std('#D5DAE1', { metalness: 0.92, roughness: 0.22 });
  const kettle = [...smooth([[0.0, 0], [0.09, 0], [0.125, 0.02], [0.135, 0.07], [0.125, 0.12], [0.095, 0.15], [0.072, 0.16], [0.07, 0.175]], 40), V2(0, 0.175)];
  g.add(mesh(lathe(kettle, 56), steel));
  g.add(tube([V3(0.11, 0.05, 0), V3(0.17, 0.08, 0), V3(0.2, 0.135, 0), V3(0.215, 0.17, 0)], 0.012, steel));
  g.add(mesh(new THREE.TorusGeometry(0.06, 0.009, 10, 28, Math.PI), std('#222222', { roughness: 0.5 }), [-0.12, 0.09, 0], [0, 0, Math.PI / 2]));
  const potProfile = [V2(0, 0.175), ...smooth([[0.055, 0.175], [0.08, 0.19], [0.092, 0.225], [0.085, 0.26], [0.06, 0.285], [0.035, 0.292]], 30), V2(0, 0.292)];
  const porcelain = std('#ffffff', { roughness: 0.22, map: porcelainBand(0.3, 0.62, 7) });
  g.add(mesh(lathe(potProfile, 56), porcelain));
  g.add(mesh(lathe(pts([[0, 0.29], [0.037, 0.29], [0.031, 0.304], [0.012, 0.312], [0, 0.313]]), 32), std(PORCELAIN, { roughness: 0.22 })));
  g.add(mesh(new THREE.SphereGeometry(0.012, 16, 12), std(COBALT, { roughness: 0.3 }), [0, 0.322, 0]));
  g.add(tube([V3(0.08, 0.212, 0), V3(0.115, 0.235, 0), V3(0.145, 0.275, 0)], 0.0075, std(PORCELAIN, { roughness: 0.22 })));
  g.add(mesh(new THREE.TorusGeometry(0.038, 0.007, 8, 24, Math.PI), std(PORCELAIN, { roughness: 0.22 }), [-0.085, 0.235, 0], [0, 0, Math.PI / 2]));
  return g;
}

function simit() {
  const g = new THREE.Group();
  const R = 0.1;
  const r = 0.041;
  const geo = new THREE.TorusGeometry(R, r, 28, 80);
  const pos = geo.attributes.position;
  const v = V3(0, 0, 0);
  const c = V3(0, 0, 0);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const u = Math.atan2(v.y, v.x);
    c.set(Math.cos(u) * R, Math.sin(u) * R, 0);
    const n = v.clone().sub(c).normalize();
    const radial = c.clone().normalize();
    const tv = Math.atan2(n.z, n.dot(radial));
    v.addScaledVector(n, 0.0065 * Math.sin(u * 11 - tv * 2));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const ring = mesh(geo, std('#B8652B', { roughness: 0.62 }), [0, 0.168, 0]);
  g.add(ring);
  // sesame seeds on the front half
  const count = 240;
  const seeds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), std('#F2DCA0', { roughness: 0.5 }), count);
  const rnd = rng(21);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const q2 = new THREE.Quaternion();
  for (let i = 0; i < count; i++) {
    const u = rnd() * Math.PI * 2;
    const tv = 0.15 + rnd() * (Math.PI - 0.3);
    const radial = V3(Math.cos(u), Math.sin(u), 0);
    const center = radial.clone().multiplyScalar(R);
    const n = radial.clone().multiplyScalar(Math.cos(tv)).add(V3(0, 0, Math.sin(tv)));
    const p = center.addScaledVector(n, r + 0.0035);
    p.y += 0.168;
    q.setFromUnitVectors(V3(0, 0, 1), n);
    q2.setFromAxisAngle(V3(0, 0, 1), rnd() * Math.PI);
    q.multiply(q2);
    m4.compose(p, q, V3(0.0075, 0.0042, 0.0028));
    seeds.setMatrixAt(i, m4);
  }
  seeds.castShadow = true;
  g.add(seeds);
  g.add(plinth(0.06, 0.02));
  g.add(rod(V3(0, 0.02, 0), V3(0, 0.33, 0), 0.0065, woodDark()));
  return g;
}

function baglama() {
  const g = new THREE.Group();
  const prof = smooth([[0, 0], [0.04, 0.004], [0.07, 0.025], [0.088, 0.06], [0.085, 0.105], [0.068, 0.145], [0.045, 0.175], [0.024, 0.198], [0.012, 0.21], [0, 0.212]], 36);
  const ribs = ctex(256, 64, (gg, w, h) => {
    for (let i = 0; i < 12; i++) {
      gg.fillStyle = i % 2 ? '#7A3B17' : '#9A5326';
      gg.fillRect((i * w) / 12, 0, w / 12 + 1, h);
      gg.fillStyle = 'rgba(30,10,0,0.5)';
      gg.fillRect((i * w) / 12, 0, 1.5, h);
    }
  });
  const body = new THREE.Group();
  const bowl = mesh(lathe(prof, 40, Math.PI / 2, Math.PI), std('#ffffff', { roughness: 0.32, map: ribs }));
  bowl.scale.z = 0.75;
  body.add(bowl);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  prof.forEach((p) => shape.lineTo(p.x, p.y));
  [...prof].reverse().forEach((p) => shape.lineTo(-p.x, p.y));
  body.add(mesh(new THREE.ShapeGeometry(shape, 24), std('#D6A463', { roughness: 0.45 }), [0, 0, 0.0005]));
  // decorative dots and bridge
  [[-0.05, 0.08], [0.05, 0.08], [0, 0.12]].forEach(([x, y]) => body.add(mesh(new THREE.CircleGeometry(0.007, 16), std('#3A1A08'), [x, y, 0.001])));
  body.add(mesh(new THREE.BoxGeometry(0.05, 0.008, 0.007), std('#EEE3C8'), [0, 0.045, 0.004]));
  body.position.y = 0.022;
  g.add(body);
  const neckMat = std('#4B2410', { roughness: 0.4 });
  g.add(mesh(new THREE.BoxGeometry(0.026, 0.3, 0.018), neckMat, [0, 0.234 + 0.15, -0.002]));
  let y = 0.25;
  let step = 0.028;
  for (let i = 0; i < 11; i++) {
    g.add(mesh(new THREE.BoxGeometry(0.028, 0.0018, 0.003), std('#E9DDBF'), [0, y, 0.0085]));
    y += step;
    step *= 0.93;
  }
  const head = new THREE.Group();
  head.add(mesh(new THREE.BoxGeometry(0.032, 0.085, 0.02), neckMat, [0, 0.0425, 0]));
  for (let i = 0; i < 7; i++) {
    const side = i % 2 ? 1 : -1;
    const py = 0.012 + Math.floor(i / 2) * 0.022;
    head.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 8), std('#2E160A'), [side * 0.008, py, 0.016], [Math.PI / 2, 0, 0]));
    head.add(mesh(new THREE.SphereGeometry(0.0065, 10, 8), std('#E9DDBF', { roughness: 0.4 }), [side * 0.008, py, 0.032]));
  }
  head.position.set(0, 0.534, -0.004);
  head.rotation.x = -0.18;
  g.add(head);
  const strMat = std('#E6E6E6', { metalness: 0.8, roughness: 0.3 });
  for (const dx of [-0.006, 0, 0.006]) g.add(rod(V3(dx, 0.07, 0.011), V3(dx * 0.6, 0.53, 0.011), 0.0008, strMat, 4));
  g.add(mesh(new RoundedBoxGeometry(0.13, 0.022, 0.08, 2, 0.006), wood(), [0, 0.011, -0.01]));
  return g;
}

function periBacasi() {
  const g = new THREE.Group();
  const strata = ctex(128, 256, (gg, w, h) => {
    const tones = ['#EAD5B2', '#E0C49A', '#EDDCC0', '#D9B98D', '#E6CDA6'];
    const r = rng(4);
    let y = 0;
    while (y < h) {
      const bh = 6 + r() * 18;
      gg.fillStyle = tones[Math.floor(r() * tones.length)];
      gg.fillRect(0, y, w, bh);
      y += bh;
    }
    for (let i = 0; i < 900; i++) {
      gg.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(90,60,30,0.08)';
      gg.fillRect(r() * w, r() * h, 2, 2);
    }
  });
  const tuff = std('#ffffff', { roughness: 0.92, map: strata });
  const cap = std('#6E5444', { roughness: 0.85 });
  const dark = std('#4A3324', { roughness: 0.9 });
  g.add(mesh(lathe(smooth([[0, 0], [0.16, 0], [0.175, 0.015], [0.165, 0.035], [0.125, 0.05], [0, 0.055]], 20), 40), std('#C9A27A', { roughness: 0.95 })));
  const chim = (x: number, z: number, h: number, rb: number, cr: number, holes: [number, number, number][]) => {
    const prof: P[] = [[0, 0], [rb, 0], [rb * 0.95, h * 0.25], [rb * 0.72, h * 0.6], [rb * 0.5, h * 0.88], [rb * 0.42, h], [0, h]];
    const c = new THREE.Group();
    c.add(mesh(lathe(smooth(prof, 30), 36), tuff));
    c.add(mesh(lathe(smooth([[0, 0], [cr, 0], [cr * 0.95, cr * 0.35], [cr * 0.6, cr * 0.7], [0, cr * 0.85]], 16), 32), cap, [0, h - 0.006, 0]));
    const rAt = (y: number) => {
      for (let i = 0; i < prof.length - 2; i++) {
        const [r0, y0] = prof[i];
        const [r1, y1] = prof[i + 1];
        if (y >= y0 && y <= y1) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
      }
      return prof[prof.length - 2][0];
    };
    for (const [hy, hw, hh] of holes) {
      c.add(mesh(new THREE.SphereGeometry(1, 14, 10), dark, [0, hy, rAt(hy) * 0.97], undefined, [hw, hh, 0.004]));
    }
    c.position.set(x, 0.045, z);
    return c;
  };
  g.add(chim(-0.075, -0.02, 0.26, 0.055, 0.046, [[0.12, 0.007, 0.01]]));
  g.add(chim(0.015, 0.025, 0.34, 0.066, 0.054, [[0.05, 0.013, 0.02], [0.17, 0.007, 0.01], [0.23, 0.006, 0.008]]));
  g.add(chim(0.1, -0.03, 0.22, 0.05, 0.042, [[0.09, 0.006, 0.009]]));
  return g;
}

function balon() {
  const g = new THREE.Group();
  const gores = ctex(512, 128, (gg, w, h) => {
    const cols = [RED, SAFFRON, COBALT, TURQ];
    const n = 12;
    for (let i = 0; i < n; i++) {
      gg.fillStyle = cols[i % 4];
      gg.fillRect((i * w) / n, 0, w / n + 1, h);
    }
    gg.fillStyle = '#FFF6E0';
    gg.fillRect(0, h * 0.7, w, h * 0.06);
    for (let i = 0; i < n * 2; i++) {
      gg.beginPath();
      gg.arc(((i + 0.5) * w) / (n * 2), h * 0.73, 3, 0, Math.PI * 2);
      gg.fillStyle = RED;
      gg.fill();
    }
    gg.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < n; i++) gg.fillRect((i * w) / n - 1, 0, 2, h);
  });
  const env = smooth([[0.0, 0], [0.022, 0.004], [0.05, 0.03], [0.085, 0.08], [0.108, 0.14], [0.115, 0.2], [0.105, 0.255], [0.08, 0.3], [0.045, 0.325], [0, 0.333]], 50);
  g.add(mesh(lathe(env, 72), std('#ffffff', { roughness: 0.55, map: gores }), [0, 0.135, 0]));
  const weave = ctex(64, 64, (gg) => {
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++) {
        gg.fillStyle = (i + j) % 2 ? '#B8834C' : '#97632F';
        gg.fillRect(i * 8, j * 8, 8, 8);
      }
  });
  g.add(mesh(new RoundedBoxGeometry(0.062, 0.048, 0.062, 2, 0.006), std('#ffffff', { roughness: 0.9, map: weave }), [0, 0.024, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.022, 16), std('#8A8F98', { metalness: 0.7, roughness: 0.35 }), [0, 0.075, 0]));
  const ropeMat = std('#5B3A1E');
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.add(rod(V3(sx * 0.027, 0.048, sz * 0.027), V3(sx * 0.016, 0.14, sz * 0.016), 0.0016, ropeMat, 4));
  return g;
}

function baklava() {
  const g = new THREE.Group();
  g.add(leanStand(0.3, [0.27, -0.06]));
  const tray = new THREE.Group();
  const copper = std('#C9773A', { metalness: 0.85, roughness: 0.3 });
  tray.add(mesh(lathe(pts([[0, 0], [0.15, 0], [0.158, 0.004], [0.166, 0.022], [0.172, 0.026], [0.168, 0.03], [0.158, 0.024], [0.148, 0.01], [0, 0.01]]), 64), copper));
  const a = 0.034;
  const b = 0.022;
  const shape = new THREE.Shape([V2(0, -a), V2(b, 0), V2(0, a), V2(-b, 0)]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2 });
  geo.rotateX(-Math.PI / 2);
  const pastry = std('#E6A23C', { roughness: 0.38, emissive: '#3a1800', emissiveIntensity: 0.15 });
  const crumbs: THREE.Vector3[] = [];
  for (let j = -4; j <= 4; j++)
    for (let i = -4; i <= 4; i++) {
      const x = i * b * 2 + (Math.abs(j) % 2 ? b : 0);
      const z = j * a;
      if (Math.hypot(x, z) > 0.125) continue;
      tray.add(mesh(geo, pastry, [x, 0.012, z]));
      crumbs.push(V3(x, 0.04, z));
    }
  const pist = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0055, 8, 6), std('#7DB346', { roughness: 0.6 }), crumbs.length * 2);
  const m4 = new THREE.Matrix4();
  const r = rng(3);
  crumbs.forEach((p, i) => {
    for (let k = 0; k < 2; k++) {
      m4.makeTranslation(p.x + (r() - 0.5) * 0.012, p.y, p.z + (r() - 0.5) * 0.02);
      pist.setMatrixAt(i * 2 + k, m4);
    }
  });
  tray.add(pist);
  const th = 1.15;
  tray.rotation.x = th;
  tray.position.set(0, 0.03 + 0.172 * Math.sin(th), 0.036 - 0.172 * Math.cos(th));
  g.add(tray);
  return g;
}

function nazar() {
  const g = new THREE.Group();
  const glass = (c: string) => phys(c, { roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 });
  const cy = 0.24;
  const sph = new THREE.SphereGeometry(1, 40, 20);
  g.add(mesh(sph, glass('#123E9C'), [0, cy, 0], undefined, [0.105, 0.105, 0.034]));
  g.add(mesh(sph, glass('#F7FAFF'), [0, cy, 0.012], undefined, [0.068, 0.068, 0.03]));
  g.add(mesh(sph, glass('#4FB3E8'), [0, cy, 0.02], undefined, [0.046, 0.046, 0.028]));
  g.add(mesh(sph, glass('#0B1430'), [0, cy, 0.028], undefined, [0.022, 0.022, 0.02]));
  g.add(mesh(new THREE.TorusGeometry(0.011, 0.003, 8, 20), gold(), [0, cy + 0.113, 0]));
  g.add(rod(V3(0, cy + 0.123, 0), V3(0, 0.44, 0), 0.0018, std('#B0302A'), 6));
  // a little red tassel below
  g.add(rod(V3(0, cy - 0.105, 0), V3(0, cy - 0.14, 0), 0.0016, std('#B0302A'), 6));
  g.add(mesh(new THREE.ConeGeometry(0.012, 0.045, 12), std('#C0392B', { roughness: 0.8 }), [0, cy - 0.16, 0], [Math.PI, 0, 0]));
  const b = brass();
  g.add(plinth(0.075, 0.02, wood()));
  g.children[g.children.length - 1].position.x = -0.06;
  g.add(rod(V3(-0.11, 0.02, 0), V3(-0.11, 0.445, 0), 0.0055, b));
  g.add(rod(V3(-0.11, 0.44, 0), V3(0.008, 0.44, 0), 0.005, b));
  g.add(mesh(new THREE.SphereGeometry(0.009, 12, 10), b, [-0.11, 0.45, 0]));
  return g;
}

function bloomGeo(phase: number) {
  const geo = lathe(smooth([[0, 0], [0.02, 0.004], [0.034, 0.02], [0.04, 0.042], [0.036, 0.064]], 20), 60);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    if (y > 0.035) {
      const a = Math.atan2(x, z) + phase;
      const t = (y - 0.035) / 0.03;
      const k = Math.pow(0.5 + 0.5 * Math.cos(3 * a), 3);
      p.setY(i, y + t * 0.026 * k - t * 0.006);
      const s = 1 - t * 0.2 * (1 - k);
      p.setX(i, x * s);
      p.setZ(i, z * s);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function leafGeo(len: number, wid: number, bend: number) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(wid, len * 0.45, 0, len);
  s.quadraticCurveTo(-wid, len * 0.45, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 14);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, bend * (y / len) ** 2 * len - Math.abs(x) * 0.5);
  }
  geo.computeVertexNormals();
  return geo;
}

function lale() {
  const g = new THREE.Group();
  const vaseTex = ctex(512, 256, (gg, w, h) => {
    gg.fillStyle = '#F7FAFC';
    gg.fillRect(0, 0, w, h);
    gg.fillStyle = COBALT;
    gg.fillRect(0, h * 0.86, w, h * 0.14);
    gg.fillStyle = TURQ;
    gg.fillRect(0, h * 0.14, w, h * 0.05);
    const pen = new Pen(w, h / w);
    for (let i = 0; i < 6; i++) {
      const x = (i + 0.5) * (1000 / 6);
      pen.c.save();
      tulip(pen, x, pen.H * 0.8, pen.H * 0.55, i % 2 ? RED : COBALT);
      pen.c.restore();
    }
    gg.drawImage(pen.canvas, 0, 0);
    for (let i = 0; i < 24; i++) {
      gg.beginPath();
      gg.arc((i + 0.5) * (w / 24), h * 0.93, 3.5, 0, Math.PI * 2);
      gg.fillStyle = '#ffffff';
      gg.fill();
    }
  });
  const vase = [...smooth([[0.0, 0], [0.05, 0], [0.066, 0.02], [0.07, 0.06], [0.056, 0.11], [0.032, 0.15], [0.025, 0.185], [0.031, 0.205]], 36), V2(0.026, 0.208), V2(0, 0.2)];
  g.add(mesh(lathe(vase, 56), std('#ffffff', { roughness: 0.22, map: vaseTex })));
  const green = std(LEAF, { roughness: 0.55, side: THREE.DoubleSide });
  g.add(tube([V3(0, 0.19, 0), V3(0.008, 0.27, 0.004), V3(0.004, 0.35, 0.002), V3(0, 0.42, 0)], 0.0055, green));
  const l1 = mesh(leafGeo(0.17, 0.028, 0.25), green, [0.004, 0.2, 0], [0.15, 0, -0.42]);
  const l2 = mesh(leafGeo(0.14, 0.024, 0.25), green, [-0.004, 0.205, 0], [0.1, Math.PI, -0.38]);
  g.add(l1, l2);
  const red = std(RED, { roughness: 0.45, side: THREE.DoubleSide });
  g.add(mesh(bloomGeo(0), red, [0, 0.415, 0]));
  g.add(mesh(bloomGeo(Math.PI / 3), std('#E04A3C', { roughness: 0.45, side: THREE.DoubleSide }), [0, 0.417, 0], undefined, [0.9, 0.97, 0.9]));
  return g;
}

function kahve() {
  const g = new THREE.Group();
  const white = std(PORCELAIN, { roughness: 0.25 });
  const cup = new THREE.Group();
  cup.add(mesh(lathe(pts([[0, 0], [0.05, 0], [0.075, 0.008], [0.085, 0.016], [0.082, 0.02], [0.07, 0.012], [0.04, 0.009], [0, 0.009]]), 48), white));
  cup.add(mesh(new THREE.TorusGeometry(0.0835, 0.0025, 6, 48), gold(), [0, 0.019, 0], [Math.PI / 2, 0, 0]));
  const outer = smooth([[0.026, 0.009], [0.032, 0.013], [0.037, 0.035], [0.04, 0.065], [0.041, 0.075]], 16);
  const inner = smooth([[0.037, 0.075], [0.036, 0.065], [0.033, 0.035], [0.027, 0.016], [0, 0.014]], 16);
  cup.add(mesh(lathe([V2(0, 0.009), ...outer, ...inner], 48), std('#ffffff', { roughness: 0.25, map: porcelainBand(0.3, 0.44, 6) })));
  cup.add(mesh(new THREE.TorusGeometry(0.0405, 0.0022, 6, 48), gold(), [0, 0.075, 0], [Math.PI / 2, 0, 0]));
  const foam = ctex(128, 128, (gg, w) => {
    const grd = gg.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w / 2);
    grd.addColorStop(0, '#5A3418');
    grd.addColorStop(0.55, '#8A5A32');
    grd.addColorStop(1, '#C49A6C');
    gg.fillStyle = grd;
    gg.fillRect(0, 0, w, w);
  });
  cup.add(mesh(new THREE.CircleGeometry(0.036, 32), std('#ffffff', { roughness: 0.6, map: foam }), [0, 0.068, 0], [-Math.PI / 2, 0, 0]));
  cup.add(mesh(new THREE.TorusGeometry(0.014, 0.0035, 8, 16, Math.PI * 1.2), white, [0.046, 0.045, 0], [0, 0, -Math.PI * 0.6]));
  cup.position.set(-0.045, 0, 0.035);
  g.add(cup);
  const copper = std('#C2703A', { metalness: 0.85, roughness: 0.28 });
  const cezve = new THREE.Group();
  const cp = [...smooth([[0.0, 0], [0.04, 0], [0.046, 0.008], [0.044, 0.035], [0.036, 0.06], [0.035, 0.07], [0.045, 0.086]], 24), V2(0.04, 0.084), V2(0.031, 0.072), V2(0, 0.072)];
  cezve.add(mesh(lathe(cp, 40), copper));
  cezve.add(rod(V3(0.04, 0.072, 0), V3(0.13, 0.12, 0), 0.0055, brass()));
  cezve.add(mesh(new THREE.SphereGeometry(0.009, 12, 10), brass(), [0.13, 0.12, 0]));
  cezve.position.set(0.05, 0, -0.045);
  cezve.rotation.y = -1.9;
  g.add(cezve);
  return g;
}

function lokum() {
  const g = new THREE.Group();
  const dish = pts([[0, 0], [0.04, 0], [0.042, 0.006], [0.025, 0.012], [0.022, 0.03], [0.06, 0.04], [0.1, 0.055], [0.105, 0.06], [0.098, 0.063], [0.055, 0.05], [0, 0.046]]);
  g.add(mesh(lathe(dish, 56), std(PORCELAIN, { roughness: 0.25 })));
  g.add(mesh(new THREE.TorusGeometry(0.1015, 0.003, 6, 56), std(COBALT, { roughness: 0.3 }), [0, 0.061, 0], [Math.PI / 2, 0, 0]));
  const cube = new RoundedBoxGeometry(0.05, 0.05, 0.05, 3, 0.011);
  const pink = std('#F39BBE', { roughness: 0.95 });
  const cream = std('#F5EAD3', { roughness: 0.95 });
  const spots: [number, number, number, number, boolean][] = [
    [-0.055, 0.075, 0, 0.12, true],
    [0, 0.075, 0.004, -0.08, false],
    [0.055, 0.075, 0, 0.18, true],
    [-0.027, 0.125, 0.002, -0.1, false],
    [0.028, 0.125, 0, 0.14, true],
    [0, 0.175, 0.002, 0.25, false],
    [-0.03, 0.075, -0.05, 0.3, false],
    [0.03, 0.075, -0.05, -0.2, true],
  ];
  for (const [x, y, z, ry, isPink] of spots) g.add(mesh(cube, isPink ? pink : cream, [x, y, z], [0, ry, 0]));
  return g;
}

function galata() {
  const g = new THREE.Group();
  const stone = '#D8CCB6';
  const base = ctex(256, 128, stoneTex(stone, '#C2B59C', 256, 128, 6));
  g.add(mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.05, 40), std('#ffffff', { roughness: 0.9, map: base }), [0, 0.025, 0]));
  const bodyTex = ctex(512, 512, (gg, w, h) => {
    stoneTex(stone, '#C4B79E', w, h, 22)(gg);
    const cols = 10;
    for (let i = 0; i < cols; i++)
      for (const v of [0.22, 0.42, 0.62, 0.82]) {
        const x = ((i + 0.5) * w) / cols;
        const y = (1 - v) * h;
        gg.fillStyle = '#3E4652';
        gg.beginPath();
        gg.moveTo(x - 9, y + 16);
        gg.lineTo(x - 9, y - 6);
        gg.arc(x, y - 6, 9, Math.PI, 0);
        gg.lineTo(x + 9, y + 16);
        gg.closePath();
        gg.fill();
      }
    // door at the front (u = 0 wraps)
    gg.fillStyle = '#5A3A28';
    for (const x of [0, w]) {
      gg.beginPath();
      gg.moveTo(x - 16, h);
      gg.lineTo(x - 16, h - 40);
      gg.arc(x, h - 40, 16, Math.PI, 0);
      gg.lineTo(x + 16, h);
      gg.fill();
    }
  });
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.29, 40), std('#ffffff', { roughness: 0.88, map: bodyTex }), [0, 0.195, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.063, 0.06, 0.012, 40), std('#CDBFA6', { roughness: 0.85 }), [0, 0.346, 0]));
  g.add(mesh(new THREE.TorusGeometry(0.066, 0.004, 8, 48), std('#7A7F88', { metalness: 0.6, roughness: 0.4 }), [0, 0.352, 0], [Math.PI / 2, 0, 0]));
  const gallery = ctex(512, 64, (gg, w, h) => {
    gg.fillStyle = '#E6DCC8';
    gg.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      const x = ((i + 0.5) * w) / 16;
      gg.fillStyle = '#3E4652';
      gg.beginPath();
      gg.moveTo(x - 10, h - 8);
      gg.lineTo(x - 10, 24);
      gg.arc(x, 24, 10, Math.PI, 0);
      gg.lineTo(x + 10, h - 8);
      gg.fill();
    }
  });
  g.add(mesh(new THREE.CylinderGeometry(0.056, 0.058, 0.045, 40), std('#ffffff', { roughness: 0.85, map: gallery }), [0, 0.375, 0]));
  g.add(mesh(new THREE.ConeGeometry(0.064, 0.15, 40), std('#4D5968', { metalness: 0.35, roughness: 0.45 }), [0, 0.473, 0]));
  g.add(rod(V3(0, 0.545, 0), V3(0, 0.575, 0), 0.0025, gold()));
  g.add(mesh(new THREE.SphereGeometry(0.0075, 12, 10), gold(), [0, 0.565, 0]));
  return g;
}

function kizKulesi() {
  const g = new THREE.Group();
  const ripples = ctex(256, 256, (gg, w, h) => {
    gg.fillStyle = '#2F7FC1';
    gg.fillRect(0, 0, w, h);
    gg.strokeStyle = 'rgba(160,215,245,0.55)';
    gg.lineWidth = 3;
    const r = rng(6);
    for (let i = 0; i < 26; i++) {
      const x = r() * w;
      const y = r() * h;
      gg.beginPath();
      gg.arc(x, y, 8 + r() * 14, Math.PI * 1.1, Math.PI * 1.9);
      gg.stroke();
    }
  });
  const water = std('#2F7FC1', { roughness: 0.15, metalness: 0.1 });
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 56), [water, std('#ffffff', { roughness: 0.15, map: ripples }), water], [0, 0.01, 0]));
  g.add(mesh(lathe(smooth([[0, 0], [0.12, 0], [0.115, 0.02], [0.09, 0.04], [0.05, 0.05], [0, 0.052]], 16), 32), std('#8E8172', { roughness: 0.95 }), [0, 0.018, 0]));
  const white = '#F4EFE6';
  const winTex = (cols: number, rows: number[]) =>
    ctex(256, 128, (gg, w, h) => {
      gg.fillStyle = white;
      gg.fillRect(0, 0, w, h);
      for (let i = 0; i < cols; i++)
        for (const v of rows) {
          const x = ((i + 0.5) * w) / cols;
          const y = (1 - v) * h;
          gg.fillStyle = '#5F7FA0';
          gg.beginPath();
          gg.moveTo(x - 7, y + 14);
          gg.lineTo(x - 7, y - 4);
          gg.arc(x, y - 4, 7, Math.PI, 0);
          gg.lineTo(x + 7, y + 14);
          gg.fill();
        }
    });
  const bTex = winTex(5, [0.45]);
  g.add(mesh(new THREE.BoxGeometry(0.15, 0.055, 0.075), std('#ffffff', { roughness: 0.8, map: bTex }), [-0.02, 0.092, 0]));
  const roof = new THREE.Shape([V2(-0.08, 0), V2(0.08, 0), V2(0, 0.032)]);
  const roofGeo = new THREE.ExtrudeGeometry(roof, { depth: 0.083, bevelEnabled: false });
  roofGeo.translate(0, 0, -0.0415);
  g.add(mesh(roofGeo, std('#B5533C', { roughness: 0.75 }), [-0.02, 0.119, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.18, 8), std('#ffffff', { roughness: 0.8, map: winTex(8, [0.3, 0.7]) }), [0.045, 0.155, 0.005]));
  g.add(mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 8), std('#E2D8C6', { roughness: 0.8 }), [0.045, 0.25, 0.005]));
  g.add(mesh(new THREE.ConeGeometry(0.034, 0.07, 8), std('#566170', { metalness: 0.3, roughness: 0.5 }), [0.045, 0.291, 0.005]));
  g.add(rod(V3(0.045, 0.325, 0.005), V3(0.045, 0.37, 0.005), 0.0018, gold()));
  const flag = ctex(150, 100, (gg) => {
    const pen = new Pen(150, 2 / 3);
    turkishFlag(pen, 0, 0, 1000);
    gg.drawImage(pen.canvas, 0, 0);
  });
  g.add(mesh(new THREE.PlaneGeometry(0.036, 0.024), std('#ffffff', { roughness: 0.7, map: flag, side: THREE.DoubleSide }), [0.064, 0.357, 0.005]));
  return g;
}

function davul() {
  const g = new THREE.Group();
  const zig = ctex(512, 128, (gg, w, h) => {
    gg.fillStyle = '#C2352A';
    gg.fillRect(0, 0, w, h);
    gg.strokeStyle = '#F1E3C4';
    gg.lineWidth = 6;
    gg.lineJoin = 'round';
    gg.beginPath();
    const n = 16;
    for (let i = 0; i <= n * 2; i++) {
      const x = (i * w) / (n * 2);
      const y = i % 2 ? h - 12 : 12;
      if (i === 0) gg.moveTo(x, y);
      else gg.lineTo(x, y);
    }
    gg.stroke();
    gg.fillStyle = '#8A2018';
    gg.fillRect(0, 0, w, 6);
    gg.fillRect(0, h - 6, w, 6);
  });
  const drum = new THREE.Group();
  drum.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 48, 1, true), std('#ffffff', { roughness: 0.6, map: zig, side: THREE.DoubleSide })));
  const skin = std('#EFE1C6', { roughness: 0.75 });
  const hoop = std('#6B3A1E', { roughness: 0.5 });
  for (const s of [1, -1]) {
    drum.add(mesh(new THREE.CircleGeometry(0.1, 48), skin, [0, s * 0.05, 0], [s * -Math.PI / 2, 0, 0]));
    drum.add(mesh(new THREE.TorusGeometry(0.1, 0.008, 10, 48), hoop, [0, s * 0.05, 0], [Math.PI / 2, 0, 0]));
  }
  drum.rotation.z = Math.PI / 2;
  drum.position.y = 0.135;
  g.add(drum);
  const w = wood();
  g.add(mesh(new RoundedBoxGeometry(0.03, 0.045, 0.13, 2, 0.006), w, [-0.04, 0.0225, 0]));
  g.add(mesh(new RoundedBoxGeometry(0.03, 0.045, 0.13, 2, 0.006), w, [0.04, 0.0225, 0]));
  // mallet (tokmak) and thin stick (çubuk) lying in front
  const mallet = new THREE.Group();
  mallet.add(rod(V3(-0.08, 0, 0), V3(0.06, 0, 0), 0.007, std('#8A5530')));
  mallet.add(mesh(new THREE.SphereGeometry(0.02, 16, 12), std('#5C3A22', { roughness: 0.7 }), [0.07, 0, 0], undefined, [1.1, 0.95, 0.95]));
  mallet.position.set(0.01, 0.01, 0.105);
  mallet.rotation.y = 0.2;
  g.add(mallet);
  g.add(rod(V3(-0.09, 0.006, 0.12), V3(0.08, 0.006, 0.145), 0.0035, std('#C8A06A')));
  return g;
}

/** Ebru (paper marbling) made with the real marbling maths: ink drops and combs on water. */
function ebruCanvas(w = 256, h = 320, seed = 5) {
  type Op = { t: 'drop'; x: number; y: number; r: number; c: [number, number, number] } | { t: 'wave'; axis: 'x' | 'y'; amp: number; per: number; ph: number };
  const hex = (s: string): [number, number, number] => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const pal = [COBALT, TURQ, RED, SAFFRON, '#F7F2E6', '#2E2A5A', '#7FC4D8'].map(hex);
  const r = rng(seed);
  const ops: Op[] = [];
  for (let i = 0; i < 46; i++) ops.push({ t: 'drop', x: r() * w, y: r() * h, r: 8 + r() * 20, c: pal[Math.floor(r() * pal.length)] });
  ops.push({ t: 'wave', axis: 'y', amp: 14, per: 64, ph: 0 });
  ops.push({ t: 'wave', axis: 'x', amp: 9, per: 46, ph: 1.3 });
  // a big flower of concentric drops in the middle
  const fx = w * 0.5;
  const fy = h * 0.52;
  [[52, RED], [40, '#F7F2E6'], [30, SAFFRON], [18, RED], [8, COBALT]].forEach(([rr, c]) => ops.push({ t: 'drop', x: fx, y: fy, r: rr as number, c: hex(c as string) }));
  ops.push({ t: 'wave', axis: 'y', amp: 4, per: 120, ph: 0.4 });
  const base = hex('#EFE2C6');
  return canvas(w, h, (g) => {
    const img = g.createImageData(w, h);
    for (let py = 0; py < h; py++)
      for (let px = 0; px < w; px++) {
        let x = px + 0.5;
        let y = py + 0.5;
        let col = base;
        for (let k = ops.length - 1; k >= 0; k--) {
          const o = ops[k];
          if (o.t === 'wave') {
            if (o.axis === 'y') y -= o.amp * Math.sin((2 * Math.PI * x) / o.per + o.ph);
            else x -= o.amp * Math.sin((2 * Math.PI * y) / o.per + o.ph);
          } else {
            const dx = x - o.x;
            const dy = y - o.y;
            const d2 = dx * dx + dy * dy;
            const r2 = o.r * o.r;
            if (d2 < r2) {
              col = o.c;
              break;
            }
            const s = Math.sqrt(1 - r2 / d2);
            x = o.x + dx * s;
            y = o.y + dy * s;
          }
        }
        const i = (py * w + px) * 4;
        img.data[i] = col[0];
        img.data[i + 1] = col[1];
        img.data[i + 2] = col[2];
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  });
}

function ebru() {
  const g = new THREE.Group();
  const panel = new THREE.Group();
  panel.add(mesh(new THREE.PlaneGeometry(0.24, 0.3), std('#ffffff', { roughness: 0.75, map: tex(ebruCanvas()) })));
  const fr = std('#7A4A26', { roughness: 0.5 });
  const gl = gold();
  const t = 0.02;
  panel.add(mesh(new THREE.BoxGeometry(0.24 + 2 * t, t, 0.018), fr, [0, 0.15 + t / 2, 0]));
  panel.add(mesh(new THREE.BoxGeometry(0.24 + 2 * t, t, 0.018), fr, [0, -0.15 - t / 2, 0]));
  panel.add(mesh(new THREE.BoxGeometry(t, 0.3, 0.018), fr, [0.12 + t / 2, 0, 0]));
  panel.add(mesh(new THREE.BoxGeometry(t, 0.3, 0.018), fr, [-0.12 - t / 2, 0, 0]));
  panel.add(mesh(new THREE.BoxGeometry(0.244, 0.003, 0.004), gl, [0, 0.1505, 0.006]));
  panel.add(mesh(new THREE.BoxGeometry(0.244, 0.003, 0.004), gl, [0, -0.1505, 0.006]));
  panel.add(mesh(new THREE.BoxGeometry(0.003, 0.3, 0.004), gl, [0.1205, 0, 0.006]));
  panel.add(mesh(new THREE.BoxGeometry(0.003, 0.3, 0.004), gl, [-0.1205, 0, 0.006]));
  panel.rotation.x = -0.16;
  panel.position.set(0, 0.105 + 0.17 * Math.cos(0.16), 0.045 - 0.17 * Math.sin(0.16));
  g.add(panel);
  const w = woodDark();
  g.add(rod(V3(-0.1, 0, 0.06), V3(-0.035, 0.5, -0.015), 0.006, w));
  g.add(rod(V3(0.1, 0, 0.06), V3(0.035, 0.5, -0.015), 0.006, w));
  g.add(rod(V3(0, 0, -0.15), V3(0, 0.46, -0.025), 0.006, w));
  g.add(mesh(new THREE.BoxGeometry(0.24, 0.012, 0.045), w, [0, 0.1, 0.05]));
  return g;
}

function karagozCanvas() {
  return canvas(512, 420, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.62);
    grd.addColorStop(0, '#FFF6DA');
    grd.addColorStop(1, '#EBCB8E');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    const outline = (fill: string, draw: () => void) => {
      g.beginPath();
      draw();
      g.fillStyle = fill;
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = '#3A1E10';
      g.stroke();
    };
    const joint = (x: number, y: number) => {
      g.beginPath();
      g.arc(x, y, 4, 0, Math.PI * 2);
      g.fillStyle = '#3A1E10';
      g.fill();
    };
    const figure = (cx: number, face: 1 | -1, o: { hat: string; robe: string; sash: string; beard: 'round' | 'pointy'; tallHat: boolean }) => {
      const f = face;
      // robe
      outline(o.robe, () => {
        g.moveTo(cx - 38, 370);
        g.quadraticCurveTo(cx - 44, 250, cx - 20, 200);
        g.lineTo(cx + 22, 200);
        g.quadraticCurveTo(cx + 46, 250, cx + 40, 370);
        g.closePath();
      });
      outline(o.sash, () => g.rect(cx - 30, 262, 62, 14));
      // arm pointing forward
      outline(o.robe, () => {
        g.moveTo(cx + f * 8, 214);
        g.quadraticCurveTo(cx + f * 60, 240, cx + f * 80, 220);
        g.lineTo(cx + f * 84, 234);
        g.quadraticCurveTo(cx + f * 58, 262, cx + f * 4, 238);
        g.closePath();
      });
      outline('#F2C9A0', () => g.arc(cx + f * 88, 226, 9, 0, Math.PI * 2));
      // legs
      outline('#C0392B', () => g.rect(cx - 26, 366, 20, 28));
      outline('#C0392B', () => g.rect(cx + 6, 366, 20, 28));
      // head
      outline('#F2C9A0', () => g.ellipse(cx + f * 6, 168, 30, 33, 0, 0, Math.PI * 2));
      g.beginPath();
      g.arc(cx + f * 18, 160, 5, 0, Math.PI * 2);
      g.fillStyle = '#1A0E08';
      g.fill();
      outline('#F2C9A0', () => g.ellipse(cx + f * 34, 172, 10, 7, 0, 0, Math.PI * 2));
      if (o.beard === 'round') outline('#1A0E08', () => g.ellipse(cx + f * 8, 196, 26, 18, 0, 0, Math.PI));
      else
        outline('#1A0E08', () => {
          g.moveTo(cx - 14, 188);
          g.lineTo(cx + f * 26, 188);
          g.lineTo(cx + f * 8, 236);
          g.closePath();
        });
      // hat
      if (o.tallHat)
        outline(o.hat, () => {
          g.moveTo(cx - 28, 148);
          g.quadraticCurveTo(cx - 34, 70, cx + f * 4, 56);
          g.quadraticCurveTo(cx + 40, 70, cx + 30, 148);
          g.closePath();
        });
      else
        outline(o.hat, () => {
          g.moveTo(cx - 34, 150);
          g.quadraticCurveTo(cx - 40, 100, cx + f * 10, 96);
          g.quadraticCurveTo(cx + 48, 104, cx + 34, 150);
          g.closePath();
        });
      outline('#ffffff', () => g.rect(cx - 32, 142, 66, 12));
      [[cx, 200], [cx + f * 10, 228], [cx - 16, 366], [cx + 16, 366], [cx, 262]].forEach(([x, y]) => joint(x, y));
    };
    figure(150, 1, { hat: '#1A0E08', robe: '#D2372C', sash: SAFFRON, beard: 'round', tallHat: false });
    figure(362, -1, { hat: '#2E8B57', robe: '#7B4FA0', sash: '#F2B33D', beard: 'pointy', tallHat: true });
    // a little tulip ornament between them
    const pen = new Pen(80, 1);
    tulip(pen, 500, 950, 800, RED);
    g.drawImage(pen.canvas, w / 2 - 30, 30, 60, 60);
  });
}

function karagoz() {
  const g = new THREE.Group();
  const cloth = ctex(256, 96, (gg, w, h) => {
    gg.fillStyle = '#A82A22';
    gg.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      gg.fillStyle = 'rgba(0,0,0,0.12)';
      gg.fillRect((i * w) / 16, 0, 4, h);
    }
    gg.fillStyle = SAFFRON;
    gg.fillRect(0, 8, w, 6);
    for (let i = 0; i < 32; i++) {
      gg.beginPath();
      gg.moveTo((i * w) / 32, h);
      gg.lineTo(((i + 0.5) * w) / 32, h - 12);
      gg.lineTo(((i + 1) * w) / 32, h);
      gg.fill();
    }
  });
  g.add(mesh(new RoundedBoxGeometry(0.33, 0.13, 0.05, 2, 0.008), std('#ffffff', { roughness: 0.9, map: cloth }), [0, 0.065, 0]));
  const frame = std('#5A3018', { roughness: 0.5 });
  const fy = 0.13 + 0.13;
  g.add(mesh(new RoundedBoxGeometry(0.34, 0.03, 0.04, 2, 0.006), frame, [0, fy + 0.125, 0]));
  g.add(mesh(new RoundedBoxGeometry(0.34, 0.024, 0.04, 2, 0.006), frame, [0, fy - 0.122, 0]));
  g.add(mesh(new RoundedBoxGeometry(0.026, 0.27, 0.04, 2, 0.006), frame, [0.157, fy, 0]));
  g.add(mesh(new RoundedBoxGeometry(0.026, 0.27, 0.04, 2, 0.006), frame, [-0.157, fy, 0]));
  const t = tex(karagozCanvas());
  const screen = mesh(new THREE.PlaneGeometry(0.29, 0.236), std('#ffffff', { roughness: 0.9, map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.55 }), [0, fy, 0.002]);
  screen.castShadow = false;
  g.add(screen);
  // crest on top
  g.add(mesh(new THREE.SphereGeometry(0.018, 16, 12), gold(), [0, fy + 0.152, 0]));
  return g;
}

function scoopGeo(r: number, seed: number) {
  const geo = new THREE.SphereGeometry(r, 40, 28);
  const p = geo.attributes.position;
  const R = rng(seed);
  const ph = [R() * 6, R() * 6, R() * 6];
  const v = V3(0, 0, 0);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    let d = 1 + 0.05 * Math.sin(n.x * 7 + ph[0]) * Math.sin(n.y * 6 + ph[1]) + 0.03 * Math.sin(n.z * 9 + ph[2]);
    if (n.y < -0.05 && n.y > -0.55) d += 0.07 * Math.max(0, Math.sin(Math.atan2(n.x, n.z) * 9 + ph[0]));
    v.copy(n).multiplyScalar(r * d);
    if (v.y < -r * 0.42) v.y = -r * 0.42;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function dondurma() {
  const g = new THREE.Group();
  g.add(mesh(lathe(pts([[0, 0], [0.042, 0], [0.044, 0.006], [0.036, 0.045], [0.04, 0.05], [0.024, 0.05], [0, 0.03]]), 40), wood()));
  const waffle = ctex(256, 256, (gg, w, h) => {
    gg.fillStyle = '#D9A05B';
    gg.fillRect(0, 0, w, h);
    gg.strokeStyle = '#A7692E';
    gg.lineWidth = 6;
    for (let i = -8; i < 16; i++) {
      gg.beginPath();
      gg.moveTo(i * 32, 0);
      gg.lineTo(i * 32 + h, h);
      gg.moveTo(i * 32, h);
      gg.lineTo(i * 32 + h, 0);
      gg.stroke();
    }
  }, [3, 2]);
  g.add(mesh(lathe(pts([[0, 0], [0.006, 0.004], [0.046, 0.16], [0.051, 0.168], [0.047, 0.172], [0, 0.172]]), 48), std('#ffffff', { roughness: 0.7, map: waffle }), [0, 0.02, 0]));
  const top = 0.02 + 0.172;
  g.add(mesh(scoopGeo(0.05, 2), std('#FBF7EF', { roughness: 0.75 }), [0, top + 0.016, 0]));
  g.add(mesh(scoopGeo(0.043, 7), std('#CFE0A8', { roughness: 0.75 }), [0.006, top + 0.075, 0.003]));
  g.add(mesh(lathe(smooth([[0, 0], [0.02, 0.004], [0.012, 0.028], [0.006, 0.052], [0, 0.06]], 16), 24), std('#CFE0A8', { roughness: 0.75 }), [0.01, top + 0.105, 0.002], [0, 0, -0.18]));
  return g;
}

function iznikPlateCanvas() {
  return canvas(1024, 1024, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#F7FAFC';
    g.fillRect(0, 0, w, w);
    // rim: wave-and-rock band
    g.fillStyle = COBALT;
    g.beginPath();
    g.arc(c, c, c, 0, Math.PI * 2);
    g.arc(c, c, c * 0.8, 0, Math.PI * 2, true);
    g.fill();
    g.strokeStyle = '#ffffff';
    g.lineWidth = 10;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const x = c + Math.cos(a) * c * 0.9;
      const y = c + Math.sin(a) * c * 0.9;
      g.beginPath();
      g.arc(x, y, c * 0.05, a, a + Math.PI * 1.4);
      g.stroke();
    }
    g.strokeStyle = TURQ;
    g.lineWidth = 8;
    g.beginPath();
    g.arc(c, c, c * 0.78, 0, Math.PI * 2);
    g.stroke();
    // centre: tulips, carnations and saz leaves
    const pen = new Pen(w, 1);
    const P = (x: number) => (x / w) * 1000;
    pen.c.save();
    const leaf = (x: number, y: number, len: number, ang: number) => {
      pen.save();
      pen.translate(P(x), P(y));
      pen.rotate(ang);
      pen.shape(LEAF, (cc) => {
        cc.moveTo(0, 0);
        cc.quadraticCurveTo(P(len) * 0.3, -P(len) * 0.5, 0, -P(len));
        cc.quadraticCurveTo(-P(len) * 0.05, -P(len) * 0.5, 0, 0);
      });
      pen.restore();
    };
    leaf(c - 60, c + 230, 360, -0.55);
    leaf(c + 60, c + 230, 360, 0.55);
    tulip(pen, P(c), P(c + 250), P(470), RED);
    tulip(pen, P(c - 150), P(c + 210), P(330), COBALT);
    tulip(pen, P(c + 150), P(c + 210), P(330), TURQ);
    pen.c.restore();
    g.drawImage(pen.canvas, 0, 0);
    // carnations
    for (const [x, y] of [[c - 220, c - 40], [c + 220, c - 40]]) {
      g.fillStyle = RED;
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        g.arc(x + (k - 2) * 18, y - Math.abs(k - 2) * -6, 22, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = TURQ;
      g.fillRect(x - 40, y + 18, 80, 14);
    }
  });
}

function cini() {
  const g = new THREE.Group();
  g.add(leanStand(0.26, [0.3, -0.07]));
  const plate = new THREE.Group();
  plate.add(mesh(new THREE.CircleGeometry(0.15, 64), std('#ffffff', { roughness: 0.18, map: tex(iznikPlateCanvas()) }), [0, 0, 0.0065]));
  plate.add(mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.012, 64, 1, true), std(PORCELAIN, { roughness: 0.25 }), [0, 0, 0], [Math.PI / 2, 0, 0]));
  plate.add(mesh(new THREE.TorusGeometry(0.15, 0.007, 10, 64), std(PORCELAIN, { roughness: 0.2 }), [0, 0, 0.006]));
  plate.add(mesh(new THREE.CircleGeometry(0.15, 48), std(PORCELAIN, { roughness: 0.3 }), [0, 0, -0.006], [0, Math.PI, 0]));
  const tilt = 0.28;
  plate.rotation.x = -tilt;
  plate.position.set(0, 0.03 + 0.152 * Math.cos(tilt), 0.034 - 0.152 * Math.sin(tilt));
  g.add(plate);
  return g;
}

function mangala() {
  const g = new THREE.Group();
  g.add(leanStand(0.36, [0.17, -0.05]));
  const W = 0.34;
  const H = 0.12;
  const cw = 680;
  const ch = 240;
  const pits: [number, number][] = [];
  const board = canvas(cw, ch, (gg) => {
    gg.fillStyle = '#B07A45';
    gg.fillRect(0, 0, cw, ch);
    const r = rng(12);
    for (let i = 0; i < 60; i++) {
      gg.strokeStyle = r() > 0.5 ? 'rgba(90,50,20,0.16)' : 'rgba(255,220,170,0.12)';
      gg.lineWidth = 1 + r() * 3;
      const y = r() * ch;
      gg.beginPath();
      gg.moveTo(0, y);
      gg.bezierCurveTo(cw * 0.3, y + 6, cw * 0.6, y - 6, cw, y);
      gg.stroke();
    }
    const pit = (x: number, y: number, rx: number, ry: number) => {
      const grd = gg.createRadialGradient(x - rx * 0.2, y - ry * 0.3, 2, x, y, Math.max(rx, ry));
      grd.addColorStop(0, '#4A2A14');
      grd.addColorStop(1, '#7A4A26');
      gg.fillStyle = grd;
      gg.beginPath();
      gg.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      gg.fill();
    };
    pit(48, ch / 2, 32, 92);
    pit(cw - 48, ch / 2, 32, 92);
    for (let i = 0; i < 6; i++)
      for (const y of [64, ch - 64]) {
        const x = 120 + i * 88;
        pit(x, y, 34, 34);
        pits.push([x, y]);
      }
  });
  const faceMat = std('#ffffff', { roughness: 0.55, map: tex(board) });
  const side = std('#9C6A3A', { roughness: 0.55 });
  const brd = new THREE.Group();
  brd.add(mesh(new RoundedBoxGeometry(W, H, 0.026, 2, 0.008), [side, side, side, side, faceMat, side]));
  const colors = [RED, COBALT, TURQ, SAFFRON, '#F7F2E6'];
  const stones = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0085, 12, 8), std('#ffffff', { roughness: 0.25 }), pits.length * 4);
  const m4 = new THREE.Matrix4();
  const rr = rng(2);
  const col = new THREE.Color();
  let k = 0;
  for (const [px, py] of pits)
    for (let s = 0; s < 4; s++) {
      const x = (px / cw - 0.5) * W + (rr() - 0.5) * 0.02;
      const y = (0.5 - py / ch) * H + (rr() - 0.5) * 0.02;
      m4.compose(V3(x, y, 0.016), new THREE.Quaternion(), V3(1, 1, 0.7));
      stones.setMatrixAt(k, m4);
      stones.setColorAt(k, col.set(colors[Math.floor(rr() * colors.length)]));
      k++;
    }
  stones.castShadow = true;
  brd.add(stones);
  const tilt = 0.24;
  brd.rotation.x = -tilt;
  brd.position.set(0, 0.03 + (H / 2) * Math.cos(tilt), 0.034 - (H / 2) * Math.sin(tilt));
  g.add(brd);
  return g;
}

function bayrak() {
  const g = new THREE.Group();
  g.add(plinth(0.06, 0.022, woodDark()));
  g.children[0].position.x = -0.1;
  const pole = std('#F2F0EA', { roughness: 0.35 });
  g.add(rod(V3(-0.1, 0.02, 0), V3(-0.1, 0.5, 0), 0.0055, pole));
  g.add(mesh(new THREE.SphereGeometry(0.013, 16, 12), gold(), [-0.1, 0.51, 0]));
  const fw = 0.24;
  const fh = 0.16;
  const geo = new THREE.PlaneGeometry(fw, fh, 28, 8);
  geo.translate(fw / 2, 0, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const t = x / fw;
    p.setZ(i, 0.016 * Math.sin(x * 28 - 0.6) * t);
    p.setY(i, p.getY(i) - 0.012 * t * t);
  }
  geo.computeVertexNormals();
  const ft = ctex(600, 400, (gg) => {
    const pen = new Pen(600, 2 / 3);
    turkishFlag(pen, 0, 0, 1000);
    gg.drawImage(pen.canvas, 0, 0);
  });
  g.add(mesh(geo, std('#ffffff', { roughness: 0.75, map: ft, side: THREE.DoubleSide }), [-0.094, 0.5 - fh / 2 - 0.006, 0]));
  return g;
}

export const CULTURE_BUILDERS: Record<string, { build: () => THREE.Object3D; h: number }> = {
  cay: { build: cay, h: 0.34 },
  caydanlik: { build: caydanlik, h: 0.44 },
  simit: { build: simit, h: 0.38 },
  baglama: { build: baglama, h: 0.56 },
  'peri-bacasi': { build: periBacasi, h: 0.44 },
  balon: { build: balon, h: 0.5 },
  baklava: { build: baklava, h: 0.4 },
  nazar: { build: nazar, h: 0.46 },
  lale: { build: lale, h: 0.52 },
  kahve: { build: kahve, h: 0.32 },
  lokum: { build: lokum, h: 0.3 },
  galata: { build: galata, h: 0.56 },
  'kiz-kulesi': { build: kizKulesi, h: 0.44 },
  davul: { build: davul, h: 0.32 },
  ebru: { build: ebru, h: 0.52 },
  karagoz: { build: karagoz, h: 0.46 },
  dondurma: { build: dondurma, h: 0.44 },
  cini: { build: cini, h: 0.42 },
  mangala: { build: mangala, h: 0.34 },
  bayrak: { build: bayrak, h: 0.54 },
};

/** A neutral placeholder for an item that has neither a builder nor a model yet. */
export function placeholder() {
  const g = new THREE.Group();
  g.add(plinth(0.08, 0.03));
  g.add(mesh(new RoundedBoxGeometry(0.12, 0.12, 0.12, 3, 0.02), std(TURQ, { roughness: 0.4 }), [0, 0.1, 0]));
  return g;
}

export function iznikTileCanvas(px = 256) {
  const pen = new Pen(px, 1);
  iznikTile(pen, 0, 0, 1000, 1);
  return pen.canvas;
}
