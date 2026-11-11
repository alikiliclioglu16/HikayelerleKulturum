import * as THREE from 'three';

/**
 * The little shows that go with the story: paper confetti thrown up at a cheer, hearts rising from a hug, music
 * notes from a dance or a drum, steam over hot food. Confetti are tumbling paper bits (one instanced mesh); the
 * rest are small pictures that always face the reader (one point cloud with a four-picture sheet).
 */

const CONFETTI = ['#E3262E', '#F2C230', '#2F6DC4', '#3E9A4F', '#F28CB1', '#FFFFFF', '#F58A2B', '#7B4FA0'];
const HEARTS = ['#E8384F', '#F2668B', '#FF8FA3'];
const NOTES = ['#2F5FA8', '#7B4FA0', '#D9482B', '#1F8A70'];

/** Pictures on the sheet: 0 heart, 1 note, 2 puff of steam, 3 star. */
function sheet() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  // heart
  g.save();
  g.translate(64, 64);
  g.beginPath();
  g.moveTo(0, 38);
  g.bezierCurveTo(-58, -4, -34, -52, 0, -22);
  g.bezierCurveTo(34, -52, 58, -4, 0, 38);
  g.fill();
  g.restore();
  // note
  g.save();
  g.translate(192, 64);
  g.beginPath();
  g.ellipse(-12, 28, 17, 12, -0.4, 0, Math.PI * 2);
  g.fill();
  g.fillRect(0, -40, 7, 68);
  g.beginPath();
  g.moveTo(7, -40);
  g.quadraticCurveTo(38, -30, 30, 2);
  g.quadraticCurveTo(28, -14, 7, -18);
  g.fill();
  g.restore();
  // puff
  const grd = g.createRadialGradient(64, 192, 0, 64, 192, 56);
  grd.addColorStop(0, 'rgba(255,255,255,0.85)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.4)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 128, 128, 128);
  // star
  g.fillStyle = '#fff';
  g.save();
  g.translate(192, 192);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 22 : 52;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.fill();
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Bit {
  p: THREE.Vector3;
  v: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  life: number;
  max: number;
  ph: number;
}

export class Party {
  readonly group = new THREE.Group();
  private paper: THREE.InstancedMesh;
  private bits: Bit[] = [];
  private nextBit = 0;
  private points: THREE.Points;
  private n: number;
  private pos: Float32Array;
  private col: Float32Array;
  private aux: Float32Array; // size, picture, alpha
  private vel: Float32Array;
  private life: Float32Array;
  private max: Float32Array;
  private kind: Uint8Array;
  private next = 0;
  private steamers: { at: THREE.Vector3; width: number; on: () => boolean; acc: number }[] = [];
  private later: { at: number; run: () => void }[] = [];
  private clock = 0;
  private live = 0;
  /** The floor of the page: confetti come to rest there. */
  floor = 0;

  constructor(paperCount = 260, count = 160) {
    const geo = new THREE.PlaneGeometry(0.02, 0.012);
    this.paper = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), paperCount);
    this.paper.frustumCulled = false;
    this.paper.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const c = new THREE.Color();
    for (let i = 0; i < paperCount; i++) {
      this.paper.setMatrixAt(i, zero);
      this.paper.setColorAt(i, c.set(CONFETTI[i % CONFETTI.length]));
      this.bits.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3(), life: 0, max: 1, ph: Math.random() * 6 });
    }
    this.paper.visible = false;
    this.n = count;
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.aux = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.max = new Float32Array(count);
    this.kind = new Uint8Array(count);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    pg.setAttribute('aux', new THREE.BufferAttribute(this.aux, 3));
    this.points = new THREE.Points(
      pg,
      new THREE.ShaderMaterial({
        uniforms: { map: { value: sheet() }, scale: { value: 600 } },
        vertexShader: `
          attribute vec3 color; attribute vec3 aux;
          varying vec3 vColor; varying vec2 vCell; varying float vAlpha;
          uniform float scale;
          void main() {
            vColor = color; vAlpha = aux.z;
            vCell = vec2(mod(aux.y, 2.0), floor(aux.y / 2.0));
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aux.x * scale / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform sampler2D map;
          varying vec3 vColor; varying vec2 vCell; varying float vAlpha;
          void main() {
            vec2 uv = (vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y) + vec2(vCell.x, 1.0 - vCell.y)) * 0.5;
            vec4 t = texture2D(map, uv);
            if (t.a * vAlpha < 0.02) discard;
            gl_FragColor = vec4(vColor, t.a * vAlpha);
          }`,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.points.frustumCulled = false;
    this.points.renderOrder = 9;
    this.group.add(this.paper, this.points);
  }

  setScale(px: number) {
    (this.points.material as THREE.ShaderMaterial).uniforms.scale.value = px;
  }

  /** Do something in `delay` seconds of the party's own clock (it stops when the page is paused). */
  after(delay: number, run: () => void) {
    if (delay <= 0.01) run();
    else this.later.push({ at: this.clock + delay, run });
  }

  /** Paper confetti thrown up from a point; they flutter down around it. */
  confetti(at: THREE.Vector3, n = 36, power = 1) {
    for (let k = 0; k < n; k++) {
      const b = this.bits[this.nextBit];
      this.nextBit = (this.nextBit + 1) % this.bits.length;
      const a = Math.random() * Math.PI * 2;
      const out = (0.12 + Math.random() * 0.3) * power;
      b.p.copy(at);
      b.v.set(Math.cos(a) * out, (0.5 + Math.random() * 0.55) * power, Math.sin(a) * out * 0.7);
      b.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      b.spin.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16);
      b.max = b.life = 2.6 + Math.random() * 1.2;
    }
    this.paper.visible = true;
  }

  private emit(kind: number, at: THREE.Vector3, spread: number, size: number, color: string, life: number, up: number) {
    const i = this.next;
    this.next = (this.next + 1) % this.n;
    this.pos[i * 3] = at.x + (Math.random() - 0.5) * spread;
    this.pos[i * 3 + 1] = at.y + (Math.random() - 0.5) * spread * 0.3;
    this.pos[i * 3 + 2] = at.z + (Math.random() - 0.5) * spread * 0.5;
    this.vel[i * 3] = (Math.random() - 0.5) * 0.05;
    this.vel[i * 3 + 1] = up * (0.8 + Math.random() * 0.4);
    this.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    const c = new THREE.Color(color);
    this.col[i * 3] = c.r;
    this.col[i * 3 + 1] = c.g;
    this.col[i * 3 + 2] = c.b;
    this.aux[i * 3] = size * (0.8 + Math.random() * 0.4);
    this.aux[i * 3 + 1] = kind;
    this.aux[i * 3 + 2] = 0;
    this.kind[i] = kind;
    this.max[i] = this.life[i] = life * (0.85 + Math.random() * 0.3);
  }

  /** Hearts rising one after another. */
  hearts(at: THREE.Vector3, n = 5) {
    for (let k = 0; k < n; k++) this.after(k * 0.16, () => this.emit(0, at, 0.1, 0.05, HEARTS[k % HEARTS.length], 1.5, 0.13));
  }

  /** Music notes floating up for `seconds`. */
  notes(at: THREE.Vector3, seconds = 3) {
    const n = Math.max(3, Math.round(seconds / 0.4));
    for (let k = 0; k < n; k++) this.after(k * 0.4, () => this.emit(1, at, 0.16, 0.052, NOTES[k % NOTES.length], 1.6, 0.12));
  }

  /** A few stars popping out (a small "well done"). */
  stars(at: THREE.Vector3, n = 6) {
    for (let k = 0; k < n; k++) this.emit(3, at, 0.14, 0.04, k % 2 ? '#FFD34D' : '#FFF2B0', 1.0, 0.16);
  }

  /** Steam rising from a place for as long as `on()` is true (until `clear`). */
  steam(at: THREE.Vector3, width: number, on: () => boolean = () => true) {
    this.steamers.push({ at, width, on, acc: Math.random() });
  }

  /** A new page: the steam sources and everything still waiting go. */
  clear() {
    this.steamers = [];
    this.later = [];
  }

  /** Returns true while something is on the move. */
  update(dt: number): boolean {
    if (dt <= 0) return this.live > 0 || this.steamers.length > 0;
    this.clock += dt;
    if (this.later.length) {
      const due = this.later.filter((l) => l.at <= this.clock);
      this.later = this.later.filter((l) => l.at > this.clock);
      due.forEach((l) => l.run());
    }
    for (const s of this.steamers) {
      if (!s.on()) continue;
      s.acc += dt * 5;
      while (s.acc >= 1) {
        s.acc -= 1;
        this.emit(2, s.at, s.width, 0.06 + s.width * 0.25, '#FFFFFF', 1.7, 0.075);
      }
    }
    let live = 0;
    // paper
    if (this.paper.visible) {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const one = new THREE.Vector3(1, 1, 1);
      let any = false;
      this.bits.forEach((b, i) => {
        if (b.life <= 0) return;
        b.life -= dt;
        const resting = b.p.y <= this.floor + 0.004 && b.v.y <= 0;
        if (!resting) {
          b.v.y -= 1.5 * dt;
          // paper: the air slows it down and it flutters from side to side
          const drag = Math.exp(-dt * 2.6);
          b.v.x *= drag;
          b.v.z *= drag;
          if (b.v.y < -0.16) b.v.y = -0.16;
          b.p.addScaledVector(b.v, dt);
          b.p.x += Math.sin(b.life * 6 + b.ph) * 0.05 * dt;
          b.rot.x += b.spin.x * dt;
          b.rot.y += b.spin.y * dt;
          b.rot.z += b.spin.z * dt;
          if (b.p.y < this.floor + 0.004) {
            b.p.y = this.floor + 0.004;
            b.rot.set(-Math.PI / 2, 0, b.rot.z);
          }
        }
        const k = b.life <= 0 ? 0 : Math.min(1, b.life / 0.5);
        m.compose(b.p, q.setFromEuler(b.rot), one.setScalar(k));
        this.paper.setMatrixAt(i, m);
        any = true;
        live++;
      });
      this.paper.instanceMatrix.needsUpdate = true;
      if (!any) this.paper.visible = false;
    }
    // pictures
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const age = 1 - Math.max(0, this.life[i]) / this.max[i];
      this.pos[i * 3] += (this.vel[i * 3] + Math.sin(this.clock * 3 + i) * 0.02) * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const steam = this.kind[i] === 2;
      if (steam) this.aux[i * 3] += dt * 0.03;
      const fadeIn = Math.min(1, age / 0.15);
      const fadeOut = Math.min(1, (1 - age) / 0.4);
      this.aux[i * 3 + 2] = this.life[i] <= 0 ? 0 : fadeIn * fadeOut * (steam ? 0.7 : 1);
      live++;
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aux.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    this.live = live;
    return live > 0 || this.steamers.length > 0 || this.later.length > 0;
  }
}
