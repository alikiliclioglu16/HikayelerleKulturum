import { Pen, rng, cutout } from './pen';
import {
  C, elif, can, bunting, iznikTile, tulip, teaGlass, caydanlik,
  baklavaTray, lokumBox, candy, CANDY_COLORS, windowFrame, curtain, crescent, star, plant, clockTower, turkishFlag,
} from './kit';
import type { Hotspot, LayerSpec } from '../types';
import { KAZAN_SCENES, drawKazanCover } from './scenesKazan';
import { KELOGLAN_SCENES, drawKeloglanCover } from './scenesKeloglan';

export interface ProcLayer extends LayerSpec {
  draw: (p: Pen) => void;
}

export interface BuiltLayer {
  spec: LayerSpec;
  canvas: HTMLCanvasElement;
  alpha: Uint8Array;
  aw: number;
  ah: number;
  hotspots: Hotspot[];
}

const BACK = { z: 0.04, w: 0.96, h: 0.86 };
const MID = { z: 0.45, w: 0.92, h: 0.6 };
const FRONT = { z: 0.84, w: 0.94, h: 0.3 };

function sky(p: Pen, top: string, bottom: string, x = 0, y = 0, w = p.W, h = p.H) {
  const g = p.c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  p.rect(x, y, w, h, g as unknown as string);
}

