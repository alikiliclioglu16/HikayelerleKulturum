import type { Token } from '../text';

/**
 * The story text printed on the left page of the open book, like a real picture book: the title, the text set
 * in lines that fill the page, the word being read with a soft marker, glossary words with a dotted underline,
 * the page number and the Houston Education Attaché's logo in the corner.
 * Layout units: the page is 512 wide (canvas pixels are twice that); `boxes` gives each word's place, so a tap on
 * the page can find the word.
 */

export interface PageTextSpec {
  title: string;
  sub: string;
  tokens: Token[];
  /** Word indices (wi) that are glossary words. */
  gloss: Set<number>;
  /** A larger type (the reader's "Büyük" setting). */
  big?: boolean;
}

export interface WordBox {
  wi: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const INK = '#1C2540';
const RED = '#D2372C';
const TURQ = '#1FA59A';
const MARK = 'rgba(255, 205, 80, 0.75)';
const FLASH = 'rgba(120, 214, 208, 0.7)';
const LOGO_SRC = '/logo/houston-egitim-atasesi.webp';

let logoImg: HTMLImageElement | null = null;
/** The logo, loading once. */
export function pageLogo() {
  if (!logoImg) {
    logoImg = new Image();
    logoImg.src = LOGO_SRC;
  }
  return logoImg;
}

interface Piece {
  /** Text drawn for this piece (a word with the punctuation stuck to it). */
  text: string;
  /** Word tokens inside it with their offsets (layout units at the chosen size). */
  words: { wi: number; from: number; to: number }[];
  width: number;
}

interface Line {
  y: number;
  pieces: { piece: Piece; x: number }[];
}

export class PageText {
  boxes: WordBox[] = [];
  private lines: Line[] = [];
  private size = 24;
  private spec: PageTextSpec | null = null;

  constructor(
    readonly W: number,
    readonly H: number,
  ) {}

  /** Lay out the text at the largest size that fills the page without running past the bottom. */
  setText(g: CanvasRenderingContext2D, spec: PageTextSpec) {
    this.spec = spec;
    const max = spec.big ? 34 : 30;
    for (let size = max; size >= 15; size -= 1) {
      if (this.layout(g, spec, size)) return;
    }
    this.layout(g, spec, 15, true);
  }

  private font(size: number) {
    return `700 ${size}px "Andika", system-ui, sans-serif`;
  }

  /** Words with the punctuation around them, split at spaces. */
  private pieces(g: CanvasRenderingContext2D, tokens: Token[]): Piece[] {
    const out: Piece[] = [];
    let cur: { text: string; words: { wi: number; start: number; end: number }[] } | null = null;
    const flush = () => {
      if (!cur) return;
      const words = cur.words.map((w) => ({ wi: w.wi, from: g.measureText(cur!.text.slice(0, w.start)).width, to: g.measureText(cur!.text.slice(0, w.end)).width }));
      out.push({ text: cur.text, words, width: g.measureText(cur.text).width });
      cur = null;
    };
    for (const t of tokens) {
      if (t.kind === 'space') {
        flush();
        continue;
      }
      cur ??= { text: '', words: [] };
      if (t.kind === 'word') cur.words.push({ wi: t.wi!, start: cur.text.length, end: cur.text.length + t.text.length });
      cur.text += t.text;
    }
    flush();
    return out;
  }

  /** The text area: below the title, above the page number; lines next to the logo are shorter. */
  private area() {
    const left = 46;
    const right = this.W - 58;
    const logoTop = this.H - 26 - 14 - 92 - 8;
    return { left, right, top: 128, bottom: this.H - 64, logoTop, logoLeft: this.W - 26 - 18 - 72 - 12 };
  }

