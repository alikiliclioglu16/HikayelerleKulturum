export type LevelId = '1' | '2' | '3';

export interface Bi {
  tr: string;
  en: string;
}

/** A clickable area on a pop-up layer, in 0..1 layer coordinates (x, y from top-left, w, h). */
export interface Hotspot {
  word: string;
  rect: [number, number, number, number];
}

/**
 * One standing pop-up layer on the right page.
 * Either `art` (a procedural illustration from src/art) or `src` (an image file, e.g. from ChatGPT/Gemini).
 */
export interface LayerSpec {
  art?: string;
  src?: string;
  /** Position from the back of the page (0) to the front (1). */
  z: number;
  /** Width as a fraction of the page width. */
  w: number;
  /** Height in page widths. */
  h: number;
  /** Horizontal offset from the page centre, in page widths. */
  x?: number;
  hotspots?: Hotspot[];
}

export interface PageAudio {
  src: string;
  /** Start time in seconds of every word token, in reading order. */
  marks: number[];
}

export interface PageData {
  id: string;
  scene: string;
  title: Bi;
  text: Record<LevelId, Bi>;
  culture?: Bi;
  /** Optional image-based layers; when missing the procedural scene is used. */
  layers?: LayerSpec[];
  /** Optional recorded narration per level. */
  audio?: Partial<Record<LevelId, PageAudio>>;
}

export interface QuizItem {
  q: Bi;
  options: Bi[];
  answer: number;
  page?: string;
}

export interface ValueHuntItem {
  page: string;
  answer: string;
  options: string[];
  why: Bi;
}

export interface Book {
  id: string;
  title: string;
  titleEn: string;
  culture: Bi;
  summary: Bi;
  values: string[];
  pages: PageData[];
  glossary: Record<string, { en: string; icon?: string }>;
  quiz: QuizItem[];
  valueHunt: ValueHuntItem[];
  family: { task: Bi; talk: Bi[] };
}

export interface BookListing {
  id: string;
  status: 'ready' | 'soon';
  title: string;
  titleEn: string;
  pages?: number;
  values: string[];
  blurb: Bi;
  cover: { art: string; color?: string; motif?: string; src?: string };
}
