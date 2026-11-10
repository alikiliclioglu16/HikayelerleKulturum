import { store } from "./store";

/**
 * Synthesized sound effects, story sounds and the home page lullaby (made here, nothing to download), and each
 * book's own music (an MP3 rendered from real instrument samples, see book.json → music).
 * Everything goes through one master bus with a soft room reverb and a limiter,
 * so the effects are clear and full but never harsh.
 */
/** Overall loudness of the object sounds and of the background music. */
const FX_LEVEL = 0.7;
const MUSIC_LEVEL = 0.95;

let ctx: AudioContext | null = null;
let fxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let reverbIn: GainNode | null = null;

function makeImpulse(a: AudioContext, seconds = 2.2, decay = 3) {
  const len = Math.round(a.sampleRate * seconds);
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

/** Browsers only allow audio after the first tap or key press; until then stay silent. */
let unlocked = false;
const pendingUnlock: (() => void)[] = [];
function unlock() {
  if (unlocked) return;
  unlocked = true;
  window.removeEventListener("pointerdown", unlock, true);
  window.removeEventListener("keydown", unlock, true);
  pendingUnlock.splice(0).forEach((f) => f());
}
window.addEventListener("pointerdown", unlock, true);
window.addEventListener("keydown", unlock, true);

function audio(force = false): AudioContext | null {
  if (!unlocked) return null;
  if (!store.settings.sound && !force) return null;
  try {
    if (!ctx) {
      const C =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 8;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.2;
      limiter.connect(ctx.destination);
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(limiter);
      const verb = ctx.createConvolver();
      verb.buffer = makeImpulse(ctx);
      const verbOut = ctx.createGain();
      verbOut.gain.value = 0.32;
      verb.connect(verbOut).connect(master);
      reverbIn = ctx.createGain();
      reverbIn.connect(verb);
      fxBus = ctx.createGain();
      fxBus.gain.value = FX_LEVEL;
      fxBus.connect(master);
      fxBus.connect(reverbIn);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(master);
      const musicVerb = ctx.createGain();
      musicVerb.gain.value = 0.9;
      musicBus.connect(musicVerb).connect(reverbIn);
    }
    if (ctx.state === "suspended") void ctx.resume();
    loadClips(ctx);
    return ctx;
  } catch {
    return null;
  }
}

let target: AudioNode | null = null;
const out = () => target ?? fxBus!;

/** Per-sound loudness, measured so every object sounds equally clear. */
const LEVEL: Record<string, number> = {
  caydanlik: 1.6,
  simit: 2.1,
  "peri-bacasi": 3.4,
  balon: 2.5,
  kahve: 1.9,
  lokum: 1.5,
  ebru: 1.6,
};

/*
 * The mix, measured as the sounds leave the speakers (RMS while sounding), against a narrator recording
 * normalised to about -16 LUFS:
 *  - story sounds of the pop-up and object sounds: 5–7 dB under the voice, clearly heard over it;
 *  - book music: about 10 dB under the voice, and 17 dB under it while the voice reads (ducked);
 *  - the sounds of the place (birds, a market, a classroom…): a soft bed about 18–20 dB under the voice.
 */
const ITEM_GAIN = 1.7;
const SCENE_GAIN = 3.5;
const PAGE_GAIN = 4;
/** Each place's sounds brought to the same soft level (their recipes are very different in loudness). */
const AMBIENCE_LEVEL: Record<string, number> = {
  birds: 10,
  crickets: 21,
  home: 28,
  kitchen: 16,
  village: 10,
  market: 18,
  school: 18,
  hall: 16,
};
/** Each story sound evened out (measured), so a hop, a pop, a balloon or the applause are all heard alike. */
const SCENE_LEVEL: Record<string, number> = {
  hop: 1.8, cheer: 1.35, pop: 1.7, greet: 1.7, balloon: 4, rain: 0.5, whirl: 1.5, knock: 1.1, angry: 0.85, put: 1.5,
  fly: 2, vanish: 1.6, lift: 1.8, damla: 1.5, cizgi: 1.6, kagit: 2, tek: 1.2, shutter: 1.4, rise: 1.6, sink: 1.7, clink: 1.3, alarm: 1.5, shine: 1.2, davul: 0.85, applause: 3.6, spin: 4.5,
};

/**
 * Shelf sounds played by real instruments (FluidR3 GM samples, see public/sesler/raf): the bağlama, bells,
 * chimes, the harp, the davul, the trumpet. Loaded once the sound is on; things like a simit's crunch or the
 * çaydanlık's steam have no instrument, so they are still made here.
 */
const CLIP_IDS = [
  "baglama",
  "cay",
  "baklava",
  "nazar",
  "lale",
  "galata",
  "kiz-kulesi",
  "davul",
  "karagoz",
  "dondurma",
  "cini",
  "mangala",
  "bayrak",
];
const clips = new Map<string, AudioBuffer>();
let clipsAsked = false;
function loadClips(a: AudioContext) {
  if (clipsAsked) return;
  clipsAsked = true;
  for (const id of CLIP_IDS) {
    fetch(`/sesler/raf/${id}.mp3`)
      .then((r) =>
        r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))),
      )
      .then(
        (d) =>
          new Promise<AudioBuffer>((res, rej) =>
            a.decodeAudioData(d, res, rej),
          ),
      )
      .then((b) => clips.set(id, b))
      .catch(() => undefined);
  }
}
/** Play a shelf clip; false while it is still loading. */
function clip(a: AudioContext, t: number, id: string, vol = 0.55) {
  const b = clips.get(id);
  if (!b) return false;
  const src = a.createBufferSource();
  src.buffer = b;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(g).connect(out());
  src.start(t);
  return true;
}

