import type { PageAudio } from './types';
import { estimateMarks, type Token } from './text';

export interface NarrationHandlers {
  onWord: (wi: number) => void;
  onEnd: () => void;
  /** The browser wants a new tap before it plays the recording (some phones after a while). */
  onBlocked?: () => void;
}

/**
 * Reads a page aloud.
 * 1. Recorded narration (page.audio) with word marks, when a book provides it.
 * 2. Otherwise the device's Turkish voice (Web Speech API).
 * 3. Otherwise silent follow-along: words light up at reading pace so a parent can read aloud.
 */
export class Narrator {
  private speedRate = 0.9;
  voice: SpeechSynthesisVoice | null = null;
  ready: Promise<SpeechSynthesisVoice | null>;
  /** True once the voice search has finished (so speech can start inside the tap handler). */
  resolved = false;
  private timers: number[] = [];
  /**
   * One sound element for every recorded page: once a tap has started it, phones let the same element
   * go on to the next page by itself (a new element would wait for another tap).
   */
  private el: HTMLAudioElement | null = null;
  private loaded = '';
  /** The recording being read now. */
  private audio: PageAudio | null = null;
  private raf = 0;
  private session = 0;

  get rate() {
    return this.speedRate;
  }

  /** Reading speed (0.6–1.2, 0.9 is normal); a recording follows it at once, keeping the voice's pitch. */
  set rate(v: number) {
    this.speedRate = v;
    if (this.el && this.audio) this.el.playbackRate = this.speed;
  }

  /** Playback speed of the recordings (1 at the normal reading speed). */
  get speed() {
    return Math.max(0.6, Math.min(1.3, this.speedRate / 0.9));
  }

  private element() {
    if (!this.el) {
      this.el = new Audio();
      this.el.preload = 'auto';
      this.el.preservesPitch = true;
    }
    return this.el;
  }

  private load(src: string) {
    const el = this.element();
    if (this.loaded !== src) {
      this.loaded = src;
      el.src = src;
    }
    return el;
  }

  /** Start loading a page's recording, so the voice starts as soon as the play button is pressed. */
  preload(audio?: PageAudio) {
    if (audio && !this.audio) this.load(audio.src);
  }

  constructor() {
    this.ready = this.findVoice().then((v) => {
      this.resolved = true;
      return v;
    });
  }

  private findVoice(): Promise<SpeechSynthesisVoice | null> {
    if (!('speechSynthesis' in window)) return Promise.resolve(null);
    const choose = () => {
      const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('tr'));
      if (!voices.length) return null;
      const score = (v: SpeechSynthesisVoice) =>
        (/natural|online|neural|premium|enhanced/i.test(v.name) ? 4 : 0) + (/yelda|emel|google|seda/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
      return voices.sort((a, b) => score(b) - score(a))[0];
    };
    return new Promise((resolve) => {
      const now = choose();
      if (now || speechSynthesis.getVoices().length) {
        this.voice = now;
        resolve(now);
        return;
      }
      const done = () => {
        this.voice = choose();
        resolve(this.voice);
      };
      speechSynthesis.addEventListener('voiceschanged', done, { once: true });
      setTimeout(done, 1500);
    });
  }

  get mode(): 'voice' | 'silent' {
    return this.voice ? 'voice' : 'silent';
  }

