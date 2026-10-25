import type { Pen } from './pen';
import { rng } from './pen';
import { C, elif, can, dede, hoca, person, star, crescent, iznikTile, tulip, kazan as kazanArt, type Arms } from './kit';
import type { LayerSpec } from '../types';

/**
 * Scenes for "Nasreddin Hoca ve Kazan".
 * The painted layers are only the backdrops (sky, Akşehir and the Sultan Mountains, house fronts, a living room);
 * the people, the cauldron, trees and market stalls in front of them are 3D models (see book.json → models).
 */

type Layer = LayerSpec & { draw: (p: Pen) => void };

const BACK = { z: 0.04, w: 0.96, h: 0.86 };
const HOUSES = { z: 0.26, w: 0.94, h: 0.46 };
const SOFA = { z: 0.4, w: 0.9, h: 0.6 };

function grad(p: Pen, y0: number, y1: number, stops: [number, string][]) {
  const g = p.c.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g as unknown as string;
}

/** Clip to the arched back panel and fill it. */
function archPanel(p: Pen, fill: string) {
  const c = p.c;
  const x = 14;
  const y = 14;
  const w = 972;
  const h = p.H - 28;
  const r = w / 2;
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, y + r * 0.6);
  c.bezierCurveTo(x, y + r * 0.6 - r * 0.75, x + w, y + r * 0.6 - r * 0.75, x + w, y + r * 0.6);
  c.lineTo(x + w, y + h);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  c.save();
  c.clip();
}

function cloud(p: Pen, x: number, y: number, s: number, color = '#ffffff') {
  p.circle(x, y, s, color);
  p.circle(x + s * 0.9, y + s * 0.15, s * 0.75, color);
  p.circle(x - s * 0.9, y + s * 0.2, s * 0.7, color);
  p.rect(x - s * 1.5, y + s * 0.1, s * 3.1, s * 0.75, color, s * 0.37);
}

function poplar(p: Pen, x: number, base: number, h: number, color = '#3F7F4A') {
  p.rect(x - 4, base - h * 0.2, 8, h * 0.2, '#6B4A2E', 3);
  p.ellipse(x, base - h * 0.58, h * 0.11, h * 0.45, color);
  p.ellipse(x - h * 0.03, base - h * 0.62, h * 0.05, h * 0.32, 'rgba(255,255,255,0.12)');
}

function minaret(p: Pen, x: number, base: number, h: number, wall = '#F2E6D2') {
  const w = h * 0.07;
  p.rect(x - w / 2, base - h, w, h, wall, 3);
  p.rect(x - w * 0.85, base - h * 0.72, w * 1.7, h * 0.035, wall, 2);
  p.rect(x - w * 0.85, base - h * 0.72 + h * 0.035, w * 1.7, h * 0.012, 'rgba(0,0,0,0.15)');
  p.poly([x - w * 0.62, base - h, x + w * 0.62, base - h, x, base - h * 1.28], '#5D7FA6');
  p.line([x, base - h * 1.28, x, base - h * 1.36], '#C9A04A', 3);
}

type Mood = 'morning' | 'noon' | 'evening';
const SKIES: Record<Mood, { top: string; bottom: string; mt: string; mt2: string; lake: string; hill: string; ground: string }> = {
  morning: { top: '#8FCDEB', bottom: '#FFF0D2', mt: '#9AA9D6', mt2: '#B8C2E3', lake: '#8ED0E0', hill: '#C9B27A', ground: '#EBD3A4' },
  noon: { top: '#6FBDE6', bottom: '#E8F6FF', mt: '#8E9FD0', mt2: '#AEBBE2', lake: '#7CC6DE', hill: '#B9AE6E', ground: '#EED7A8' },
  evening: { top: '#4E5FA8', bottom: '#FFB990', mt: '#6E6FA6', mt2: '#8D88B8', lake: '#E7A88E', hill: '#A88A6A', ground: '#DDB98E' },
};

