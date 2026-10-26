import type { LevelId } from './types';

/**
 * Everything is kept in this browser only (localStorage). No accounts, no cookies, no analytics.
 */
export interface Settings {
  level: LevelId;
  /** The reader has picked a reading level on the welcome screen (asked once, on the first visit). */
  levelChosen: boolean;
  rate: number;
  big: boolean;
  calm: boolean;
  sound: boolean;
  music: boolean;
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
  culture: string[];
  hints: string[];
}

const defaults: Data = {
  settings: { level: '2', levelChosen: false, rate: 0.9, big: false, calm: false, sound: true, music: true },
  chest: {},
  progress: {},
  culture: [],
  hints: [],
};

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    const d = JSON.parse(raw) as Partial<Data>;
    const settings = { ...defaults.settings, ...(d.settings ?? {}) };
    delete (settings as Partial<Settings> & { showEn?: boolean }).showEn; // an old setting (English was removed)
    return {
      settings,
      chest: d.chest ?? {},
      progress: d.progress ?? {},
      culture: d.culture ?? [],
      hints: d.hints ?? [],
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
  get culture() {
    return data.culture;
  },
  /** Mark a culture shelf item as discovered; returns true the first time. */
  discover(id: string): boolean {
    if (data.culture.includes(id)) return false;
    data.culture = [...data.culture, id];
    save();
    return true;
  },
  seenHint(id: string): boolean {
    return data.hints.includes(id);
  },
  markHint(id: string) {
    if (!data.hints.includes(id)) {
      data.hints = [...data.hints, id];
      save();
    }
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
