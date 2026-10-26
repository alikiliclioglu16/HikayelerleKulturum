import { Pen, rng } from './pen';

export const C = {
  ink: '#1A2340',
  cobalt: '#1C3F8C',
  turq: '#1FA4A0',
  red: '#D2372C',
  saffron: '#F2B33D',
  leaf: '#3E8E4E',
  paper: '#FFFBF2',
  white: '#FFFFFF',
  wood: '#A9673A',
  woodDark: '#7A4526',
  cheek: 'rgba(232, 96, 96, 0.35)',
};

export type HairStyle = 'ponytail' | 'short' | 'bun' | 'curly' | 'scarf' | 'shoulder' | 'grandpa';
export type Arms = 'down' | 'up' | 'wave' | 'forward' | 'hold' | 'kiss' | 'hug' | 'offer' | 'point';

export interface PersonOpts {
  x: number;
  y: number; // feet
  h: number;
  skin: string;
  hair: string;
  style: HairStyle;
  top: string;
  bottom?: string;
  dress?: boolean;
  child?: boolean;
  bow?: string;
  glasses?: boolean;
  mustache?: string;
  cap?: string;
  scarfDots?: string;
  apron?: string;
  mouth?: 'smile' | 'open' | 'grin';
  arms?: Arms;
  lean?: number;
  ribbon?: string;
  sitting?: boolean;
  noLegs?: boolean;
}

/** Returns key points so callers can attach objects to hands. */
export interface PersonPoints {
  headX: number;
  headY: number;
  headR: number;
  handL: [number, number];
  handR: [number, number];
  chestY: number;
  bodyTop: number;
  bodyBottom: number;
  shoulderW: number;
}

