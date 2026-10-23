export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  back: (t: number) => {
    const c1 = 1.5;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  hop: (t: number) => Math.sin(t * Math.PI) * (1 - t * 0.4),
};

export interface Tween {
  start: number;
  dur: number;
  from: number;
  to: number;
  ease: Ease;
  apply: (v: number) => void;
  resolve: () => void;
}

export class Tweens {
  private list: Tween[] = [];

  add(dur: number, from: number, to: number, apply: (v: number) => void, e: Ease = ease.inOut, delay = 0): Promise<void> {
    return new Promise((resolve) => {
      if (dur <= 0) {
        apply(to);
        resolve();
        return;
      }
      apply(from);
      this.list.push({ start: performance.now() + delay, dur, from, to, ease: e, apply, resolve });
    });
  }

  get active() {
    return this.list.length > 0;
  }

  update(now: number) {
    const keep: Tween[] = [];
    for (const t of this.list) {
      const k = Math.min(1, Math.max(0, (now - t.start) / t.dur));
      t.apply(t.from + (t.to - t.from) * t.ease(k));
      if (k >= 1) t.resolve();
      else keep.push(t);
    }
    this.list = keep;
  }
}
