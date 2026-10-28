import * as THREE from 'three';
import { runAct, type Beat, type ActResult } from './acts';
import type { Key, State } from './performer';

/** Anything the stage can direct: a character (Performer) or a magic thing (PropActor). */
export interface StageActor {
  reset(start: State, base: THREE.Vector3): void;
  add(keys: Key[]): void;
  endState(): State;
  update(t: number, dt: number): void;
  /** Its own acts (a toy character hops instead of bending); otherwise the acts in acts.ts. */
  run?(s: State, b: Beat, t: number): ActResult;
}
import { trLower, type Token } from '../text';

/**
 * Plays a page's beats in order. A beat starts when the narration reaches its cue word; without narration
 * the page plays by itself at reading pace (the same word schedule the follow-along uses).
 * The stage clock can pause, and `reset` puts every character back to the page's start.
 */
export class Stage {
  private clock = 0;
  private running = false;
  private next = 0;
  /** Word index that starts each beat (or -1 when the beat is skipped). */
  private cueWord: number[] = [];
  /** Seconds (on the reading schedule) when each beat is due in the self-playing mode. */
  private dueAt: number[] = [];
  private reached = -1;
  private mode: 'auto' | 'narration' = 'auto';
  private busyUntil = new Map<string, number>();
  onFocus: ((who: string | null) => void) | null = null;
  /** A beat has started (at stage time `t`, the clock being at `now`): for its sounds. */
  onBeat: ((b: Beat, t: number, res: ActResult, now: number) => void) | null = null;

  constructor(
    private cast: Map<string, StageActor>,
    private starts: Map<string, State>,
    private beats: Beat[],
  ) {}

  /** Match the beats to the words of the page text. */
  setText(tokens: Token[], marks: number[]) {
    const words = tokens.filter((t) => t.kind === 'word');
    let from = 0;
    this.cueWord = this.beats.map((b) => {
      if (!b.cue?.length) return Math.min(words.length - 1, from);
      const stems = b.cue.map(trLower);
      for (let i = from; i < words.length; i++) {
        const w = trLower(words[i].text);
        if (stems.some((s) => w.startsWith(s))) {
          from = i;
          return i;
        }
      }
      return b.optional ? -1 : Math.min(words.length - 1, from + 1);
    });
    this.dueAt = this.cueWord.map((wi) => (wi < 0 ? -1 : marks[wi] ?? 0));
  }

  /** Back to the start of the page: everyone in their start pose, nothing played yet. */
  reset(base: Map<string, THREE.Vector3>) {
    this.clock = 0;
    this.next = 0;
    this.reached = -1;
    this.busyUntil.clear();
    for (const [id, p] of this.cast) p.reset(this.starts.get(id)!, base.get(id) ?? new THREE.Vector3());
    this.onFocus?.(null);
  }

  /** Play by itself at reading pace. */
  playAuto() {
    this.mode = 'auto';
    this.running = true;
  }

  /** Follow the narration: beats start when `word(wi)` reaches their cue. */
  playWithNarration() {
    this.mode = 'narration';
    this.running = true;
  }

  word(wi: number) {
    this.reached = Math.max(this.reached, wi);
  }

  pause() {
    this.running = false;
  }

  resume() {
    this.running = true;
  }

  get playing() {
    return this.running;
  }

  /** All beats have started and finished. */
  get done() {
    if (this.next < this.beats.length) return false;
    let end = 0;
    this.busyUntil.forEach((v) => (end = Math.max(end, v)));
    return this.clock > end + 0.5;
  }

  /** Jump to a moment of the page's play (for testing and for showing a still frame). */
  seek(t: number, base: Map<string, THREE.Vector3>) {
    this.reset(base);
    this.running = true;
    while (this.clock < t) this.tick(Math.min(0.05, t - this.clock));
    this.running = false;
  }

  /** Advance the clock and start the beats that are due. Returns true while something moves. */
  tick(dt: number) {
    if (this.running) {
      this.clock += dt;
      while (this.next < this.beats.length) {
        const i = this.next;
        if (this.cueWord[i] < 0) {
          this.next++;
          continue;
        }
        const due = this.mode === 'auto' ? this.clock >= this.dueAt[i] : this.reached >= this.cueWord[i];
        if (!due) break;
        this.start(this.beats[i]);
        this.next++;
      }
    }
    for (const p of this.cast.values()) p.update(this.clock, this.running ? dt : 0);
    return this.running && !this.done;
  }

  private start(b: Beat) {
    const p = this.cast.get(b.who);
    if (!p) return;
    // one act after another for the same character; only looking can happen while the body is busy
    const lookOnly = b.do === 'lookAt' || b.do === 'lookAround';
    const busy = this.busyUntil.get(b.who) ?? 0;
    const t = (lookOnly ? this.clock : Math.max(this.clock, busy - 0.25)) + (b.wait ?? 0);
    const res = p.run ? p.run(p.endState(), b, t) : runAct(p.endState(), b, t);
    p.add(res.keys);
    this.busyUntil.set(b.who, Math.max(busy, t + res.dur));
    this.onBeat?.(b, t, res, this.clock);
    if (b.focus) this.onFocus?.(b.who);
  }
}
