import * as THREE from 'three';
import { loadGltf } from '../home3d/actors';

/**
 * Rigged family characters (skeletons added to the Meshy models, see docs/karakterler.md).
 * Bones: hips, spine, chest, neck, head, shoulder_L/R, upper_arm_L/R, forearm_L/R, hand_L/R,
 * thigh_L/R, shin_L/R, foot_L/R. The character faces +Z; its left is +X.
 *
 * A pose rotates bones by angles about the model's own axes (as if the character stood in its rest pose):
 *   x: bend forwards (+) / backwards (−), y: turn to its left (+) / right (−), z: tilt towards its left (+).
 * For the left arm z+ lifts the arm sideways; for the right arm z− does.
 */
export interface CharacterDef {
  src: string;
  /** Height in page widths, in proportion to the others (Can 5, Elif and Maya 8 years old). */
  height: number;
  name: string;
  /** Eyes for eyelids, in fractions of the model height: x, y (from the feet), z, radius. */
  eyes?: [number, number, number, number][];
  skin?: string;
}

export const CHARACTERS: Record<string, CharacterDef> = {
  elif: {
    src: '/models/aile/elif.glb', height: 0.395, name: 'Elif', skin: '#F2B48E',
    eyes: [[-0.0189, 0.8325, 0.1088, 0.026], [0.0624, 0.855, 0.0779, 0.023]],
  },
  can: { src: '/models/aile/can.glb', height: 0.34, name: 'Can' },
  maya: { src: '/models/aile/maya.glb', height: 0.4, name: 'Maya' },
  anne: { src: '/models/aile/anne.glb', height: 0.5, name: 'Anne' },
  baba: { src: '/models/aile/baba.glb', height: 0.55, name: 'Baba' },
  babaanne: { src: '/models/aile/babaanne.glb', height: 0.49, name: 'Babaanne' },
  dede: { src: '/models/aile/dede.glb', height: 0.525, name: 'Dede' },
  ayse: { src: '/models/aile/ayse.glb', height: 0.49, name: 'Ayşe Teyze' },
  // Tale characters: still models without bones, played like toys (three/toy.ts, book.json → toyCast)
  // Nasreddin Hoca ve Kazan
  hoca: { src: '/models/masal/hoca.glb', height: 0.53, name: 'Nasreddin Hoca' },
  komsu: { src: '/models/masal/komsu.glb', height: 0.52, name: 'Komşu' },
  'aksehirli-teyze': { src: '/models/masal/aksehirli-teyze.glb', height: 0.47, name: 'Akşehirli Teyze' },
  pazarci: { src: '/models/masal/pazarci.glb', height: 0.53, name: 'Pazarcı Amca' },
  // Keloğlan ve Üç Tohum
  keloglan: { src: '/models/masal/keloglan.glb', height: 0.45, name: 'Keloğlan' },
  'keloglan-anasi': { src: '/models/masal/keloglan-anasi.glb', height: 0.47, name: 'Keloğlan’ın anası' },
  'hasan-amca': { src: '/models/masal/hasan-amca.glb', height: 0.49, name: 'Hasan Amca' },
  'koylu-cocuk': { src: '/models/masal/koylu-cocuk.glb', height: 0.34, name: 'Köylü çocuk' },
  'koylu-kadin': { src: '/models/masal/koylu-kadin.glb', height: 0.47, name: 'Köylü kadın' },
  // 23 Nisan Şenliği: Elif's teacher and classmates
  ogretmen: { src: '/models/23-nisan/ogretmen.glb', height: 0.5, name: 'Ms. Carter' },
  zara: { src: '/models/23-nisan/zara.glb', height: 0.39, name: 'Zara' },
  kenji: { src: '/models/23-nisan/kenji.glb', height: 0.38, name: 'Kenji' },
  amara: { src: '/models/23-nisan/amara.glb', height: 0.385, name: 'Amara' },
  liam: { src: '/models/23-nisan/liam.glb', height: 0.4, name: 'Liam' },
};

