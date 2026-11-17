import * as THREE from 'three';

/**
 * Little lives that keep every page moving between the story's beats: butterflies over a village or a garden,
 * a flock of birds crossing the sky now and then, fireflies on a summer night, specks of dust floating in a
 * sunny room, gulls over the sea. Nothing here takes part in the story; it only makes the pop-up feel alive.
 *
 * Which ones come is chosen from the page's `life` list, or from its `ambience` when it has none.
 */
export type LifeKind = 'butterflies' | 'birds' | 'fireflies' | 'motes' | 'gulls' | 'petals' | 'leaves';

export const LIFE_BY_AMBIENCE: Record<string, LifeKind[]> = {
  birds: ['butterflies', 'birds'],
  village: ['butterflies', 'birds'],
  market: ['birds', 'butterflies'],
  crickets: ['fireflies'],
  home: ['motes'],
  kitchen: ['motes'],
  school: ['motes'],
  hall: ['motes'],
  sea: ['gulls'],
};

/** The box the lives stay in (world units): the page floor from x0 to x1 and z0 (back) to z1 (front). */
export interface LifeBox {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
  /** How high the painted sky goes above the floor at the back. */
  sky: number;
}

interface Flyer {
  obj: THREE.Object3D;
  wings: THREE.Object3D[];
  update(t: number, dt: number): void;
}

const WING_COLORS = [
  ['#F2A23A', '#E0612B'],
  ['#5AB0E8', '#2F6DC4'],
  ['#F7D44A', '#E8A51F'],
  ['#F28CB1', '#D9487D'],
  ['#FFFFFF', '#C8D8F0'],
];

function wing(color: string, edge: string, w: number, h: number, flip: number) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(w * 0.4 * flip, h * 0.9, w * flip, h * 0.8, w * 0.95 * flip, h * 0.15);
  s.bezierCurveTo(w * 0.9 * flip, -h * 0.5, w * 0.35 * flip, -h * 0.6, 0, -h * 0.1);
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d')!;
  const grd = x.createRadialGradient(16, 16, 2, 16, 16, 18);
  grd.addColorStop(0, color);
  grd.addColorStop(1, edge);
  x.fillStyle = grd;
  x.fillRect(0, 0, 32, 32);
  const m = new THREE.MeshBasicMaterial({ color: '#ffffff', map: new THREE.CanvasTexture(c), side: THREE.DoubleSide });
  const pivot = new THREE.Group();
  pivot.add(new THREE.Mesh(g, m));
  return pivot;
}

export class Life {
  readonly group = new THREE.Group();
  private flyers: Flyer[] = [];
  private t = 0;
  private box: LifeBox | null = null;
  private kinds: LifeKind[] = [];
  private flockAt = 3;

  /** Clears the page's lives and brings the ones for this page. */
  set(kinds: LifeKind[], box: LifeBox) {
    this.clear();
    this.box = box;
    this.kinds = kinds;
    this.flockAt = this.t + 2.5 + Math.random() * 3;
    for (const k of kinds) {
      if (k === 'butterflies') for (let i = 0; i < 3; i++) this.butterfly(i);
      if (k === 'fireflies') for (let i = 0; i < 16; i++) this.firefly(i);
      if (k === 'motes') for (let i = 0; i < 22; i++) this.mote(i, '#FFF4D6', 0.004);
      if (k === 'petals') for (let i = 0; i < 14; i++) this.falling(i, ['#F7B7CB', '#FFFFFF', '#F28CB1'][i % 3], 0.012);
      if (k === 'leaves') for (let i = 0; i < 12; i++) this.falling(i, ['#E89A3A', '#C9542B', '#E8C33A'][i % 3], 0.014);
    }
  }

  clear() {
    for (const f of this.flyers) this.group.remove(f.obj);
    this.flyers = [];
  }

  get active() {
    return this.flyers.length > 0 || this.kinds.includes('birds') || this.kinds.includes('gulls');
  }

