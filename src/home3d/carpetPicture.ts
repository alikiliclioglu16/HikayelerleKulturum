import { FRINGE, drawFringe } from './kilim';

/**
 * Carpet pictures drawn by an illustrator (public/halilar/*.webp) are a fixed size, but the wall they cover
 * changes shape with the screen. Instead of cropping the picture (which cuts the woven border), the carpet is
 * re-woven for the wall: the corners stay as they are, the border bands get whole pattern repeats added or
 * removed (so the diamonds never stretch), and the field is extended with mirrored copies of itself.
 */

/** Where the border ends inside a carpet picture: top, right, bottom, left (fractions of its height/width). */
export const PICTURE_INSET: [number, number, number, number] = [0.131, 0.0955, 0.1354, 0.0961];

interface Source {
  img: HTMLCanvasElement;
  /** Pattern repeat of the top/bottom bands and of the left/right bands, in source pixels (0 = none found). */
  periodX: number;
  periodY: number;
}

const sources = new Map<string, Promise<Source>>();

/** Load a carpet picture once (later calls share it). */
export function loadCarpetPicture(src: string, inset = PICTURE_INSET): Promise<Source> {
  let p = sources.get(src);
  if (!p) {
    p = (async () => {
      const im = new Image();
      im.src = src;
      await im.decode();
      const c = document.createElement('canvas');
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      const g = c.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(im, 0, 0);
      const [t, r, b, l] = inset;
      const W = c.width;
      const H = c.height;
      const T = Math.round(t * H);
      const L = Math.round(l * W);
      const R = Math.round(r * W);
      const B = Math.round(b * H);
      // the diamonds of the main band are about as long as the band is thick; ignore the small dashes of the guard stripes
      const periodX = findPeriod(g, L, Math.round(T * 0.15), W - L - R, Math.round(T * 0.5), 'x', Math.round(T * 0.45));
      const periodY = findPeriod(g, Math.round(L * 0.15), T, Math.round(L * 0.5), H - T - B, 'y', Math.round(L * 0.45));
      return { img: c, periodX, periodY };
    })();
    sources.set(src, p);
    p.catch(() => sources.delete(src));
  }
  return p;
}

/** The repeat length of a woven band (autocorrelation of its brightness along the band). */
function findPeriod(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, axis: 'x' | 'y', minLag = 12) {
  if (w < 8 || h < 8) return 0;
  const d = g.getImageData(x, y, w, h).data;
  const n = axis === 'x' ? w : h;
  const across = axis === 'x' ? h : w;
  const prof = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < across; j++) {
      const px = axis === 'x' ? i : j;
      const py = axis === 'x' ? j : i;
      const k = (py * w + px) * 4;
      sum += d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11;
    }
    prof[i] = sum / across;
  }
  let mean = 0;
  for (const v of prof) mean += v;
  mean /= n;
  let varSum = 0;
  for (let i = 0; i < n; i++) {
    prof[i] -= mean;
    varSum += prof[i] * prof[i];
  }
  if (varSum <= 0) return 0;
  const maxLag = Math.min(Math.floor(n / 3), 700);
  const corr = new Float32Array(maxLag + 1);
  for (let k = minLag; k <= maxLag; k++) {
    let s = 0;
    for (let i = 0; i + k < n; i++) s += prof[i] * prof[i + k];
    corr[k] = (s / (n - k)) / (varSum / n);
  }
  let best = 0;
  for (let k = minLag; k <= maxLag; k++) if (corr[k] > corr[best] || best === 0) best = k;
  if (!best || corr[best] < 0.35) return 0;
  // prefer the shortest repeat that matches almost as well (the fundamental, not a multiple of it)
  for (let k = minLag + 1; k < best; k++) {
    const peak = corr[k] >= corr[k - 1] && corr[k] >= corr[k + 1];
    if (peak && corr[k] > corr[best] * 0.85) return k;
  }
  return best;
}

/**
 * Copy a band of the picture with whole repeats added (or removed) in its middle, so that it becomes about
 * `want` pixels long without stretching its pattern. Returns the band and its actual length.
 */