export type Euler3 = [number, number, number];
export type Pose = Record<string, Euler3>;

/** Where the character is: offset on the page, turn, and how far it lies down (0 standing, 1 lying on its back). */
export interface RootState {
  x: number;
  y: number;
  z: number;
  rotY: number;
  lie: number;
  /** Things only (see PropActor): how much it is there (0 gone … 1 shown) and a tilt to the side (degrees). */
  show?: number;
  tilt?: number;
  /** Things and toy characters: lean forward (degrees), squash (1 normal, <1 squashed, >1 stretched), magic glow. */
  lean?: number;
  sq?: number;
  glow?: number;
  /** Toy characters: an extra turn (degrees) for a spin, snapped back to 0 afterwards. */
  spin?: number;
}

export interface State {
  pose: Pose;
  root: RootState;
  /** 0 closed … 1 open */
  eyes: number;
  /** Name of what the character looks at, or null to look straight ahead. */
  look: string | null;
  /** A thing in the hands (see HELD in three/props.ts), or null. */
  hold?: string | null;
}

/** A change that starts at `t` (seconds on the stage clock) and takes `dur` seconds. */
export interface Key {
  t: number;
  dur: number;
  pose?: Pose;
  root?: Partial<RootState>;
  eyes?: number;
  look?: string | null;
  hold?: string | null;
  /** A small in-between movement (a step, a nod, a bounce): left out in calm mode. */
  minor?: boolean;
  /** A burst of sparkles when this key starts (strength), for magic things. */
  burst?: number;
  /** Rain falling from this thing for so many seconds when the key starts (a cloud). */
  rain?: number;
}

const D2R = Math.PI / 180;
const qFromEuler = (e: Euler3) => new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0] * D2R, e[1] * D2R, e[2] * D2R, 'YXZ'));
export const smooth = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

/** `hold` value that puts the held thing down where it is instead of letting it disappear. */
export const PUT_DOWN = '@put';

/** Arms hang relaxed at the sides (the models were made in an A-pose). */
export const RELAXED: Pose = {
  upper_arm_L: [0, 0, -30],
  upper_arm_R: [0, 0, 30],
  forearm_L: [-12, 0, 0],
  forearm_R: [-12, 0, 0],
};

export function clonePose(p: Pose): Pose {
  const o: Pose = {};
  for (const k in p) o[k] = [...p[k]] as Euler3;
  return o;
}

export function cloneState(s: State): State {
  return { pose: clonePose(s.pose), root: { ...s.root }, eyes: s.eyes, look: s.look, hold: s.hold ?? null };
}

export class Performer {
  readonly root = new THREE.Group();
  /** Turned and laid down; the model hangs below it. */
  private body = new THREE.Group();
  private bones: Record<string, THREE.Bone> = {};
  private rest: Record<string, { ql: THREE.Quaternion; pw: THREE.Quaternion }> = {};
  private lids: THREE.Group[] = [];
  readonly hit: THREE.Mesh;
  private keys: Key[] = [];
  private start!: State;
  private base = new THREE.Vector3();
  private lookYaw = 0;
  private lookPitch = 0;
  private held: { name: string; obj: THREE.Object3D } | null = null;
  private heldName: string | null = null;
  /** Things this character has put down on the page (taken away again when the page restarts). */
  private dropped: THREE.Object3D[] = [];
  /** Builds a thing to hold by name (set by the scene). */
  makeProp: ((name: string) => THREE.Object3D | null) | null = null;
  /** Word said when the held thing is tapped. */
  get heldWord() {
    return this.held ? (this.held.obj.userData.word as string | undefined) ?? null : null;
  }
  get heldObject() {
    return this.held?.obj ?? null;
  }
  /** The spot on a nearby table top where something put down at `p` lands (world units), or null for the page. */
  surfaceAt: (p: THREE.Vector3) => THREE.Vector3 | null = () => null;
  /** World position of named things the character can look at. */
  targets: (name: string) => THREE.Vector3 | null = () => null;
  current!: State;

