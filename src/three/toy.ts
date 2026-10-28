import * as THREE from 'three';
import { loadGltf } from '../home3d/actors';
import { CHARACTERS, Performer, PUT_DOWN, RELAXED, blendKey, cloneState, mergeKey, smooth, type CharacterDef, type Key, type RootState, type State } from './performer';
import { runAct, type Beat, type ActResult } from './acts';

/**
 * A story character played like a toy on a pop-up page: the model itself never bends, it hops, turns, leans,
 * squashes and stretches as a whole, like a figure moved by a child's hand. This is how the tale characters of
 * Nasreddin Hoca and Keloğlan act (book.json → "toyCast": true). Things it holds float in front of it, and a
 * thing handed from one character to another flies over in a little arc of sparkles (see BookScene).
 * The state is the same as a Performer's; the root also uses lean (forward, degrees), tilt (sideways),
 * sq (squash: 1 normal) and y (a hop).
 */

const D2R = Math.PI / 180;

export class ToyPerformer {
  readonly root = new THREE.Group();
  /** Pivots at the feet: lean, tilt, squash and stretch. */
  private body = new THREE.Group();
  readonly hit: THREE.Mesh;
  private start!: State;
  private keys: Key[] = [];
  current!: State;
  private base = new THREE.Vector3();
  private lookYaw = 0;
  private held: { name: string; obj: THREE.Object3D } | null = null;
  private heldName: string | null = null;
  private dropped: THREE.Object3D[] = [];
  private phase = Math.random() * 6;
  calm = false;
  makeProp: ((name: string) => THREE.Object3D | null) | null = null;
  surfaceAt: (p: THREE.Vector3) => THREE.Vector3 | null = () => null;
  targets: (name: string) => THREE.Vector3 | null = () => null;
  /** Something leaves the hands (given away, not put down): where it was. */
  onRelease: ((at: THREE.Vector3, obj: THREE.Object3D) => void) | null = null;
  /** Something comes into the hands. */
  onTake: ((obj: THREE.Object3D) => void) | null = null;

  private constructor(
    readonly id: string,
    readonly def: CharacterDef,
    model: THREE.Object3D,
    private height: number,
  ) {
    this.root.add(this.body);
    this.body.add(model);
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(height * 0.5, height, height * 0.4), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.position.y = height / 2;
    this.body.add(this.hit);
  }

  /**
   * A tale character comes from a still model (public/models/masal); a family member is the rigged model put
   * once in its relaxed pose (arms down) and then moved only as a whole.
   */
  static async load(id: string) {
    const def = CHARACTERS[id];
    const h = def.height;
    if (def.src.includes('/models/aile/')) {
      const p = await Performer.load(id);
      p.reset({ pose: { ...RELAXED }, root: { x: 0, y: 0, z: 0, rotY: 0, lie: 0 }, eyes: 1, look: null }, new THREE.Vector3());
      return new ToyPerformer(id, def, p.root, h);
    }
    const gltf = await loadGltf(def.src);
    const model = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(model);
    const s = h / (box.max.y - box.min.y);
    model.scale.setScalar(s);
    model.position.set(-((box.min.x + box.max.x) / 2) * s, -box.min.y * s, -((box.min.z + box.max.z) / 2) * s);
    const wrap = new THREE.Group();
    wrap.add(model);
    return new ToyPerformer(id, def, wrap, h);
  }

  reset(start: State, base: THREE.Vector3) {
    for (const o of this.dropped) o.parent?.remove(o);
    this.dropped = [];
    this.start = cloneState(start);
    Object.assign(this.start.root, { lean: 0, tilt: 0, sq: 1, spin: 0, ...start.root });
    this.base.copy(base);
    this.keys = [];
    this.lookYaw = 0;
    this.current = cloneState(this.start);
    this.apply(this.current, 0, true, 0);
  }

