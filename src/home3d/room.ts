import * as THREE from 'three';
import { rng } from '../art/pen';
import { canvas, tex, lathe, smooth, std, mesh, V2 } from './kit3d';
import { iznikTileCanvas } from './culture';

/** Tone-on-tone stencil wallpaper: tulips and çintemani dots on deep turquoise plaster. */
export function wallTexture() {
  const c = canvas(512, 512, (g, w, h) => {
    g.fillStyle = '#2B676B';
    g.fillRect(0, 0, w, h);
    const r = rng(17);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
      const s = 1 + r() * 2.5;
      g.fillRect(r() * w, r() * h, s, s);
    }
    const ink = '#33777B';
    const tulipStencil = (x: number, y: number, s: number) => {
      g.save();
      g.translate(x, y);
      g.scale(s, s);
      g.fillStyle = ink;
      g.strokeStyle = ink;
      g.lineCap = 'round';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(0, 40);
      g.quadraticCurveTo(4, 10, 0, -14);
      g.stroke();
      g.beginPath();
      g.ellipse(-14, 20, 6, 20, -0.6, 0, Math.PI * 2);
      g.ellipse(14, 14, 5, 17, 0.6, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(-18, -38);
      g.quadraticCurveTo(-20, -12, 0, -10);
      g.quadraticCurveTo(20, -12, 18, -38);
      g.lineTo(9, -26);
      g.lineTo(0, -44);
      g.lineTo(-9, -26);
      g.closePath();
      g.fill();
      g.restore();
    };
    const cintemani = (x: number, y: number) => {
      g.fillStyle = ink;
      for (const [dx, dy] of [[0, -9], [-8, 5], [8, 5]]) {
        g.beginPath();
        g.arc(x + dx, y + dy, 5.5, 0, Math.PI * 2);
        g.fill();
      }
    };
    tulipStencil(128, 140, 1.15);
    tulipStencil(384, 396, 1.15);
    for (const [x, y] of [[384, 140], [128, 396], [0, 0], [512, 0], [0, 512], [512, 512], [256, 268]]) cintemani(x, y);
  });
  return tex(c);
}

export function woodCanvas(base = '#7B4A28', seed = 3, w = 1024, h = 256) {
  return canvas(w, h, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const r = rng(seed);
    for (let i = 0; i < 90; i++) {
      const y0 = r() * h;
      const k = 1 + Math.floor(r() * 3);
      const amp = 1.5 + r() * 4;
      const ph = r() * Math.PI * 2;
      g.strokeStyle = r() > 0.45 ? `rgba(45,22,8,${0.1 + r() * 0.12})` : `rgba(255,214,170,${0.05 + r() * 0.06})`;
      g.lineWidth = 0.8 + r() * 3.5;
      for (const dy of [-h, 0, h]) {
        g.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const y = y0 + dy + Math.sin((x / w) * Math.PI * 2 * k + ph) * amp;
          if (x === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
    }
  });
}

export function woodTexture(base: string, repeat: [number, number], seed = 3) {
  return tex(woodCanvas(base, seed), repeat);
}

export function tileBandTexture(repeatX: number) {
  const one = iznikTileCanvas(256);
  const c = canvas(1024, 256, (g) => {
    for (let i = 0; i < 4; i++) g.drawImage(one, i * 256, 0);
  });
  return tex(c, [repeatX, 1]);
}

/** Table lamp with an Ottoman mosaic glass globe. */
export function mosaicLamp() {
  const g = new THREE.Group();
  const mosaic = canvas(1024, 512, (gg, w, h) => {
    gg.fillStyle = '#3B2810';
    gg.fillRect(0, 0, w, h);
    const bands = [
      ['#2A5BD7', '#36C2C0'],
      ['#F2B33D', '#E8572E'],
      ['#36C2C0', '#7FD27A'],
      ['#D2372C', '#F2B33D'],
      ['#2A5BD7', '#F7E7B5'],
      ['#E8572E', '#36C2C0'],
      ['#7FD27A', '#2A5BD7'],
      ['#F2B33D', '#D2372C'],
    ];
    const rows = 16;
    const rh = h / rows;
    const cols = 32;
    const cw = w / cols;
    for (let j = 0; j < rows; j++) {
      const pal = bands[j % bands.length];
      for (let i = 0; i < cols; i++) {
        const x = i * cw + (j % 2 ? cw / 2 : 0);
        const y = j * rh + rh / 2;
        gg.fillStyle = pal[(i + j) % 2];
        gg.beginPath();
        gg.moveTo(x, y - rh * 0.44);
        gg.lineTo(x + cw * 0.42, y);
        gg.lineTo(x, y + rh * 0.44);
        gg.lineTo(x - cw * 0.42, y);
        gg.closePath();
        gg.fill();
        gg.fillStyle = 'rgba(255,255,255,0.25)';
        gg.beginPath();
        gg.arc(x - cw * 0.08, y - rh * 0.12, 2.2, 0, Math.PI * 2);
        gg.fill();
      }
    }
  });
  const t = tex(mosaic);
  const globe = mesh(new THREE.SphereGeometry(0.2, 48, 32), std('#ffffff', { map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 1.25, roughness: 0.35 }));
  globe.castShadow = false;
  const brass = std('#C99A42', { metalness: 0.9, roughness: 0.3 });
  const baseProf = smooth([[0, 0], [0.13, 0], [0.12, 0.025], [0.06, 0.05], [0.025, 0.08], [0.02, 0.28], [0.045, 0.31], [0.05, 0.33]], 30);
  g.add(mesh(lathe([...baseProf, V2(0, 0.33)], 40), brass));
  globe.position.y = 0.33 + 0.18;
  g.add(globe);
  g.add(mesh(lathe(smooth([[0, 0], [0.085, 0], [0.065, 0.03], [0.025, 0.06], [0.012, 0.1], [0, 0.12]], 20), 32), brass, [0, 0.33 + 0.18 + 0.18, 0]));
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex(
        canvas(256, 256, (gg, w) => {
          const grd = gg.createRadialGradient(w / 2, w / 2, 10, w / 2, w / 2, w / 2);
          grd.addColorStop(0, 'rgba(255,200,120,0.55)');
          grd.addColorStop(0.4, 'rgba(255,170,90,0.18)');
          grd.addColorStop(1, 'rgba(255,170,90,0)');
          gg.fillStyle = grd;
          gg.fillRect(0, 0, w, w);
        }),
      ),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  halo.scale.set(1.3, 1.3, 1);
  halo.position.y = globe.position.y;
  g.add(halo);
  const light = new THREE.PointLight('#FFB66B', 2.2, 3.2, 1.6);
  light.position.y = globe.position.y;
  g.add(light);
  return g;
}