export function person(p: Pen, o: PersonOpts): PersonPoints {
  const { x, y, h } = o;
  const child = !!o.child;
  const headR = h * (child ? 0.165 : 0.12);
  const legH = o.sitting ? h * 0.12 : h * (child ? 0.24 : 0.36);
  const bodyBottom = y - legH;
  const bodyTop = y - h + headR * 2 - headR * 0.15;
  const bodyH = bodyBottom - bodyTop;
  const shoulderW = h * (child ? 0.25 : 0.25);
  const headX = x;
  const headY = y - h + headR;
  const sleeve = o.top;

  p.save();
  if (o.lean) {
    p.translate(x, y);
    p.rotate(o.lean);
    p.translate(-x, -y);
  }

  // back hair (behind body)
  if (o.style === 'ponytail') {
    p.ellipse(headX + headR * 0.95, headY + headR * 0.55, headR * 0.42, headR * 0.85, o.hair, -0.35);
  }
  if (o.style === 'shoulder') {
    p.rect(headX - headR * 1.12, headY - headR * 0.2, headR * 2.24, headR * 1.85, o.hair, headR * 0.6);
  }
  if (o.style === 'scarf') {
    p.shape(o.hair, (c) => {
      c.moveTo(headX - headR * 1.25, headY);
      c.quadraticCurveTo(headX - headR * 1.35, headY - headR * 1.45, headX, headY - headR * 1.38);
      c.quadraticCurveTo(headX + headR * 1.35, headY - headR * 1.45, headX + headR * 1.25, headY);
      c.quadraticCurveTo(headX + headR * 1.5, headY + headR * 1.6, headX + shoulderW * 0.75, bodyTop + headR * 0.9);
      c.lineTo(headX - shoulderW * 0.75, bodyTop + headR * 0.9);
      c.quadraticCurveTo(headX - headR * 1.5, headY + headR * 1.6, headX - headR * 1.25, headY);
    });
  }

  // legs
  if (!o.noLegs) {
    const legW = h * (child ? 0.075 : 0.07);
    const legColor = o.dress ? o.skin : o.bottom ?? C.ink;
    const lx = shoulderW * 0.22;
    if (o.sitting) {
      p.rect(x - lx - legW / 2 - legW, bodyBottom - legW * 0.5, legW * 2.4, legW, legColor, legW / 2);
      p.rect(x + lx - legW / 2 - legW, bodyBottom - legW * 0.5, legW * 2.4, legW, legColor, legW / 2);
    } else {
      p.rect(x - lx - legW / 2, bodyBottom - 4, legW, legH, legColor, legW / 2);
      p.rect(x + lx - legW / 2, bodyBottom - 4, legW, legH, legColor, legW / 2);
      p.ellipse(x - lx - legW * 0.2, y - legW * 0.25, legW * 0.85, legW * 0.45, '#3A2A22');
      p.ellipse(x + lx + legW * 0.2, y - legW * 0.25, legW * 0.85, legW * 0.45, '#3A2A22');
    }
  }

  // body
  if (o.dress) {
    const hem = bodyBottom + h * 0.02;
    p.shape(o.top, (c) => {
      c.moveTo(x - shoulderW / 2, bodyTop + 6);
      c.quadraticCurveTo(x, bodyTop - 8, x + shoulderW / 2, bodyTop + 6);
      c.lineTo(x + shoulderW * 0.85, hem);
      c.quadraticCurveTo(x, hem + h * 0.035, x - shoulderW * 0.85, hem);
      c.closePath();
    });
    // waist band
    p.rect(x - shoulderW * 0.5, bodyTop + bodyH * 0.38, shoulderW, h * 0.025, 'rgba(255,255,255,0.55)', 4);
  } else {
    p.rect(x - shoulderW / 2, bodyTop, shoulderW, bodyH * (o.bottom ? 0.72 : 1), o.top, shoulderW * 0.3);
    if (o.bottom) p.rect(x - shoulderW / 2, bodyTop + bodyH * 0.62, shoulderW, bodyH * 0.42, o.bottom, shoulderW * 0.15);
  }
  if (o.apron) {
    p.rect(x - shoulderW * 0.36, bodyTop + bodyH * 0.25, shoulderW * 0.72, bodyH * 0.85, o.apron, 10);
  }

  // arms
  const armW = h * (child ? 0.07 : 0.065);
  const sy = bodyTop + armW * 0.6;
  const slx = x - shoulderW / 2 + armW * 0.35;
  const srx = x + shoulderW / 2 - armW * 0.35;
  const L = h * (child ? 0.26 : 0.3);
  let hl: [number, number];
  let hr: [number, number];
  let el: [number, number] | null = null;
  let er: [number, number] | null = null;
  switch (o.arms ?? 'down') {
    case 'up':
      hl = [slx - L * 0.35, sy - L * 0.9];
      hr = [srx + L * 0.35, sy - L * 0.9];
      break;
    case 'wave':
      hl = [slx - L * 0.25, sy + L * 0.9];
      er = [srx + L * 0.45, sy + L * 0.05];
      hr = [srx + L * 0.55, sy - L * 0.55];
      break;
    case 'forward':
      hl = [slx + L * 0.25, sy + L * 0.55];
      hr = [srx + L * 0.75, sy + L * 0.35];
      break;
    case 'hold':
      el = [slx - L * 0.15, sy + L * 0.5];
      er = [srx + L * 0.15, sy + L * 0.5];
      hl = [x - shoulderW * 0.28, sy + L * 0.55];
      hr = [x + shoulderW * 0.28, sy + L * 0.55];
      break;
    case 'offer':
      el = [slx - L * 0.05, sy + L * 0.55];
      hl = [x + shoulderW * 0.15, sy + L * 0.62];
      er = [srx + L * 0.35, sy + L * 0.45];
      hr = [srx + L * 0.8, sy + L * 0.42];
      break;
    case 'kiss':
      el = [slx + L * 0.25, sy + L * 0.55];
      hl = [x - headR * 0.9, headY + headR * 0.7];
      er = [srx + L * 0.2, sy + L * 0.45];
      hr = [x - headR * 0.6, headY + headR * 0.95];
      break;
    case 'hug':
      el = [slx - L * 0.1, sy + L * 0.5];
      er = [srx + L * 0.1, sy + L * 0.5];
      hl = [x + shoulderW * 0.1, sy + L * 0.62];
      hr = [x - shoulderW * 0.1, sy + L * 0.62];
      break;
    case 'point':
      hl = [slx - L * 0.2, sy + L * 0.9];
      er = [srx + L * 0.5, sy - L * 0.1];
      hr = [srx + L * 0.95, sy - L * 0.45];
      break;
    default:
      hl = [slx - L * 0.22, sy + L * 0.95];
      hr = [srx + L * 0.22, sy + L * 0.95];
  }
  const drawArm = (s: [number, number], e: [number, number] | null, hnd: [number, number]) => {
    const pts = e ? [s[0], s[1], e[0], e[1], hnd[0], hnd[1]] : [s[0], s[1], hnd[0], hnd[1]];
    p.curve(pts, sleeve, armW);
    p.circle(hnd[0], hnd[1], armW * 0.62, o.skin);
  };
  drawArm([slx, sy], el, hl);
  drawArm([srx, sy], er, hr);

  // neck + head
  p.rect(x - headR * 0.28, headY + headR * 0.7, headR * 0.56, headR * 0.6, o.skin, 6);
  p.circle(headX, headY, headR, o.skin);
  // ears
  p.circle(headX - headR * 0.97, headY + headR * 0.08, headR * 0.2, o.skin);
  p.circle(headX + headR * 0.97, headY + headR * 0.08, headR * 0.2, o.skin);

  // front hair
  const hr0 = headR;
  switch (o.style) {
    case 'ponytail':
    case 'shoulder':
    case 'short':
      p.shape(o.hair, (c) => {
        c.moveTo(headX - hr0 * 1.03, headY + hr0 * 0.15);
        c.bezierCurveTo(headX - hr0 * 1.15, headY - hr0 * 1.25, headX + hr0 * 1.15, headY - hr0 * 1.25, headX + hr0 * 1.03, headY + hr0 * 0.15);
        c.quadraticCurveTo(headX + hr0 * 0.9, headY - hr0 * 0.4, headX + hr0 * 0.2, headY - hr0 * 0.45);
        c.quadraticCurveTo(headX - hr0 * 0.2, headY - hr0 * 0.15, headX - hr0 * 0.55, headY - hr0 * 0.42);
        c.quadraticCurveTo(headX - hr0 * 0.9, headY - hr0 * 0.3, headX - hr0 * 1.03, headY + hr0 * 0.15);
      });
      if (o.style === 'ponytail' && o.ribbon) {
        p.ellipse(headX + hr0 * 0.8, headY - hr0 * 0.55, hr0 * 0.22, hr0 * 0.13, o.ribbon, 0.5);
        p.ellipse(headX + hr0 * 1.05, headY - hr0 * 0.35, hr0 * 0.22, hr0 * 0.13, o.ribbon, -0.9);
        p.circle(headX + hr0 * 0.93, headY - hr0 * 0.45, hr0 * 0.09, o.ribbon);
      }
      break;
    case 'bun':
      p.circle(headX, headY - hr0 * 1.05, hr0 * 0.42, o.hair);
      p.shape(o.hair, (c) => {
        c.moveTo(headX - hr0 * 1.02, headY + hr0 * 0.1);
        c.bezierCurveTo(headX - hr0 * 1.1, headY - hr0 * 1.2, headX + hr0 * 1.1, headY - hr0 * 1.2, headX + hr0 * 1.02, headY + hr0 * 0.1);
        c.quadraticCurveTo(headX, headY - hr0 * 0.75, headX - hr0 * 1.02, headY + hr0 * 0.1);
      });
      break;
    case 'curly': {
      const r = rng(Math.round(x));
      for (let i = 0; i < 16; i++) {
        const a = Math.PI * (0.95 + (i / 15) * 1.1);
        const rr = hr0 * (1.0 + r() * 0.12);
        p.circle(headX + Math.cos(a) * rr, headY + Math.sin(a) * rr * 0.95 + hr0 * 0.05, hr0 * 0.34, o.hair);
      }
      p.circle(headX - hr0 * 1.05, headY + hr0 * 0.45, hr0 * 0.3, o.hair);
      p.circle(headX + hr0 * 1.05, headY + hr0 * 0.45, hr0 * 0.3, o.hair);
      break;
    }
    case 'scarf':
      p.shape(o.hair, (c) => {
        c.moveTo(headX - hr0 * 1.08, headY + hr0 * 0.3);
        c.bezierCurveTo(headX - hr0 * 1.2, headY - hr0 * 1.25, headX + hr0 * 1.2, headY - hr0 * 1.25, headX + hr0 * 1.08, headY + hr0 * 0.3);
        c.quadraticCurveTo(headX + hr0 * 0.95, headY - hr0 * 0.55, headX, headY - hr0 * 0.62);
        c.quadraticCurveTo(headX - hr0 * 0.95, headY - hr0 * 0.55, headX - hr0 * 1.08, headY + hr0 * 0.3);
      });
      if (o.scarfDots) {
        const r = rng(3);
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * (1.05 + (i / 8) * 0.9);
          p.circle(headX + Math.cos(a) * hr0 * (0.9 + r() * 0.15), headY + Math.sin(a) * hr0 * (0.85 + r() * 0.1), hr0 * 0.06, o.scarfDots);
        }
      }
      break;
    case 'grandpa':
      p.shape(o.hair, (c) => {
        c.moveTo(headX - hr0 * 1.02, headY + hr0 * 0.25);
        c.quadraticCurveTo(headX - hr0 * 1.12, headY - hr0 * 0.6, headX - hr0 * 0.55, headY - hr0 * 0.7);
        c.lineTo(headX - hr0 * 0.6, headY - hr0 * 0.2);
        c.closePath();
        c.moveTo(headX + hr0 * 1.02, headY + hr0 * 0.25);
        c.quadraticCurveTo(headX + hr0 * 1.12, headY - hr0 * 0.6, headX + hr0 * 0.55, headY - hr0 * 0.7);
        c.lineTo(headX + hr0 * 0.6, headY - hr0 * 0.2);
        c.closePath();
      });
      break;
  }
  if (o.cap) {
    p.shape(o.cap, (c) => {
      c.moveTo(headX - hr0 * 1.08, headY - hr0 * 0.35);
      c.bezierCurveTo(headX - hr0 * 1.0, headY - hr0 * 1.35, headX + hr0 * 1.05, headY - hr0 * 1.35, headX + hr0 * 1.1, headY - hr0 * 0.4);
      c.quadraticCurveTo(headX + hr0 * 1.45, headY - hr0 * 0.25, headX + hr0 * 1.3, headY - hr0 * 0.18);
      c.lineTo(headX - hr0 * 1.08, headY - hr0 * 0.3);
      c.closePath();
    });
  }

  // face
  const ey = headY + hr0 * 0.05;
  const ex = hr0 * 0.38;
  p.ellipse(headX - ex, ey, hr0 * 0.1, hr0 * 0.13, '#2A1B15');
  p.ellipse(headX + ex, ey, hr0 * 0.1, hr0 * 0.13, '#2A1B15');
  p.circle(headX - ex + hr0 * 0.035, ey - hr0 * 0.045, hr0 * 0.035, '#ffffff');
  p.circle(headX + ex + hr0 * 0.035, ey - hr0 * 0.045, hr0 * 0.035, '#ffffff');
  if (!child) {
    p.line([headX - ex - hr0 * 0.13, ey - hr0 * 0.26, headX - ex + hr0 * 0.12, ey - hr0 * 0.3], o.style === 'grandpa' || o.style === 'bun' ? '#9a948a' : '#3a2a22', hr0 * 0.06);
    p.line([headX + ex - hr0 * 0.12, ey - hr0 * 0.3, headX + ex + hr0 * 0.13, ey - hr0 * 0.26], o.style === 'grandpa' || o.style === 'bun' ? '#9a948a' : '#3a2a22', hr0 * 0.06);
  }
  p.circle(headX - hr0 * 0.62, headY + hr0 * 0.36, hr0 * 0.17, C.cheek);
  p.circle(headX + hr0 * 0.62, headY + hr0 * 0.36, hr0 * 0.17, C.cheek);
  if (o.glasses) {
    const c = p.c;
    c.beginPath();
    c.arc(headX - ex, ey, hr0 * 0.24, 0, Math.PI * 2);
    c.moveTo(headX + ex + hr0 * 0.24, ey);
    c.arc(headX + ex, ey, hr0 * 0.24, 0, Math.PI * 2);
    c.moveTo(headX - ex + hr0 * 0.24, ey);
    c.lineTo(headX + ex - hr0 * 0.24, ey);
    c.strokeStyle = '#5b4636';
    c.lineWidth = hr0 * 0.06;
    c.stroke();
  }
  const my = headY + hr0 * 0.48;
  if (o.mustache) {
    p.ellipse(headX - hr0 * 0.2, my - hr0 * 0.1, hr0 * 0.24, hr0 * 0.1, o.mustache, 0.2);
    p.ellipse(headX + hr0 * 0.2, my - hr0 * 0.1, hr0 * 0.24, hr0 * 0.1, o.mustache, -0.2);
  }
  const mouth = o.mouth ?? 'smile';
  if (mouth === 'open' || mouth === 'grin') {
    p.shape('#8a2b2b', (c) => {
      c.moveTo(headX - hr0 * 0.24, my);
      c.quadraticCurveTo(headX, my + hr0 * (mouth === 'open' ? 0.42 : 0.3), headX + hr0 * 0.24, my);
      c.closePath();
    });
  } else {
    const c = p.c;
    c.beginPath();
    c.arc(headX, my - hr0 * 0.1, hr0 * 0.22, 0.2 * Math.PI, 0.8 * Math.PI);
    c.strokeStyle = '#7a2e2e';
    c.lineWidth = hr0 * 0.07;
    c.stroke();
  }
  if (o.bow) {
    const by = bodyTop + headR * 0.12;
    p.poly([x, by, x - headR * 0.42, by - headR * 0.2, x - headR * 0.42, by + headR * 0.24], o.bow);
    p.poly([x, by, x + headR * 0.42, by - headR * 0.24, x + headR * 0.42, by + headR * 0.2], o.bow);
    p.circle(x, by, headR * 0.1, o.bow);
  }
  p.restore();

  return {
    headX,
    headY,
    headR,
    handL: hl,
    handR: hr,
    chestY: bodyTop + bodyH * 0.3,
    bodyTop,
    bodyBottom,
    shoulderW,
  };
}

