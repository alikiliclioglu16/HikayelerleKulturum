import type { Token } from '../text';

/**
 * The story text printed on a pop-up card that stands up on the left page of the open book, facing the reader
 * like the picture on the right page: a parchment card with an arched top, a cobalt and red border with tulips,
 * the title, the text set in lines that fill the card, the word being read with a soft marker, glossary words
 * with a dotted underline and the page number (the Houston Education Attaché's logo is printed on the page in front).
 * Layout units: the card is W wide (canvas pixels are twice that); `boxes` gives each word's place, so a tap on
 * the card can find the word.
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

const INK = '#101018';
const RED = '#C8261F';
const COBALT = '#1C3F8C';
const TURQ = '#138A80';
const MARK = 'rgba(255, 196, 46, 0.8)';
const FLASH = 'rgba(96, 206, 198, 0.75)';
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

/** A little tulip, the motif of the border (centre x, bottom y, height). */
export function tulip(g: CanvasRenderingContext2D, x: number, y: number, h: number, color: string) {
  g.save();
  g.translate(x, y);
  g.scale(h / 100, h / 100);
  g.strokeStyle = '#2F8A4A';
  g.lineWidth = 6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, -44);
  g.stroke();
  g.fillStyle = '#2F8A4A';
  g.beginPath();
  g.ellipse(-12, -22, 13, 6, -0.7, 0, Math.PI * 2);
  g.ellipse(12, -26, 13, 6, 0.7, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(-20, -86);
  g.lineTo(-10, -70);
  g.lineTo(0, -92);
  g.lineTo(10, -70);
  g.lineTo(20, -86);
  g.quadraticCurveTo(24, -50, 0, -42);
  g.quadraticCurveTo(-24, -50, -20, -86);
  g.fill();
  g.restore();
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

  /** The card's outline: straight sides, rounded bottom corners, a gentle arch on top. */
  private outline(g: CanvasRenderingContext2D, inset: number) {
    const { W, H } = this;
    const r = 26 - inset * 0.3;
    const top = 26 + inset;
    const peak = 4 + inset;
    g.beginPath();
    g.moveTo(inset, H - inset - r);
    g.lineTo(inset, top + r);
    g.quadraticCurveTo(inset, top, inset + r, top);
    g.quadraticCurveTo(W / 2, peak - 6, W - inset - r, top);
    g.quadraticCurveTo(W - inset, top, W - inset, top + r);
    g.lineTo(W - inset, H - inset - r);
    g.quadraticCurveTo(W - inset, H - inset, W - inset - r, H - inset);
    g.lineTo(inset + r, H - inset);
    g.quadraticCurveTo(inset, H - inset, inset, H - inset - r);
    g.closePath();
  }

  /** Lay out the text at the largest size that fills the card without running past the bottom. */
  setText(g: CanvasRenderingContext2D, spec: PageTextSpec) {
    this.spec = spec;
    const max = spec.big ? 34 : 30;
    for (let size = max; size >= 14; size -= 1) {
      if (this.layout(g, spec, size)) return;
    }
    this.layout(g, spec, 14, true);
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
      const c = cur;
      const words = c.words.map((w) => ({ wi: w.wi, from: g.measureText(c.text.slice(0, w.start)).width, to: g.measureText(c.text.slice(0, w.end)).width }));
      out.push({ text: c.text, words, width: g.measureText(c.text).width });
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

  /** The text area: below the title, above the page number. */
  private area() {
    const { W, H } = this;
    return { left: W * 0.075, right: W * 0.925, top: H * 0.175, bottom: H * 0.9 };
  }

  private layout(g: CanvasRenderingContext2D, spec: PageTextSpec, size: number, force = false) {
    g.font = this.font(size);
    const a = this.area();
    const lh = size * 1.38;
    const space = g.measureText(' ').width;
    const pieces = this.pieces(g, spec.tokens);
    const lines: Line[] = [];
    let y = a.top + size;
    let line: Line = { y, pieces: [] };
    let x = a.left;
    const limit = () => a.right;
    for (const p of pieces) {
      if (line.pieces.length && x + p.width > limit()) {
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

  /** The parchment card with its border (transparent outside the arched outline). */
  private paper(g: CanvasRenderingContext2D) {
    const { W, H } = this;
    g.clearRect(0, 0, W, H);
    // a soft drop shadow inside the canvas edge, so the card reads as thick paper
    this.outline(g, 2);
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#FFF9EC');
    grd.addColorStop(1, '#FBEFD6');
    g.fillStyle = grd;
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(120, 84, 40, 0.45)';
    g.stroke();
    // cobalt and red frame
    this.outline(g, 14);
    g.lineWidth = 5;
    g.strokeStyle = COBALT;
    g.stroke();
    this.outline(g, 22);
    g.lineWidth = 2;
    g.strokeStyle = RED;
    g.stroke();
    // tulips at the top and in the bottom corners, little dots on the sides
    tulip(g, W / 2, 38, 24, RED);
    tulip(g, 46, H - 34, 26, RED);
    tulip(g, W - 46, H - 34, 26, '#E9A23B');
    g.fillStyle = COBALT;
    for (let y = H * 0.2; y < H * 0.85; y += H * 0.1) {
      for (const x of [14, W - 14]) {
        g.beginPath();
        g.arc(x, y, 2.6, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  /** Draw the card: `now` is the word being read (-1 for none), `flash` words light up after a tap. */
  draw(g: CanvasRenderingContext2D, now: number, flash: Set<number>) {
    const spec = this.spec;
    this.paper(g);
    if (!spec) return;
    const { W, H } = this;
    // title
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillStyle = RED;
    let ts = 36;
    g.font = `600 ${ts}px "DynaPuff", system-ui`;
    while (g.measureText(spec.title).width > W * 0.8 && ts > 22) {
      ts -= 2;
      g.font = `600 ${ts}px "DynaPuff", system-ui`;
    }
    g.fillText(spec.title, W / 2, H * 0.145);
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
    // the text, bold and nearly black (a hairline stroke makes it a touch heavier still)
    g.textAlign = 'left';
    g.font = this.font(size);
    g.fillStyle = INK;
    g.strokeStyle = INK;
    g.lineWidth = Math.max(0.6, size * 0.035);
    g.lineJoin = 'round';
    for (const l of this.lines)
      for (const { piece, x } of l.pieces) {
        g.fillText(piece.text, x, l.y);
        g.strokeText(piece.text, x, l.y);
      }
    // dotted underline under glossary words
    g.fillStyle = TURQ;
    const dot = Math.max(1.8, size * 0.08);
    for (const b of this.boxes) {
      if (!spec.gloss.has(b.wi)) continue;
      const y = b.y + size * 1.17;
      for (let x = b.x + dot; x < b.x + b.w; x += dot * 3) {
        g.beginPath();
        g.arc(x, y, dot, 0, Math.PI * 2);
        g.fill();
      }
    }
    // page number
    g.fillStyle = '#3A4466';
    g.font = '700 19px "Andika", system-ui';
    g.textAlign = 'center';
    g.fillText(spec.sub, W / 2, H * 0.955);
  }

  /** The word under a point of the card (layout units), with a little slack. */
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