function grad(p: Pen, y0: number, y1: number, stops: [number, string][]) {
  const g = p.c.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function cloud(p: Pen, x: number, y: number, s: number, color = '#ffffff') {
  p.circle(x, y, s, color);
  p.circle(x + s * 0.9, y + s * 0.15, s * 0.75, color);
  p.circle(x - s * 0.9, y + s * 0.2, s * 0.7, color);
  p.rect(x - s * 1.5, y + s * 0.1, s * 3.1, s * 0.75, color, s * 0.37);
}

function framedTile(p: Pen, x: number, y: number, s: number) {
  p.rect(x - 10, y - 10, s + 20, s + 20, C.woodDark, 6);
  iznikTile(p, x, y, s, 2);
}

function shelf(p: Pen, x: number, y: number, w: number) {
  p.rect(x, y, w, 16, C.woodDark, 4);
  p.poly([x + 20, y + 16, x + 50, y + 16, x + 20, y + 50], C.woodDark);
  p.poly([x + w - 20, y + 16, x + w - 50, y + 16, x + w - 20, y + 50], C.woodDark);
}

function books(p: Pen, x: number, y: number) {
  const cols = [C.red, C.cobalt, C.saffron, C.turq, C.leaf];
  let xx = x;
  cols.forEach((c, i) => {
    const h = 70 + ((i * 17) % 30);
    p.rect(xx, y - h, 22, h, c, 3);
    xx += 25;
  });
}

/* ------------------------------------------------------------------ */
/* Scenes                                                              */
/* ------------------------------------------------------------------ */

/* The rooms behind the 3D characters: a back wall and a few things in front. The family itself acts in 3D
   (see book.json → cast), so no people are drawn here. */
const SCENES: Record<string, ProcLayer[]> = {
  /* 1. Bedroom, Bayram morning */
  p1: [
    {
      ...BACK,
      draw: (p) => {
        p.arch(14, 14, 972, p.H - 28, '#CFE6F2');
        windowFrame(p, 330, 230, 340, 300, (q) => {
          sky(q, '#FFD9A6', '#FFF3D6', 330, 230, 340, 300);
          // sun
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            q.line([500 + Math.cos(a) * 70, 360 + Math.sin(a) * 70, 500 + Math.cos(a) * 95, 360 + Math.sin(a) * 95], C.saffron, 10);
          }
          q.circle(500, 360, 58, C.saffron);
          q.circle(500, 360, 46, '#FFCF5C');
          cloud(q, 400, 290, 26);
          q.shape('#8CC77B', (c) => {
            c.moveTo(330, 470);
            c.quadraticCurveTo(430, 420, 520, 465);
            c.quadraticCurveTo(600, 430, 670, 455);
            c.lineTo(670, 530);
            c.lineTo(330, 530);
          });
        });
        p.hot('güneş', 435, 290, 130, 140);
        p.hot('pencere', 316, 216, 368, 350);
        p.rect(230, 186, 540, 12, C.woodDark, 6);
        curtain(p, 236, 196, 120, 400, C.turq, 'l');
        curtain(p, 644, 196, 120, 400, C.turq, 'r');
        bunting(p, 110, 890, 120, 22, 9);
        framedTile(p, 820, 360, 100);
        shelf(p, 70, 470, 170);
        books(p, 90, 470);
        p.rect(14, p.H - 70, 972, 56, '#B8D6E6');
      },
    },
    {
    z: 0.22,
    w: 0.22,
    h: 0.2,
    x: -0.4,
    draw: (p) => {
      // bedside table with the alarm clock
      p.rect(80, p.H - 380, 840, 380, C.wood, 30);
      p.rect(140, p.H - 300, 720, 110, C.woodDark, 16);
      p.circle(500, p.H - 245, 18, C.saffron);
      const cx = 500;
      const cy = p.H - 560;
      p.circle(cx - 90, cy - 110, 46, C.saffron);
      p.circle(cx + 90, cy - 110, 46, C.saffron);
      p.circle(cx, cy, 150, C.red);
      p.circle(cx, cy, 112, '#ffffff');
      p.line([cx, cy, cx, cy - 80], C.ink, 14);
      p.line([cx, cy, cx + 60, cy + 18], C.ink, 14);
      p.line([cx - 110, cy + 130, cx - 140, cy + 175], C.red, 20);
      p.line([cx + 110, cy + 130, cx + 140, cy + 175], C.red, 20);
      p.hot('saat', cx - 160, cy - 170, 320, 330);
    },
  },
    {
    z: 0.86,
    w: 0.94,
    h: 0.3,
    draw: (p) => {
      // chair with the Bayram dress, slippers and a plant, all on the right so Elif stays in view
      p.rect(640, 40, 22, 270, C.woodDark, 8);
      p.rect(820, 40, 22, 270, C.woodDark, 8);
      p.rect(640, 40, 202, 30, C.wood, 10);
      p.rect(640, 200, 202, 24, C.wood, 10);
      p.shape('#3F6FD1', (c) => {
        c.moveTo(675, 60);
        c.lineTo(805, 60);
        c.lineTo(840, 250);
        c.quadraticCurveTo(740, 270, 640, 250);
        c.closePath();
      });
      p.rect(690, 120, 100, 14, 'rgba(255,255,255,0.6)', 7);
      p.hot('bayramlık', 630, 30, 225, 285);
      p.ellipse(470, 292, 50, 18, '#F28DB2');
      p.ellipse(560, 292, 50, 18, '#F28DB2');
      plant(p, 940, 300, 190, C.cobalt);
    },
  },
  ],

  /* 2. Getting dressed */
  p2: [
    {
      ...BACK,
      draw: (p) => {
        p.arch(14, 14, 972, p.H - 28, '#BFE3DF');
        bunting(p, 120, 880, 110, 20, 8);
        // mirror
        p.ellipse(225, 470, 140, 240, C.saffron);
        p.ellipse(225, 470, 118, 218, grad(p, 250, 690, [[0, '#E9F6FB'], [1, '#B6D9EA']]) as unknown as string);
        p.line([170, 340, 210, 300], 'rgba(255,255,255,0.9)', 14);
        p.line([180, 390, 240, 330], 'rgba(255,255,255,0.7)', 10);
        p.hot('ayna', 80, 225, 290, 490);
        // wardrobe
        p.rect(610, 230, 320, p.H - 250, C.wood, 18);
        p.rect(630, 255, 132, p.H - 300, C.woodDark, 10);
        p.rect(778, 255, 132, p.H - 300, C.woodDark, 10);
        p.circle(750, 540, 10, C.saffron);
        p.circle(790, 540, 10, C.saffron);
        p.rect(14, p.H - 60, 972, 46, '#9FCFC9');
      },
    },
    {
      ...FRONT,
      draw: (p) => {
        // shoe box with new shoes
        p.rect(120, 150, 300, 160, C.red, 10);
        p.rect(120, 150, 300, 30, '#E35A4F', 10);
        p.shape(C.red, (c) => {
          c.moveTo(130, 140);
          c.lineTo(420, 60);
          c.lineTo(440, 100);
          c.lineTo(150, 180);
          c.closePath();
        });
        p.rect(255, 150, 30, 160, C.saffron);
        p.ellipse(230, 140, 70, 30, '#3A2A22');
        p.ellipse(330, 140, 70, 30, '#3A2A22');
        p.ellipse(215, 130, 30, 10, 'rgba(255,255,255,0.35)');
        p.hot('ayakkabı', 110, 50, 340, 265);
        plant(p, 860, 305, 240, C.saffron);
        // folded clothes on a stool
        p.rect(530, 190, 200, 120, C.woodDark, 10);
        p.rect(545, 120, 170, 40, '#F7F2E6', 10);
        p.rect(555, 85, 150, 36, C.turq, 10);
      },
    },
  ],

  /* 3. Kitchen, Bayram table */
  p3: [
    {
      ...BACK,
      draw: (p) => {
        p.arch(14, 14, 972, p.H - 28, '#DDEBD7');
        windowFrame(p, 400, 130, 200, 180, (q) => {
          sky(q, '#9FD4F2', '#E2F3FB', 400, 130, 200, 180);
          cloud(q, 470, 200, 20);
        });
        shelf(p, 90, 430, 260);
        caydanlik(p, 170, 430, 170);
        p.hot('çaydanlık', 95, 250, 170, 185);
        // jars
        p.rect(270, 360, 50, 70, '#F7F2E6', 10);
        p.rect(270, 360, 50, 18, C.red, 6);
        shelf(p, 650, 430, 260);
        teaGlass(p, 700, 425, 70);
        teaGlass(p, 760, 425, 70);
        teaGlass(p, 820, 425, 70);
        // tile band
        for (let i = 0; i < 10; i++) iznikTile(p, 60 + i * 88, 520, 88, i);
        p.rect(30, 608, 940, 36, '#C9A27A', 8);
        p.rect(14, 644, 972, p.H - 658, '#E8D9C2');
      },
    },
    {
      ...FRONT,
      draw: (p) => {
        p.rect(20, 110, 960, 200, '#ffffff', 16);
        p.rect(20, 110, 960, 26, C.cobalt, 12);
        for (let i = 0; i < 14; i++) p.circle(60 + i * 68, 123, 6, '#ffffff');
        p.rect(20, 268, 960, 20, C.turq);
        // plates and glasses on the table
        [150, 420, 690].forEach((x) => {
          p.ellipse(x, 110, 80, 18, '#ffffff');
          p.ellipse(x, 110, 60, 12, '#E6EEF5');
        });
        teaGlass(p, 285, 108, 70);
        teaGlass(p, 555, 108, 70);
        // lokum plate
        p.ellipse(840, 108, 80, 18, C.saffron);
        for (let i = 0; i < 5; i++) p.rect(790 + i * 20, 70 + (i % 2) * 8, 22, 22, i % 2 ? '#F28DB2' : '#F7F2E6', 4);
        p.hot('lokum', 760, 50, 160, 75);
        p.hot('sofra', 20, 60, 960, 250);
      },
    },
  ],

  /* 4. Video call with grandparents in İzmir */
  p4: [
    {
      ...BACK,
      draw: (p) => {
        p.arch(14, 14, 972, p.H - 28, '#DCE4F5');
        windowFrame(p, 130, 240, 260, 260, (q) => {
          sky(q, '#A9DCF5', '#E6F6FD', 130, 240, 260, 260);
          q.circle(200, 470, 70, '#6FB165');
          q.circle(330, 480, 90, '#5C9F55');
          q.rect(250, 400, 14, 100, C.woodDark);
        });
        curtain(p, 90, 220, 90, 340, '#C0504D', 'l');
        curtain(p, 340, 220, 90, 340, '#C0504D', 'r');
        // framed photo of İzmir's clock tower
        p.rect(560, 250, 260, 200, C.woodDark, 8);
        p.rect(575, 265, 230, 170, '#BFE1F3');
        p.rect(575, 395, 230, 40, '#4C8FCB');
        clockTower(p, 690, 400, 140);
        bunting(p, 120, 880, 110, 20, 8);
        p.rect(14, p.H - 60, 972, 46, '#BCC8E6');
      },
    },
    {
    ...MID,
    draw: (p) => {
      // the sofa, empty: the children stand in front of it for the video call
      p.rect(40, 300, 640, 230, C.turq, 50);
      p.rect(20, 380, 90, 220, '#178C88', 40);
      p.rect(610, 380, 90, 220, '#178C88', 40);
      p.rect(60, 520, 600, 110, '#1A9894', 30);
      p.rect(80, 600, 30, 40, C.woodDark, 6);
      p.rect(610, 600, 30, 40, C.woodDark, 6);
      p.hot('kanepe', 20, 300, 680, 340);
    },
  },
  ],

  /* 5. Kissing Aunt Ayşe's hand at the door */
  p5: [
    {
      ...BACK,
      draw: (p) => {
        p.arch(14, 14, 972, p.H - 28, '#E3EEF3');
        // open door
        p.rect(520, 210, 360, p.H - 230, '#ffffff', 10);
        p.rect(545, 235, 310, p.H - 260, grad(p, 235, p.H, [[0, '#9ED3F0'], [0.55, '#DCF1FA'], [0.56, '#86C47B'], [1, '#6AAE60']]) as unknown as string);
        tulip(p, 600, p.H - 40, 90);
        tulip(p, 650, p.H - 40, 80, C.saffron);
        p.poly([855, 235, 960, 200, 960, p.H - 20, 855, p.H - 25], C.wood);
        p.circle(880, 560, 10, C.saffron);
        // coat hooks
        p.rect(90, 260, 260, 18, C.woodDark, 6);
        p.circle(150, 290, 10, C.saffron);
        p.circle(290, 290, 10, C.saffron);
        p.shape('#C0504D', (c) => {
          c.moveTo(130, 290);
          c.lineTo(175, 290);
          c.lineTo(200, 460);
          c.lineTo(110, 460);
          c.closePath();
        });
        // side table with candy bowl
        p.rect(90, 560, 260, 20, C.woodDark, 6);
        p.rect(110, 580, 20, p.H - 600, C.woodDark);
        p.rect(310, 580, 20, p.H - 600, C.woodDark);
        p.shape('#ffffff', (c) => {
          c.moveTo(140, 500);
          c.lineTo(300, 500);
          c.quadraticCurveTo(290, 560, 220, 560);
          c.quadraticCurveTo(150, 560, 140, 500);
        });
        for (let i = 0; i < 6; i++) candy(p, 160 + i * 25, 498 - (i % 2) * 14, 13, CANDY_COLORS[i % CANDY_COLORS.length], i * 0.7);
        p.hot('bayram şekeri', 130, 460, 180, 105);
        p.rect(14, p.H - 50, 972, 36, '#C8D9E2');
      },
    },
    {
      ...FRONT,
      draw: (p) => {
        p.rect(60, 250, 520, 50, '#B85C3C', 12);
        const pairs = [C.red, C.cobalt, '#3A2A22', C.saffron, '#F28DB2'];
        pairs.forEach((col, i) => {
          const x = 110 + i * 100;
          p.ellipse(x, 245, 30, 15, col);
          p.ellipse(x + 34, 245, 30, 15, col);
        });
        p.hot('ayakkabı', 70, 210, 520, 70);
        plant(p, 820, 305, 250, C.turq);
      },
    },
  ],

  /* 6. Sharing the candy fairly */
  p6: [
    {
      ...BACK,
      draw: (p) => {
        p.arch(14, 14, 972, p.H - 28, '#FBE3E1');
        bunting(p, 120, 880, 110, 20, 8);
        windowFrame(p, 620, 250, 230, 250, (q) => {
          sky(q, '#A9DCF5', '#E6F6FD', 620, 250, 230, 250);
          cloud(q, 720, 330, 24);
        });
        curtain(p, 580, 230, 80, 330, C.cobalt, 'l');
        curtain(p, 810, 230, 80, 330, C.cobalt, 'r');
        p.rect(140, 260, 200, 230, C.woodDark, 8);
        p.rect(158, 278, 164, 194, '#FFF6EE');
        tulip(p, 240, 455, 160);
        p.rect(14, p.H - 60, 972, 46, '#F0C9C4');
      },
    },
    {
      ...FRONT,
      draw: (p) => {
        p.rect(70, 140, 860, 50, C.wood, 14);
        p.rect(110, 190, 30, 120, C.woodDark, 6);
        p.rect(860, 190, 30, 120, C.woodDark, 6);
        const pile = (cx: number, seed: number) => {
          const r = rng(seed);
          const spots = [[-40, 0], [0, 0], [40, 0], [-20, -26], [20, -26]];
          spots.forEach(([dx, dy], i) => candy(p, cx + dx, 120 + dy, 15, CANDY_COLORS[(i + seed) % 6], r() * 1.5));
        };
        pile(330, 1);
        pile(560, 2);
        p.hot('eşit', 250, 60, 400, 100);
        p.ellipse(790, 135, 70, 16, '#ffffff');
        candy(p, 765, 118, 13, C.saffron, 0.3);
        candy(p, 815, 118, 13, C.turq, -0.4);
        candy(p, 790, 100, 13, '#F28DB2', 0.1);
        p.hot('bayram şekeri', 710, 70, 160, 90);
      },
    },
  ],

  /* 7. Maya visits */
  p7: [
    {
      ...BACK,
      draw: (p) => {
        p.arch(14, 14, 972, p.H - 28, grad(p, 14, p.H, [[0, '#8FD0F2'], [1, '#E6F6FD']]) as unknown as string);
        p.circle(180, 190, 50, C.saffron);
        p.hot('güneş', 120, 130, 120, 120);
        cloud(p, 360, 180, 30);
        // house with porch
        p.poly([470, 360, 700, 200, 930, 360], '#8B4A3C');
        p.rect(500, 350, 400, p.H - 380, '#F4F1E8');
        for (let i = 0; i < 9; i++) p.line([500, 380 + i * 50, 900, 380 + i * 50], '#E0DACB', 4);
        p.rect(640, 520, 120, p.H - 550, C.red, 8);
        p.circle(740, 680, 8, C.saffron);
        p.rect(530, 430, 80, 90, '#AFDCF2', 6);
        p.rect(790, 430, 80, 90, '#AFDCF2', 6);
        // tree
        p.rect(250, 420, 40, p.H - 450, C.woodDark, 8);
        p.circle(270, 380, 110, '#5C9F55');
        p.circle(210, 430, 70, '#6FB165');
        p.circle(335, 430, 75, '#6FB165');
        // mailbox
        p.rect(105, 560, 16, p.H - 590, '#5A6070');
        p.rect(70, 520, 90, 50, '#3B5C99', 22);
        p.rect(150, 500, 8, 40, C.red);
        p.rect(14, p.H - 60, 972, 46, '#7DBB6F');
      },
    },
    {
      ...FRONT,
      draw: (p) => {
        p.rect(30, 230, 940, 80, '#7A4F35', 20);
        const cols = [C.red, C.saffron, '#F28DB2', C.red, C.saffron, '#E35A4F', '#F28DB2', C.red, C.saffron];
        cols.forEach((col, i) => tulip(p, 90 + i * 105, 260, 170 + (i % 3) * 25, col));
        p.hot('lale', 40, 40, 920, 240);
      },
    },
  ],

  /* 8. Evening, crescent moon */
  p8: [
    {
    ...BACK,
    draw: (p) => {
      // the living room at night, a big window with the crescent moon over the rooftops
      p.arch(14, 14, 972, p.H - 28, '#F1DDBE');
      const wx = 150;
      const wy = 110;
      const ww = 700;
      const wh = 540;
      p.rect(wx - 22, wy - 22, ww + 44, wh + 44, '#FFFFFF', 18);
      p.save();
      p.c.beginPath();
      p.c.rect(wx, wy, ww, wh);
      p.c.clip();
      p.rect(wx, wy, ww, wh, grad(p, wy, wy + wh, [[0, '#0E1C46'], [1, '#2B3F7E']]) as unknown as string);
      const r = rng(8);
      for (let i = 0; i < 45; i++) p.circle(wx + 10 + r() * (ww - 20), wy + 10 + r() * (wh * 0.6), 2 + r() * 3, 'rgba(255,255,255,0.85)');
      crescent(p, 640, 230, 66, '#FFE7A3', '#16275A');
      p.hot('hilal', 560, 150, 160, 160);
      star(p, 330, 220, 34, '#FFE7A3');
      p.hot('yıldız', 290, 180, 80, 80);
      p.shape('#15214D', (c) => {
        c.moveTo(wx, wy + wh);
        c.lineTo(wx, 520);
        c.lineTo(260, 470);
        c.lineTo(360, 520);
        c.lineTo(360, 450);
        c.lineTo(470, 400);
        c.lineTo(570, 450);
        c.lineTo(570, 510);
        c.lineTo(690, 460);
        c.lineTo(790, 500);
        c.lineTo(wx + ww, 470);
        c.lineTo(wx + ww, wy + wh);
        c.closePath();
      });
      [[200, 540], [400, 470], [450, 470], [620, 530], [730, 520]].forEach(([x, y]) => p.rect(x, y, 22, 26, '#FFD58A', 3));
      p.restore();
      p.line([wx + ww / 2, wy, wx + ww / 2, wy + wh], '#FFFFFF', 14);
      p.hot('pencere', wx - 22, wy - 22, ww + 44, wh + 44);
      // window sill with tulips and a lantern
      p.rect(wx - 40, wy + wh + 20, ww + 80, 28, '#C9A27A', 8);
      [230, 330, 670, 770].forEach((x, i) => tulip(p, x, wy + wh + 24, 120, i % 2 ? C.saffron : C.red));
      p.rect(470, wy + wh - 60, 60, 80, '#FFD58A', 10);
      p.rect(462, wy + wh - 68, 76, 14, '#5C3A26', 6);
      p.hot('lale', 200, wy + wh - 100, 600, 130);
      p.rect(14, p.H - 120, 972, 106, '#C9A27A');
    },
  },
  ],
};