/* ---------- characters ---------- */

export function elif(p: Pen, x: number, y: number, h: number, extra: Partial<PersonOpts> = {}) {
  return person(p, {
    x, y, h, child: true, skin: '#F1C7A4', hair: '#5A3726', style: 'ponytail', ribbon: C.red,
    top: '#3F6FD1', dress: true, ...extra,
  });
}
export function can(p: Pen, x: number, y: number, h: number, extra: Partial<PersonOpts> = {}) {
  return person(p, {
    x, y, h, child: true, skin: '#EAB993', hair: '#2E1F18', style: 'short',
    top: '#FFFFFF', bottom: '#23306B', bow: C.red, ...extra,
  });
}
export function anne(p: Pen, x: number, y: number, h: number, extra: Partial<PersonOpts> = {}) {
  return person(p, {
    x, y, h, skin: '#EFC09C', hair: '#3B2418', style: 'shoulder', top: '#3E8E4E', dress: true, ...extra,
  });
}
export function dede(p: Pen, x: number, y: number, h: number, extra: Partial<PersonOpts> = {}) {
  return person(p, {
    x, y, h, skin: '#E2AE8A', hair: '#E9E6E1', style: 'grandpa', cap: '#6B6B6B', mustache: '#F2F0EC', top: '#8A6A4C', bottom: '#4A4F5C', ...extra,
  });
}