function band(src: HTMLCanvasElement, x: number, y: number, w: number, h: number, axis: 'x' | 'y', want: number, period: number) {
  const len = axis === 'x' ? w : h;
  const thick = axis === 'x' ? h : w;
  let m = period > 0 ? Math.round((want - len) / period) : 0;
  const mid = Math.round(len / 2);
  if (m < 0) m = -Math.min(-m, Math.floor((len - mid - 2) / period));
  const out = Math.max(1, len + m * period);
  const c = document.createElement('canvas');
  c.width = axis === 'x' ? out : thick;
  c.height = axis === 'x' ? thick : out;
  const g = c.getContext('2d')!;
  // copy [a, b) of the source band to position `at` along the band
  const put = (a: number, b: number, at: number) => {
    if (b <= a) return;
    if (axis === 'x') g.drawImage(src, x + a, y, b - a, h, at, 0, b - a, h);
    else g.drawImage(src, x, y + a, w, b - a, 0, at, w, b - a);
  };
  if (m >= 0) {
    put(0, mid, 0);
    for (let i = 0; i < m; i++) put(mid, mid + period, mid + i * period);
    put(mid, len, mid + m * period);
  } else {
    put(0, mid, 0);
    put(mid - m * period, len, mid);
  }
  return { c, len: out };
}

/** Weave a carpet picture into a canvas of any size (with the fringe below, like the drawn carpets). */
export function composeCarpet(s: Source, W: number, H: number, inset = PICTURE_INSET, seed = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const rugH = Math.round(H * (1 - FRINGE));
  let r = seed * 9301 + 49297;
  drawFringe(g, W, H, rugH, () => ((r = (r * 9301 + 49297) % 233280) / 233280));

  const img = s.img;
  const sw = img.width;
  const sh = img.height;
  const T = Math.round(inset[0] * sh);
  const R = Math.round(inset[1] * sw);
  const B = Math.round(inset[2] * sh);
  const L = Math.round(inset[3] * sw);
  // one scale for border and field; on narrow walls the side borders may take at most 40% of the width
  const sc = Math.min(rugH / sh, (0.4 * W) / (L + R));
  const tT = T * sc;
  const tB = B * sc;
  const tL = L * sc;
  const tR = R * sc;
  const mx = W - tL - tR;
  const my = rugH - tT - tB;

  // field: the middle of the picture at the same scale, centred, mirrored outwards where the wall is larger
  // (a few pixels in from the guard stripe, so no stripe shows up at the mirror seams)
  const e = Math.round(sh * 0.008);
  const fx = L + e;
  const fy = T + e;
  const fw = sw - L - R - 2 * e;
  const fh = sh - T - B - 2 * e;
  const dw = fw * sc;
  const dh = fh * sc;
  g.save();
  g.beginPath();
  g.rect(tL, tT, mx, my);
  g.clip();
  const x0 = tL + (mx - dw) / 2;
  const y0 = tT + (my - dh) / 2;
  const nx = Math.max(0, Math.ceil((mx - dw) / 2 / dw));
  const ny = Math.max(0, Math.ceil((my - dh) / 2 / dh));
  for (let i = -nx; i <= nx; i++)
    for (let j = -ny; j <= ny; j++) {
      g.save();
      g.translate(x0 + i * dw + (i % 2 ? dw : 0), y0 + j * dh + (j % 2 ? dh : 0));
      g.scale(i % 2 ? -1 : 1, j % 2 ? -1 : 1);
      g.drawImage(img, fx, fy, fw, fh, 0, 0, dw, dh);
      g.restore();
    }
  g.restore();

  // border bands: whole repeats added or removed, then fitted exactly (a tiny stretch at most)
  const top = band(img, L, 0, sw - L - R, T, 'x', mx / sc, s.periodX);
  const bottom = band(img, L, sh - B, sw - L - R, B, 'x', mx / sc, s.periodX);
  const left = band(img, 0, T, L, sh - T - B, 'y', my / sc, s.periodY);
  const right = band(img, sw - R, T, R, sh - T - B, 'y', my / sc, s.periodY);
  g.drawImage(top.c, tL, 0, mx, tT);
  g.drawImage(bottom.c, tL, rugH - tB, mx, tB);
  g.drawImage(left.c, 0, tT, tL, my);
  g.drawImage(right.c, W - tR, tT, tR, my);
  // corners as they are
  g.drawImage(img, 0, 0, L, T, 0, 0, tL, tT);
  g.drawImage(img, sw - R, 0, R, T, W - tR, 0, tR, tT);
  g.drawImage(img, 0, sh - B, L, B, 0, rugH - tB, tL, tB);
  g.drawImage(img, sw - R, sh - B, R, B, W - tR, rugH - tB, tR, tB);
  return c;
}
