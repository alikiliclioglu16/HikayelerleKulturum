import { rng } from '../art/pen';

/**
 * Turkish kilim and carpet motifs for the wall behind the shelf.
 * Each pattern is one seamless square tile (100 × 100 design units): the main motif in the
 * middle, the same motif split across the four corners (a half-drop repeat, like a real kilim),
 * and a small filler motif on the edge midpoints.
 */
export interface Motif {
  id: string;
  name: string;
  meaning: string;
  en: string;
  palette: { bg: string; a: string; b: string; c: string; d: string };
  draw: (g: CanvasRenderingContext2D, p: Motif['palette']) => void;
  filler?: (g: CanvasRenderingContext2D, p: Motif['palette']) => void;
  stripes?: boolean;
}

type Pt = [number, number];

function mirrorX(pts: Pt[]): Pt[] {
  const right = pts;
  const left = [...pts].reverse().map(([x, y]) => [100 - x, y] as Pt);
  return [...right, ...left];
}

function poly(g: CanvasRenderingContext2D, pts: Pt[], fill: string) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

function diamond(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string) {
  poly(g, [[x, y - ry], [x + rx, y], [x, y + ry], [x - rx, y]], fill);
}

/** Stepped (kilim-style) diamond outline of a given band width. */
function stepDiamond(g: CanvasRenderingContext2D, x: number, y: number, r: number, band: number, step: number, fill: string) {
  g.fillStyle = fill;
  for (let yy = -r; yy <= r; yy += step) {
    const half = r - Math.abs(yy);
    const inner = Math.max(-1, half - band);
    g.fillRect(x - half, y + yy, half - inner, step);
    g.fillRect(x + inner, y + yy, half - inner, step);
  }
}

function hookLine(g: CanvasRenderingContext2D, pts: Pt[], color: string, w: number) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineJoin = 'miter';
  g.lineCap = 'square';
  g.stroke();
}

/* ------------------------------------------------------------------ */
/* motifs                                                              */
/* ------------------------------------------------------------------ */