/* ------------------------------------------------------------------ */
/* building blocks                                                     */
/* ------------------------------------------------------------------ */

function env(
  a: AudioContext,
  start: number,
  vol: number,
  attack: number,
  dur: number,
  dest: AudioNode,
) {
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  g.connect(dest);
  return g;
}

function tone(
  a: AudioContext,
  type: OscillatorType,
  f0: number,
  f1: number,
  start: number,
  dur: number,
  vol: number,
  attack = 0.008,
  dest: AudioNode = out(),
) {
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, start);
  if (f1 !== f0)
    o.frequency.exponentialRampToValueAtTime(f1, start + dur * 0.9);
  o.connect(env(a, start, vol, attack, dur, dest));
  o.start(start);
  o.stop(start + dur + 0.05);
  return o;
}

let noiseBuf: AudioBuffer | null = null;
function noise(a: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Filtered noise: crunches, wind, steam, splashes. */
function hiss(
  a: AudioContext,
  type: BiquadFilterType,
  f0: number,
  f1: number,
  start: number,
  dur: number,
  vol: number,
  q = 1,
  attack = 0.005,
  dest: AudioNode = out(),
) {
  const src = a.createBufferSource();
  src.buffer = noise(a);
  const f = a.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, start);
  f.frequency.exponentialRampToValueAtTime(f1, start + dur);
  src.connect(f).connect(env(a, start, vol, attack, dur, dest));
  src.start(start, Math.random());
  src.stop(start + dur + 0.05);
}

/** Bell, glass or metal: inharmonic partials that ring out. */
function bell(
  a: AudioContext,
  f: number,
  start: number,
  dur: number,
  vol: number,
  partials = [1, 2.76, 5.4],
  dest: AudioNode = out(),
) {
  partials.forEach((m, i) =>
    tone(
      a,
      "sine",
      f * m,
      f * m,
      start,
      dur / (1 + i * 0.7),
      vol / (1 + i * 1.3),
      0.002,
      dest,
    ),
  );
}

/** Plucked string (Karplus–Strong). */
const pluckCache = new Map<number, AudioBuffer>();
function pluck(
  a: AudioContext,
  f: number,
  start: number,
  vol: number,
  dur = 1.4,
  dest: AudioNode = out(),
) {
  const key = Math.round(f);
  let buf = pluckCache.get(key);
  if (!buf) {
    const n = Math.round(a.sampleRate * dur);
    buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    const p = Math.round(a.sampleRate / f);
    const ring = new Float32Array(p);
    for (let i = 0; i < p; i++) ring[i] = Math.random() * 2 - 1;
    for (let i = 0; i < n; i++) {
      const k = i % p;
      const v = ring[k];
      ring[k] = 0.997 * 0.5 * (ring[k] + ring[(k + 1) % p]);
      d[i] = v;
    }
    pluckCache.set(key, buf);
  }
  const src = a.createBufferSource();
  src.buffer = buf;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(g).connect(dest);
  src.start(start);
}

/** Tone with vibrato (whistles, birds). */
function warble(
  a: AudioContext,
  f0: number,
  f1: number,
  start: number,
  dur: number,
  vol: number,
  rate = 6,
  depth = 30,
  type: OscillatorType = "sine",
) {
  const o = tone(a, type, f0, f1, start, dur, vol, 0.05);
  const lfo = a.createOscillator();
  lfo.frequency.value = rate;
  const lg = a.createGain();
  lg.gain.value = depth;
  lfo.connect(lg).connect(o.frequency);
  lfo.start(start);
  lfo.stop(start + dur + 0.05);
}

/** Drum hit: pitch-dropping body plus a noise slap. */
function drum(
  a: AudioContext,
  start: number,
  f: number,
  vol: number,
  slap = 0.3,
) {
  tone(a, "sine", f * 2.2, f, start, 0.45, vol, 0.002);
  tone(a, "triangle", f * 3, f * 1.4, start, 0.12, vol * 0.4, 0.002);
  hiss(a, "bandpass", 1800, 600, start, 0.09, vol * slap, 0.8, 0.001);
}

const N = (semitones: number, base = 440) => base * Math.pow(2, semitones / 12);

type Recipe = (a: AudioContext, t: number) => void;

