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


let noiseBuf: AudioBuffer | null = null;
function noise(a: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Filtered noise burst: crunches, wind, rustles, splashes. */
function hiss(a: AudioContext, type: BiquadFilterType, f0: number, f1: number, start: number, dur: number, vol: number, q = 1, attack = 0.01) {
  const src = a.createBufferSource();
  src.buffer = noise(a);
  const f = a.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, start);
  f.frequency.exponentialRampToValueAtTime(f1, start + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(start, Math.random() * 0.5);
  src.stop(start + dur + 0.05);
}

/** Bell or glass: a few inharmonic partials that ring and fade. */
function bell(a: AudioContext, f: number, start: number, dur: number, vol: number, partials = [1, 2.76, 5.4]) {
  partials.forEach((m, i) => tone(a, 'sine', f * m, f * m, start, dur / (1 + i * 0.8), vol / (1 + i * 1.6)));
}

/** Plucked string (Karplus–Strong), for the bağlama. */
function pluck(a: AudioContext, f: number, start: number, vol: number, dur = 1.1) {
  const n = Math.round(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  const p = Math.round(a.sampleRate / f);
  const ring = new Float32Array(p);
  for (let i = 0; i < p; i++) ring[i] = Math.random() * 2 - 1;
  for (let i = 0; i < n; i++) {
    const k = i % p;
    const next = (k + 1) % p;
    const v = ring[k];
    ring[k] = 0.996 * 0.5 * (ring[k] + ring[next]);
    d[i] = v;
  }
  const src = a.createBufferSource();
  src.buffer = buf;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(g).connect(a.destination);
  src.start(start);
}

type Recipe = (a: AudioContext, t: number) => void;

/** A soft, different sound for each culture object (all quiet, under half a second or so). */
const ITEM_SOUNDS: Record<string, Recipe> = {
  // tea spoon clinking in a tea glass
  cay: (a, t) => {
    bell(a, 2650, t, 0.35, 0.035, [1, 1.52, 2.1]);
    bell(a, 2650, t + 0.12, 0.3, 0.025, [1, 1.52, 2.1]);
  },
  // the teapot's soft whistle
  caydanlik: (a, t) => {
    tone(a, 'sine', 1400, 1750, t, 0.45, 0.025);
    hiss(a, 'bandpass', 2600, 3200, t, 0.45, 0.02, 8, 0.12);
  },
  // a crunchy bite
  simit: (a, t) => {
    hiss(a, 'bandpass', 1800, 900, t, 0.09, 0.08, 1.2);
    hiss(a, 'bandpass', 1500, 700, t + 0.08, 0.1, 0.06, 1.2);
  },
  // two plucked notes on the bağlama
  baglama: (a, t) => {
    pluck(a, 294, t, 0.16);
    pluck(a, 392, t + 0.13, 0.12);
  },
  // wind over the fairy chimneys
  'peri-bacasi': (a, t) => hiss(a, 'bandpass', 400, 900, t, 0.7, 0.05, 2.5, 0.25),
  // balloon burner whoosh
  balon: (a, t) => hiss(a, 'lowpass', 600, 1800, t, 0.5, 0.06, 0.7, 0.08),
  // flaky pastry crunch
  baklava: (a, t) => {
    for (let i = 0; i < 3; i++) hiss(a, 'highpass', 2500, 2000, t + i * 0.05, 0.05, 0.05, 0.8);
  },
  // glass bead chime
  nazar: (a, t) => bell(a, 1760, t, 0.6, 0.04, [1, 2.4, 4.2]),
  // a gentle rising tulip "bloom"
  lale: (a, t) => {
    tone(a, 'sine', 660, 990, t, 0.3, 0.035);
    tone(a, 'sine', 990, 1320, t + 0.1, 0.32, 0.025);
  },
  // tiny cup on a saucer
  kahve: (a, t) => bell(a, 2200, t, 0.18, 0.04, [1, 1.8]),
  // soft squishy boop
  lokum: (a, t) => tone(a, 'sine', 330, 520, t, 0.18, 0.06),
  // a deep tower bell
  galata: (a, t) => bell(a, 392, t, 1.1, 0.04, [1, 2.0, 2.76, 4.1]),
  // seagull and a little wave
  'kiz-kulesi': (a, t) => {
    tone(a, 'triangle', 1500, 1100, t, 0.18, 0.02);
    tone(a, 'triangle', 1450, 1000, t + 0.2, 0.2, 0.018);
    hiss(a, 'lowpass', 900, 300, t, 0.5, 0.03, 0.7, 0.15);
  },
  // a soft davul thump
  davul: (a, t) => {
    tone(a, 'sine', 140, 55, t, 0.35, 0.16);
    hiss(a, 'lowpass', 500, 150, t, 0.08, 0.04);
  },
  // water drops on the ebru tray
  ebru: (a, t) => {
    tone(a, 'sine', 900, 1500, t, 0.09, 0.05);
    tone(a, 'sine', 1100, 1800, t + 0.13, 0.08, 0.04);
  },
  // wooden puppet clack
  karagoz: (a, t) => {
    bell(a, 900, t, 0.08, 0.06, [1, 2.3]);
    bell(a, 1100, t + 0.09, 0.07, 0.05, [1, 2.3]);
  },
  // the ice cream seller's little bell
  dondurma: (a, t) => {
    for (let i = 0; i < 3; i++) bell(a, 1975, t + i * 0.08, 0.25, 0.025, [1, 2.7]);
  },
  // porcelain ting
  cini: (a, t) => bell(a, 3100, t, 0.5, 0.025, [1, 2.2, 3.9]),
  // stones dropping into the pits
  mangala: (a, t) => {
    for (let i = 0; i < 3; i++) bell(a, 1300 + i * 120, t + i * 0.07, 0.07, 0.05, [1, 2.1]);
  },
  // the flag flapping in the wind
  bayrak: (a, t) => {
    for (let i = 0; i < 3; i++) hiss(a, 'bandpass', 700, 500, t + i * 0.09, 0.08, 0.04, 1.5);
  },
};

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
  /** The object's own little sound (falls back to a music-box note). */
  item(id: string, n = 0) {
    const a = audio();
    if (!a) return;
    const r = ITEM_SOUNDS[id];
    if (r) r(a, a.currentTime + 0.005);
    else sfx.twinkle(n);
  },
  /** Soft music-box note when the pointer finds a shelf item; each item has its own note. */
  twinkle(n = 0) {
    const a = audio();
    if (!a) return;
    const scale = [784, 880, 988, 1175, 1319, 1568, 1760, 1976];
    const f = scale[n % scale.length];
    const t = a.currentTime;
    tone(a, 'sine', f, f, t, 0.35, 0.05);
    tone(a, 'triangle', f * 2, f * 2, t + 0.05, 0.25, 0.018);
  },
  /** A short glissando when the pointer finds a book. */
  shimmer() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime;
    // a page riffle followed by a soft sparkle
    hiss(a, 'bandpass', 3000, 1800, t, 0.18, 0.03, 0.9, 0.04);
    [1046, 1318, 1568].forEach((f, i) => tone(a, 'sine', f, f, t + 0.06 + i * 0.045, 0.28, 0.022));
  },
  tap() {
    const a = audio();
    if (a) tone(a, 'sine', 300, 240, a.currentTime, 0.08, 0.06);
  },
};
