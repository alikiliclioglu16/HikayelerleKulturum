import * as THREE from 'three';
import { blendKey, cloneState, mergeKey, smooth, type Key, type State } from './performer';

let haloTex: THREE.Texture | null = null;
/**
 * A warm golden glow with soft rays, shared by every magic thing. It is drawn with normal blending, so it shows
 * on a light page as well as on a night sky.
 */
function halo() {
  if (!haloTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,236,150,0.95)');
    grd.addColorStop(0.3, 'rgba(255,200,70,0.78)');
    grd.addColorStop(0.62, 'rgba(255,165,45,0.3)');
    grd.addColorStop(1, 'rgba(255,150,40,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    g.translate(128, 128);
    for (let i = 0; i < 12; i++) {
      g.rotate(Math.PI / 6);
      const ray = g.createLinearGradient(0, 0, 0, 124);
      ray.addColorStop(0, 'rgba(255,196,70,0.75)');
      ray.addColorStop(1, 'rgba(255,190,70,0)');
      g.fillStyle = ray;
      g.beginPath();
      g.moveTo(-7, 0);
      g.lineTo(7, 0);
      g.lineTo(1.5, 124);
      g.lineTo(-1.5, 124);
      g.fill();
    }
    haloTex = new THREE.CanvasTexture(c);
    haloTex.colorSpace = THREE.SRGBColorSpace;
  }
  return haloTex;
}