  /** Leaving the page: things it put down go too. */
  leave() {
    for (const o of this.dropped) o.parent?.remove(o);
    this.dropped = [];
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

  /** Toy acts (TOY_ACTS); looking acts are the same as for the bending characters. */
  run(s: State, b: Beat, t: number): ActResult {
    const a = TOY_ACTS[b.do];
    if (a) return a(s, b, t, this.height);
    if (b.do === 'lookAt' || b.do === 'lookAround') return runAct(s, b, t);
    return TOY_ACTS.hop(s, b, t, this.height);
  }

  update(t: number, dt: number) {
    const s = cloneState(this.start);
    for (const k of this.keys) {
      if (t < k.t) break;
      if (this.calm && k.minor) continue;
      const f = smooth((t - k.t) / Math.max(0.001, this.calm ? Math.min(k.dur, 0.35) : k.dur));
      blendKey(s, k, f);
    }
    this.current = s;
    this.apply(s, dt, false, t);
  }

  private apply(s: State, dt: number, snap: boolean, t: number) {
    const r = s.root as RootState;
    this.root.position.set(this.base.x + r.x, this.base.y + r.y, this.base.z + r.z);
    // turning towards what it looks at (the whole figure, a little)
    let want = 0;
    const target = s.look ? this.targets(s.look) : null;
    if (target) {
      const d = target.clone().sub(this.root.position);
      let yaw = Math.atan2(d.x, d.z) - r.rotY * D2R;
      yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      want = THREE.MathUtils.clamp(yaw, -0.6, 0.6);
    }
    const k = snap || this.calm ? 1 : 1 - Math.exp(-dt * 4);
    this.lookYaw += (want - this.lookYaw) * k;
    this.root.rotation.set(0, (r.rotY + (r.spin ?? 0)) * D2R + this.lookYaw, 0);
    this.body.rotation.set((r.lean ?? 0) * D2R, 0, (r.tilt ?? 0) * D2R, 'XYZ');
    // squash and stretch keep the volume; a soft breath while standing (not in calm mode, not while paused)
    const breath = this.calm || dt <= 0 ? 0 : Math.sin(t * 2.1 + this.phase) * 0.008;
    const sq = (r.sq ?? 1) + breath;
    const side = 1 / Math.sqrt(Math.max(0.3, sq));
    this.body.scale.set(side, sq, side);
    this.setHeld(s.hold ?? null);
  }

  /** Two-handed things float in front of the chest, small ones beside the right hand. */
  private setHeld(name: string | null) {
    if (this.heldName === name) return;
    this.heldName = name;
    const H = this.height;
    if (this.held && name === PUT_DOWN) {
      const o = this.held.obj;
      this.held = null;
      const host = this.root.parent;
      if (host) {
        host.attach(o);
        const p = o.getWorldPosition(new THREE.Vector3());
        const onto = this.surfaceAt(p);
        if (onto) o.position.set(onto.x, onto.y + 0.004, onto.z);
        else o.position.y = this.base.y + 0.004;
        o.quaternion.copy(this.root.quaternion);
        o.scale.setScalar(1);
        this.dropped.push(o);
      } else o.parent?.remove(o);
      return;
    }
    if (this.held) {
      const o = this.held.obj;
      this.onRelease?.(o.getWorldPosition(new THREE.Vector3()), o);
      o.parent?.remove(o);
      this.held = null;
    }
    if (name === PUT_DOWN || !name || !this.makeProp) return;
    const obj = this.makeProp(name);
    if (!obj) return;
    const small = obj.userData.hand === 'R';
    obj.position.set(small ? -0.24 * H : 0, H * (small ? 0.4 : (obj.userData.atHeight ?? 0.45)), H * (small ? 0.14 : Math.max(0.22, obj.userData.ahead ?? 0.22)));
    this.body.add(obj);
    this.held = { name, obj };
    this.onTake?.(obj);
  }

  get heldWord() {
    return this.held ? ((this.held.obj.userData.word as string | undefined) ?? null) : null;
  }
  get heldObject() {
    return this.held?.obj ?? null;
  }

  headPosition() {
    this.root.updateMatrixWorld(true);
    return this.body.localToWorld(new THREE.Vector3(0, this.height * 0.86, 0.02 * this.height));
  }

  get size() {
    return this.height;
  }
}

/* ---------------- toy acts ---------------- */

type ToyAct = (s: State, b: Beat, t: number, H: number) => ActResult;
const key = (t: number, dur: number, k: Partial<Key>): Key => ({ t, dur, ...k });

/** One hop on the spot (or to `to`): crouch, spring up stretched, land squashed, settle. */
function hopKeys(s: State, t: number, height: number, to?: Partial<RootState>, big = false): Key[] {
  const y = s.root.y;
  const up = big ? 1.12 : 1.07;
  return [
    key(t, 0.1, { root: { sq: 0.86 } }),
    key(t + 0.1, 0.17, { root: { y: y + height, sq: up, ...(to ? halfway(s, to) : {}) } }),
    key(t + 0.27, 0.15, { root: { y, sq: 0.9, ...(to ?? {}) } }),
    key(t + 0.42, 0.14, { root: { sq: 1 } }),
  ];
}
function halfway(s: State, to: Partial<RootState>): Partial<RootState> {
  const o: Partial<RootState> = {};
  if (to.x !== undefined) o.x = (s.root.x + to.x) / 2;
  if (to.z !== undefined) o.z = (s.root.z + to.z) / 2;
  return o;
}

const upright = { lean: 0, tilt: 0, sq: 1 };

/** An angle (degrees) that turns the short way from `from`. */
function near(from: number, to: number) {
  return from + ((((to - from) % 360) + 540) % 360) - 180;
}

export const TOY_ACTS: Record<string, ToyAct> = {
  /** A happy little hop. */
  hop: (s, b, t, H) => ({ keys: [...hopKeys(s, t, 0.08 * H), key(t + 0.3, 0.3, { look: b.look ?? s.look })], dur: 0.6 }),

  /** Hops along to a place (`to`), facing where it goes, then turns to `face`. */
  walkTo: (s, b, t, H) => {
    const to = b.to ?? [s.root.x, s.root.y, s.root.z];
    const dx = to[0] - s.root.x;
    const dz = to[2] - s.root.z;
    const dist = Math.hypot(dx, dz);
    const dir = near(s.root.rotY, (Math.atan2(dx, dz) * 180) / Math.PI);
    const n = Math.max(2, Math.round(dist / 0.065));
    const keys: Key[] = [key(t, 0.25, { root: { rotY: dir, ...upright }, look: null })];
    let at = t + 0.2;
    let cur: State = { ...s, root: { ...s.root } };
    for (let i = 1; i <= n; i++) {
      const p = { x: s.root.x + (dx * i) / n, z: s.root.z + (dz * i) / n };
      const hop = hopKeys(cur, at, 0.055 * H, p).map((k, j) => (j === 1 ? { ...k, minor: true } : k));
      keys.push(...hop);
      cur = { ...cur, root: { ...cur.root, ...p } };
      at += 0.34;
    }
    keys.push(key(at + 0.1, 0.35, { root: { x: to[0], z: to[2], rotY: b.face !== undefined ? near(dir, b.face) : dir, sq: 1 }, look: b.look ?? s.look }));
    return { keys, dur: at + 0.45 - t };
  },

  /** Talks: leans towards the listener and bobs as if speaking, a small step forward and back. */
  talk: (_s, b, t) => {
    const len = Math.max(1.6, b.len ?? 2.4);
    const keys: Key[] = [key(t, 0.35, { root: { lean: 6 }, look: b.look ?? b.target ?? 'reader' })];
    for (let i = 0; i < Math.floor((len - 0.8) / 0.36); i++) {
      keys.push(key(t + 0.35 + i * 0.36, 0.16, { root: { sq: 1.035, tilt: i % 2 ? 2.5 : -2.5 }, minor: true }));
      keys.push(key(t + 0.53 + i * 0.36, 0.16, { root: { sq: 0.975 }, minor: true }));
    }
    keys.push(key(t + len - 0.4, 0.4, { root: { ...upright } }));
    return { keys, dur: len };
  },

  /** Nods twice. */
  nod: (s, b, t) => ({
    keys: [
      key(t, 0.2, { root: { lean: 14 }, look: b.look ?? s.look }),
      key(t + 0.22, 0.2, { root: { lean: 0 } }),
      key(t + 0.45, 0.2, { root: { lean: 14 }, minor: true }),
      key(t + 0.67, 0.25, { root: { lean: 0 } }),
    ],
    dur: 1,
  }),

  /** Bows (sad, sorry, respectful): leans far forward, stays a moment, comes back up. */
  bow: (s, b, t) => {
    const len = Math.max(1.4, b.len ?? 1.8);
    return {
      keys: [key(t, 0.45, { root: { lean: 24, sq: 0.97 }, look: b.look ?? s.look }), key(t + len - 0.5, 0.5, { root: { ...upright } })],
      dur: len,
    };
  },

  /** Cheers: two big joyful hops, the second with a full turn. */
  cheer: (s, b, t, H) => ({
    keys: [
      key(t, 0.1, { look: b.look ?? 'reader' }),
      ...hopKeys(s, t, 0.12 * H, undefined, true),
      ...hopKeys(s, t + 0.5, 0.14 * H, undefined, true),
      key(t + 0.55, 0.4, { root: { spin: 360 } }),
      key(t + 1.0, 0.001, { root: { spin: 0 } }),
    ],
    dur: 1.1,
  }),

  /** Waves hello: rocks from side to side and gives a little hop. */
  wave: (s, b, t, H) => ({
    keys: [
      key(t, 0.2, { root: { tilt: 9 }, look: b.look ?? b.target ?? 'reader' }),
      key(t + 0.2, 0.2, { root: { tilt: -9 }, minor: true }),
      key(t + 0.4, 0.2, { root: { tilt: 9 }, minor: true }),
      key(t + 0.6, 0.2, { root: { tilt: 0 } }),
      ...hopKeys(s, t + 0.8, 0.06 * H),
    ],
    dur: 1.3,
  }),

  /** Points out or calls out something: leans towards it with a tiny hop. */
  point: (s, b, t, H) => {
    const len = b.len ?? 1.8;
    return {
      keys: [key(t, 0.3, { root: { lean: 10 }, look: b.target ?? b.look ?? 'reader' }), ...hopKeys(s, t + 0.3, 0.04 * H).map((k) => ({ ...k, root: { ...k.root, lean: 10 } })), key(t + len - 0.4, 0.4, { root: { ...upright } })],
      dur: len,
    };
  },

  /** Angry: little stomps and a shake. */
  angry: (s, b, t, H) => {
    const keys: Key[] = [key(t, 0.15, { root: { lean: 8 }, look: b.target ?? b.look ?? s.look })];
    for (let i = 0; i < 6; i++) keys.push(key(t + 0.15 + i * 0.11, 0.11, { root: { tilt: i % 2 ? -6 : 6, y: s.root.y + (i % 2 ? 0 : 0.02 * H), sq: i % 2 ? 0.94 : 1.03 }, minor: true }));
    keys.push(key(t + 0.85, 0.3, { root: { ...upright, y: s.root.y } }));
    return { keys, dur: b.len ?? 1.6 };
  },

  /** Knocks on a door: two quick leans towards it. */
  knock: (_s, b, t) => ({
    keys: [
      key(t, 0.2, { root: { lean: 6 }, look: b.target ?? b.look }),
      key(t + 0.25, 0.1, { root: { lean: 14 } }),
      key(t + 0.37, 0.1, { root: { lean: 6 } }),
      key(t + 0.5, 0.1, { root: { lean: 14 } }),
      key(t + 0.62, 0.1, { root: { lean: 6 } }),
      key(t + 0.9, 0.35, { root: { ...upright } }),
    ],
    dur: 1.3,
  }),

  /** Turns to face a direction (degrees) with a little hop. */
  turn: (s, b, t, H) => ({ keys: [...hopKeys(s, t, 0.035 * H, { rotY: near(s.root.rotY, b.face ?? 0) }), key(t, 0.4, { look: b.look ?? s.look })], dur: 0.6 }),

  /** Gives away what it holds (or, with `target`, takes that out first): leans towards the other, lets go. */
  give: (_s, b, t) => ({
    keys: [
      ...(b.target ? [key(t, 0.05, { hold: b.target })] : []),
      key(t, 0.35, { root: { lean: 12 }, look: b.look ?? b.target }),
      key(t + 0.5, 0.05, { hold: null }),
      key(t + 0.9, 0.4, { root: { ...upright } }),
    ],
    dur: 1.3,
  }),

  /** Takes something (`target`): it arrives in the hands, then a pleased little hop. */
  receive: (s, b, t, H) => ({
    keys: [key(t, 0.3, { root: { lean: 6 }, look: b.look ?? s.look }), key(t + 0.55, 0.05, { hold: b.target ?? null }), key(t + 0.6, 0.3, { root: { lean: 0 } }), ...hopKeys(s, t + 1.3, 0.05 * H)],
    dur: 1.8,
  }),

  /** Holds out what it has: leans forward with two small bobs. */
  offer: (_s, b, t) => {
    const len = b.len ?? 2.2;
    return {
      keys: [
        key(t, 0.35, { root: { lean: 12 }, look: b.look ?? b.target }),
        key(t + 0.5, 0.2, { root: { sq: 1.04 }, minor: true }),
        key(t + 0.7, 0.2, { root: { sq: 0.98 }, minor: true }),
        key(t + len - 0.4, 0.4, { root: { ...upright } }),
      ],
      dur: len,
    };
  },

  /** Puts down what it holds: bends, lets go, straightens. */
  put: (_s, b, t) => ({
    keys: [key(t, 0.4, { root: { lean: 22, sq: 0.95 }, look: b.look ?? 'down' }), key(t + 0.45, 0.05, { hold: PUT_DOWN }), key(t + 0.7, 0.4, { root: { ...upright }, look: b.look ?? null })],
    dur: 1.1,
  }),

  /** A hug: leans towards the other and squeezes (squash) twice. */
  hug: (_s, b, t) => ({
    keys: [
      key(t, 0.3, { root: { lean: 10 }, look: b.target }),
      key(t + 0.35, 0.2, { root: { sq: 0.92 } }),
      key(t + 0.6, 0.2, { root: { sq: 1.02 } }),
      key(t + 0.85, 0.2, { root: { sq: 0.92 } }),
      key(t + 1.3, 0.4, { root: { ...upright }, look: b.look ?? b.target }),
    ],
    dur: 1.7,
  }),

  /** A turn all the way round with a hop. */
  spin: (s, b, t, H) => ({ keys: [...hopKeys(s, t, 0.08 * H, undefined, true), key(t + 0.05, 0.4, { root: { spin: 360 } }), key(t + 0.6, 0.001, { root: { spin: 0 }, look: b.look ?? s.look })], dur: 0.7 }),

  /** Back upright. */
  rest: (_s, b, t) => ({ keys: [key(t, 0.4, { root: { ...upright }, look: b.look ?? null })], dur: 0.4 }),
  /** Named poses mean nothing to a toy; it just stands up straight and looks. */
  pose: (_s, b, t) => ({ keys: [key(t, 0.4, { root: { ...upright }, look: b.look })], dur: b.len ?? 0.6 }),
};
TOY_ACTS.twirl = TOY_ACTS.spin;
TOY_ACTS.kissHand = TOY_ACTS.bow;
TOY_ACTS.offerHand = TOY_ACTS.offer;
TOY_ACTS.fixBow = TOY_ACTS.hug;
TOY_ACTS.kissForehead = TOY_ACTS.hug;
TOY_ACTS.blowKiss = TOY_ACTS.wave;