export const MOTIFS: Motif[] = [
  {
    id: 'elibelinde',
    name: 'Elibelinde',
    meaning: 'Eli belinde duran bir anneyi anlatır; anneliği ve bereketi simgeler.',
    en: 'Hands on hips: a symbol of motherhood and plenty.',
    palette: { bg: '#5E2421', a: '#8C3A2E', b: '#C99A55', c: '#2E3F5C', d: '#E6CFA0' },
    draw: (g, p) => {
      // head
      diamond(g, 50, 16, 7, 8, p.b);
      diamond(g, 50, 16, 3, 3.5, p.c);
      // body with arms on the hips
      poly(g, mirrorX([[50, 27], [64, 27], [80, 41], [66, 55], [60, 55], [74, 86], [50, 86]]), p.a);
      poly(g, mirrorX([[50, 33], [62, 33], [71, 41], [62, 49], [50, 49]]), p.bg);
      poly(g, mirrorX([[50, 37], [58, 37], [62, 41], [58, 45], [50, 45]]), p.b);
      // skirt decoration
      diamond(g, 50, 72, 8, 9, p.d);
      diamond(g, 50, 72, 4, 4.5, p.c);
      poly(g, mirrorX([[50, 86], [74, 86], [76, 90], [50, 90]]), p.b);
    },
    filler: (g, p) => {
      diamond(g, 0, 0, 5, 5, p.b);
      diamond(g, 0, 0, 2, 2, p.c);
    },
  },
  {
    id: 'kocboynuzu',
    name: 'Koçboynuzu',
    meaning: 'Koçun boynuzlarından gelir; güç, kahramanlık ve bereket demektir.',
    en: "Ram's horn: strength, courage and plenty.",
    palette: { bg: '#22344F', a: '#C08A48', b: '#8A3A30', c: '#E2CC9C', d: '#3C5A86' },
    draw: (g, p) => {
      diamond(g, 50, 50, 10, 10, p.b);
      diamond(g, 50, 50, 4, 4, p.c);
      for (const sx of [1, -1])
        for (const sy of [1, -1]) {
          const P = (x: number, y: number): Pt => [50 + sx * x, 50 + sy * y];
          hookLine(g, [P(8, 8), P(18, 18), P(30, 18), P(30, 34), P(18, 34), P(18, 26), P(24, 26)], p.a, 5);
        }
      hookLine(g, [[50, 30], [50, 40]], p.a, 5);
      hookLine(g, [[50, 60], [50, 70]], p.a, 5);
    },
    filler: (g, p) => {
      hookLine(g, [[-8, 0], [8, 0]], p.d, 4);
      hookLine(g, [[0, -8], [0, 8]], p.d, 4);
      diamond(g, 0, 0, 3, 3, p.c);
    },
  },
  {
    id: 'hayat-agaci',
    name: 'Hayat ağacı',
    meaning: 'Göğe uzanan ağaç; sonsuz yaşamı ve umudu anlatır.',
    en: 'Tree of life: everlasting life and hope.',
    palette: { bg: '#24585C', a: '#C79E55', b: '#8E3B33', c: '#E8D7AE', d: '#357377' },
    draw: (g, p) => {
      hookLine(g, [[50, 90], [50, 12]], p.a, 5);
      const branches = [80, 64, 48, 32];
      branches.forEach((y, i) => {
        const len = 24 - i * 4;
        for (const s of [1, -1]) {
          hookLine(g, [[50, y], [50 + s * len, y - len * 0.7]], p.a, 4);
          diamond(g, 50 + s * len, y - len * 0.7 - 4, 4, 5, i % 2 ? p.c : p.b);
        }
      });
      diamond(g, 50, 10, 7, 8, p.b);
      diamond(g, 50, 10, 3, 3.5, p.c);
      poly(g, [[38, 90], [62, 90], [56, 96], [44, 96]], p.b);
    },
    filler: (g, p) => {
      diamond(g, 0, 0, 4, 6, p.d);
    },
  },
  {
    id: 'yildiz',
    name: 'Yıldız',
    meaning: 'Gökyüzündeki yıldız; mutluluğu ve iyi talihi simgeler.',
    en: 'Star: happiness and good luck.',
    palette: { bg: '#3E4A2C', a: '#C4A15E', b: '#8A3A2E', c: '#EADBB4', d: '#5E7044' },
    draw: (g, p) => {
      const star = (r: number, fill: string) => {
        const pts: Pt[] = [];
        for (let i = 0; i < 16; i++) {
          const rr = i % 2 ? r * 0.58 : r;
          const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
          pts.push([50 + Math.cos(a) * rr, 50 + Math.sin(a) * rr]);
        }
        poly(g, pts, fill);
      };
      star(34, p.a);
      star(24, p.b);
      diamond(g, 50, 50, 11, 11, p.c);
      diamond(g, 50, 50, 5, 5, p.b);
    },
    filler: (g, p) => {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        diamond(g, Math.cos(a) * 6, Math.sin(a) * 6, 2.5, 2.5, p.c);
      }
    },
  },
  {
    id: 'goz',
    name: 'Göz',
    meaning: 'Nazara karşı korunmayı ve iyi dilekleri anlatır.',
    en: 'Eye: protection from the evil eye.',
    palette: { bg: '#4A2638', a: '#C9A15A', b: '#2F5A60', c: '#E6D3AA', d: '#7A3E5A' },
    draw: (g, p) => {
      stepDiamond(g, 50, 50, 38, 6, 3, p.a);
      stepDiamond(g, 50, 50, 26, 6, 3, p.d);
      diamond(g, 50, 50, 15, 15, p.c);
      diamond(g, 50, 50, 9, 9, p.b);
      diamond(g, 50, 50, 3.5, 3.5, p.c);
      for (const [x, y] of [[50, 6], [94, 50], [50, 94], [6, 50]] as Pt[]) diamond(g, x, y, 3, 3, p.c);
    },
  },
  {
    id: 'su-yolu',
    name: 'Su yolu',
    meaning: 'Akıp giden su gibi; hayatın hiç durmadan devam etmesini anlatır.',
    en: 'Water path: life that keeps flowing.',
    palette: { bg: '#5B3A23', a: '#D2B07A', b: '#2E4E5A', c: '#9A4A30', d: '#EADCB8' },
    stripes: true,
    draw: (g, p) => {
      const zig = (y: number, amp: number, color: string, w: number) => {
        const pts: Pt[] = [];
        for (let x = -12.5; x <= 112.5; x += 12.5) pts.push([x, y + (Math.round(x / 12.5) % 2 ? amp : -amp)]);
        hookLine(g, pts, color, w);
      };
      zig(20, 6, p.a, 4);
      zig(50, 9, p.c, 6);
      zig(50, 9, p.d, 1.6);
      zig(80, 6, p.a, 4);
      for (let x = 0; x <= 100; x += 25) {
        diamond(g, x, 35, 4, 5, p.b);
        diamond(g, x + 12.5, 65, 4, 5, p.b);
      }
    },
  },
  {
    id: 'muska',
    name: 'Muska',
    meaning: 'Üçgen biçimli muska; korunmayı ve iyi dilekleri simgeler.',
    en: 'Amulet: protection and good wishes.',
    palette: { bg: '#23414A', a: '#C7A05A', b: '#9A3A2E', c: '#E4D4AC', d: '#3A6470' },
    draw: (g, p) => {
      poly(g, [[22, 22], [78, 22], [50, 66]], p.a);
      poly(g, [[32, 28], [68, 28], [50, 56]], p.b);
      poly(g, [[42, 32], [58, 32], [50, 45]], p.c);
      for (const x of [36, 50, 64]) {
        hookLine(g, [[x, x === 50 ? 66 : 56], [x, 78]], p.a, 2.5);
        diamond(g, x, 82, 3.5, 4.5, x === 50 ? p.b : p.c);
      }
      hookLine(g, [[22, 18], [78, 18]], p.d, 3);
    },
    filler: (g, p) => {
      diamond(g, 0, 0, 3.5, 3.5, p.d);
    },
  },
  {
    id: 'pitrak',
    name: 'Pıtrak',
    meaning: 'Dikenli pıtrak bitkisinden gelir; kötülüklerden korunmayı ve bolluğu anlatır.',
    en: 'Burdock: protection and plenty.',
    palette: { bg: '#2E2A4A', a: '#C9A15A', b: '#8E3B33', c: '#E6D6B0', d: '#4A4680' },
    draw: (g, p) => {
      // a stepped diamond with smaller diamonds on its four points, like a burdock seed
      stepDiamond(g, 50, 50, 20, 5, 2.5, p.a);
      diamond(g, 50, 50, 10, 10, p.b);
      diamond(g, 50, 50, 4.5, 4.5, p.c);
      for (const [x, y] of [[50, 20], [80, 50], [50, 80], [20, 50]] as Pt[]) {
        diamond(g, x, y, 6, 6, p.b);
        diamond(g, x, y, 2.5, 2.5, p.c);
      }
      for (const [x, y] of [[36, 36], [64, 36], [64, 64], [36, 64]] as Pt[]) diamond(g, x, y, 2.2, 2.2, p.c);
    },
    filler: (g, p) => {
      diamond(g, 0, 0, 5, 5, p.d);
      diamond(g, 0, 0, 2, 2, p.c);
    },
  },
];