/** A clear, characterful sound for each culture object. */
const ITEM_SOUNDS: Record<string, Recipe> = {
  // a spoon clinking a tea glass, twice, with a glassy ring
  cay: (a, t) => {
    if (!clip(a, t, "cay")) bell(a, 2960, t, 0.7, 0.28, [1, 1.47, 2.09, 2.9]);
  },
  // the çaydanlık starting to whistle, with steam
  caydanlik: (a, t) => {
    warble(a, 1150, 1850, t, 0.95, 0.16, 7, 25);
    warble(a, 2300, 3700, t + 0.05, 0.9, 0.04, 7, 50);
    hiss(a, "bandpass", 3500, 5500, t, 1.0, 0.16, 3, 0.2);
  },
  // a big crunchy bite of simit
  simit: (a, t) => {
    hiss(a, "bandpass", 2200, 900, t, 0.11, 0.55, 1.1, 0.002);
    hiss(a, "bandpass", 1700, 700, t + 0.12, 0.12, 0.45, 1.1, 0.002);
    hiss(a, "highpass", 4000, 3000, t + 0.05, 0.08, 0.2, 0.7, 0.002);
    tone(a, "sine", 260, 180, t + 0.26, 0.22, 0.18, 0.02);
  },
  // a little Hicaz phrase on the bağlama: D Eb F# G
  baglama: (a, t) => {
    if (!clip(a, t, "baglama", 0.65))
      [N(-7), N(-6), N(-3), N(-2)].forEach((f, i) =>
        pluck(a, f, t + i * 0.12, 0.55),
      );
  },
  // wind whistling around the fairy chimneys
  "peri-bacasi": (a, t) => {
    hiss(a, "bandpass", 380, 1300, t, 0.7, 0.4, 4, 0.25);
    hiss(a, "bandpass", 1300, 500, t + 0.55, 0.8, 0.32, 5, 0.1);
    warble(a, 620, 900, t + 0.1, 1.1, 0.04, 3, 40);
  },
  // the balloon's burner: a deep fwoosh
  balon: (a, t) => {
    hiss(a, "lowpass", 300, 2600, t, 0.85, 0.6, 0.9, 0.04);
    tone(a, "sawtooth", 70, 90, t, 0.8, 0.07, 0.05);
    hiss(a, "bandpass", 160, 120, t, 0.8, 0.3, 2, 0.05);
  },
  // crispy layers of baklava, then a sweet ding
  baklava: (a, t) => {
    for (let i = 0; i < 5; i++)
      hiss(a, "highpass", 3200, 2400, t + i * 0.045, 0.045, 0.4, 0.8, 0.001);
    clip(a, t, "baklava", 0.4);
  },
  // a cascade of glass chimes for the nazar boncuğu
  nazar: (a, t) => {
    if (!clip(a, t, "nazar"))
      [N(19), N(22), N(26), N(31)].forEach((f, i) =>
        bell(a, f, t + i * 0.08, 1.2, 0.17, [1, 2.4, 4.2]),
      );
  },
  // a harp glissando, like a tulip opening
  lale: (a, t) => {
    if (!clip(a, t, "lale"))
      [0, 2, 4, 7, 9, 12, 16].forEach((s, i) =>
        pluck(a, N(s), t + i * 0.055, 0.4, 1.4),
      );
  },
  // a coffee cup set on its saucer, then bubbling coffee
  kahve: (a, t) => {
    bell(a, 1900, t, 0.35, 0.3, [1, 1.7, 2.6]);
    for (let i = 0; i < 6; i++)
      tone(
        a,
        "sine",
        300 + Math.random() * 200,
        700 + Math.random() * 300,
        t + 0.25 + i * 0.06,
        0.06,
        0.16,
        0.003,
      );
  },
  // a squishy, bouncy lokum
  lokum: (a, t) => {
    warble(a, 240, 520, t, 0.35, 0.35, 18, 60, "triangle");
    tone(a, "sine", 520, 380, t + 0.3, 0.2, 0.2, 0.01);
  },
  // the deep bell of an old tower
  galata: (a, t) => {
    if (!clip(a, t, "galata", 0.7))
      bell(a, 196, t, 3.2, 0.3, [1, 2.0, 2.4, 3.0, 4.2, 5.4]);
  },
  // a wave on the Bosphorus and two seagulls
  "kiz-kulesi": (a, t) => {
    if (!clip(a, t, "kiz-kulesi", 0.6))
      hiss(a, "lowpass", 400, 1600, t, 0.5, 0.35, 0.7, 0.25);
    for (const d of [0.25, 0.6]) {
      warble(a, 1700, 1150, t + d, 0.22, 0.12, 20, 80, "triangle");
      warble(a, 1600, 1050, t + d + 0.18, 0.2, 0.09, 20, 80, "triangle");
    }
  },
  // a davul beat: dum ... tek tek
  davul: (a, t) => {
    if (!clip(a, t, "davul", 0.7)) {
      drum(a, t, 70, 0.9, 0.35);
      drum(a, t + 0.56, 70, 0.75, 0.3);
    }
  },
  // paint drops falling onto the water tray
  ebru: (a, t) => {
    [0, 0.14, 0.3].forEach((d, i) => {
      tone(a, "sine", 700 + i * 150, 1700 + i * 200, t + d, 0.1, 0.35, 0.002);
      hiss(a, "bandpass", 2500, 1200, t + d + 0.02, 0.08, 0.12, 2, 0.002);
    });
  },
  // the shadow-play puppets: wooden clack-clack and a slide whistle
  karagoz: (a, t) => {
    if (!clip(a, t, "karagoz")) bell(a, 820, t, 0.12, 0.45, [1, 2.3, 3.7]);
    tone(a, "sine", 600, 1500, t + 0.3, 0.35, 0.1, 0.02);
  },
  // the Maraş ice cream seller's jingling bell
  dondurma: (a, t) => {
    if (!clip(a, t, "dondurma"))
      for (let i = 0; i < 7; i++)
        bell(a, i % 2 ? 2350 : 2100, t + i * 0.06, 0.45, 0.16, [1, 2.7, 4.6]);
  },
  // a bright porcelain ting with a long ring
  cini: (a, t) => {
    if (!clip(a, t, "cini")) bell(a, 2480, t, 1.6, 0.26, [1, 2.32, 4.25, 6.1]);
  },
  // stones dropping into the mangala pits
  mangala: (a, t) => {
    if (!clip(a, t, "mangala"))
      for (let i = 0; i < 5; i++)
        bell(
          a,
          1100 + Math.random() * 600,
          t + i * 0.075,
          0.12,
          0.35,
          [1, 2.2],
        );
  },
  // the flag flapping in the wind and a short proud fanfare
  bayrak: (a, t) => {
    for (let i = 0; i < 4; i++)
      hiss(a, "bandpass", 900, 500, t + i * 0.08, 0.08, 0.2, 1.4, 0.002);
    if (!clip(a, t, "bayrak", 0.5))
      [0, 4, 7, 12].forEach((s, i) =>
        tone(
          a,
          "square",
          N(s - 5),
          N(s - 5),
          t + 0.3 + i * 0.1,
          i === 3 ? 0.5 : 0.12,
          0.05,
          0.01,
        ),
      );
  },
};