/* ---------- objects ---------- */

export function bunting(p: Pen, x0: number, x1: number, y: number, sag = 40, n = 9) {
  const colors = [C.cobalt, C.turq, C.red, C.saffron];
  p.curve([x0, y, (x0 + x1) / 2, y + sag * 2, x1, y], '#7a5a3a', 3);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * t;
    const yy = y + 4 * sag * t * (1 - t);
    p.poly([x - 22, yy, x + 22, yy, x, yy + 46], colors[i % colors.length]);
  }
}

/** İznik tile, a 4-petal tulip/carnation rosette on white. */
export function iznikTile(p: Pen, x: number, y: number, s: number, seed = 1) {
  p.rect(x, y, s, s, '#F7FAFC');
  const cx = x + s / 2;
  const cy = y + s / 2;
  const r = s * 0.42;
  p.c.save();
  p.c.strokeStyle = C.cobalt;
  p.c.lineWidth = s * 0.03;
  p.c.strokeRect(x + s * 0.04, y + s * 0.04, s * 0.92, s * 0.92);
  p.c.restore();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + (seed % 2 ? Math.PI / 4 : 0);
    const px = cx + Math.cos(a) * r * 0.55;
    const py = cy + Math.sin(a) * r * 0.55;
    p.ellipse(px, py, r * 0.36, r * 0.17, i % 2 ? C.turq : C.cobalt, a);
  }
  p.circle(cx, cy, r * 0.22, C.red);
  p.circle(cx, cy, r * 0.09, '#F7FAFC');
}