/** Akşehir at the foot of the Sultan Mountains, with the lake and the town's minarets. */
function aksehir(p: Pen, mood: Mood) {
  const s = SKIES[mood];
  archPanel(p, grad(p, 0, p.H * 0.72, [[0, s.top], [1, s.bottom]]));
  const r = rng(mood.length * 7);
  if (mood === 'evening') {
    crescent(p, 780, 190, 40, '#FFF6D8', s.top);
    for (let i = 0; i < 14; i++) star(p, 80 + r() * 840, 90 + r() * 220, 5 + r() * 5, '#FFF6D8');
  } else {
    p.circle(mood === 'morning' ? 230 : 780, 200, 58, '#FFE08A');
    p.circle(mood === 'morning' ? 230 : 780, 200, 44, '#FFF1B8');
    cloud(p, 620, 170, 34);
    cloud(p, 380, 260, 24, 'rgba(255,255,255,0.85)');
  }
  // Sultan Mountains with snow on the peaks
  const peaks = [[-20, 520], [90, 380], [200, 450], [320, 330], [450, 430], [560, 350], [690, 450], [800, 360], [920, 440], [1040, 400]];
  p.shape(s.mt, (c) => {
    c.moveTo(-20, 620);
    peaks.forEach(([x, y]) => c.lineTo(x, y));
    c.lineTo(1040, 620);
  });
  for (const [x, y] of peaks.filter((_, i) => i % 2 === 1)) p.poly([x - 34, y + 30, x, y, x + 34, y + 30, x + 14, y + 24, x, y + 36, x - 16, y + 26], '#F6F8FF');
  p.shape(s.mt2, (c) => {
    c.moveTo(-20, 620);
    [[60, 520], [180, 470], [300, 530], [420, 480], [560, 540], [700, 470], [840, 530], [1040, 490]].forEach(([x, y]) => c.lineTo(x, y));
    c.lineTo(1040, 620);
  });
  p.hot('dağ', 80, 330, 840, 200);
  // Akşehir Lake
  p.rect(-20, 560, 1040, 40, s.lake);
  p.line([120, 578, 240, 578], 'rgba(255,255,255,0.5)', 3);
  p.line([620, 586, 780, 586], 'rgba(255,255,255,0.5)', 3);
  p.hot('göl', 40, 556, 920, 44);
  // the town: little flat-roofed houses, a dome and minarets
  p.shape(s.hill, (c) => {
    c.moveTo(-20, 700);
    c.quadraticCurveTo(250, 570, 520, 640);
    c.quadraticCurveTo(780, 590, 1040, 650);
    c.lineTo(1040, 720);
    c.lineTo(-20, 720);
  });
  const walls = ['#F4E3C3', '#EBCB98', '#F6EEDD', '#E5BE8E'];
  for (let i = 0; i < 16; i++) {
    const x = 40 + i * 60 + r() * 20;
    const hh = 34 + r() * 30;
    const base = 668 - Math.sin((x / 1000) * Math.PI) * 30;
    p.rect(x, base - hh, 46, hh, walls[i % walls.length], 3);
    p.rect(x - 3, base - hh - 6, 52, 8, '#9C6B45', 2);
    p.rect(x + 14, base - hh + 12, 10, 12, '#5A4A3E', 2);
  }
  p.circle(620, 610, 44, '#E8E0D2');
  p.rect(576, 610, 88, 30, '#E8E0D2');
  minaret(p, 690, 640, 170);
  minaret(p, 548, 640, 130);
  p.hot('minare', 520, 410, 200, 230);
  for (const [x, hh] of [[70, 200], [140, 240], [880, 220], [940, 190]]) poplar(p, x, 700, hh);
  // ground
  p.rect(-20, 700, 1040, p.H, grad(p, 700, p.H, [[0, s.ground], [1, '#D9B98A']]));
  p.c.restore();
}