/* ------------------------------------------------------------------ */
/* background music                                                    */
/* ------------------------------------------------------------------ */

/**
 * Two kinds of music: on the home page a slow, endless lullaby made here (warm pad chords, a soft music-box
 * melody in a gentle Uşşak-like scale, a few far-away chimes); in a book that book's own tune, an MP3 that
 * repeats (book.json → music). Each piece plays through its own gain (a "session"), so one can fade out while
 * the next fades in.
 */
interface Track {
  src: string;
  loop: number;
  /** Evens out the pieces: each book's tune is brought to the same loudness (about -18 LUFS before this mix). */
  gain?: number;
}
interface Session {
  gain: GainNode;
  track: Track | null;
  sources: AudioBufferSourceNode[];
  next: number;
  bar: number;
  started: boolean;
}

/** Book music is mixed at about the level of the lullaby. */
const TRACK_LEVEL = 0.36;

const music = {
  on: false,
  timer: 0,
  track: null as Track | null,
  session: null as Session | null,
  chords: [
    [-12, -5, 0, 3], // A minor
    [-14, -7, -2, 2], // G
    [-16, -9, -4, 0], // F
    [-12, -5, 0, 5], // A sus4 back home
  ],
  scale: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15],
};

const buffers = new Map<string, Promise<AudioBuffer | null>>();
function trackBuffer(a: AudioContext, src: string) {
  let p = buffers.get(src);
  if (!p) {
    p = fetch(src)
      .then((r) =>
        r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))),
      )
      .then(
        (d) =>
          new Promise<AudioBuffer>((res, rej) =>
            a.decodeAudioData(d, res, rej),
          ),
      )
      .catch((e) => {
        console.warn("Müzik yüklenemedi", src, e);
        return null;
      });
    buffers.set(src, p);
  }
  return p;
}

function padChord(
  a: AudioContext,
  notes: number[],
  start: number,
  dur: number,
  bus: AudioNode,
) {
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  lp.connect(bus);
  for (const s of notes) {
    for (const det of [-6, 6]) {
      const o = a.createOscillator();
      o.type = "triangle";
      o.frequency.value = N(s, 220);
      o.detune.value = det;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.03, start + dur * 0.35);
      g.gain.linearRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(lp);
      o.start(start);
      o.stop(start + dur + 0.1);
    }
  }
}

function musicBox(
  a: AudioContext,
  s: number,
  start: number,
  vol: number,
  bus: AudioNode,
) {
  const f = N(s, 880);
  tone(a, "sine", f, f, start, 1.6, vol, 0.004, bus);
  tone(a, "sine", f * 3, f * 3, start, 0.5, vol * 0.18, 0.002, bus);
}

/** Keep a little of the music scheduled ahead. */
function scheduleMusic() {
  const a = ctx;
  const ses = music.session;
  if (!a || !music.on || !ses) return;
  if (ses.track) {
    const track = ses.track;
    void trackBuffer(a, track.src).then((buf) => {
      if (!buf || music.session !== ses || !music.on) return;
      // the first round starts from the beginning once the file is there
      if (!ses.started) ses.next = Math.max(ses.next, a.currentTime + 0.05);
      ses.started = true;
      // a new round starts exactly `loop` seconds after the last one; its tail rings into the next
      while (ses.next < a.currentTime + 1.5) {
        const src = a.createBufferSource();
        src.buffer = buf;
        src.connect(ses.gain);
        const at = Math.max(ses.next, a.currentTime + 0.05);
        src.start(at, at - ses.next);
        ses.sources.push(src);
        src.onended = () => ses.sources.splice(ses.sources.indexOf(src), 1);
        ses.next += track.loop;
      }
    });
    return;
  }
  const barLen = 4.8;
  while (ses.next < a.currentTime + 1.2) {
    const t0 = ses.next;
    padChord(
      a,
      music.chords[ses.bar % music.chords.length],
      t0,
      barLen + 0.6,
      ses.gain,
    );
    // 4–6 melody notes per bar, moving step by step
    let idx = 2 + Math.floor(Math.random() * 4);
    for (const b of [0, 1.2, 1.8, 2.4, 3.6, 4.2]) {
      if (Math.random() < 0.25) continue;
      idx = Math.max(
        0,
        Math.min(
          music.scale.length - 1,
          idx + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.8 ? 1 : 2),
        ),
      );
      musicBox(a, music.scale[idx] - 12, t0 + b, 0.045, ses.gain);
    }
    if (ses.bar % 2 === 1)
      bell(
        a,
        N(24, 440),
        t0 + 3.0 + Math.random(),
        2.5,
        0.012,
        [1, 2.76],
        ses.gain,
      );
    ses.next += barLen;
    ses.bar++;
  }
}