export function tulip(p: Pen, x: number, y: number, h: number, color = C.red) {
  p.line([x, y, x, y - h * 0.75], C.leaf, h * 0.06);
  p.ellipse(x - h * 0.14, y - h * 0.3, h * 0.07, h * 0.22, C.leaf, -0.5);
  p.ellipse(x + h * 0.13, y - h * 0.4, h * 0.06, h * 0.2, C.leaf, 0.6);
  const ty = y - h * 0.82;
  p.shape(color, (c) => {
    c.moveTo(x - h * 0.15, ty - h * 0.08);
    c.quadraticCurveTo(x - h * 0.17, ty + h * 0.12, x, ty + h * 0.14);
    c.quadraticCurveTo(x + h * 0.17, ty + h * 0.12, x + h * 0.15, ty - h * 0.08);
    c.lineTo(x + h * 0.08, ty - h * 0.0);
    c.lineTo(x, ty - h * 0.14);
    c.lineTo(x - h * 0.08, ty - h * 0.0);
    c.closePath();
  });
}

export function teaGlass(p: Pen, x: number, y: number, h: number) {
  // saucer
  p.ellipse(x, y, h * 0.55, h * 0.12, C.red);
  p.ellipse(x, y - h * 0.03, h * 0.38, h * 0.07, '#ffffff');
  // tulip-shaped glass
  p.shape('rgba(255,255,255,0.85)', (c) => {
    c.moveTo(x - h * 0.3, y - h);
    c.quadraticCurveTo(x - h * 0.12, y - h * 0.55, x - h * 0.24, y - h * 0.08);
    c.lineTo(x + h * 0.24, y - h * 0.08);
    c.quadraticCurveTo(x + h * 0.12, y - h * 0.55, x + h * 0.3, y - h);
    c.closePath();
  });
  p.shape('#B5421E', (c) => {
    c.moveTo(x - h * 0.26, y - h * 0.82);
    c.quadraticCurveTo(x - h * 0.11, y - h * 0.5, x - h * 0.21, y - h * 0.1);
    c.lineTo(x + h * 0.21, y - h * 0.1);
    c.quadraticCurveTo(x + h * 0.11, y - h * 0.5, x + h * 0.26, y - h * 0.82);
    c.closePath();
  });
  p.line([x - h * 0.17, y - h * 0.75, x - h * 0.1, y - h * 0.3], 'rgba(255,255,255,0.6)', h * 0.04);
}

