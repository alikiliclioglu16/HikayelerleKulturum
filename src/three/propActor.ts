import * as THREE from 'three';
import { blendKey, cloneState, mergeKey, smooth, type Key, type State } from './performer';

/**
 * A magic thing on the page that takes part in the story like a character: the sleeping moon in the window,
 * the smiling sun that rises, the alarm clock that rings, the mirror that shines. Beats address it by the
 * model's `id` (see book.json → models) and use the thing acts in acts.ts (appear, vanish, rise, ring, shine …).
 * Its state is the root offset, the turn, a tilt and `show` (0 gone … 1 there); everything else is ignored.
 */
export class PropActor {
  /** Put between the model's place on the page and the model, so the act moves it from where it stands. */
  readonly group = new THREE.Group();
  private start!: State;
  private keys: Key[] = [];
  private last = 0;
  calm = false;
  /** Sparkles when a key with `burst` starts (world centre, strength). */
  onBurst: ((at: THREE.Vector3, strength: number) => void) | null = null;
  /** Height of the model (world units), so bursts appear around it. */
  height = 0.1;

  reset(start: State, _base?: THREE.Vector3) {
    this.start = cloneState(start);
    this.keys = [];
    this.last = 0;
    this.apply(this.start);
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

  update(t: number, dt: number) {
    const s = cloneState(this.start);
    for (const k of this.keys) {
      if (t < k.t) break;
      if (this.calm && k.minor) continue;
      const f = smooth((t - k.t) / Math.max(0.001, this.calm ? Math.min(k.dur, 0.35) : k.dur));
      blendKey(s, k, f);
      if (k.burst && dt > 0 && !this.calm && this.last < k.t && t >= k.t && this.onBurst) {
        const at = this.group.getWorldPosition(new THREE.Vector3());
        at.y += this.height * 0.5;
        this.onBurst(at, k.burst);
      }
    }
    this.last = t;
    this.apply(s);
  }

  private apply(s: State) {
    const r = s.root;
    const show = Math.max(0, Math.min(1.4, r.show ?? 1));
    this.group.position.set(r.x, r.y, r.z);
    this.group.rotation.set(0, THREE.MathUtils.degToRad(r.rotY), THREE.MathUtils.degToRad(r.tilt ?? 0));
    this.group.scale.setScalar(Math.max(0.001, show));
    this.group.visible = show > 0.01;
  }
}