export function sceneLayers(sceneId: string): ProcLayer[] {
  return SCENES[sceneId] ?? KAZAN_SCENES[sceneId] ?? KELOGLAN_SCENES[sceneId] ?? [];
}

/** Draw one procedural layer and turn it into a paper cut-out. */
export function buildProcLayer(layer: ProcLayer, px = 1024): BuiltLayer {
  const aspect = layer.h / layer.w;
  const pen = new Pen(px, aspect);
  layer.draw(pen);
  const cut = cutout(pen.canvas, Math.round(px / 130));
  const { draw: _d, ...spec } = layer;
  return { spec, canvas: cut.canvas, alpha: cut.alpha, aw: cut.aw, ah: cut.ah, hotspots: pen.hotspots };
}

/** A flat picture of a pop-up page, for activity cards. */
export function sceneThumb(layers: BuiltLayer[], width = 560): HTMLCanvasElement {
  const S = width;
  const maxH = Math.max(...layers.map((l) => l.spec.h));
  const c = document.createElement('canvas');
  c.width = width;
  // layers further back sit higher, as if the page is seen from slightly above
  const lift = 0.3 * S;
  c.height = Math.round(maxH * S + lift + 16);
  const g = c.getContext('2d')!;
  for (const l of layers) {
    const w = l.spec.w * S;
    const hh = l.spec.h * S;
    const x = width / 2 + (l.spec.x ?? 0) * S - w / 2;
    const bottom = c.height - 8 - (1 - l.spec.z) * lift;
    g.drawImage(l.canvas, x, bottom - hh, w, hh);
  }
  return c;
}