export function caydanlik(p: Pen, x: number, y: number, h: number) {
  // bottom kettle
  p.ellipse(x, y - h * 0.22, h * 0.42, h * 0.24, '#C9CED6');
  p.rect(x - h * 0.42, y - h * 0.24, h * 0.84, h * 0.2, '#C9CED6', h * 0.08);
  p.line([x + h * 0.38, y - h * 0.3, x + h * 0.62, y - h * 0.5], '#AEB4BE', h * 0.08);
  // top teapot
  p.ellipse(x, y - h * 0.6, h * 0.3, h * 0.2, '#E7EBF0');
  p.rect(x - h * 0.06, y - h * 0.86, h * 0.12, h * 0.1, '#AEB4BE', 4);
  p.line([x - h * 0.28, y - h * 0.62, x - h * 0.48, y - h * 0.78], '#C9CED6', h * 0.06);
  p.c.save();
  p.c.beginPath();
  p.c.arc(x + h * 0.3, y - h * 0.62, h * 0.12, -Math.PI / 2, Math.PI / 2);
  p.c.strokeStyle = '#AEB4BE';
  p.c.lineWidth = h * 0.05;
  p.c.stroke();
  p.c.restore();
}

export function baklavaTray(p: Pen, x: number, y: number, w: number) {
  const h = w * 0.36;
  p.ellipse(x, y, w * 0.55, h * 0.55, '#C08A2B');
  p.ellipse(x, y - h * 0.06, w * 0.48, h * 0.45, '#E9A93A');
  p.c.save();
  p.c.beginPath();
  p.c.ellipse(x, y - h * 0.06, w * 0.48, h * 0.45, 0, 0, Math.PI * 2);
  p.c.clip();
  p.c.strokeStyle = '#B9771F';
  p.c.lineWidth = 3;
  for (let i = -6; i <= 6; i++) {
    p.c.beginPath();
    p.c.moveTo(x + i * w * 0.09 - w, y - h);
    p.c.lineTo(x + i * w * 0.09 + w, y + h);
    p.c.moveTo(x + i * w * 0.09 + w, y - h);
    p.c.lineTo(x + i * w * 0.09 - w, y + h);
    p.c.stroke();
  }
  const r = rng(11);
  for (let i = 0; i < 26; i++) p.circle(x + (r() - 0.5) * w * 0.85, y - h * 0.06 + (r() - 0.5) * h * 0.7, w * 0.012, '#6FA13A');
  p.c.restore();
}

export function lokumBox(p: Pen, x: number, y: number, w: number, open = true) {
  const h = w * 0.45;
  p.rect(x - w / 2, y - h, w, h, C.red, 8);
  p.rect(x - w / 2 + 6, y - h + 6, w - 12, h - 12, '#F9E6E6', 6);
  if (open) {
    const cols = 4;
    const rows = 2;
    const cw = (w - 24) / cols;
    const ch = (h - 24) / rows;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const col = (i + j) % 2 ? '#F28DB2' : '#F7F2E6';
        p.rect(x - w / 2 + 12 + i * cw + 3, y - h + 12 + j * ch + 3, cw - 6, ch - 6, col, 5);
      }
  } else {
    p.rect(x - w / 2, y - h * 0.62, w, h * 0.14, C.saffron);
  }
}