  stop() {
    this.session++;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    cancelAnimationFrame(this.raf);
    if (this.el) {
      this.el.onended = null;
      this.el.onerror = null;
      this.el.ontimeupdate = null;
      if (!this.el.paused) this.el.pause();
    }
    this.audio = null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  play(tokens: Token[], plain: string, h: NarrationHandlers, audio?: PageAudio, fromWord = 0) {
    this.stop();
    const id = this.session;
    if (audio) return this.playAudio(audio, tokens, plain, h, id, fromWord);
    this.playVoice(tokens, plain, h, id, fromWord);
  }

  private playVoice(tokens: Token[], plain: string, h: NarrationHandlers, id: number, fromWord: number) {
    if (this.voice) return this.playSpeech(tokens, plain, h, id, fromWord);
    return this.playSilent(tokens, h, id, fromWord);
  }

  private playAudio(audio: PageAudio, tokens: Token[], plain: string, h: NarrationHandlers, id: number, fromWord: number) {
    const el = this.load(audio.src);
    this.audio = audio;
    el.defaultPlaybackRate = this.speed;
    el.playbackRate = this.speed;
    // from the very beginning (the recording starts with a breath of silence) or from a word
    const from = fromWord > 0 ? (audio.marks[fromWord] ?? 0) : 0;
    try {
      if (Math.abs(el.currentTime - from) > 0.01) el.currentTime = from;
    } catch {
      /* not loaded yet: it starts from the beginning */
    }
    let last = -1;
    const update = (t: number) => {
      let wi = 0;
      while (wi + 1 < audio.marks.length && audio.marks[wi + 1] <= t) wi++;
      if (wi !== last) {
        last = wi;
        h.onWord(wi);
      }
    };
    const tick = () => {
      if (id !== this.session) return;
      update(el.currentTime);
      this.raf = requestAnimationFrame(tick);
    };
    // also when the screen draws slowly (a busy scene, a tab in the background)
    el.ontimeupdate = () => id === this.session && !el.paused && update(el.currentTime);
    el.onended = () => {
      if (id !== this.session) return;
      cancelAnimationFrame(this.raf);
      // the last words count as read, so the moves that wait for them still happen
      update(Infinity);
      this.audio = null;
      h.onEnd();
    };
    // the file could not be loaded (offline…): read the page with the device's voice instead
    let failed = false;
    const fallback = () => {
      if (failed || id !== this.session) return;
      failed = true;
      cancelAnimationFrame(this.raf);
      el.onended = null;
      el.onerror = null;
      el.ontimeupdate = null;
      this.audio = null;
      this.loaded = '';
      this.playVoice(tokens, plain, h, id, Math.max(0, last));
    };
    el.onerror = fallback;
    el.play().then(
      () => id === this.session && tick(),
      (e: unknown) => {
        if (id !== this.session) return;
        if ((e as DOMException)?.name === 'NotAllowedError' && h.onBlocked) {
          this.audio = null;
          h.onBlocked();
        } else if ((e as DOMException)?.name !== 'AbortError') fallback();
      },
    );
  }

  private playSpeech(tokens: Token[], plain: string, h: NarrationHandlers, id: number, fromWord: number) {
    const words = tokens.filter((t) => t.kind === 'word');
    const startChar = words[fromWord]?.start ?? 0;
    // speak sentence by sentence: long utterances get cut off in some browsers
    const chunks: { text: string; offset: number }[] = [];
    const re = /[^.!?…]+(?:[.!?…]+['"’”]*)?\s*/g;
    for (const m of plain.matchAll(re)) {
      const offset = m.index ?? 0;
      const end = offset + m[0].length;
      if (end <= startChar) continue;
      const from = Math.max(offset, startChar);
      const text = plain.slice(from, end);
      if (text.trim()) chunks.push({ text, offset: from });
    }
    let gotBoundary = false;
    const fallback = estimateMarks(tokens, this.rate);
    const scheduleEstimate = (chunkOffset: number) => {
      // until the voice reports word boundaries, follow an estimated pace
      const first = words.findIndex((w) => w.start >= chunkOffset);
      if (first < 0) return;
      const base = fallback[first];
      for (let wi = first; wi < words.length; wi++) {
        const t = (fallback[wi] - base) * 1000;
        this.timers.push(window.setTimeout(() => {
          if (!gotBoundary && id === this.session) h.onWord(wi);
        }, t));
      }
    };
    chunks.forEach((chunk, ci) => {
      const u = new SpeechSynthesisUtterance(chunk.text);
      u.voice = this.voice;
      u.lang = this.voice?.lang ?? 'tr-TR';
      u.rate = this.rate;
      u.onstart = () => {
        if (id !== this.session) return;
        if (!gotBoundary) {
          this.timers.forEach((t) => clearTimeout(t));
          this.timers = [];
          scheduleEstimate(chunk.offset);
        }
      };
      u.onboundary = (e) => {
        if (id !== this.session) return;
        if (e.name && e.name !== 'word') return;
        if (!gotBoundary) {
          gotBoundary = true;
          this.timers.forEach((t) => clearTimeout(t));
          this.timers = [];
        }
        const ch = chunk.offset + e.charIndex;
        const w = words.find((t) => ch >= t.start && ch < t.end) ?? words.find((t) => t.start >= ch);
        if (w?.wi !== undefined) h.onWord(w.wi);
      };
      if (ci === chunks.length - 1) {
        u.onend = () => {
          if (id === this.session) h.onEnd();
        };
      }
      speechSynthesis.speak(u);
    });
    if (!chunks.length) h.onEnd();
  }

  private playSilent(tokens: Token[], h: NarrationHandlers, id: number, fromWord: number) {
    const marks = estimateMarks(tokens, this.rate * 0.85);
    const base = marks[fromWord] ?? 0;
    const wordsCount = tokens.filter((t) => t.kind === 'word').length;
    for (let wi = fromWord; wi < wordsCount; wi++) {
      this.timers.push(window.setTimeout(() => id === this.session && h.onWord(wi), (marks[wi] - base) * 1000));
    }
    this.timers.push(window.setTimeout(() => id === this.session && h.onEnd(), (marks[wordsCount] - base) * 1000 + 300));
  }

  /** Say a single word or phrase (tap on a word). */
  say(text: string) {
    if (!this.voice || !('speechSynthesis' in window)) return false;
    this.stop();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = this.voice;
    u.lang = this.voice.lang;
    u.rate = Math.min(this.rate, 0.85);
    speechSynthesis.speak(u);
    return true;
  }
}