let starTex: THREE.Texture | null = null;
/** A four-pointed golden star with a white heart, for the stars that circle a magic thing. */
function star() {
  if (!starTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const glow = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    glow.addColorStop(0, 'rgba(255,240,180,0.9)');
    glow.addColorStop(0.4, 'rgba(255,200,80,0.35)');
    glow.addColorStop(1, 'rgba(255,190,70,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#FFC93C';
    g.strokeStyle = 'rgba(190,110,10,0.9)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(32, 4);
    g.quadraticCurveTo(36, 28, 60, 32);
    g.quadraticCurveTo(36, 36, 32, 60);
    g.quadraticCurveTo(28, 36, 4, 32);
    g.quadraticCurveTo(28, 28, 32, 4);
    g.fill();
    g.stroke();
    g.fillStyle = '#FFFBEA';
    g.beginPath();
    g.arc(32, 32, 5, 0, Math.PI * 2);
    g.fill();
    starTex = new THREE.CanvasTexture(c);
    starTex.colorSpace = THREE.SRGBColorSpace;
  }
  return starTex;
}

const STARS = 4;
const tmp = new THREE.Vector3();
const eye = new THREE.Vector3();

/**
 * A magic thing on the page that takes part in the story like a character: the sleeping moon in the window,
 * the smiling sun that rises, the little pot that is "born", the cloud that brings rain. Beats address it by the
 * model's `id` (see book.json → models) and use the thing acts in acts.ts (appear, vanish, rise, sink, ring,
 * shine, grow, rain, spin). Its state is the root offset, turn, tilt, `show` (0 gone … 1 there) and `glow`.
 * A magic thing (`magic` in book.json) also has a golden halo behind it and little golden stars circling it,
 * twinkles now and then and leaves a trail of sparkles when it moves, so the eye finds it at once.
 */
export class PropActor {
  /** Put between the model's place on the page and the model, so the act moves it from where it stands. */
  readonly group = new THREE.Group();
  private sprite: THREE.Sprite | null = null;
  /** Little golden stars circling the thing. */
  private stars: THREE.Points | null = null;
  private start!: State;
  private keys: Key[] = [];
  private last = 0;
  private lastPos = new THREE.Vector3();
  private trailT = 0;
  private nextTwinkle = 2;
  private wasShown = true;
  private phase = Math.random() * 6;
  calm = false;
  /** Sparkles (world centre, size of the box around it, strength). */
  onBurst: ((at: THREE.Vector3, half: THREE.Vector3, strength: number) => void) | null = null;
  /** Rain under the thing for so many seconds (a cloud). */
  onRain: ((at: THREE.Vector3, width: number, seconds: number) => void) | null = null;
  /** Called when the thing disappears (so a character taking it can make it fly over). */
  onGone: ((at: THREE.Vector3) => void) | null = null;
  /** Height of the model (world units), so effects fit it. */
  height = 0.1;

  constructor(readonly magic = false) {
    if (!magic) return;
    const mat = new THREE.SpriteMaterial({ map: halo(), transparent: true, depthWrite: false, opacity: 0 });
    const sprite = new THREE.Sprite(mat);
    // the glow stands a little behind the thing as seen from the camera, so it lights up around it, not over it
    sprite.onBeforeRender = (_r, _s, cam) => {
      const parent = sprite.parent;
      if (!parent) return;
      tmp.set(0, this.height * 0.5, 0);
      parent.localToWorld(tmp);
      eye.setFromMatrixPosition(cam.matrixWorld);
      tmp.addScaledVector(eye.sub(tmp).normalize(), -this.height * 0.45 * this.group.scale.y);
      sprite.position.copy(parent.worldToLocal(tmp));
      sprite.updateMatrixWorld();
    };
    this.sprite = sprite;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STARS * 3), 3));
    this.stars = new THREE.Points(
      g,
      new THREE.PointsMaterial({ map: star(), size: 0.03, transparent: true, depthWrite: false, opacity: 0.95, sizeAttenuation: true }),
    );
    this.stars.frustumCulled = false;
    this.stars.renderOrder = 3;
  }

  /**
   * Called when the model has loaded: the glow and the stars are sized to it and put in `holder` (the group the
   * model floats or bobs in), so they stay with it.
   */
  fit(height: number, holder: THREE.Object3D = this.group) {
    this.height = height;
    if (this.sprite && this.stars) {
      holder.add(this.sprite, this.stars);
      // (three.js sizes points against half the screen height, not the view: a factor of 8 gives stars about a
      // third as tall as the thing in the reader's close shot)
      (this.stars.material as THREE.PointsMaterial).size = THREE.MathUtils.clamp(height * 0.22, 0.012, 0.045) * 8;
      this.orbit(0);
    }
  }

  /** The stars go round the thing on a tilted ring, bobbing up and down. */
  private orbit(t: number) {
    if (!this.stars) return;
    const pos = this.stars.geometry.attributes.position as THREE.BufferAttribute;
    const h = this.height;
    const r = h * 0.78;
    for (let i = 0; i < STARS; i++) {
      const a = t * 1.1 + (i / STARS) * Math.PI * 2 + this.phase;
      pos.setXYZ(i, Math.cos(a) * r, h * (0.5 + 0.28 * Math.sin(a * 2 + i)), Math.sin(a) * r * 0.55);
    }
    pos.needsUpdate = true;
  }

  reset(start: State, _base?: THREE.Vector3) {
    this.start = cloneState(start);
    this.keys = [];
    this.last = 0;
    this.nextTwinkle = 1.5 + Math.random() * 1.5;
    this.wasShown = (start.root.show ?? 1) > 0.5;
    this.apply(this.start, 0);
  }

  add(keys: Key[]) {
    this.keys.push(...keys);
    this.keys.sort((a, b) => a.t - b.t);
  }

  endState(): State {
    const s = cloneState(this.start);
    for (const k of this.keys) mergeKey(s, k);
    return s;
  }

  private centre() {
    const at = this.group.getWorldPosition(new THREE.Vector3());
    at.y += this.height * 0.5 * this.group.scale.y;
    return at;
  }

  update(t: number, dt: number) {
    const s = cloneState(this.start);
    for (const k of this.keys) {
      if (t < k.t) break;
      if (this.calm && k.minor) continue;
      const f = smooth((t - k.t) / Math.max(0.001, this.calm ? Math.min(k.dur, 0.35) : k.dur));
      blendKey(s, k, f);
      const starts = dt > 0 && this.last < k.t && t >= k.t;
      if (starts && k.burst && !this.calm && this.onBurst) {
        const h = this.height;
        this.onBurst(this.centre(), new THREE.Vector3(h * 0.55, h * 0.55, h * 0.3), k.burst);
      }
      if (starts && k.rain && !this.calm && this.onRain) this.onRain(this.centre(), this.height * 1.4, k.rain);
    }
    this.last = t;
    this.apply(s, dt);
  }

  private apply(s: State, dt: number) {
    const r = s.root;
    const show = Math.max(0, Math.min(1.5, r.show ?? 1));
    this.group.position.set(r.x, r.y, r.z);
    this.group.rotation.set(0, THREE.MathUtils.degToRad(r.rotY), THREE.MathUtils.degToRad(r.tilt ?? 0));
    this.group.scale.setScalar(Math.max(0.001, show));
    this.group.visible = show > 0.01;
    const shown = show > 0.5;
    if (this.wasShown && !shown && dt > 0) this.onGone?.(this.centre());
    this.wasShown = shown;
    if (!this.sprite) return;
    const glow = this.calm ? Math.min(0.45, r.glow ?? 0.45) : (r.glow ?? 0.45);
    const mat = this.sprite.material as THREE.SpriteMaterial;
    // a soft, slowly breathing glow that stays while it is there, flaring up when it acts
    const pulse = dt > 0 && !this.calm ? 0.86 + 0.14 * Math.sin(this.last * 2.4 + this.phase) : 1;
    mat.opacity = Math.min(1, (0.16 + glow * 0.78) * pulse);
    const sz = this.height * (2.3 + 1.2 * glow);
    this.sprite.scale.set(sz, sz, 1);
    if (dt > 0 && !this.calm) this.orbit(this.last);
    // the stars shine brightest while the thing acts, and stay softer while it just stands there
    if (this.stars) (this.stars.material as THREE.PointsMaterial).opacity = Math.min(1, 0.35 + glow * 0.6);
    if (dt <= 0 || this.calm || !shown || !this.onBurst) return;
    // a trail of sparkles while it moves, and a little twinkle now and then while it is there
    const c = this.centre();
    const moved = c.distanceTo(this.lastPos);
    this.lastPos.copy(c);
    this.trailT -= dt;
    if (moved > 0.002 && moved < 0.2 && this.trailT <= 0) {
      this.trailT = 0.05;
      this.onBurst(c, new THREE.Vector3(this.height * 0.3, this.height * 0.3, 0.02), 0.25);
    }
    if (this.last > this.nextTwinkle) {
      this.nextTwinkle = this.last + 2.4 + Math.random() * 2;
      this.onBurst(c, new THREE.Vector3(this.height * 0.6, this.height * 0.5, 0.03), 0.3);
    }
  }
}