export function candy(p: Pen, x: number, y: number, s: number, color: string, rot = 0) {
  p.save();
  p.translate(x, y);
  p.rotate(rot);
  p.poly([-s, 0, -s * 1.7, -s * 0.55, -s * 1.7, s * 0.55], color);
  p.poly([s, 0, s * 1.7, -s * 0.55, s * 1.7, s * 0.55], color);
  p.ellipse(0, 0, s * 1.05, s * 0.72, color);
  p.line([-s * 0.4, -s * 0.5, s * 0.1, s * 0.55], 'rgba(255,255,255,0.65)', s * 0.18);
  p.restore();
}

export const CANDY_COLORS = [C.red, C.turq, C.saffron, '#F28DB2', C.cobalt, '#7FC46A'];

export function windowFrame(p: Pen, x: number, y: number, w: number, h: number, sky: (p: Pen) => void, frame = '#ffffff') {
  p.rect(x - 12, y - 12, w + 24, h + 24, frame, 10);
  p.save();
  p.c.beginPath();
  p.c.rect(x, y, w, h);
  p.c.clip();
  sky(p);
  p.restore();
  p.rect(x + w / 2 - 6, y, 12, h, frame);
  p.rect(x, y + h / 2 - 6, w, 12, frame);
  p.rect(x - 22, y + h + 6, w + 44, 18, frame, 6);
}

export function curtain(p: Pen, x: number, y: number, w: number, h: number, color: string, side: 'l' | 'r') {
  p.shape(color, (c) => {
    if (side === 'l') {
      c.moveTo(x, y);
      c.lineTo(x + w, y);
      c.quadraticCurveTo(x + w * 0.4, y + h * 0.55, x + w * 0.75, y + h);
      c.lineTo(x, y + h);
    } else {
      c.moveTo(x + w, y);
      c.lineTo(x, y);
      c.quadraticCurveTo(x + w * 0.6, y + h * 0.55, x + w * 0.25, y + h);
      c.lineTo(x + w, y + h);
    }
    c.closePath();
  });
  for (let i = 1; i < 4; i++) {
    const xx = side === 'l' ? x + (w * i) / 5 : x + w - (w * i) / 5;
    p.line([xx, y + 8, xx, y + h * 0.4], 'rgba(255,255,255,0.25)', 5);
  }
}

export function crescent(p: Pen, x: number, y: number, r: number, color: string, bg: string) {
  p.circle(x, y, r, color);
  p.circle(x + r * 0.38, y - r * 0.08, r * 0.82, bg);
}

export function star(p: Pen, x: number, y: number, r: number, color: string, rot = -Math.PI / 2) {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.42 : r;
    const a = rot + (i * Math.PI) / 5;
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  p.poly(pts, color);
}

export function plant(p: Pen, x: number, y: number, h: number, pot = C.red) {
  p.shape(pot, (c) => {
    c.moveTo(x - h * 0.24, y - h * 0.32);
    c.lineTo(x + h * 0.24, y - h * 0.32);
    c.lineTo(x + h * 0.18, y);
    c.lineTo(x - h * 0.18, y);
    c.closePath();
  });
  const r = rng(Math.round(x + h));
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.32;
    const len = h * (0.45 + r() * 0.25);
    p.ellipse(x + Math.cos(a) * len * 0.55, y - h * 0.32 + Math.sin(a) * len * 0.55, h * 0.07, len * 0.42, C.leaf, a + Math.PI / 2);
  }
}

export function clockTower(p: Pen, x: number, y: number, h: number) {
  const w = h * 0.22;
  p.rect(x - w * 0.75, y - h * 0.12, w * 1.5, h * 0.12, '#E8D9B8');
  p.rect(x - w / 2, y - h * 0.82, w, h * 0.72, '#F1E4C6');
  p.rect(x - w * 0.62, y - h * 0.5, w * 1.24, h * 0.06, '#D9C59A');
  p.circle(x, y - h * 0.68, w * 0.32, '#ffffff');
  p.line([x, y - h * 0.68, x, y - h * 0.68 - w * 0.22], C.ink, 3);
  p.line([x, y - h * 0.68, x + w * 0.16, y - h * 0.68], C.ink, 3);
  p.shape('#C9A64A', (c) => {
    c.moveTo(x - w * 0.55, y - h * 0.82);
    c.quadraticCurveTo(x, y - h * 1.05, x + w * 0.55, y - h * 0.82);
    c.closePath();
  });
  p.line([x, y - h * 0.95, x, y - h * 1.02], '#C9A64A', 4);
  for (let i = 0; i < 3; i++) p.rect(x - w * 0.3 + i * w * 0.24, y - h * 0.42, w * 0.12, h * 0.16, '#C7B285', 6);
}

