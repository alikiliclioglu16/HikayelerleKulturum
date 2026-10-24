import { store } from './store';

/** Tiny synthesized sound effects (no audio files). Silent when sound is off. */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!store.settings.sound) return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(a: AudioContext, type: OscillatorType, f0: number, f1: number, start: number, dur: number, vol: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, start);
  o.frequency.exponentialRampToValueAtTime(f1, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(a.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

export const sfx = {
  pop() {
    const a = audio();
    if (a) tone(a, 'sine', 520, 900, a.currentTime, 0.14, 0.14);
  },
  chime() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime;
    tone(a, 'triangle', 1046, 1046, t, 0.32, 0.08);
    tone(a, 'triangle', 1318, 1318, t + 0.09, 0.36, 0.07);
    tone(a, 'triangle', 1568, 1568, t + 0.18, 0.42, 0.06);
  },
  slide() {
    const a = audio();
    if (a) tone(a, 'triangle', 340, 190, a.currentTime, 0.2, 0.05);
  },
  tap() {
    const a = audio();
    if (a) tone(a, 'sine', 300, 240, a.currentTime, 0.08, 0.06);
  },
};