  private add(f: Flyer) {
    this.flyers.push(f);
    this.group.add(f.obj);
  }

  private butterfly(i: number) {
    const b = this.box!;
    const [c, e] = WING_COLORS[(i + Math.floor(Math.random() * 5)) % WING_COLORS.length];
    const obj = new THREE.Group();
    const L = wing(c, e, 0.04, 0.032, -1);
    const R = wing(c, e, 0.04, 0.032, 1);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.022, 3, 6), new THREE.MeshBasicMaterial({ color: '#3B2A22' }));
    body.rotation.x = Math.PI / 2;
    obj.add(L, R, body);
    const cx = THREE.MathUtils.lerp(b.x0, b.x1, 0.2 + Math.random() * 0.6);
    const cz = THREE.MathUtils.lerp(b.z0, b.z1, 0.25 + Math.random() * 0.5);
    const ph = Math.random() * 10;
    const sp = 0.35 + Math.random() * 0.25;
    const rx = (b.x1 - b.x0) * (0.22 + Math.random() * 0.12);
    const rz = (b.z1 - b.z0) * 0.22;
    const last = new THREE.Vector3();
    this.add({
      obj,
      wings: [L, R],
      update: (t) => {
        const a = t * sp + ph;
        const x = cx + Math.sin(a) * rx + Math.sin(a * 2.3) * rx * 0.25;
        const z = cz + Math.sin(a * 0.7 + 1) * rz;
        const y = b.y + 0.16 + Math.sin(a * 1.9) * 0.05 + Math.sin(a * 5.1) * 0.012;
        last.copy(obj.position);
        obj.position.set(x, y, z);
        const dx = x - last.x;
        const dz = z - last.z;
        if (Math.abs(dx) + Math.abs(dz) > 1e-5) obj.rotation.y = Math.atan2(dx, dz);
        const f = Math.sin(t * 22 + ph) * 1.1;
        L.rotation.z = -f;
        R.rotation.z = f;
      },
    });
  }

  private bird(dir: number, y: number, z: number, delay: number, gull: boolean) {
    const b = this.box!;
    const color = gull ? '#F7F7F2' : '#3A3F4A';
    const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    const s = gull ? 0.035 : 0.022;
    const obj = new THREE.Group();
    const mk = (flip: number) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, s * 0.25, 0, 0, -s * 0.2, s * 1.1 * flip, 0, -s * 0.1], 3));
      const p = new THREE.Group();
      p.add(new THREE.Mesh(g, m));
      return p;
    };
    const L = mk(-1);
    const R = mk(1);
    obj.add(L, R);
    if (gull) {
      const body = new THREE.Mesh(new THREE.SphereGeometry(s * 0.22, 8, 6).scale(1, 0.8, 2), m);
      obj.add(body);
    }
    const x0 = dir > 0 ? b.x0 - 0.1 : b.x1 + 0.1;
    const x1 = dir > 0 ? b.x1 + 0.1 : b.x0 - 0.1;
    const dur = gull ? 9 : 6 + Math.random() * 2;
    const start = this.t + delay;
    obj.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    obj.visible = false;
    const ph = Math.random() * 6;
    const f: Flyer = {
      obj,
      wings: [L, R],
      update: (t) => {
        const k = (t - start) / dur;
        obj.visible = k >= 0 && k <= 1;
        if (!obj.visible) {
          if (k > 1) this.flyers.splice(this.flyers.indexOf(f), 1), this.group.remove(obj);
          return;
        }
        obj.position.set(THREE.MathUtils.lerp(x0, x1, k), y + Math.sin(k * 6 + ph) * 0.02, z);
        const flap = gull ? (Math.sin(t * 4 + ph) > 0.4 ? Math.sin(t * 16) * 0.6 : 0.1) : Math.sin(t * 15 + ph) * 0.7;
        L.rotation.z = flap;
        R.rotation.z = -flap;
      },
    };
    this.add(f);
  }

  private flock() {
    const b = this.box!;
    const gull = this.kinds.includes('gulls');
    const dir = Math.random() < 0.5 ? 1 : -1;
    const n = gull ? 1 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 3);
    const y = b.y + b.sky * (0.62 + Math.random() * 0.25);
    const z = b.z0 + 0.03;
    for (let i = 0; i < n; i++) this.bird(dir, y + (i % 2 ? 0.025 : -0.01) * i * 0.6, z + i * 0.004, i * 0.28, gull);
  }

  private firefly(i: number) {
    const b = this.box!;
    const m = new THREE.MeshBasicMaterial({ color: '#E9FF8A', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const obj = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 6), m);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: '#C9F25A', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    obj.add(halo);
    const cx = THREE.MathUtils.lerp(b.x0, b.x1, Math.random());
    const cz = THREE.MathUtils.lerp(b.z0, b.z1, Math.random());
    const cy = b.y + 0.05 + Math.random() * 0.35;
    const ph = Math.random() * 10 + i;
    this.add({
      obj,
      wings: [],
      update: (t) => {
        obj.position.set(cx + Math.sin(t * 0.3 + ph) * 0.05, cy + Math.sin(t * 0.45 + ph * 2) * 0.03, cz + Math.cos(t * 0.25 + ph) * 0.04);
        const glow = Math.max(0, Math.sin(t * 1.6 + ph));
        m.opacity = 0.15 + glow * 0.85;
        (halo.material as THREE.MeshBasicMaterial).opacity = glow * 0.35;
      },
    });
  }

  private mote(i: number, color: string, r: number) {
    const b = this.box!;
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
    const obj = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 4), m);
    const cx = THREE.MathUtils.lerp(b.x0, b.x1, Math.random());
    const cz = THREE.MathUtils.lerp(b.z0, b.z1 - 0.15, Math.random());
    const ph = Math.random() * 20 + i;
    const rise = 0.008 + Math.random() * 0.01;
    this.add({
      obj,
      wings: [],
      update: (t) => {
        const y = ((t * rise + ph * 0.05) % 0.5) + b.y + 0.03;
        obj.position.set(cx + Math.sin(t * 0.2 + ph) * 0.03, y, cz + Math.cos(t * 0.17 + ph) * 0.02);
        m.opacity = (0.25 + 0.3 * Math.max(0, Math.sin(t * 0.8 + ph))) * Math.min(1, (0.5 - (y - b.y - 0.03)) * 6);
      },
    });
  }

  private falling(i: number, color: string, s: number) {
    const b = this.box!;
    const g = new THREE.PlaneGeometry(s, s * 0.7);
    const obj = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    const cx = THREE.MathUtils.lerp(b.x0, b.x1, Math.random());
    const cz = THREE.MathUtils.lerp(b.z0, b.z1, Math.random());
    const ph = Math.random() * 20 + i;
    const fall = 0.03 + Math.random() * 0.02;
    const top = b.sky * 0.7;
    this.add({
      obj,
      wings: [],
      update: (t) => {
        const k = ((t * fall + ph * 0.07) % top) / top;
        obj.position.set(cx + Math.sin(t * 1.3 + ph) * 0.04, b.y + top * (1 - k), cz + Math.cos(t * 0.9 + ph) * 0.02);
        obj.rotation.set(t * 2 + ph, t * 1.3, t * 0.7);
      },
    });
  }

  /** Moves them on; true while anything is alive (so the scene keeps rendering). */
  update(dt: number): boolean {
    if (!this.box) return false;
    this.t += dt;
    if ((this.kinds.includes('birds') || this.kinds.includes('gulls')) && this.t > this.flockAt) {
      this.flock();
      this.flockAt = this.t + 7 + Math.random() * 7;
    }
    for (const f of [...this.flyers]) f.update(this.t, dt);
    return this.active;
  }
}
