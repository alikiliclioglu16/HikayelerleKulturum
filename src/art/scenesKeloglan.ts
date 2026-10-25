import type { Pen } from './pen';
import { rng } from './pen';
import { C, elif, can, anne, person, tulip, type Arms } from './kit';
import { archPanel, grad, cloud, poplar, house } from './scenesKazan';
import type { LayerSpec } from '../types';

/**
 * Scenes for "Keloğlan ve Üç Tohum". The painted layers are backdrops (an American back yard, an Anatolian
 * village in a dry summer, the rain, the harvest); Keloğlan, the villagers, tools and the growing
 * vegetables are 3D models in front of them.
 */

type Layer = LayerSpec & { draw: (p: Pen) => void };

const BACK = { z: 0.04, w: 0.96, h: 0.86 };
const MIDDLE = { z: 0.3, w: 0.94, h: 0.46 };
const FAMILY = { z: 0.36, w: 0.9, h: 0.5 };
const CAST = { z: 0.62, w: 0.94, h: 0.42, thumbOnly: true };

/** Keloğlan as a drawing (for the cover and the activity pictures): bald, red vest, blue şalvar. */
export function keloglan2d(p: Pen, x: number, y: number, h: number, arms: Arms = 'wave', mouth: 'smile' | 'open' | 'grin' = 'grin') {
  const pt = person(p, { x, y, h, child: true, skin: '#F0C29C', hair: '#F0C29C', style: 'short', top: '#C9472F', bottom: '#2F5FA8', arms, mouth });
  // shine on the bald head
  p.ellipse(pt.headX - pt.headR * 0.35, pt.headY - pt.headR * 0.55, pt.headR * 0.28, pt.headR * 0.14, 'rgba(255,255,255,0.55)', -0.4);
  // a yellow sash
  p.rect(x - h * 0.13, pt.bodyTop + (pt.bodyBottom - pt.bodyTop) * 0.55, h * 0.26, h * 0.03, C.saffron, 4);
  return pt;
}

/** Keloğlan's mother: a headscarf and an apron. */
function ana(p: Pen, x: number, y: number, h: number, arms: Arms = 'offer') {
  return person(p, { x, y, h, skin: '#E6B48E', hair: '#F4F1EA', style: 'scarf', scarfDots: C.red, top: '#6B5BA8', dress: true, apron: '#F4EBD8', arms, mouth: 'smile' });
}

type Mood = 'dry' | 'rain' | 'harvest';
const SKY: Record<Mood, { top: string; bottom: string; hill: string; field: string; ground: string }> = {
  dry: { top: '#9CC8E4', bottom: '#FCE7C0', hill: '#C9A86A', field: '#D8B878', ground: '#E3C68E' },
  rain: { top: '#7F8FA8', bottom: '#C9D6E2', hill: '#7FA05A', field: '#8DB463', ground: '#A8C47A' },
  harvest: { top: '#F5B46A', bottom: '#FFE3B0', hill: '#A9A04E', field: '#E0B24C', ground: '#D9C27A' },
};