function endSession(a: AudioContext, ses: Session, fade: number) {
  const t = a.currentTime;
  ses.gain.gain.cancelScheduledValues(t);
  ses.gain.gain.setValueAtTime(ses.gain.gain.value, t);
  ses.gain.gain.linearRampToValueAtTime(0, t + fade);
  for (const s of ses.sources) s.stop(t + fade + 0.05);
  window.setTimeout(() => ses.gain.disconnect(), (fade + 0.3) * 1000);
}

/* ------------------------------------------------------------------ */
/* story sounds                                                        */
/* ------------------------------------------------------------------ */

/**
 * Sounds for what happens on a page: toy hops, knocks, magic things appearing, rain, a pot clinking.
 * `at` is the AudioContext time; each recipe is short and soft so it never covers the narration.
 */
const SCENE_SOUNDS: Record<string, (a: AudioContext, t: number) => void> = {
  // a wooden toy landing on paper
  hop: (a, t) => {
    tone(a, "sine", 330, 180, t, 0.09, 0.22, 0.002);
    hiss(a, "bandpass", 1500, 900, t, 0.05, 0.09, 1.2, 0.001);
  },
  // a springy little jump of joy
  cheer: (a, t) => {
    tone(a, "triangle", 380, 760, t, 0.16, 0.12, 0.01);
    [N(7), N(11), N(14), N(19)].forEach((f, i) =>
      bell(a, f, t + 0.08 + i * 0.07, 0.6, 0.07, [1, 2.4]),
    );
  },
  // two knocks on a wooden door
  knock: (a, t) => {
    for (const d of [0.25, 0.5]) {
      tone(a, "sine", 210, 120, t + d, 0.12, 0.45, 0.001);
      hiss(a, "bandpass", 900, 500, t + d, 0.07, 0.3, 2, 0.001);
    }
  },
  // stamping feet and a grumble
  angry: (a, t) => {
    for (let i = 0; i < 3; i++) drum(a, t + 0.15 + i * 0.22, 90, 0.18, 0.15);
    warble(a, 140, 110, t + 0.1, 0.6, 0.05, 9, 12, "sawtooth");
  },
  // something set down: a soft clunk
  put: (a, t) => {
    tone(a, "sine", 240, 150, t + 0.45, 0.14, 0.3, 0.002);
    bell(a, 720, t + 0.45, 0.25, 0.05, [1, 2.7]);
  },
  // a thing flying from hand to hand: a swish, then a chime as it lands
  fly: (a, t) => {
    hiss(a, "bandpass", 700, 2600, t, 0.55, 0.16, 1.4, 0.15);
    bell(a, N(19), t + 0.72, 0.8, 0.09, [1, 2.4]);
  },
  // something comes out of nowhere into the hands
  pop: (a, t) => {
    tone(a, "sine", 420, 980, t, 0.14, 0.22, 0.004);
    bell(a, N(24), t + 0.08, 0.5, 0.05, [1, 2.4]);
  },
  // a tool picked up and brought forward: a soft swish
  lift: (a, t) => {
    hiss(a, "bandpass", 900, 2200, t, 0.4, 0.1, 1.3, 0.12);
  },
  // paint drops falling onto the water of the ebru tray: tıp, tıp, tıp
  damla: (a, t) => {
    [0, 0.17, 0.36, 0.5].forEach((d, i) => {
      tone(a, "sine", 650 + i * 140, 1600 + i * 180, t + d, 0.1, 0.4, 0.002);
      hiss(a, "bandpass", 2500, 1200, t + d + 0.02, 0.08, 0.14, 2, 0.002);
    });
  },
  // the biz drawing through the paint: a soft watery swirl
  cizgi: (a, t) => {
    hiss(a, "bandpass", 500, 1400, t, 1.4, 0.12, 2.5, 0.3);
    tone(a, "sine", 520, 780, t + 0.1, 1.2, 0.05, 0.3);
  },
  // a sheet of paper laid down or lifted: a light rustle
  kagit: (a, t) => {
    hiss(a, "highpass", 2500, 5500, t, 0.35, 0.16, 0.7, 0.05);
    hiss(a, "bandpass", 1800, 900, t + 0.2, 0.25, 0.1, 1.2, 0.04);
  },
  // a magic thing appears: a rising sparkle of little bells
  appear: (a, t) => {
    [0, 4, 7, 12, 16, 19].forEach((s, i) =>
      bell(a, N(s + 7), t + i * 0.055, 1.0, 0.07, [1, 2.4, 4.1]),
    );
    hiss(a, "highpass", 5000, 9000, t, 0.6, 0.05, 0.8, 0.1);
  },
  // and goes: a falling sparkle and a soft poof
  vanish: (a, t) => {
    [19, 16, 12, 7].forEach((s, i) =>
      bell(a, N(s + 7), t + i * 0.06, 0.7, 0.05, [1, 2.4]),
    );
    hiss(a, "lowpass", 1800, 300, t + 0.25, 0.4, 0.12, 0.7, 0.03);
  },
  // gliding through the air
  rise: (a, t) => {
    for (let i = 0; i < 10; i++)
      bell(a, N(10 + i * 1.5), t + i * 0.16, 0.9, 0.035, [1, 2.4]);
    hiss(a, "bandpass", 1200, 3000, t, 1.6, 0.05, 1.5, 0.4);
  },
  sink: (a, t) => {
    for (let i = 0; i < 6; i++)
      bell(a, N(22 - i * 2), t + i * 0.12, 0.8, 0.04, [1, 2.4]);
  },
  // a little pot clinking as it wiggles
  clink: (a, t) => {
    for (let i = 0; i < 4; i++)
      bell(a, i % 2 ? 1960 : 1720, t + i * 0.18, 0.4, 0.09, [1, 2.6, 4.4]);
  },
  // the alarm clock ringing
  alarm: (a, t) => {
    for (let i = 0; i < 18; i++)
      bell(a, i % 2 ? 2650 : 2500, t + i * 0.06, 0.12, 0.08, [1, 2.2]);
  },
  // a glow: a warm swelling chord of bells
  shine: (a, t) => {
    [0, 4, 7, 11].forEach((s, i) =>
      bell(a, N(s + 12), t + i * 0.04, 1.4, 0.05, [1, 2, 3]),
    );
  },
  // a sprout popping up out of the soil
  grow: (a, t) => {
    tone(a, "sine", 300, 900, t, 0.35, 0.16, 0.02);
    [12, 16, 19].forEach((s, i) =>
      pluck(a, N(s - 12), t + 0.25 + i * 0.07, 0.25, 1.2),
    );
  },
  // one deep stroke of the davul
  // the davul played with the stick: "düm", a deep boom with the skin's slap
  davul: (a, t) => {
    drum(a, t, 82, 0.75, 0.55);
    tone(a, "sine", 190, 120, t, 0.18, 0.22, 0.002);
  },
  // … and "tek", the thin switch on the other side: a dry, bright crack
  tek: (a, t) => {
    hiss(a, "bandpass", 3200, 2400, t, 0.06, 0.32, 1.6, 0.001);
    tone(a, "triangle", 620, 420, t, 0.05, 0.12, 0.001);
  },
  // a camera's shutter: a soft click and a whirr
  shutter: (a, t) => {
    hiss(a, "highpass", 3000, 2600, t, 0.03, 0.3, 0.7, 0.001);
    hiss(a, "highpass", 2600, 2200, t + 0.07, 0.03, 0.22, 0.7, 0.001);
    hiss(a, "bandpass", 900, 1600, t + 0.12, 0.25, 0.06, 2, 0.02);
  },
  // a globe spinning by itself: a long airy whoosh and a run of little bells
  whirl: (a, t) => {
    hiss(a, "bandpass", 500, 2600, t, 1.6, 0.12, 1.4, 0.3);
    for (let i = 0; i < 12; i++)
      bell(a, N(12 + ((i * 5) % 17)), t + i * 0.18, 0.7, 0.04, [1, 2.4]);
  },
  // a greeting bubble popping up: a bright "pop" and a chime
  greet: (a, t) => {
    tone(a, "sine", 500, 1100, t, 0.12, 0.2, 0.004);
    bell(
      a,
      N(19 + Math.floor(Math.random() * 5)),
      t + 0.06,
      0.7,
      0.07,
      [1, 2.4],
    );
  },
  // a hall clapping and cheering
  applause: (a, t) => {
    for (let i = 0; i < 70; i++)
      hiss(
        a,
        "bandpass",
        1400 + Math.random() * 1400,
        900,
        t + Math.random() * 2.2,
        0.03,
        0.05 + Math.random() * 0.06,
        1.2,
        0.001,
      );
    hiss(a, "bandpass", 900, 1200, t, 2.4, 0.04, 0.6, 0.3);
  },
  // a balloon squeaking as it is blown up and tied
  balloon: (a, t) => {
    warble(a, 300, 700, t, 0.5, 0.06, 14, 40, "sawtooth");
    hiss(a, "bandpass", 1200, 2600, t, 0.5, 0.06, 2, 0.1);
  },
  // a whoosh round
  spin: (a, t) => {
    hiss(a, "bandpass", 600, 2400, t, 0.45, 0.14, 1.6, 0.12);
    hiss(a, "bandpass", 2400, 700, t + 0.45, 0.45, 0.1, 1.6, 0.05);
  },
};