/** One village house front: earth walls, wooden beams or a tiled roof, a wooden door and geraniums. */
function house(p: Pen, x: number, w: number, h: number, o: { wall: string; tiled?: boolean; door: string; shutter: string; vine?: boolean; word?: string }) {
  const base = p.H - 4;
  const top = base - h;
  p.rect(x, top, w, h, o.wall, 8);
  // plaster patches
  const r = rng(Math.round(x));
  for (let i = 0; i < 9; i++) p.ellipse(x + 20 + r() * (w - 40), top + 30 + r() * (h - 80), 14 + r() * 18, 7 + r() * 6, 'rgba(120,80,40,0.08)');
  if (o.tiled) {
    p.poly([x - 26, top + 6, x + w / 2, top - h * 0.32, x + w + 26, top + 6], '#B8432E');
    for (let i = 1; i < 6; i++) p.line([x - 26 + i * ((w + 52) / 6), top + 6, x + w / 2, top - h * 0.32], 'rgba(0,0,0,0.12)', 3);
  } else {
    p.rect(x - 14, top - 14, w + 28, 22, '#8A5A36', 4);
    for (let i = 0; i < 7; i++) p.rect(x - 10 + i * ((w + 4) / 6), top + 6, 12, 14, '#6E4429', 2);
  }
  // door with an arched top and iron studs
  const dw = w * 0.32;
  const dx = x + w * 0.5 - dw / 2;
  const dh = h * 0.56;
  p.rect(dx - 10, base - dh - 10, dw + 20, dh + 10, '#E9DCC6', 10);
  p.arch(dx, base - dh, dw, dh, o.door);
  p.line([dx + dw / 2, base - dh * 0.92, dx + dw / 2, base], 'rgba(0,0,0,0.25)', 3);
  for (const yy of [0.35, 0.6, 0.85]) for (const xx of [0.2, 0.8]) p.circle(dx + dw * xx, base - dh + dh * yy, 4, '#3A2A1E');
  p.circle(dx + dw * 0.62, base - dh * 0.45, 7, '#C9A04A');
  p.rect(dx - 18, base - 10, dw + 36, 12, '#BFAE94', 3);
  p.hot('kapı', dx, base - dh, dw, dh);
  // windows with wooden shutters
  for (const wx of [x + w * 0.13, x + w * 0.87 - w * 0.16]) {
    const ww = w * 0.16;
    const wy = top + h * 0.2;
    p.rect(wx, wy, ww, ww * 1.15, '#5A6E86', 4);
    p.line([wx + ww / 2, wy, wx + ww / 2, wy + ww * 1.15], '#F4EBD8', 4);
    p.rect(wx - ww * 0.42, wy, ww * 0.4, ww * 1.15, o.shutter, 3);
    p.rect(wx + ww * 1.02, wy, ww * 0.4, ww * 1.15, o.shutter, 3);
    p.rect(wx - 6, wy + ww * 1.15, ww + 12, 8, '#E9DCC6', 3);
    // geraniums in a tin on the sill
    p.rect(wx + ww * 0.2, wy + ww * 1.15 - 22, ww * 0.6, 22, '#9AA6B2', 3);
    for (let i = 0; i < 4; i++) p.circle(wx + ww * (0.28 + i * 0.15), wy + ww * 1.15 - 30 - (i % 2) * 8, 9, '#E0453A');
    p.hot('pencere', wx - ww * 0.42, wy, ww * 1.84, ww * 1.2);
  }
  if (o.vine) {
    // a grapevine over the door
    for (let i = 0; i < 9; i++) p.circle(dx - 30 + i * ((dw + 60) / 8), base - dh - 26 + Math.sin(i) * 8, 22, i % 2 ? '#4E9A4A' : '#5FAE55');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3 - i; j++) p.circle(dx + dw * 0.15 + j * 12 + i * 6, base - dh - 4 + i * 11, 6, '#6A3F86');
    p.hot('asma', dx - 40, base - dh - 50, dw + 80, 60);
  }
  if (o.word) p.hot(o.word, x, top, w, h);
}

function houses(p: Pen, focus: 'both' | 'hoca' | 'komsu') {
  if (focus !== 'komsu') house(p, focus === 'hoca' ? 260 : 30, 420, 360, { wall: '#EED6AE', door: '#7A4A2A', shutter: '#2F7F86', vine: true, word: 'ev' });
  if (focus !== 'hoca') house(p, focus === 'komsu' ? 300 : 540, 420, 330, { wall: '#F3E6CF', tiled: true, door: '#5E3B22', shutter: '#3E6FA8', word: 'ev' });
}