  private constructor(
    readonly id: string,
    readonly def: CharacterDef,
    model: THREE.Object3D,
    private height: number,
  ) {
    this.root.add(this.body);
    this.body.add(model);
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) this.bones[o.name] = o as THREE.Bone;
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false;
      }
    });
    model.updateMatrixWorld(true);
    for (const [k, b] of Object.entries(this.bones)) {
      this.rest[k] = { ql: b.quaternion.clone(), pw: b.parent ? b.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion() };
    }
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(height * 0.45, height, height * 0.35), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.position.y = height / 2;
    this.body.add(this.hit);
    this.buildLids();
  }

  static async load(id: string, height?: number) {
    const def = CHARACTERS[id];
    const gltf = await loadGltf(def.src);
    const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
    const model = clone(gltf.scene);
    // scale to the character's height, feet on y = 0, centred
    const box = new THREE.Box3().setFromObject(model);
    const h = height ?? def.height;
    const s = h / (box.max.y - box.min.y);
    model.scale.setScalar(s);
    model.position.set(-((box.min.x + box.max.x) / 2) * s, -box.min.y * s, -((box.min.z + box.max.z) / 2) * s);
    return new Performer(id, def, model, h);
  }

  /** Eyelids: skin-coloured caps over the painted eyes, hinged at the top, attached to the head bone. */
  private buildLids() {
    const head = this.bones.head;
    if (!this.def.eyes || !head) return;
    const model = this.body.children[0];
    const scale = model.scale.x;
    const H = this.height / scale; // model height in the model's own units
    const minY = -model.position.y / scale;
    this.root.updateMatrixWorld(true);
    const mat = new THREE.MeshStandardMaterial({ color: this.def.skin ?? '#F0C29C', roughness: 0.75 });
    const lash = new THREE.MeshBasicMaterial({ color: '#2A1B15' });
    const centre = new THREE.Vector3(0.01 * H, minY + 0.84 * H, -0.02 * H);
    for (const [ex, ey, ez, er] of this.def.eyes) {
      const r = er * H;
      const eye = new THREE.Vector3(ex * H, minY + ey * H, ez * H);
      const dir = eye.clone().sub(centre).setY(0).normalize();
      const pivot = new THREE.Group();
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), mat);
      cap.rotation.x = Math.PI / 2;
      cap.position.set(0, -r, -r * 0.55);
      const line = new THREE.Mesh(new THREE.TorusGeometry(r * 0.92, r * 0.08, 6, 24, Math.PI), lash);
      line.rotation.z = Math.PI;
      line.position.set(0, -r * 1.02, r * 0.38);
      line.scale.set(1, 0.35, 1);
      pivot.add(cap, line);
      // in model space: hinge at the top of the eye, the dome facing out of the face
      pivot.position.copy(eye).add(dir.clone().multiplyScalar(0.006 * H)).add(new THREE.Vector3(0, r, 0));
      pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      model.add(pivot);
      pivot.updateMatrixWorld(true);
      head.attach(pivot);
      pivot.userData.sy = pivot.scale.y;
      this.lids.push(pivot);
    }
  }

  /** Put the character at its start state (used when a page starts or is played again). */
  reset(start: State, base: THREE.Vector3) {
    for (const o of this.dropped) o.parent?.remove(o);
    this.dropped = [];
    this.start = cloneState(start);
    this.base.copy(base);
    this.keys = [];
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.current = cloneState(start);
    this.apply(this.current, 0, true);
  }

  /** Schedule changes. Keys are evaluated in order; a later key starts from wherever the earlier ones left off. */
  add(keys: Key[]) {
    this.keys.push(...keys);
    this.keys.sort((a, b) => a.t - b.t);
  }

  /** Leaving the page: things it put down go too. */
  leave() {
    for (const o of this.dropped) o.parent?.remove(o);
    this.dropped = [];
  }

  /** The state the character will have once every scheduled key has finished. */
  endState(): State {
    const s = cloneState(this.start);
    for (const k of this.keys) mergeKey(s, k);
    return s;
  }

  /** Calm mode (reduce motion): small in-between movements are left out and changes are short fades. */
  calm = false;

  /** Evaluate at stage time `t`. */
  update(t: number, dt: number) {
    const s = cloneState(this.start);
    for (const k of this.keys) {
      if (t < k.t) break;
      if (this.calm && k.minor) continue;
      // calm mode: no steps, nods or bounces, and each change is a short, soft fade
      const f = smooth((t - k.t) / Math.max(0.001, this.calm ? Math.min(k.dur, 0.35) : k.dur));
      blendKey(s, k, f);
    }
    this.current = s;
    this.apply(s, dt, false);
  }

  private apply(s: State, dt: number, snap: boolean) {
    // bones
    for (const [k, b] of Object.entries(this.bones)) {
      const R = this.rest[k];
      const e = s.pose[k];
      if (!e) {
        b.quaternion.copy(R.ql);
        continue;
      }
      const d = qFromEuler(e);
      b.quaternion.copy(R.pw.clone().invert().multiply(d).multiply(R.pw).multiply(R.ql));
    }
    // root: position, turn, lying down on its back (head towards −x of the turned frame)
    const r = s.root;
    this.root.position.set(this.base.x + r.x, this.base.y + r.y, this.base.z + r.z);
    this.root.rotation.set(0, r.rotY * D2R, 0);
    const lie = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0)),
    );
    this.body.quaternion.identity().slerp(lie, r.lie);
    // eyes
    for (const l of this.lids) {
      const open = Math.min(1, Math.max(0, s.eyes));
      l.scale.y = l.userData.sy * Math.max(0.02, 1 - open);
      l.visible = open < 0.98;
    }
    this.setHeld(s.hold ?? null);
    // look at something: turn the head (and a little the neck) towards it, smoothly
    let yaw = 0;
    let pitch = 0;
    const target = s.look ? this.targets(s.look) : null;
    const head = this.bones.head;
    if (target && head) {
      this.root.updateMatrixWorld(true);
      const hp = head.getWorldPosition(new THREE.Vector3());
      const local = this.body.worldToLocal(target.clone()).sub(this.body.worldToLocal(hp.clone()));
      yaw = Math.atan2(local.x, local.z);
      pitch = -Math.atan2(local.y, Math.hypot(local.x, local.z));
      yaw = Math.max(-1.1, Math.min(1.1, yaw));
      pitch = Math.max(-0.5, Math.min(0.45, pitch));
    }
    const k = snap || this.calm ? 1 : 1 - Math.exp(-dt * 5);
    this.lookYaw += (yaw - this.lookYaw) * k;
    this.lookPitch += (pitch - this.lookPitch) * k;
    if (Math.abs(this.lookYaw) + Math.abs(this.lookPitch) > 0.001) {
      for (const [name, share] of [['neck', 0.35], ['head', 0.65]] as [string, number][]) {
        const b = this.bones[name];
        if (!b) continue;
        const extra = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.lookPitch * share, this.lookYaw * share, 0, 'YXZ'));
        const R = this.rest[name];
        // look is added in the bone's parent frame, after its pose
        b.quaternion.premultiply(R.pw.clone().invert().multiply(extra).multiply(R.pw));
      }
    }
  }

  /**
   * Things held in both hands (a tray, a bowl, a tablet) sit in front of the chest; small things
   * (an envelope) sit in the right hand.
   */
  private setHeld(name: string | null) {
    if (this.heldName === name) return;
    this.heldName = name;
    if (this.held && name === PUT_DOWN) {
      // put down: it stays where the hands left it, standing level on the page
      const o = this.held.obj;
      this.held = null;
      const host = this.root.parent;
      if (host) {
        host.attach(o);
        // onto a table near the hands (the nearest spot on its top), else on the page
        const p = o.getWorldPosition(new THREE.Vector3());
        const onto = this.surfaceAt(p);
        if (onto) o.position.set(onto.x, onto.y + 0.004, onto.z);
        else o.position.y = this.base.y + 0.004;
        o.quaternion.copy(this.root.quaternion);
        this.dropped.push(o);
      } else o.parent?.remove(o);
      return;
    }
    if (this.held) {
      this.held.obj.parent?.remove(this.held.obj);
      this.held = null;
    }
    if (name === PUT_DOWN) return;
    if (!name || !this.makeProp) return;
    const obj = this.makeProp(name);
    if (!obj) return;
    const model = this.body.children[0];
    const small = obj.userData.hand === 'R';
    const bone = small ? this.bones.hand_R : this.bones.chest;
    if (!bone) return;
    // place in rest pose terms: in front of the chest at about elbow height, or in the right hand
    const prev = this.body.quaternion.clone();
    const savedPose = new Map<THREE.Bone, THREE.Quaternion>();
    for (const [k, b] of Object.entries(this.bones)) {
      savedPose.set(b, b.quaternion.clone());
      b.quaternion.copy(this.rest[k].ql);
    }
    this.body.quaternion.identity();
    const prevScale = this.root.scale.x;
    this.root.scale.setScalar(1);
    this.root.updateMatrixWorld(true);
    const H = this.height;
    const at = small
      ? this.bones.hand_R.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.01 * H, 0.03 * H))
      : this.root.localToWorld(new THREE.Vector3(0, H * (obj.userData.atHeight ?? 0.5), H * (obj.userData.ahead ?? 0.2)));
    obj.position.copy(at);
    obj.quaternion.copy(this.root.getWorldQuaternion(new THREE.Quaternion()));
    obj.scale.setScalar(1);
    this.root.parent?.add(obj) ?? this.root.add(obj);
    obj.updateMatrixWorld(true);
    bone.attach(obj);
    for (const [b, q] of savedPose) b.quaternion.copy(q);
    this.body.quaternion.copy(prev);
    this.root.scale.setScalar(prevScale);
    void model;
    this.held = { name, obj };
  }

  /** Where the head is (for the camera and speech). */
  headPosition() {
    const h = this.bones.head;
    this.root.updateMatrixWorld(true);
    return h ? h.getWorldPosition(new THREE.Vector3()) : this.root.position.clone().add(new THREE.Vector3(0, this.height * 0.85, 0));
  }

  get size() {
    return this.height;
  }
}

export function mergeKey(s: State, k: Key) {
  if (k.pose) for (const b in k.pose) s.pose[b] = [...k.pose[b]] as Euler3;
  if (k.root) Object.assign(s.root, k.root);
  if (k.eyes !== undefined) s.eyes = k.eyes;
  if (k.look !== undefined) s.look = k.look;
  if (k.hold !== undefined) s.hold = k.hold;
}

export function blendKey(s: State, k: Key, f: number) {
  if (k.pose) {
    for (const b in k.pose) {
      const from = s.pose[b] ?? [0, 0, 0];
      const to = k.pose[b];
      s.pose[b] = [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f, from[2] + (to[2] - from[2]) * f];
    }
  }
  if (k.root) {
    for (const key of Object.keys(k.root) as (keyof RootState)[]) {
      const to = k.root[key]!;
      const from = s.root[key] ?? 0;
      s.root[key] = from + (to - from) * f;
    }
  }
  if (k.eyes !== undefined) s.eyes = s.eyes + (k.eyes - s.eyes) * f;
  if (k.look !== undefined && f > 0) s.look = k.look;
  if (k.hold !== undefined && f >= 0.5) s.hold = k.hold;
}
