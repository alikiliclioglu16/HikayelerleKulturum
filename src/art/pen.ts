import type { Hotspot } from '../types';

/**
 * A tiny drawing helper. Everything is drawn in "units": the layer is always 1000 units wide,
 * and as tall as its aspect ratio says. Hotspots are collected while drawing.
 */
export class Pen {
  readonly canvas: HTMLCanvasElement;
  readonly c: CanvasRenderingContext2D;
  readonly W = 1000;
  readonly H: number;
  readonly s: number;
  readonly hotspots: Hotspot[] = [];

  constructor(pxWidth: number, aspect: number) {
    this.H = Math.round(1000 * aspect);
    this.canvas = document.createElement('canvas');
    this.canvas.width = pxWidth;
    this.canvas.height = Math.round(pxWidth * aspect);
    this.s = pxWidth / 1000;
    this.c = this.canvas.getContext('2d', { willReadFrequently: false })!;
    this.c.setTransform(this.s, 0, 0, this.s, 0, 0);
    this.c.lineJoin = 'round';
    this.c.lineCap = 'round';
  }

  hot(word: string, x: number, y: number, w: number, h: number) {
    this.hotspots.push({ word, rect: [x / this.W, y / this.H, w / this.W, h / this.H] });
  }

  rect(x: number, y: number, w: number, h: number, fill: string, r = 0) {
    const c = this.c;
    c.beginPath();
    if (r > 0) c.roundRect(x, y, w, h, r);
    else c.rect(x, y, w, h);
    c.fillStyle = fill;
    c.fill();
  }

  circle(x: number, y: number, r: number, fill: string) {
    const c = this.c;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
  }

  ellipse(x: number, y: number, rx: number, ry: number, fill: string, rot = 0) {
    const c = this.c;
    c.beginPath();
    c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
  }

  poly(pts: number[], fill: string) {
    const c = this.c;
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }

  line(pts: number[], stroke: string, width: number) {
    const c = this.c;
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }

  curve(pts: number[], stroke: string, width: number) {
    // quadratic chain through midpoints for smooth strokes
    const c = this.c;
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length - 2; i += 2) {
      const mx = (pts[i] + pts[i + 2]) / 2;
      const my = (pts[i + 1] + pts[i + 3]) / 2;
      c.quadraticCurveTo(pts[i], pts[i + 1], mx, my);
    }
    c.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }

  shape(fill: string, draw: (c: CanvasRenderingContext2D) => void) {
    const c = this.c;
    c.beginPath();
    draw(c);
    c.fillStyle = fill;
    c.fill();
  }

  /** Arched panel: the standard silhouette of a back layer. */
  arch(x: number, y: number, w: number, h: number, fill: string | CanvasGradient, pointed = false) {
    const c = this.c;
    c.beginPath();
    const r = w / 2;
    c.moveTo(x, y + h);
    c.lineTo(x, y + r * 0.6);
    if (pointed) {
      c.quadraticCurveTo(x, y, x + r, y - r * 0.05);
      c.quadraticCurveTo(x + w, y, x + w, y + r * 0.6);
    } else {
      c.bezierCurveTo(x, y + r * 0.6 - r * 0.75, x + w, y + r * 0.6 - r * 0.75, x + w, y + r * 0.6);
    }
    c.lineTo(x + w, y + h);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }

  text(t: string, x: number, y: number, size: number, fill: string, font = '"DynaPuff", system-ui', align: CanvasTextAlign = 'center') {
    const c = this.c;
    c.font = `600 ${size}px ${font}`;
    c.textAlign = align;
    c.textBaseline = 'alphabetic';
    c.fillStyle = fill;
    c.fillText(t, x, y);
  }

  save() {
    this.c.save();
  }
  restore() {
    this.c.restore();
  }
  translate(x: number, y: number) {
    this.c.translate(x, y);
  }
  rotate(a: number) {
    this.c.rotate(a);
  }
  scale(x: number, y = x) {
    this.c.scale(x, y);
  }
}

/** Seeded random so illustrations look the same on every visit. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Turns the drawn layer into a paper cut-out: a white border around the silhouette,
 * a soft paper grain, and an alpha map for hit-testing.
 */
export function cutout(src: HTMLCanvasElement, borderPx = 7): { canvas: HTMLCanvasElement; alpha: Uint8Array; aw: number; ah: number } {
  const w = src.width;
  const h = src.height;
  const pad = 0;
  const out = document.createElement('canvas');
  out.width = w + pad * 2;
  out.height = h + pad * 2;
  const c = out.getContext('2d')!;

  // white silhouette
  const white = document.createElement('canvas');
  white.width = w;
  white.height = h;
  const wc = white.getContext('2d')!;
  wc.drawImage(src, 0, 0);
  wc.globalCompositeOperation = 'source-in';
  wc.fillStyle = '#ffffff';
  wc.fillRect(0, 0, w, h);

  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    c.drawImage(white, pad + Math.cos(a) * borderPx, pad + Math.sin(a) * borderPx);
  }
  c.drawImage(white, pad, pad);
  c.drawImage(src, pad, pad);

  // paper grain, only where there is paper
  const grain = document.createElement('canvas');
  grain.width = 128;
  grain.height = 128;
  const gc = grain.getContext('2d')!;
  const img = gc.createImageData(128, 128);
  const r = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + r() * 135;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 18;
  }
  gc.putImageData(img, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = c.createPattern(grain, 'repeat')!;
  c.fillRect(0, 0, out.width, out.height);
  c.globalCompositeOperation = 'source-over';

  // low-resolution alpha map for picking
  const aw = Math.max(16, Math.round(out.width / 8));
  const ah = Math.max(16, Math.round(out.height / 8));
  const small = document.createElement('canvas');
  small.width = aw;
  small.height = ah;
  const sc = small.getContext('2d', { willReadFrequently: true })!;
  sc.drawImage(out, 0, 0, aw, ah);
  const data = sc.getImageData(0, 0, aw, ah).data;
  const alpha = new Uint8Array(aw * ah);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
  return { canvas: out, alpha, aw, ah };
}