/** Rain: thunder far away, then a steady shower with drops plinking, for `seconds`. */
function rainSound(a: AudioContext, t: number, seconds: number) {
  hiss(a, "lowpass", 220, 80, t, 2.2, 0.35, 0.8, 0.25);
  tone(a, "sine", 55, 40, t, 1.8, 0.2, 0.2);
  const src = a.createBufferSource();
  src.buffer = noise(a);
  src.loop = true;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 2600;
  f.Q.value = 0.6;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t + 0.3);
  g.gain.linearRampToValueAtTime(0.16, t + 1.2);
  g.gain.setValueAtTime(0.16, t + seconds);
  g.gain.linearRampToValueAtTime(0.0001, t + seconds + 1.5);
  src.connect(f).connect(g).connect(out());
  src.start(t + 0.3);
  src.stop(t + seconds + 1.6);
  for (let i = 0; i < seconds * 5; i++) {
    const d = t + 0.6 + Math.random() * seconds;
    tone(a, "sine", 1800 + Math.random() * 1600, 900, d, 0.05, 0.03, 0.001);
  }
}

/** A little bird: two or three quick chirps. */
function bird(a: AudioContext, t: number, vol = 1) {
  const f = 2600 + Math.random() * 1400;
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++)
    warble(
      a,
      f,
      f * (1.15 + Math.random() * 0.2),
      t + i * 0.13,
      0.09,
      0.025 * vol,
      30,
      120,
      "sine",
    );
}

/** One soft tick of a wall clock. */
function clickTick(a: AudioContext, t: number, f: number) {
  hiss(a, "bandpass", f, f, t, 0.015, 0.03, 6, 0.001);
}