/**
 * A layer drawn from an image file (for example an illustration made with ChatGPT or Gemini,
 * saved as a transparent PNG/WebP). The image is fitted to the layer and bottom-aligned.
 */
export async function buildImageLayer(spec: LayerSpec, baseUrl: string, px = 1024): Promise<BuiltLayer> {
  const img = new Image();
  img.src = baseUrl + spec.src;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = px;
  c.height = Math.round((px * spec.h) / spec.w);
  const s = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight);
  const w = img.naturalWidth * s;
  const hgt = img.naturalHeight * s;
  c.getContext('2d')!.drawImage(img, (c.width - w) / 2, c.height - hgt, w, hgt);
  const cut = cutout(c, Math.round(px / 130));
  return { spec, canvas: cut.canvas, alpha: cut.alpha, aw: cut.aw, ah: cut.ah, hotspots: spec.hotspots ?? [] };
}

/* ------------------------------------------------------------------ */
/* Covers                                                              */
/* ------------------------------------------------------------------ */

function tileBorder(p: Pen, color: string) {
  p.rect(0, 0, p.W, p.H, color, 40);
  const s = 92;
  const n = Math.floor((p.W - 40) / s);
  const off = (p.W - n * s) / 2;
  const m = Math.floor((p.H - 40) / s);
  const offY = (p.H - m * s) / 2;
  for (let i = 0; i < n; i++) {
    iznikTile(p, off + i * s, offY, s, i);
    iznikTile(p, off + i * s, offY + (m - 1) * s, s, i + 1);
  }
  for (let j = 1; j < m - 1; j++) {
    iznikTile(p, off, offY + j * s, s, j);
    iznikTile(p, off + (n - 1) * s, offY + j * s, s, j + 1);
  }
  return { x: off + s, y: offY + s, w: (n - 2) * s, h: (m - 2) * s };
}

