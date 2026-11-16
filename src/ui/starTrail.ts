import { store } from '../store';

/**
 * Little glowing stars that follow the mouse everywhere on the site, quietly (no sound). Off in calm mode and
 * when the device asks for less motion; drawn on one see-through canvas over the page that never takes a click.
 */
interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  hue: number;
  spin: number;
}

export function startStarTrail() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'star-trail';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '9999' });
  document.body.append(canvas);
  const g = canvas.getContext('2d')!;
  let stars: Star[] = [];
  let raf = 0;
  let last = performance.now();
  let lx = -1;
  let ly = -1;

  const fit = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  window.addEventListener('resize', fit);

  const draw = (s: Star) => {
    const k = s.life / s.max;
    const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
    const r = s.size * (0.6 + 0.4 * (1 - k));
    g.save();
    g.translate(s.x, s.y);
    g.rotate(s.spin * s.life);
    g.globalAlpha = Math.max(0, a);
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
    glow.addColorStop(0, `hsla(${s.hue}, 100%, 85%, 0.9)`);
    glow.addColorStop(1, `hsla(${s.hue}, 100%, 70%, 0)`);
    g.fillStyle = glow;
    g.fillRect(-r * 2.4, -r * 2.4, r * 4.8, r * 4.8);
    // a four-pointed star
    g.fillStyle = `hsl(${s.hue}, 100%, 92%)`;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const rr = i % 2 ? r * 0.32 : r;
      g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    g.closePath();
    g.fill();
    g.restore();
  };

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    g.clearRect(0, 0, innerWidth, innerHeight);
    stars = stars.filter((s) => (s.life += dt) < s.max);
    for (const s of stars) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 30 * dt;
      draw(s);
    }
    raf = stars.length ? requestAnimationFrame(tick) : 0;
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || store.settings.calm || reduce?.matches) return;
      const d = Math.hypot(e.clientX - lx, e.clientY - ly);
      if (lx >= 0 && d < 9) return;
      lx = e.clientX;
      ly = e.clientY;
      const n = d > 40 ? 2 : 1;
      for (let i = 0; i < n && stars.length < 90; i++)
        stars.push({
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 40,
          vy: -10 - Math.random() * 30,
          life: 0,
          max: 0.6 + Math.random() * 0.5,
          size: 3 + Math.random() * 4,
          hue: [45, 50, 190, 330][Math.floor(Math.random() * 4)],
          spin: (Math.random() - 0.5) * 4,
        });
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    },
    { passive: true },
  );
}