/** An Anatolian village under wide skies, with fields on the hills. */
function village(p: Pen, mood: Mood) {
  const s = SKY[mood];
  archPanel(p, grad(p, 0, p.H * 0.7, [[0, s.top], [1, s.bottom]]));
  const r = rng(mood.length * 13);
  if (mood === 'dry') {
    p.circle(760, 190, 70, '#FFE08A');
    p.circle(760, 190, 54, '#FFF3BF');
  } else if (mood === 'rain') {
    cloud(p, 300, 170, 70, '#E8EDF3');
    cloud(p, 700, 150, 80, '#DCE3EC');
    cloud(p, 520, 230, 50, '#EEF2F6');
    // a rainbow behind the rain
    const c = p.c;
    ['#E0453A', '#F2B33D', '#F7E35A', '#5FAE55', '#3E6FA8', '#7A4FA0'].forEach((col, i) => {
      c.beginPath();
      c.arc(820, 620, 300 - i * 16, Math.PI * 1.05, Math.PI * 1.55);
      c.strokeStyle = col;
      c.globalAlpha = 0.55;
      c.lineWidth = 16;
      c.stroke();
    });
    c.globalAlpha = 1;
  } else {
    p.circle(250, 330, 80, '#FFD27A');
    p.circle(250, 330, 62, '#FFEAB0');
    cloud(p, 680, 200, 36, '#FFF4E2');
  }
  // far hills with patchwork fields
  p.shape(s.hill, (c) => {
    c.moveTo(-20, 560);
    c.quadraticCurveTo(200, 420, 420, 500);
    c.quadraticCurveTo(650, 400, 1040, 520);
    c.lineTo(1040, 700);
    c.lineTo(-20, 700);
  });
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 110 + r() * 30;
    const y = 520 + r() * 60;
    p.poly([x, y, x + 90, y - 18, x + 110, y + 20, x + 20, y + 38], i % 2 ? s.field : 'rgba(255,255,255,0.12)');
  }
  p.hot('tarla', 40, 480, 920, 120);
  // village houses on the hill
  const walls = ['#F4E3C3', '#EBCB98', '#F6EEDD'];
  for (let i = 0; i < 7; i++) {
    const x = 120 + i * 105 + r() * 20;
    const base = 560 - Math.sin((x / 1000) * Math.PI) * 40;
    p.rect(x, base - 40, 56, 40, walls[i % 3], 3);
    p.poly([x - 6, base - 38, x + 28, base - 62, x + 62, base - 38], '#B8432E');
    p.rect(x + 22, base - 22, 12, 22, '#6B4A2E', 2);
  }
  p.hot('köy', 100, 470, 820, 100);
  for (const [x, hh] of [[60, 220], [930, 240], [880, 180]] as [number, number][]) poplar(p, x, 650, hh, mood === 'dry' ? '#7F8F4A' : '#3F7F4A');
  p.rect(-20, 640, 1040, p.H, grad(p, 640, p.H, [[0, s.ground], [1, mood === 'dry' ? '#D2B07A' : '#93B06A']]));
  if (mood === 'dry') {
    // cracks in the dry earth
    for (let i = 0; i < 10; i++) {
      const x = 60 + r() * 880;
      const y = 680 + r() * 160;
      p.line([x, y, x + 20, y + 8, x + 34, y + 2, x + 50, y + 12], 'rgba(120,80,40,0.35)', 3);
    }
  }
  if (mood === 'rain') {
    for (let i = 0; i < 70; i++) {
      const x = r() * 1000;
      const y = 120 + r() * 600;
      p.line([x, y, x - 8, y + 30], 'rgba(255,255,255,0.65)', 3);
    }
    p.hot('yağmur', 100, 120, 800, 500);
  }
  p.c.restore();
}

/** A stone village well with a little roof and a bucket on a rope. */
function well(p: Pen, x: number, base: number, s: number) {
  p.rect(x - s * 0.5, base - s * 0.45, s, s * 0.45, '#B9AE9C', 12);
  for (let i = 0; i < 4; i++) p.line([x - s * 0.5, base - s * (0.1 + i * 0.1), x + s * 0.5, base - s * (0.1 + i * 0.1)], 'rgba(0,0,0,0.12)', 3);
  p.rect(x - s * 0.44, base - s * 1.05, s * 0.06, s * 0.6, C.woodDark, 3);
  p.rect(x + s * 0.38, base - s * 1.05, s * 0.06, s * 0.6, C.woodDark, 3);
  p.poly([x - s * 0.62, base - s * 1.0, x, base - s * 1.32, x + s * 0.62, base - s * 1.0], '#B8432E');
  p.line([x, base - s * 0.98, x, base - s * 0.62], '#7A5A3A', 3);
  p.rect(x - s * 0.08, base - s * 0.66, s * 0.16, s * 0.14, '#7F8FA8', 3);
  p.hot('kuyu', x - s * 0.62, base - s * 1.32, s * 1.24, s * 1.32);
}

function home(p: Pen, withMother: boolean, withWell: boolean) {
  house(p, 60, 400, 330, { wall: '#EED6AE', door: '#7A4A2A', shutter: '#3E8E4E', vine: false, word: 'ev' });
  if (withMother) {
    ana(p, 260, p.H - 6, 300);
    p.hot('anne', 190, p.H - 310, 140, 300);
  }
  if (withWell) well(p, 760, p.H - 6, 230);
}