  private layout(g: CanvasRenderingContext2D, spec: PageTextSpec, size: number, force = false) {
    g.font = this.font(size);
    const a = this.area();
    const lh = size * 1.48;
    const space = g.measureText(' ').width;
    const pieces = this.pieces(g, spec.tokens);
    const lines: Line[] = [];
    let y = a.top + size;
    let line: Line = { y, pieces: [] };
    let x = a.left;
    const limit = (yy: number) => (yy + size * 0.3 > a.logoTop ? a.logoLeft : a.right);
    for (const p of pieces) {
      if (line.pieces.length && x + p.width > limit(y)) {
        lines.push(line);
        y += lh;
        line = { y, pieces: [] };
        x = a.left;
      }
      line.pieces.push({ piece: p, x });
      x += p.width + space;
    }
    if (line.pieces.length) lines.push(line);
    if (!force && y + size * 0.35 > a.bottom) return false;
    this.size = size;
    this.lines = lines;
    this.boxes = [];
    for (const l of lines)
      for (const { piece, x: px } of l.pieces)
        for (const w of piece.words) this.boxes.push({ wi: w.wi, x: px + w.from, y: l.y - size * 0.95, w: w.to - w.from, h: size * 1.3 });
    return true;
  }

  /** Draw the page: `now` is the word being read (-1 for none), `flash` words light up after a tap. */
  draw(g: CanvasRenderingContext2D, now: number, flash: Set<number>) {
    const spec = this.spec;
    if (!spec) return;
    const { W, H } = this;
    const cx = W / 2 - 8;
    // title
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillStyle = RED;
    let ts = 36;
    g.font = `600 ${ts}px "DynaPuff", system-ui`;
    while (g.measureText(spec.title).width > W - 120 && ts > 22) {
      ts -= 2;
      g.font = `600 ${ts}px "DynaPuff", system-ui`;
    }
    g.fillText(spec.title, cx, 92);
    // a small tulip line under the title
    g.strokeStyle = 'rgba(210, 55, 44, 0.35)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx - 70, 108);
    g.lineTo(cx - 14, 108);
    g.moveTo(cx + 14, 108);
    g.lineTo(cx + 70, 108);
    g.stroke();
    g.fillStyle = RED;
    g.beginPath();
    g.arc(cx, 108, 4, 0, Math.PI * 2);
    g.fill();
    // markers behind the words
    const size = this.size;
    for (const b of this.boxes) {
      const lit = b.wi === now ? MARK : flash.has(b.wi) ? FLASH : null;
      if (!lit) continue;
      g.fillStyle = lit;
      g.beginPath();
      g.roundRect(b.x - 4, b.y, b.w + 8, b.h, 8);
      g.fill();
    }
    // the text
    g.textAlign = 'left';
    g.font = this.font(size);
    g.fillStyle = INK;
    for (const l of this.lines) for (const { piece, x } of l.pieces) g.fillText(piece.text, x, l.y);
    // dotted underline under glossary words
    g.fillStyle = TURQ;
    const dot = Math.max(1.6, size * 0.075);
    for (const b of this.boxes) {
      if (!spec.gloss.has(b.wi)) continue;
      const y = b.y + size * 1.17;
      for (let x = b.x + dot; x < b.x + b.w; x += dot * 3) {
        g.beginPath();
        g.arc(x, y, dot, 0, Math.PI * 2);
        g.fill();
      }
    }
    // page number and logo
    g.fillStyle = '#4A5675';
    g.font = '20px "Andika", system-ui';
    g.fillText(spec.sub, 50, H - 44);
    const img = pageLogo();
    if (img.complete && img.naturalWidth) {
      const lh = 92;
      const lw = (img.naturalWidth / img.naturalHeight) * lh;
      g.drawImage(img, W - 26 - 18 - lw, H - 26 - 14 - lh, lw, lh);
    }
  }

  /** The word under a point of the page (layout units), with a little slack. */
  hit(x: number, y: number) {
    let best: WordBox | null = null;
    let bd = 14;
    for (const b of this.boxes) {
      const dx = x < b.x ? b.x - x : x > b.x + b.w ? x - b.x - b.w : 0;
      const dy = y < b.y ? b.y - y : y > b.y + b.h ? y - b.y - b.h : 0;
      const d = Math.hypot(dx, dy);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }
}