/* ---------- the living room where Dede tells the story ---------- */

function livingRoom(p: Pen) {
  archPanel(p, grad(p, 0, p.H, [[0, '#F5E6CC'], [1, '#EBD3AE']]));
  // window with the night sky
  const wx = 150;
  const wy = 200;
  const ww = 300;
  const wh = 290;
  p.rect(wx - 18, wy - 18, ww + 36, wh + 36, '#FFFFFF', 12);
  p.rect(wx, wy, ww, wh, grad(p, wy, wy + wh, [[0, '#26326E'], [1, '#5E6FB8']]));
  crescent(p, wx + 210, wy + 90, 34, '#FFF6D8', '#2D3A78');
  const r = rng(4);
  for (let i = 0; i < 9; i++) star(p, wx + 20 + r() * (ww - 40), wy + 20 + r() * (wh - 90), 4 + r() * 4, '#FFF6D8');
  p.line([wx + ww / 2, wy, wx + ww / 2, wy + wh], '#FFFFFF', 8);
  p.line([wx, wy + wh * 0.45, wx + ww, wy + wh * 0.45], '#FFFFFF', 8);
  p.hot('pencere', wx - 18, wy - 18, ww + 36, wh + 36);
  // framed picture of Nasreddin Hoca
  const fx = 600;
  const fy = 180;
  const fw = 220;
  const fh = 260;
  p.rect(fx - 16, fy - 16, fw + 32, fh + 32, '#8A5A36', 10);
  p.rect(fx, fy, fw, fh, '#CFE7EF');
  p.save();
  p.c.beginPath();
  p.c.rect(fx, fy, fw, fh);
  p.c.clip();
  hoca(p, fx + fw / 2, fy + fh + 120, 380, { arms: 'down' });
  p.restore();
  p.hot('Nasreddin Hoca', fx - 16, fy - 16, fw + 32, fh + 32);
  // shelf with books and a tile
  p.rect(560, 520, 330, 14, C.woodDark, 4);
  const cols = [C.red, C.cobalt, C.saffron, C.turq, C.leaf, '#8E5BB5'];
  cols.forEach((c, i) => p.rect(580 + i * 26, 520 - 70 - (i % 3) * 10, 22, 70 + (i % 3) * 10, c, 3));
  iznikTile(p, 780, 440, 76, 3);
  p.hot('kitap', 575, 440, 160, 82);
  // lower wall panelling
  p.rect(0, p.H - 230, 1000, 230, '#C9A27A');
  for (let i = 0; i < 9; i++) p.rect(30 + i * 110, p.H - 200, 90, 150, 'rgba(255,255,255,0.12)', 8);
  p.c.restore();
}

function sedir(p: Pen) {
  const base = p.H - 4;
  // a low Turkish divan with kilim cushions along the wall
  p.rect(40, base - 260, 920, 120, '#B03A2E', 30);
  for (let i = 0; i < 6; i++) {
    const cx = 120 + i * 152;
    p.rect(cx - 62, base - 248, 124, 96, '#C9472F', 24);
    p.poly([cx, base - 236, cx + 40, base - 200, cx, base - 164, cx - 40, base - 200], '#F2B33D');
    p.poly([cx, base - 222, cx + 22, base - 200, cx, base - 178, cx - 22, base - 200], '#1C3F8C');
  }
  p.rect(20, base - 150, 960, 120, '#7A4526', 18);
  p.rect(20, base - 150, 960, 34, '#9C5B32', 14);
  for (let i = 0; i < 12; i++) p.poly([60 + i * 78, base - 112, 92 + i * 78, base - 80, 60 + i * 78, base - 48, 28 + i * 78, base - 80], i % 2 ? '#E7C98F' : '#B8432E');
  p.hot('sedir', 20, base - 260, 960, 230);
}

