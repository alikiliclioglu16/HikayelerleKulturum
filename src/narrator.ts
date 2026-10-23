import type { PageAudio } from './types';
import { estimateMarks, type Token } from './text';

export interface NarrationHandlers {
  onWord: (wi: number) => void;
  onEnd: () => void;
}

/**
 * Reads a page aloud.
 * 1. Recorded narration (page.audio) with word marks, when a book provides it.
 * 2. Otherwise the device's Turkish voice (Web Speech API).
 * 3. Otherwise silent follow-along: words light up at reading pace so a parent can read aloud.
 */
export class Narrator {
  rate = 0.9;
  voice: SpeechSynthesisVoice | null = null;
  ready: Promise<SpeechSynthesisVoice | null>;
  /** True once the voice search has finished (so speech can start inside the tap handler). */
  resolved = false;
  private timers: number[] = [];
  private audio: HTMLAudioElement | null = null;
  private raf = 0;
  private session = 0;

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
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  play(tokens: Token[], plain: string, h: NarrationHandlers, audio?: PageAudio, fromWord = 0) {
    this.stop();
    const id = this.session;
    if (audio) return this.playAudio(audio, h, id, fromWord);
    if (this.voice) return this.playSpeech(tokens, plain, h, id, fromWord);
    return this.playSilent(tokens, h, id, fromWord);
  }

  private playAudio(audio: PageAudio, h: NarrationHandlers, id: number, fromWord: number) {
    const el = new Audio(audio.src);
    this.audio = el;
    el.playbackRate = Math.max(0.6, Math.min(1.3, this.rate / 0.9));
    el.currentTime = audio.marks[fromWord] ?? 0;
    let last = -1;
    const tick = () => {
      if (id !== this.session) return;
      const t = el.currentTime;
      let wi = 0;
      while (wi + 1 < audio.marks.length && audio.marks[wi + 1] <= t) wi++;
      if (wi !== last) {
        last = wi;
        h.onWord(wi);
      }
      this.raf = requestAnimationFrame(tick);
    };
    el.onended = () => {
      if (id === this.session) {
        cancelAnimationFrame(this.raf);
        h.onEnd();
      }
    };
    el.play().then(tick, () => this.playSilentFallback(h, id));
  }

  private playSilentFallback(h: NarrationHandlers, id: number) {
    if (id === this.session) h.onEnd();
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
