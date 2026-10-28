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
  /** Only used for the small pictures in the activities (the 3D models play this part in the book). */
  thumbOnly?: boolean;
}

/** A 3D model (GLB) standing on the pop-up page. */
export interface PageModel {
  /** A GLB model … */
  src?: string;
  /** … or a piece of the set drawn in code: "bed", "blanket", "nightstand". */
  proc?: string;
  /** Glossary word said when the model is tapped. */
  word?: string;
  /** Horizontal position from the page centre (-0.5 left edge … 0.5 right edge). */
  x: number;
  /** Depth from the back of the page (0) to the front (1). */
  z: number;
  /** Height in page widths. */
  h: number;
  /** Optional largest width/depth in page widths (for flat things like a rug). */
  w?: number;
  /** Height above the page, e.g. a teapot standing on a table model. */
  y?: number;
  /** Turn, in degrees (0 faces the reader). */
  rotY?: number;
  /** Animation clip name (or part of it, e.g. "talk"), or "none" to stand still. */
  anim?: string;
  /** Walk from (x, z) to this point, playing the walk clip, then switch to `anim` (or idle). */
  walkTo?: [number, number];
  /** Keep walking back and forth between the start and `walkTo` (for animals). */
  patrol?: boolean;
  /** Clip used while walking (default "walk"; "run" makes a character run). */
  walkAnim?: string;
  /** Walking speed in page widths per second (default 0.11). */
  speed?: number;
  /** Turn to face this angle (degrees) after walking. */
  endRotY?: number;
  /** Seconds to wait before appearing. */
  delay?: number;
  /** Colour the model, e.g. "#D07A45" turns a grey pot into a copper cauldron. */
  tint?: string;
  /** A name for beats: a magic thing that takes part in the story (appear, rise, ring, shine … in three/acts.ts). */
  id?: string;
  /** With `id`: not there until a beat makes it appear or rise. */
  hidden?: boolean;
  /** With `id`: starts this far from its place ([x, y, z] in page widths) until a beat moves it (e.g. the sun rising). */
  from?: [number, number, number];
  /** A table: things put down above it land on its top, this far up its height (0..1). */
  top?: number;
  /** Gentle life for still objects: trees sway, a pot wobbles, a lantern swings, a plant breathes. */
  fx?: 'sway' | 'wobble' | 'swing' | 'breathe' | 'bob' | 'spin' | 'grow';
}

/** A 3D object on the reading table, around the book (world units, the book is 2 wide). */
export interface TableModel {
  /** A GLB model … */
  src?: string;
  /** … or one of the culture objects drawn in code (e.g. "lale", "nazar", "lokum", "lamba" for the mosaic lamp). */
  proc?: string;
  word?: string;
  x: number;
  z: number;
  h: number;
  w?: number;
  rotY?: number;
  /** Steam rising from a hot drink. */
  steam?: boolean;
}

/** A character on a page and how it starts. */
export interface CastMember {
  id: string;
  x: number;
  z: number;
  /** Height above the page (e.g. lying on a bed). */
  y?: number;
  rotY?: number;
  /** Starting pose: "stand", "lying", "sitBed" … (see POSES in three/acts.ts). */
  pose?: string;
  /** 0 = standing, 1 = lying on its back. */
  lie?: number;
  eyes?: number;
  look?: string | null;
  /** Something in the hands from the start (see HELD in three/props.ts). */
  hold?: string;
  /** Acts inside the tablet screen (a video call) instead of on the page. */
  screen?: boolean;
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
  /** Story characters (rigged 3D models) acting on this page. */
  cast?: CastMember[];
  /** What the characters do, in story order; each beat starts at its cue word. */
  beats?: import('./three/acts').Beat[];
  /** Named spots the characters can look at or walk to: [x, y, z] in page coordinates (like models). */
  spots?: Record<string, [number, number, number]>;
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
  /** Culture objects on the reading table (defaults to a tea set and simit). */
  table?: TableModel[];
  /** Book cover colour in the reader. */
  coverColor?: string;
}

export interface BookListing {
  id: string;
  status: 'ready' | 'soon';
  title: string;
  titleEn: string;
  pages?: number;
  values: string[];
  blurb: Bi;
  /** The wall carpet shown while this book is chosen: a kilim motif and colours, or a picture (`src`, see public/halilar). */
  carpet?: { motif: string; field?: string; border?: string; src?: string; inset?: [number, number, number, number] };
  /** An animated 3D character that stands next to the book on the home shelf. */
  hero?: string;
  /**
   * The cover: drawn in code (`art`), or a picture (`src`, in the book's folder). `model` is a sculpted 3D book
   * (GLB) shown on the home shelf, and `live` says which parts of its cover move (see home3d/livingCover.ts).
   */
  cover: { art: string; color?: string; motif?: string; src?: string; model?: string; live?: import('./home3d/livingCover').LiveCover };
}