/** Voices far off: a few syllables of children talking, soft and blurred. */
function murmur(a: AudioContext, t: number, vol = 1) {
  const n = 3 + Math.floor(Math.random() * 4);
  let d = 0;
  for (let i = 0; i < n; i++) {
    const f = 220 + Math.random() * 160;
    const dur = 0.09 + Math.random() * 0.14;
    warble(
      a,
      f,
      f * (0.85 + Math.random() * 0.3),
      t + d,
      dur,
      0.011 * vol,
      5,
      20,
      "triangle",
    );
    hiss(
      a,
      "bandpass",
      900 + Math.random() * 700,
      1000,
      t + d,
      dur,
      0.007 * vol,
      3,
      0.02,
    );
    d += dur + Math.random() * 0.12;
  }
}

/** Soft sounds of a place, under a page: birds, crickets at night, a quiet room, a kitchen, a village, a market, a school. */
let ambience: { kind: string; timer: number } | null = null;
function ambienceTick() {
  const a = ctx;
  if (!a || !ambience || document.hidden) return;
  const t = a.currentTime + Math.random() * 0.5;
  const g = a.createGain();
  g.gain.value = 0.5 * (AMBIENCE_LEVEL[ambience.kind] ?? 2);
  g.connect(fxBus!);
  target = g;
  try {
    const k = ambience.kind;
    const r = Math.random();
    if (k === "birds") bird(a, t);
    else if (k === "crickets") {
      for (let i = 0; i < 6; i++)
        tone(a, "sine", 4300, 4300, t + i * 0.045, 0.03, 0.012, 0.004);
    } else if (k === "home") {
      // a quiet room: the clock ticking, now and then a bird outside the window
      if (r < 0.75)
        for (let i = 0; i < 4; i++)
          clickTick(a, t + i * 0.5, i % 2 ? 1700 : 2100);
      else bird(a, t, 0.5);
    } else if (k === "kitchen") {
      // breakfast: a glass of tea set on its saucer, a spoon stirring, the kettle simmering
      if (r < 0.4)
        bell(a, 2600 + Math.random() * 900, t, 0.35, 0.018, [1, 2.7]);
      else if (r < 0.7)
        for (let i = 0; i < 4; i++)
          bell(a, 3800 + Math.random() * 400, t + i * 0.12, 0.08, 0.008, [1]);
      else hiss(a, "bandpass", 1800, 2200, t, 1.6, 0.012, 2, 0.4);
    } else if (k === "village") {
      // a village or an old town: birds, a sheep's bell far away, a dog
      if (r < 0.6) bird(a, t, 0.8);
      else if (r < 0.85)
        for (let i = 0; i < 3; i++)
          bell(
            a,
            1150 + Math.random() * 80,
            t + i * (0.18 + Math.random() * 0.1),
            0.5,
            0.012,
            [1, 2.4, 3.9],
          );
      else
        for (let i = 0; i < 2; i++)
          tone(a, "sawtooth", 380, 300, t + i * 0.28, 0.09, 0.006, 0.01);
    } else if (k === "market") {
      // a market: people talking, a scale's pan, a cart
      murmur(a, t, 0.9);
      if (r < 0.35)
        bell(a, 1900 + Math.random() * 600, t + 0.4, 0.3, 0.01, [1, 2.6]);
    } else if (k === "school" || k === "hall") {
      // children talking and laughing nearby (a hall is fuller; a school yard has birds)
      murmur(a, t, k === "hall" ? 1.1 : 0.8);
      if (k === "school" && r < 0.3) bird(a, t + 0.6, 0.6);
      if (k === "hall" && r < 0.12)
        for (let i = 0; i < 18; i++)
          hiss(
            a,
            "bandpass",
            1800,
            1200,
            t + 0.5 + Math.random() * 1.1,
            0.03,
            0.012,
            1.2,
            0.001,
          );
    }
  } finally {
    target = null;
  }
}

/* ------------------------------------------------------------------ */
/* public API                                                          */
/* ------------------------------------------------------------------ */