function wrap(p: Pen, text: string, maxW: number, size: number): string[] {
  p.c.font = `600 ${size}px "DynaPuff", system-ui`;
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (p.c.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function titleText(p: Pen, title: string, cx: number, y: number, maxW: number, size: number) {
  const lines = wrap(p, title, maxW, size);
  lines.forEach((l, i) => {
    const yy = y + i * size * 1.02;
    p.c.lineWidth = size * 0.16;
    p.c.strokeStyle = C.ink;
    p.c.font = `600 ${size}px "DynaPuff", system-ui`;
    p.c.textAlign = 'center';
    p.c.strokeText(l, cx, yy);
    p.text(l, cx, yy, size, '#FFFFFF');
  });
  return lines.length;
}

export function drawCover(art: string, title: string, opts: { color?: string; motif?: string } = {}, px = 700): HTMLCanvasElement {
  const p = new Pen(px, 1.36);
  if (art === 'cover-bayram') {
    const inner = tileBorder(p, C.cobalt);
    p.rect(inner.x, inner.y, inner.w, inner.h, grad(p, inner.y, inner.y + inner.h, [[0, '#86CDEB'], [0.65, '#FFE6B8'], [1, '#FFD089']]) as unknown as string);
    p.save();
    p.c.beginPath();
    p.c.rect(inner.x, inner.y, inner.w, inner.h);
    p.c.clip();
    bunting(p, inner.x - 20, inner.x + inner.w + 20, inner.y + 330, 30, 10);
    crescent(p, inner.x + inner.w - 120, inner.y + 470, 46, '#FFFFFF', '#C8E5F1');
    const e = elif(p, inner.x + inner.w * 0.38, inner.y + inner.h - 40, 520, { arms: 'hold', mouth: 'open' });
    const ty = (e.handL[1] + e.handR[1]) / 2;
    p.shape('#ffffff', (c) => {
      c.moveTo(e.headX - 90, ty - 20);
      c.lineTo(e.headX + 90, ty - 20);
      c.quadraticCurveTo(e.headX + 80, ty + 50, e.headX, ty + 52);
      c.quadraticCurveTo(e.headX - 80, ty + 50, e.headX - 90, ty - 20);
    });
    for (let i = 0; i < 6; i++) candy(p, e.headX - 60 + i * 24, ty - 26 - (i % 2) * 10, 12, CANDY_COLORS[i], i);
    can(p, inner.x + inner.w * 0.74, inner.y + inner.h - 40, 420, { arms: 'wave', mouth: 'grin' });
    for (let i = 0; i < 7; i++) tulip(p, inner.x + 30 + i * (inner.w / 6.5), inner.y + inner.h + 10, 120, i % 2 ? C.saffron : C.red);
    p.restore();
    titleText(p, title, p.W / 2, inner.y + 150, inner.w - 40, 150);
  } else if (art === 'cover-keloglan') {
    const inner = tileBorder(p, '#2E8B57');
    drawKeloglanCover(p, inner);
    titleText(p, title, p.W / 2, inner.y + 140, inner.w - 30, 128);
  } else if (art === 'cover-kazan') {
    const inner = tileBorder(p, '#1F5FA8');
    drawKazanCover(p, inner);
    titleText(p, title, p.W / 2, inner.y + 140, inner.w - 30, 128);
  } else {
    const color = opts.color ?? C.turq;
    const inner = tileBorder(p, color);
    p.rect(inner.x, inner.y, inner.w, inner.h, color);
    const cx = p.W / 2;
    const cy = inner.y + inner.h * 0.66;
    switch (opts.motif) {
      case 'kazan':
        p.ellipse(cx - 60, cy + 30, 190, 150, '#2B2F3A');
        p.ellipse(cx - 60, cy - 110, 200, 34, '#4A4F5C');
        p.ellipse(cx - 60, cy - 110, 165, 22, '#1A1D25');
        p.ellipse(cx + 200, cy + 120, 80, 62, '#2B2F3A');
        p.ellipse(cx + 200, cy + 60, 86, 16, '#4A4F5C');
        p.circle(cx + 200, cy + 110, 16, '#5A606D');
        break;
      case 'tohum':
        p.rect(inner.x, cy + 120, inner.w, inner.h - (cy + 120 - inner.y), '#7A4F35');
        [-160, 0, 160].forEach((dx, i) => {
          p.line([cx + dx, cy + 130, cx + dx, cy - 60 - i * 40], C.leaf, 16);
          p.ellipse(cx + dx - 45, cy - 40 - i * 40, 50, 22, '#7FC46A', -0.5);
          p.ellipse(cx + dx + 45, cy - 70 - i * 40, 50, 22, '#7FC46A', 0.5);
        });
        break;
      case 'bayrak':
        turkishFlag(p, cx - 210, cy - 180, 420);
        p.line([cx - 230, cy - 200, cx - 230, cy + 230], '#E8E8E8', 12);
        [[cx + 150, cy + 150, C.saffron], [cx - 120, cy + 190, C.turq], [cx + 40, cy + 230, '#F28DB2']].forEach(([x, y, col]) => {
          p.ellipse(x as number, y as number, 46, 56, col as string);
        });
        break;
      case 'ebru': {
        const cols = ['#ffffff', C.saffron, C.red, '#F28DB2', C.cobalt];
        for (let i = 0; i < 5; i++) p.ellipse(cx, cy, 330 - i * 60, 260 - i * 48, cols[i]);
        tulip(p, cx, cy + 150, 300, C.red);
        break;
      }
      case 'simit': {
        // a stack of simits on a baker's tray
        p.rect(cx - 300, cy + 170, 600, 40, '#7A4526', 14);
        const ring = (x: number, y: number, r: number) => {
          p.c.save();
          p.c.beginPath();
          p.c.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
          p.c.ellipse(x, y, r * 0.48, r * 0.26, 0, 0, Math.PI * 2, true);
          p.c.fillStyle = '#C9773A';
          p.c.fill('evenodd');
          p.c.restore();
          const rr = rng(Math.round(x + y));
          for (let i = 0; i < 40; i++) {
            const a = rr() * Math.PI * 2;
            const d = 0.55 + rr() * 0.38;
            p.ellipse(x + Math.cos(a) * r * d, y + Math.sin(a) * r * 0.62 * d, 5, 2.6, '#F5E3B5', a);
          }
        };
        ring(cx - 150, cy + 120, 140);
        ring(cx + 150, cy + 120, 140);
        ring(cx, cy + 20, 150);
        break;
      }
      case 'balon': {
        // fairy chimneys and balloons
        for (const [x, h] of [[cx - 220, 300], [cx - 60, 380], [cx + 150, 260], [cx + 280, 330]] as [number, number][]) {
          p.shape('#EAD5B2', (c) => {
            c.moveTo(x - 70, cy + 230);
            c.quadraticCurveTo(x - 40, cy + 230 - h * 0.6, x - 26, cy + 230 - h);
            c.lineTo(x + 26, cy + 230 - h);
            c.quadraticCurveTo(x + 40, cy + 230 - h * 0.6, x + 70, cy + 230);
            c.closePath();
          });
          p.ellipse(x, cy + 230 - h, 52, 28, '#6E5444');
        }
        const balloon = (x: number, y: number, r: number, a: string, b: string) => {
          p.ellipse(x, y, r, r * 1.1, a);
          p.ellipse(x, y, r * 0.35, r * 1.08, b);
          p.rect(x - r * 0.18, y + r * 1.25, r * 0.36, r * 0.28, '#8A5A2E', 4);
          p.line([x - r * 0.5, y + r * 0.8, x - r * 0.15, y + r * 1.25], '#5B3A1E', 3);
          p.line([x + r * 0.5, y + r * 0.8, x + r * 0.15, y + r * 1.25], '#5B3A1E', 3);
        };
        balloon(cx - 160, cy - 220, 70, C.red, C.saffron);
        balloon(cx + 170, cy - 160, 56, C.cobalt, C.turq);
        balloon(cx + 20, cy - 300, 40, C.saffron, C.red);
        break;
      }
      case 'marti': {
        // sea, the Maiden's Tower and a seagull
        p.rect(inner.x, cy + 80, inner.w, inner.h - (cy + 80 - inner.y), '#1F5E99');
        for (let i = 0; i < 6; i++) p.line([inner.x + 40 + i * 110, cy + 140 + (i % 2) * 40, inner.x + 100 + i * 110, cy + 140 + (i % 2) * 40], 'rgba(255,255,255,0.5)', 6);
        p.rect(cx + 120, cy - 20, 150, 100, '#F4EFE6', 6);
        p.rect(cx + 220, cy - 140, 46, 220, '#F4EFE6', 6);
        p.poly([cx + 212, cy - 140, cx + 274, cy - 140, cx + 243, cy - 200], '#566170');
        p.poly([cx + 110, cy - 20, cx + 280, cy - 20, cx + 195, cy - 60], '#B5533C');
        const gull = (x: number, y: number, s: number) => {
          p.ellipse(x, y, 60 * s, 22 * s, '#ffffff');
          p.shape('#ffffff', (c) => {
            c.moveTo(x - 20 * s, y - 6 * s);
            c.quadraticCurveTo(x - 90 * s, y - 90 * s, x - 160 * s, y - 50 * s);
            c.quadraticCurveTo(x - 80 * s, y - 40 * s, x + 10 * s, y);
            c.closePath();
            c.moveTo(x + 10 * s, y - 6 * s);
            c.quadraticCurveTo(x + 60 * s, y - 100 * s, x + 140 * s, y - 70 * s);
            c.quadraticCurveTo(x + 60 * s, y - 40 * s, x + 20 * s, y);
            c.closePath();
          });
          p.circle(x + 55 * s, y - 6 * s, 16 * s, '#ffffff');
          p.poly([x + 68 * s, y - 6 * s, x + 96 * s, y, x + 68 * s, y + 4 * s], C.saffron);
          p.circle(x + 60 * s, y - 10 * s, 3.5 * s, C.ink);
        };
        gull(cx - 120, cy - 120, 1.4);
        break;
      }
      case 'davul': {
        // night street, crescent and a big davul
        crescent(p, cx + 230, cy - 280, 54, '#FFE7A3', opts.color ?? C.ink);
        star(p, cx - 220, cy - 300, 22, '#FFE7A3');
        star(p, cx + 40, cy - 330, 16, '#FFE7A3');
        p.ellipse(cx, cy + 40, 230, 200, '#C2352A');
        p.ellipse(cx, cy + 40, 175, 200, '#EFE1C6');
        p.ellipse(cx, cy + 40, 160, 186, '#F7EFDC');
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          p.line([cx + Math.cos(a) * 200, cy + 40 + Math.sin(a) * 175, cx + Math.cos(a + 0.35) * 225, cy + 40 + Math.sin(a + 0.35) * 195], '#F2E3C4', 6);
        }
        p.line([cx + 160, cy - 160, cx + 330, cy - 300], '#8A5530', 18);
        p.circle(cx + 160, cy - 160, 36, '#5C3A22');
        break;
      }
      case 'karagoz': {
        // the lit shadow-play screen with two silhouettes
        p.rect(cx - 280, cy - 260, 560, 480, '#5A3018', 20);
        p.rect(cx - 250, cy - 230, 500, 420, '#FFE9B8', 10);
        const sil = (x: number, f: number, tall: boolean) => {
          p.ellipse(x, cy - 40, 46, 50, '#3A1E10');
          if (tall) p.poly([x - 40, cy - 70, x + 40, cy - 70, x + f * 10, cy - 170], '#3A1E10');
          else p.ellipse(x, cy - 90, 52, 36, '#3A1E10');
          p.poly([x - 60, cy + 180, x - 40, cy + 10, x + 40, cy + 10, x + 60, cy + 180], '#3A1E10');
          p.line([x + f * 30, cy + 40, x + f * 110, cy - 10], '#3A1E10', 18);
        };
        sil(cx - 110, 1, false);
        sil(cx + 110, -1, true);
        break;
      }
      case 'mangala': {
        p.rect(cx - 300, cy - 80, 600, 260, '#B07A45', 30);
        for (let i = 0; i < 6; i++)
          for (const y of [cy - 20, cy + 120]) {
            p.circle(cx - 200 + i * 80, y, 30, '#5A341A');
            const rr = rng(i * 7 + y);
            for (let k = 0; k < 3; k++) p.circle(cx - 210 + i * 80 + rr() * 20, y - 6 + rr() * 14, 9, [C.red, C.cobalt, C.saffron, C.turq][Math.floor(rr() * 4)]);
          }
        p.ellipse(cx - 268, cy + 50, 22, 100, '#5A341A');
        p.ellipse(cx + 268, cy + 50, 22, 100, '#5A341A');
        break;
      }
      case 'imece': {
        // golden wheat field and a watermill
        p.rect(inner.x, cy + 60, inner.w, inner.h - (cy + 60 - inner.y), '#E2B04A');
        for (let i = 0; i < 18; i++) {
          const x = inner.x + 20 + i * ((inner.w - 40) / 17);
          p.line([x, cy + 230, x, cy + 70], '#C08A2B', 5);
          p.ellipse(x, cy + 60, 9, 26, '#F2C960');
        }
        p.rect(cx - 40, cy - 220, 260, 240, '#F1E4C6', 8);
        p.poly([cx - 60, cy - 220, cx + 240, cy - 220, cx + 90, cy - 330], '#B5533C');
        p.circle(cx - 90, cy - 80, 110, '#8A5530');
        p.circle(cx - 90, cy - 80, 84, '#B07A45');
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          p.line([cx - 90, cy - 80, cx - 90 + Math.cos(a) * 108, cy - 80 + Math.sin(a) * 108], '#6B3D1F', 10);
        }
        break;
      }
      case 'misafir': {
        // an open door with warm light, a pair of shoes and a tea glass
        p.rect(cx - 170, cy - 300, 340, 470, '#FFD58A', 10);
        p.rect(cx - 190, cy - 320, 20, 510, '#5A3018');
        p.rect(cx + 170, cy - 320, 20, 510, '#5A3018');
        p.rect(cx - 190, cy - 330, 380, 24, '#5A3018');
        p.poly([cx + 170, cy - 306, cx + 300, cy - 260, cx + 300, cy + 210, cx + 170, cy + 170], '#8A5530');
        p.ellipse(cx - 60, cy + 210, 44, 18, '#3A2A22');
        p.ellipse(cx + 10, cy + 210, 44, 18, '#3A2A22');
        teaGlass(p, cx + 120, cy + 220, 90);
        break;
      }
      case 'tren': {
        // snowy mountains and a steam train
        p.poly([inner.x, cy + 40, cx - 160, cy - 260, cx + 40, cy + 40], '#DCE6F0');
        p.poly([cx - 60, cy + 40, cx + 140, cy - 200, inner.x + inner.w, cy + 40], '#C8D6E6');
        p.poly([cx - 220, cy - 180, cx - 160, cy - 260, cx - 100, cy - 180], '#ffffff');
        p.rect(inner.x, cy + 40, inner.w, inner.h - (cy + 40 - inner.y), '#F4F7FB');
        p.rect(cx - 280, cy + 20, 200, 120, '#D2372C', 12);
        p.rect(cx - 250, cy - 40, 110, 70, '#B32C23', 8);
        p.rect(cx - 70, cy + 30, 170, 110, '#3B5C99', 10);
        p.rect(cx + 110, cy + 30, 170, 110, '#3B5C99', 10);
        for (const x of [cx - 50, cx + 130]) for (let i = 0; i < 3; i++) p.rect(x + i * 50, cy + 50, 34, 34, '#FFE7A3', 4);
        for (const x of [cx - 250, cx - 150, cx - 40, cx + 70, cx + 140, cx + 250]) p.circle(x, cy + 150, 24, '#2B2F3A');
        for (let i = 0; i < 4; i++) p.circle(cx - 120 - i * 30, cy - 70 - i * 40, 26 + i * 8, 'rgba(255,255,255,0.9)');
        break;
      }
      case 'market': {
        // a shop window with Turkish goods
        p.rect(cx - 300, cy - 290, 600, 70, '#D2372C', 10);
        for (let i = 0; i < 8; i++) p.rect(cx - 300 + i * 75, cy - 220, 37, 30, '#ffffff');
        p.rect(cx - 280, cy - 190, 560, 400, '#F7F2E6', 10);
        for (const y of [cy - 70, cy + 70, cy + 200]) p.rect(cx - 280, y, 560, 14, '#8A5530');
        teaGlass(p, cx - 200, cy - 72, 80);
        teaGlass(p, cx - 130, cy - 72, 80);
        lokumBox(p, cx + 40, cy - 74, 150, true);
        p.rect(cx + 160, cy - 160, 90, 88, C.cobalt, 6);
        p.rect(cx + 170, cy - 140, 70, 30, '#ffffff', 4);
        for (let i = 0; i < 5; i++) p.circle(cx - 220 + i * 60, cy + 30, 30, ['#E2B04A', C.red, '#7FC46A', C.saffron, '#C9773A'][i]);
        baklavaTray(p, cx + 150, cy + 50, 200);
        break;
      }
    }
    titleText(p, title, p.W / 2, inner.y + 170, inner.w - 40, 120);
  }
  return p.canvas;
}