function bookInHands(p: Pen, x: number, y: number, s: number) {
  p.poly([x - s, y - s * 0.15, x, y, x, y + s * 0.55, x - s, y + s * 0.4], '#FFFBF2');
  p.poly([x + s, y - s * 0.15, x, y, x, y + s * 0.55, x + s, y + s * 0.4], '#F4EBD8');
  p.line([x, y, x, y + s * 0.55], '#B8A88E', 3);
  p.rect(x - s * 1.04, y + s * 0.38, s * 2.08, s * 0.12, C.cobalt, 4);
}

function pencilBox(p: Pen, x: number, y: number, s: number) {
  p.rect(x - s, y - s * 0.45, s * 2, s * 0.9, '#1FA4A0', 8);
  const cols = [C.red, C.saffron, '#3E8E4E', C.cobalt, '#8E5BB5', '#F28DB2'];
  cols.forEach((c, i) => {
    const px = x - s * 0.8 + i * s * 0.32;
    p.rect(px, y - s * 0.95, s * 0.2, s * 0.6, c, 3);
    p.poly([px, y - s * 0.95, px + s * 0.2, y - s * 0.95, px + s * 0.1, y - s * 1.15], i === 3 ? '#F4EBD8' : '#F2D7A8');
  });
  p.hot('boya kalemi', x - s, y - s * 1.2, s * 2, s * 1.65);
}

function family(p: Pen, ending: boolean) {
  sedir(p);
  const base = p.H - 120;
  const e = elif(p, 220, base, 350, { sitting: true, arms: ending ? 'hold' : 'down', mouth: ending ? 'smile' : 'open' });
  const d = dede(p, 500, base, 470, { sitting: true, arms: 'hold', mouth: 'grin' });
  bookInHands(p, d.headX, (d.handL[1] + d.handR[1]) / 2 - 10, 64);
  p.hot('dede', d.headX - 120, d.headY - 80, 240, 440);
  const c = can(p, 785, base, 320, { sitting: true, arms: ending ? 'offer' : 'up', mouth: ending ? 'smile' : 'open', lean: ending ? -0.08 : 0 });
  if (ending) pencilBox(p, c.handR[0] - 120, c.handR[1] - 10, 46);
  void e;
}

/* ---------- 2D stand-ins for the 3D cast, for the activity pictures ---------- */

const CAST = { z: 0.62, w: 0.94, h: 0.42, thumbOnly: true };

function komsu(p: Pen, x: number, y: number, h: number, arms: Arms, mouth: 'smile' | 'open' | 'grin' = 'smile') {
  return person(p, { x, y, h, skin: '#D9A47F', hair: '#3B2A1E', style: 'short', cap: '#6B4A2E', mustache: '#3B2A1E', top: '#8A5A3A', dress: true, arms, mouth });
}

function cast(p: Pen, o: { hoca: [number, Arms, ('smile' | 'open' | 'grin')?]; komsu: [number, Arms, ('smile' | 'open' | 'grin')?]; kazan?: number; baby?: boolean; yolcu?: number }) {
  const y = p.H - 10;
  hoca(p, o.hoca[0], y, 380, { arms: o.hoca[1], mouth: o.hoca[2] ?? 'smile' });
  komsu(p, o.komsu[0], y, 370, o.komsu[1], o.komsu[2]);
  if (o.yolcu !== undefined) person(p, { x: o.yolcu, y, h: 360, skin: '#E2AE8A', hair: '#5A3726', style: 'short', top: '#5E7A3A', bottom: '#4A3A2A', mustache: '#5A3726', arms: 'up', mouth: 'grin' });
  if (o.kazan !== undefined) {
    kazanArt(p, o.kazan, y, 170);
    if (o.baby) kazanArt(p, o.kazan + 10, y - 86, 70, '#F2B07A');
  }
}

/* ------------------------------------------------------------------ */

