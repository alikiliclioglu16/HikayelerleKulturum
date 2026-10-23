import type { LevelId } from './types';

/**
 * Everything is kept in this browser only (localStorage). No accounts, no cookies, no analytics.
 */
export interface Settings {
  level: LevelId;
  rate: number;
  big: boolean;
  showEn: boolean;
  calm: boolean;
}

export interface ChestWord {
  lemma: string;
  en: string;
  icon?: string;
  book: string;
  at: number;
}

export interface BookProgress {
  page: number;
  read: string[];
  quiz?: number;
  hunt?: boolean;
  done?: boolean;
}

const KEY = 'hk:v1';

interface Data {
  settings: Settings;
  chest: Record<string, ChestWord>;
  progress: Record<string, BookProgress>;
}

const defaults: Data = {
  settings: { level: '2', rate: 0.9, big: false, showEn: false, calm: false },
  chest: {},
  progress: {},
};

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    const d = JSON.parse(raw) as Partial<Data>;
    return {
      settings: { ...defaults.settings, ...(d.settings ?? {}) },
      chest: d.chest ?? {},
      progress: d.progress ?? {},
    };
  } catch {
    return structuredClone(defaults);
  }
}

let data = load();
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage can be unavailable (private mode); the app still works for this visit */
  }
  listeners.forEach((l) => l());
}

export const store = {
  get settings() {
    return data.settings;
  },
  setSettings(patch: Partial<Settings>) {
    data.settings = { ...data.settings, ...patch };
    save();
  },
  get chest() {
    return data.chest;
  },
  addWord(w: ChestWord): boolean {
    if (data.chest[w.lemma]) return false;
    data.chest[w.lemma] = w;
    save();
    return true;
  },
  removeWord(lemma: string) {
    delete data.chest[lemma];
    save();
  },
  progress(book: string): BookProgress {
    return data.progress[book] ?? { page: 0, read: [] };
  },
  setProgress(book: string, patch: Partial<BookProgress>) {
    data.progress[book] = { ...store.progress(book), ...patch };
    save();
  },
  markRead(book: string, pageId: string) {
    const p = store.progress(book);
    if (!p.read.includes(pageId)) store.setProgress(book, { read: [...p.read, pageId] });
  },
  reset() {
    data = structuredClone(defaults);
    save();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