/* ---------- the family's back yard in America ---------- */

function backyard(p: Pen, evening: boolean) {
  archPanel(p, grad(p, 0, p.H * 0.7, evening ? [[0, '#F2A66A'], [1, '#FFE2BA']] : [[0, '#8FCDEB'], [1, '#EAF6FF']]));
  if (!evening) {
    p.circle(820, 180, 56, '#FFE08A');
    cloud(p, 330, 190, 40);
  } else p.circle(200, 300, 60, '#FFD27A');
  // the family's wooden house
  p.rect(420, 260, 520, 420, '#F2EAD8', 6);
  for (let y = 280; y < 680; y += 26) p.line([420, y, 940, y], 'rgba(120,100,70,0.18)', 2);
  p.poly([400, 270, 680, 120, 960, 270], '#5A6E86');
  p.rect(500, 360, 120, 110, '#9FD3F0', 6);
  p.rect(740, 360, 120, 110, '#9FD3F0', 6);
  p.line([560, 360, 560, 470], '#FFFFFF', 6);
  p.line([800, 360, 800, 470], '#FFFFFF', 6);
  p.hot('ev', 420, 120, 520, 560);
  // a big tree
  p.rect(150, 380, 34, 300, '#7A5A3A', 8);
  for (const [x, y, rr] of [[166, 330, 110], [100, 390, 80], [240, 380, 90]] as [number, number, number][]) p.circle(x, y, rr, '#4E9A4A');
  p.hot('ağaç', 50, 220, 300, 460);
  // white picket fence
  for (let x = 20; x < 990; x += 46) {
    p.rect(x, 600, 30, 120, '#FFFFFF', 4);
    p.poly([x, 600, x + 15, 580, x + 30, 600], '#FFFFFF');
  }
  p.rect(10, 640, 990, 14, '#FFFFFF', 4);
  p.hot('çit', 10, 580, 990, 140);
  p.rect(-20, 700, 1040, p.H, grad(p, 700, p.H, [[0, '#8DC46E'], [1, '#6FAE58']]));
  p.c.restore();
}

function gardeners(p: Pen, ending: boolean) {
  const base = p.H - 8;
  anne(p, 230, base, 380, { arms: ending ? 'offer' : 'forward' });
  elif(p, 520, base, 290, { arms: ending ? 'hold' : 'point', mouth: 'open' });
  can(p, 760, base, 260, { arms: ending ? 'up' : 'hold', mouth: ending ? 'grin' : 'open' });
  if (ending) {
    // a bowl of fresh salad in Anne's hands
    p.ellipse(330, base - 240, 70, 26, '#FFFFFF');
    for (let i = 0; i < 7; i++) p.circle(280 + i * 16, base - 252 - (i % 2) * 6, 12, i % 3 ? '#5FAE55' : '#E0453A');
    p.hot('salata', 250, base - 290, 160, 70);
  } else {
    // a handful of seeds in Can's hands
    for (let i = 0; i < 3; i++) p.ellipse(745 + i * 14, base - 150, 6, 9, '#8A5A2E');
    p.hot('tohum', 720, base - 170, 80, 40);
  }
}

/* ---------- 2D stand-ins for the 3D cast in the activity pictures ---------- */

function villager(p: Pen, x: number, y: number, h: number, arms: Arms, mouth: 'smile' | 'open' | 'grin' = 'smile') {
  return person(p, { x, y, h, skin: '#D9A47F', hair: '#3B2A1E', style: 'short', cap: '#6B4A2E', mustache: '#3B2A1E', top: '#8A5A3A', dress: true, arms, mouth });
}