export const KAZAN_SCENES: Record<string, Layer[]> = {
  k1: [
    { ...BACK, draw: (p) => livingRoom(p) },
    { ...SOFA, draw: (p) => family(p, false) },
  ],
  k2: [
    { ...BACK, draw: (p) => aksehir(p, 'morning') },
    { ...HOUSES, draw: (p) => houses(p, 'both') },
    { ...CAST, draw: (p) => cast(p, { hoca: [300, 'forward'], komsu: [720, 'wave'] }) },
  ],
  k3: [
    { ...BACK, draw: (p) => aksehir(p, 'morning') },
    { ...HOUSES, draw: (p) => houses(p, 'komsu') },
    { ...CAST, draw: (p) => cast(p, { hoca: [300, 'down'], komsu: [700, 'offer', 'open'], kazan: 510 }) },
  ],
  k4: [
    { ...BACK, draw: (p) => aksehir(p, 'noon') },
    { ...HOUSES, draw: (p) => houses(p, 'komsu') },
    { ...CAST, draw: (p) => cast(p, { hoca: [290, 'point', 'grin'], komsu: [730, 'up', 'open'], kazan: 510, baby: true }) },
  ],
  k5: [
    { ...BACK, draw: (p) => aksehir(p, 'noon') },
    { ...HOUSES, draw: (p) => houses(p, 'both') },
    { ...CAST, draw: (p) => cast(p, { hoca: [280, 'forward'], komsu: [720, 'offer', 'grin'], kazan: 500 }) },
  ],
  k6: [
    { ...BACK, draw: (p) => aksehir(p, 'evening') },
    { ...HOUSES, draw: (p) => houses(p, 'hoca') },
    { ...CAST, draw: (p) => cast(p, { hoca: [330, 'down'], komsu: [690, 'point', 'open'] }) },
  ],
  k7: [
    {
      ...BACK,
      draw: (p) => {
        aksehir(p, 'noon');
        // market day: bunting across the square
        const colors = [C.cobalt, C.turq, C.red, C.saffron];
        p.curve([30, 300, 500, 380, 970, 300], '#7a5a3a', 3);
        for (let i = 0; i < 12; i++) {
          const t = (i + 0.5) / 12;
          const x = 30 + 940 * t;
          const y = 300 + 4 * 40 * t * (1 - t);
          p.poly([x - 20, y, x + 20, y, x, y + 42], colors[i % 4]);
        }
        p.hot('pazar', 30, 280, 940, 120);
      },
    },
    { ...CAST, draw: (p) => cast(p, { hoca: [260, 'point', 'grin'], komsu: [520, 'up', 'open'], yolcu: 790 }) },
  ],
  k8: [
    { ...BACK, draw: (p) => livingRoom(p) },
    { ...SOFA, draw: (p) => family(p, true) },
  ],
};

/** The cover of "Nasreddin Hoca ve Kazan". */
export function drawKazanCover(p: Pen, inner: { x: number; y: number; w: number; h: number }) {
  p.rect(inner.x, inner.y, inner.w, inner.h, grad(p, inner.y, inner.y + inner.h, [[0, '#7CC3E6'], [0.6, '#FFEBC4'], [1, '#EBD3A4']]));
  p.save();
  p.c.beginPath();
  p.c.rect(inner.x, inner.y, inner.w, inner.h);
  p.c.clip();
  const by = inner.y + inner.h * 0.62;
  p.shape('#A9B6DE', (c) => {
    c.moveTo(inner.x, by);
    [[0.12, -150], [0.3, -60], [0.48, -190], [0.66, -80], [0.84, -170], [1, -70]].forEach(([fx, dy]) => c.lineTo(inner.x + inner.w * fx, by + dy));
    c.lineTo(inner.x + inner.w, by + 40);
    c.lineTo(inner.x, by + 40);
  });
  minaret(p, inner.x + inner.w * 0.86, by + 40, 260);
  poplar(p, inner.x + inner.w * 0.1, by + 60, 300);
  p.rect(inner.x, by + 30, inner.w, inner.h, '#EBD3A4');
  hoca(p, inner.x + inner.w * 0.36, inner.y + inner.h - 30, 560, { arms: 'point', mouth: 'grin' });
  kazanArt(p, inner.x + inner.w * 0.74, inner.y + inner.h - 50, 230);
  kazanArt(p, inner.x + inner.w * 0.74 + 40, inner.y + inner.h - 160, 90);
  for (let i = 0; i < 6; i++) tulip(p, inner.x + 20 + i * (inner.w / 5.4), inner.y + inner.h + 10, 90, i % 2 ? C.saffron : C.red);
  p.restore();
}
