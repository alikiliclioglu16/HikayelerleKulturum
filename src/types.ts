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

/** A 3D model (GLB) standing on the pop-up page. */
export interface PageModel {
  src: string;
  /** Glossary word said when the model is tapped. */
  word?: string;
  /** Horizontal position from the page centre (-0.5 left edge … 0.5 right edge). */
  x: number;
  /** Depth from the back of the page (0) to the front (1). */
  z: number;
  /** Height in page widths. */
  h: number;
  /** Turn, in degrees (0 faces the reader). */
  rotY?: number;
  /** Animation clip name, or "none" to stand still. */
  anim?: string;
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
  /** Optional 3D models (GLB) on the pop-up, e.g. animals or characters. */
  models?: PageModel[];
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
  /** An animated 3D character that stands next to the book on the home shelf. */
  hero?: string;
  cover: { art: string; color?: string; motif?: string; src?: string };
}