function cast(p: Pen, o: { kel: [number, Arms]; villager?: [number, Arms]; sprouts?: number; harvest?: boolean }) {
  const y = p.H - 10;
  keloglan2d(p, o.kel[0], y, 330, o.kel[1]);
  if (o.villager) villager(p, o.villager[0], y, 380, o.villager[1], 'open');
  if (o.sprouts) for (let i = 0; i < 3; i++) tulip(p, o.sprouts + i * 70, y, 110, '#5FAE55');
  if (o.harvest) {
    p.rect(560, y - 90, 260, 90, '#9C6B45', 12);
    for (let i = 0; i < 9; i++) p.circle(580 + i * 28, y - 96 - (i % 2) * 14, 20, ['#E0453A', '#F2B33D', '#5FAE55'][i % 3]);
  }
}

export const KELOGLAN_SCENES: Record<string, Layer[]> = {
  e1: [
    { ...BACK, draw: (p) => backyard(p, false) },
    { ...FAMILY, draw: (p) => gardeners(p, false) },
  ],
  e2: [
    { ...BACK, draw: (p) => village(p, 'dry') },
    { ...MIDDLE, draw: (p) => home(p, true, false) },
    { ...CAST, draw: (p) => cast(p, { kel: [560, 'forward'] }) },
  ],
  e3: [
    { ...BACK, draw: (p) => village(p, 'dry') },
    { ...MIDDLE, draw: (p) => home(p, false, true) },
    { ...CAST, draw: (p) => cast(p, { kel: [420, 'hold'], sprouts: 640 }) },
  ],
  e4: [
    { ...BACK, draw: (p) => village(p, 'dry') },
    { ...CAST, draw: (p) => cast(p, { kel: [300, 'wave'], villager: [720, 'point'], sprouts: 440 }) },
  ],
  e5: [
    { ...BACK, draw: (p) => village(p, 'dry') },
    { ...MIDDLE, draw: (p) => home(p, false, true) },
    { ...CAST, draw: (p) => cast(p, { kel: [380, 'hold'], villager: [700, 'down'] }) },
  ],
  e6: [
    { ...BACK, draw: (p) => village(p, 'rain') },
    { ...CAST, draw: (p) => cast(p, { kel: [500, 'up'], sprouts: 640 }) },
  ],
  e7: [
    { ...BACK, draw: (p) => village(p, 'harvest') },
    { ...CAST, draw: (p) => cast(p, { kel: [300, 'up'], villager: [880, 'wave'], harvest: true }) },
  ],
  e8: [
    { ...BACK, draw: (p) => backyard(p, true) },
    { ...FAMILY, draw: (p) => gardeners(p, true) },
  ],
};

/** The cover of "Keloğlan ve Üç Tohum". */
export function drawKeloglanCover(p: Pen, inner: { x: number; y: number; w: number; h: number }) {
  p.rect(inner.x, inner.y, inner.w, inner.h, grad(p, inner.y, inner.y + inner.h, [[0, '#8FCDEB'], [0.62, '#FFF1D2'], [1, '#8DC46E']]));
  p.save();
  p.c.beginPath();
  p.c.rect(inner.x, inner.y, inner.w, inner.h);
  p.c.clip();
  p.circle(inner.x + inner.w * 0.8, inner.y + inner.h * 0.42, 70, '#FFE08A');
  const gy = inner.y + inner.h * 0.72;
  p.shape('#7FA05A', (c) => {
    c.moveTo(inner.x, gy);
    c.quadraticCurveTo(inner.x + inner.w * 0.5, gy - 90, inner.x + inner.w, gy - 10);
    c.lineTo(inner.x + inner.w, inner.y + inner.h);
    c.lineTo(inner.x, inner.y + inner.h);
  });
  p.rect(inner.x, gy + 70, inner.w, inner.h, '#7A4F35');
  keloglan2d(p, inner.x + inner.w * 0.34, inner.y + inner.h - 40, 460, 'up');
  [0.62, 0.76, 0.9].forEach((fx, i) => {
    const x = inner.x + inner.w * fx;
    const y = gy + 80;
    p.line([x, y, x, y - 90 - i * 40], C.leaf, 12);
    p.ellipse(x - 30, y - 70 - i * 40, 34, 15, '#7FC46A', -0.5);
    p.ellipse(x + 30, y - 90 - i * 40, 34, 15, '#7FC46A', 0.5);
  });
  p.restore();
}
