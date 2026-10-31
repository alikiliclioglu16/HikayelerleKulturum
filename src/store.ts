import { treasureFor, treasureById } from './treasures';

/**
 * Everything is kept in this browser only (localStorage). No accounts, no cookies, no analytics.
 */
export interface Settings {
  rate: number;
  big: boolean;
  calm: boolean;
  sound: boolean;
  music: boolean;
}

/** A culture treasure in the Kelime Sandığı: when it was found and where (a book id or 'raf', the home shelf). */
export interface Found {
  at: number;
  from: string;
}

/** The word chest of earlier versions (any word; now only culture treasures are kept). */
interface OldChestWord {
  lemma: string;
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
  treasures: Record<string, Found>;
  progress: Record<string, BookProgress>;
  culture: string[];
  hints: string[];
}

const defaults: Data = {
  settings: { rate: 0.9, big: false, calm: false, sound: true, music: true },
  treasures: {},
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
    // old settings: English was removed, and every book is now read in its one (full) text
    for (const k of ['showEn', 'level', 'levelChosen']) delete (settings as unknown as Record<string, unknown>)[k];
    const culture = d.culture ?? [];
    const treasures: Record<string, Found> = { ...(d.treasures ?? {}) };
    // the old word chest: keep the words that are culture treasures, and everything found on the shelf
    const old = (d as { chest?: Record<string, OldChestWord> }).chest ?? {};
    for (const w of Object.values(old)) {
      const t = treasureFor(w.lemma);
      if (t && !treasures[t.id]) treasures[t.id] = { at: w.at, from: w.book === 'kultur-rafi' ? 'raf' : w.book };
    }
    for (const id of culture) if (treasureById(id) && !treasures[id]) treasures[id] = { at: 0, from: 'raf' };
    return {
      settings,
      treasures,
      progress: d.progress ?? {},
      culture,
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
  /** The culture treasures found so far (by treasure id). */
  get treasures() {
    return data.treasures;
  },
  get treasureCount() {
    return Object.keys(data.treasures).length;
  },
  /** Put a treasure in the chest; returns true the first time. */
  addTreasure(id: string, from: string): boolean {
    if (data.treasures[id] || !treasureById(id)) return false;
    data.treasures[id] = { at: Date.now(), from };
    save();
    return true;
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