export function turkishFlag(p: Pen, x: number, y: number, w: number) {
  const h = w * (2 / 3);
  p.rect(x, y, w, h, '#E30A17', 4);
  // proportions from the official flag (G = h): crescent and star centres on the mid line
  const cy = y + h / 2;
  p.circle(x + h * 0.53125, cy, h * 0.25, '#ffffff');
  p.circle(x + h * 0.59375, cy, h * 0.2, '#E30A17');
  star(p, x + h * 0.8542, cy, h * 0.125, '#ffffff', Math.PI);
}

/* ---------- Nasreddin Hoca book ---------- */

/** Nasreddin Hoca: a big white turban (kavuk), a white beard and a turquoise robe. */
export function hoca(p: Pen, x: number, y: number, h: number, extra: Partial<PersonOpts> = {}) {
  const pt = person(p, {
    x, y, h, skin: '#E6B48E', hair: '#F4F1EA', style: 'grandpa', mustache: '#F4F1EA', top: '#2F8F83', dress: true, ...extra,
  });
  const { headX: hx, headY: hy, headR: r } = pt;
  // sash
  p.rect(x - h * 0.13, pt.bodyTop + (pt.bodyBottom - pt.bodyTop) * 0.36, h * 0.26, h * 0.035, '#C9472F', 6);
  // beard
  p.shape('#F4F1EA', (c) => {
    c.moveTo(hx - r * 0.9, hy + r * 0.3);
    c.quadraticCurveTo(hx - r * 0.85, hy + r * 1.5, hx, hy + r * 1.85);
    c.quadraticCurveTo(hx + r * 0.85, hy + r * 1.5, hx + r * 0.9, hy + r * 0.3);
    c.quadraticCurveTo(hx + r * 0.5, hy + r * 0.85, hx, hy + r * 0.82);
    c.quadraticCurveTo(hx - r * 0.5, hy + r * 0.85, hx - r * 0.9, hy + r * 0.3);
  });
  const c = p.c;
  c.beginPath();
  c.arc(hx, hy + r * 0.42, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
  c.strokeStyle = '#7a2e2e';
  c.lineWidth = r * 0.07;
  c.stroke();
  p.ellipse(hx - r * 0.22, hy + r * 0.4, r * 0.26, r * 0.11, '#F4F1EA', 0.25);
  p.ellipse(hx + r * 0.22, hy + r * 0.4, r * 0.26, r * 0.11, '#F4F1EA', -0.25);
  // turban: a big white wrap with a green top
  p.shape('#2E7D5B', (cc) => {
    cc.moveTo(hx - r * 0.6, hy - r * 1.3);
    cc.quadraticCurveTo(hx, hy - r * 2.55, hx + r * 0.6, hy - r * 1.3);
    cc.closePath();
  });
  p.ellipse(hx, hy - r * 0.92, r * 1.42, r * 0.78, '#FFFFFF');
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.ellipse(hx, hy - r * (0.75 + i * 0.16), r * (1.28 - i * 0.12), r * 0.32, -0.12 + i * 0.08, 0.1 * Math.PI, 0.9 * Math.PI);
    c.strokeStyle = '#DAD3C6';
    c.lineWidth = r * 0.07;
    c.stroke();
  }
  return pt;
}


/** A copper cauldron (kazan) with two handles. */
export function kazan(p: Pen, x: number, y: number, w: number, color = '#C8743F') {
  const h = w * 0.62;
  p.circle(x - w * 0.52, y - h * 0.62, w * 0.09, '#8A4A26');
  p.circle(x + w * 0.52, y - h * 0.62, w * 0.09, '#8A4A26');
  p.circle(x - w * 0.52, y - h * 0.62, w * 0.05, C.paper);
  p.circle(x + w * 0.52, y - h * 0.62, w * 0.05, C.paper);
  p.shape(color, (c) => {
    c.moveTo(x - w * 0.5, y - h * 0.82);
    c.quadraticCurveTo(x - w * 0.55, y, x - w * 0.18, y);
    c.lineTo(x + w * 0.18, y);
    c.quadraticCurveTo(x + w * 0.55, y, x + w * 0.5, y - h * 0.82);
    c.closePath();
  });
  p.ellipse(x, y - h * 0.82, w * 0.52, w * 0.09, '#A85A2E');
  p.ellipse(x, y - h * 0.82, w * 0.44, w * 0.06, '#3A2418');
  p.ellipse(x - w * 0.22, y - h * 0.45, w * 0.06, h * 0.22, 'rgba(255,255,255,0.28)', 0.2);
}