/** Draw one seamless tile of a motif. */
export function kilimCanvas(m: Motif, px = 512) {
  const c = document.createElement('canvas');
  c.width = px;
  c.height = px;
  const g = c.getContext('2d')!;
  const s = px / 100;
  g.scale(s, s);
  g.fillStyle = m.palette.bg;
  g.fillRect(0, 0, 100, 100);
  // woven texture: faint horizontal weft lines and a little noise
  const r = rng(m.id.length * 31);
  for (let y = 0; y < 100; y += 1.2) {
    g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.025})`;
    g.fillRect(0, y, 100, 0.5);
  }
  const at = (dx: number, dy: number, f: (g: CanvasRenderingContext2D, p: Motif['palette']) => void) => {
    g.save();
    g.translate(dx, dy);
    f(g, m.palette);
    g.restore();
  };
  if (m.stripes) {
    m.draw(g, m.palette);
  } else {
    // main motif in the centre and quartered on the corners (half-drop repeat)
    for (const [dx, dy] of [[0, 0], [-50, -50], [50, -50], [-50, 50], [50, 50]] as Pt[]) {
      g.save();
      g.translate(dx, dy);
      g.translate(50, 50);
      g.scale(0.9, 0.9);
      g.translate(-50, -50);
      m.draw(g, m.palette);
      g.restore();
    }
    if (m.filler) for (const [x, y] of [[50, 0], [0, 50], [100, 50], [50, 100]] as Pt[]) at(x, y, m.filler);
  }
  // soften: a faded, woven look so the motifs stay behind the shelf objects
  g.globalAlpha = 0.5;
  g.fillStyle = m.palette.bg;
  g.fillRect(0, 0, 100, 100);
  g.globalAlpha = 1;
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
    g.fillRect(r() * 100, r() * 100, 0.6, 0.6);
  }
  return c;
}