export const sfx = {
  pop() {
    const a = audio();
    if (!a) return;
    tone(a, "sine", 520, 980, a.currentTime, 0.18, 0.3);
  },
  chime() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime;
    [N(15), N(19), N(22), N(27)].forEach((f, i) =>
      bell(a, f, t + i * 0.09, 0.9, 0.16, [1, 2.4]),
    );
  },
  slide() {
    const a = audio();
    if (!a) return;
    hiss(a, "bandpass", 1400, 600, a.currentTime, 0.28, 0.25, 0.9, 0.03);
  },
  /** The object's own sound. */
  item(id: string, n = 0) {
    const a = audio();
    if (!a) return;
    const r = ITEM_SOUNDS[id];
    if (!r) return sfx.twinkle(n);
    const g = a.createGain();
    g.gain.value = (LEVEL[id] ?? 1) * ITEM_GAIN;
    g.connect(fxBus!);
    // this object's sound goes through its own level, then the shared bus and reverb
    target = g;
    try {
      r(a, a.currentTime + 0.01);
    } finally {
      target = null;
    }
  },
  twinkle(n = 0) {
    const a = audio();
    if (!a) return;
    const scale = [784, 880, 988, 1175, 1319, 1568, 1760, 1976];
    bell(a, scale[n % scale.length], a.currentTime, 0.6, 0.2, [1, 2]);
  },
  /** A page riffle and a sparkle, for books. */
  shimmer() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime;
    for (let i = 0; i < 6; i++)
      hiss(a, "bandpass", 3200, 2000, t + i * 0.035, 0.05, 0.22, 1, 0.002);
    [N(15), N(19), N(22)].forEach((f, i) =>
      bell(a, f, t + 0.2 + i * 0.06, 0.7, 0.1, [1, 2.4]),
    );
  },
  /** A page turning: paper lifting with a little crinkle, a swish through the air, a soft landing. */
  pageTurn() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.02;
    const g = a.createGain();
    g.gain.value = PAGE_GAIN;
    g.connect(fxBus!);
    target = g;
    try {
      hiss(a, "bandpass", 800, 2800, t, 0.6, 0.2, 0.9, 0.16);
      for (let i = 0; i < 9; i++) {
        const d = 0.03 + Math.random() * 0.45;
        hiss(
          a,
          "highpass",
          3600 + Math.random() * 1600,
          2800,
          t + d,
          0.02 + Math.random() * 0.025,
          0.08 + Math.random() * 0.1,
          0.8,
          0.001,
        );
      }
      hiss(a, "lowpass", 500, 140, t + 0.62, 0.14, 0.28, 0.7, 0.004);
      tone(a, "sine", 150, 90, t + 0.62, 0.09, 0.07, 0.003);
    } finally {
      target = null;
    }
  },
  /** A short, friendly meow. */
  meow() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime;
    const o = a.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(520, t);
    o.frequency.linearRampToValueAtTime(820, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.5);
    const f = a.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 5;
    f.frequency.setValueAtTime(900, t);
    f.frequency.linearRampToValueAtTime(1800, t + 0.15);
    f.frequency.linearRampToValueAtTime(1000, t + 0.5);
    o.connect(f).connect(env(a, t, 0.35, 0.05, 0.55, out()));
    o.start(t);
    o.stop(t + 0.6);
  },
  tap() {
    const a = audio();
    if (a) tone(a, "sine", 420, 300, a.currentTime, 0.1, 0.2);
  },

  /* story sounds */
  /** A sound of the page's play (see SCENE_SOUNDS) in `delay` seconds; `rain` takes the shower's length. */
  scene(kind: string, delay = 0, seconds = 4) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + Math.max(0, delay);
    const g = a.createGain();
    g.gain.value = SCENE_GAIN * (SCENE_LEVEL[kind] ?? 1);
    g.connect(fxBus!);
    target = g;
    try {
      if (kind === "rain") rainSound(a, t, seconds);
      else SCENE_SOUNDS[kind]?.(a, t);
    } finally {
      target = null;
    }
  },
  /** Sounds of the place under the page (birds, crickets, home, kitchen, village, market, school, hall; null for none). */
  setAmbience(kind: string | null) {
    if (ambience?.kind === kind) return;
    if (ambience) window.clearInterval(ambience.timer);
    ambience = null;
    if (!kind) return;
    const odds: Record<string, number> = {
      crickets: 0.55,
      birds: 0.35,
      home: 0.3,
      kitchen: 0.4,
      village: 0.35,
      market: 0.6,
      school: 0.55,
      hall: 0.6,
    };
    ambience = {
      kind,
      timer: window.setInterval(
        () => Math.random() < (odds[kind] ?? 0.35) && ambienceTick(),
        1000,
      ),
    };
  },

  /* background music */
  get musicOn() {
    return music.on;
  },
  /** The music to play: a book's own tune, or null for the home page lullaby. */
  useMusic(track: Track | null) {
    if (music.track?.src === track?.src) return;
    music.track = track;
    if (ctx && track) void trackBuffer(ctx, track.src);
    if (music.on && ctx) {
      // fade the old piece out while the new one comes in
      endSession(ctx, music.session!, 1.2);
      music.session = null;
      music.on = false;
      sfx.startMusic();
    }
  },
  startMusic() {
    if (!unlocked) {
      if (!pendingUnlock.length) pendingUnlock.push(() => sfx.startMusic());
      return;
    }
    if (!store.settings.sound || !store.settings.music || music.on) return;
    const a = audio();
    if (!a) return;
    music.on = true;
    const gain = a.createGain();
    gain.connect(musicBus!);
    gain.gain.setValueAtTime(0, a.currentTime);
    gain.gain.linearRampToValueAtTime(
      music.track ? TRACK_LEVEL * (music.track.gain ?? 1) : 1,
      a.currentTime + 2.5,
    );
    music.session = {
      gain,
      track: music.track,
      sources: [],
      next: a.currentTime + 0.2,
      bar: 0,
      started: false,
    };
    musicBus!.gain.cancelScheduledValues(a.currentTime);
    musicBus!.gain.setValueAtTime(MUSIC_LEVEL, a.currentTime);
    scheduleMusic();
    window.clearInterval(music.timer);
    music.timer = window.setInterval(scheduleMusic, 400);
  },
  stopMusic(fade = 0.8) {
    pendingUnlock.length = 0;
    if (!music.on || !ctx) return;
    music.on = false;
    window.clearInterval(music.timer);
    if (music.session) endSession(ctx, music.session, fade);
    music.session = null;
  },
  /** Quieter music while a voice is speaking. */
  duck(on: boolean) {
    if (!ctx || !musicBus || !music.on) return;
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(
      on ? MUSIC_LEVEL * 0.45 : MUSIC_LEVEL,
      t + 0.4,
    );
  },
};

// pause the music while the tab is hidden
document.addEventListener("visibilitychange", () => {
  if (!ctx) return;
  if (document.hidden) void ctx.suspend();
  else if (store.settings.sound) void ctx.resume();
});
