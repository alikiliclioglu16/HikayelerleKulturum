import * as THREE from 'three';
import { canvas, tex } from './kit3d';

/** A small pool of glowing star particles that burst around objects. */
export class Sparkles {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private size: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private base: Float32Array;
  private next = 0;
  private alive = 0;

  constructor(readonly count = 160) {
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.size = new Float32Array(count);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);
    this.base = new Float32Array(count);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    const star = tex(
      canvas(64, 64, (g, w) => {
        const c = w / 2;
        const grd = g.createRadialGradient(c, c, 0, c, c, c);
        grd.addColorStop(0, 'rgba(255,255,255,1)');
        grd.addColorStop(0.25, 'rgba(255,240,200,0.75)');
        grd.addColorStop(1, 'rgba(255,220,150,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, w, w);
        g.fillStyle = 'rgba(255,255,255,0.9)';
        g.beginPath();
        g.moveTo(c, 2);
        g.quadraticCurveTo(c + 3, c - 3, w - 2, c);
        g.quadraticCurveTo(c + 3, c + 3, c, w - 2);
        g.quadraticCurveTo(c - 3, c + 3, 2, c);
        g.quadraticCurveTo(c - 3, c - 3, c, 2);
        g.fill();
      }),
    );
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: star }, scale: { value: 300 } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float scale;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        varying vec3 vColor;
        void main() {
          vec4 t = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(vColor * t.rgb, t.a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  /** Viewport height in pixels, so particle size looks the same on every screen. */
  setScale(px: number) {
    (this.points.material as THREE.ShaderMaterial).uniforms.scale.value = px;
  }

  /** Burst of sparkles around a box (center and half size in world units). */
  burst(center: THREE.Vector3, half: THREE.Vector3, n: number, strength = 1) {
    const colors = [
      [1, 0.86, 0.45],
      [1, 1, 0.9],
      [0.55, 0.95, 1],
      [1, 0.6, 0.5],
    ];
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.count;
      const a = Math.random() * Math.PI * 2;
      const rx = Math.cos(a);
      const ry = Math.random() * 2 - 0.6;
      this.pos[i * 3] = center.x + rx * half.x * (0.6 + Math.random() * 0.5);
      this.pos[i * 3 + 1] = center.y + ry * half.y;
      this.pos[i * 3 + 2] = center.z + Math.sin(a) * half.z * 0.8 + 0.05;
      const sp = (0.25 + Math.random() * 0.45) * strength;
      this.vel[i * 3] = rx * sp * 0.6;
      this.vel[i * 3 + 1] = (0.35 + Math.random() * 0.6) * sp;
      this.vel[i * 3 + 2] = Math.sin(a) * sp * 0.3 + 0.1;
      const c = colors[Math.floor(Math.random() * colors.length)];
      this.col[i * 3] = c[0];
      this.col[i * 3 + 1] = c[1];
      this.col[i * 3 + 2] = c[2];
      this.base[i] = (0.03 + Math.random() * 0.05) * (0.8 + strength * 0.3);
      this.maxLife[i] = 0.6 + Math.random() * 0.6;
      this.life[i] = this.maxLife[i];
    }
    this.alive = this.count;
  }

  /** Advance particles; returns true while any are still visible. */
  update(dt: number) {
    if (!this.alive) return false;
    const s = dt / 1000;
    let any = false;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) {
        this.size[i] = 0;
        continue;
      }
      any = true;
      this.life[i] -= s;
      const t = Math.max(0, this.life[i] / this.maxLife[i]);
      this.pos[i * 3] += this.vel[i * 3] * s;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * s;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * s;
      this.vel[i * 3 + 1] *= 0.97;
      // twinkle: grow quickly, then fade out with a flicker
      const grow = Math.min(1, (1 - t) * 6);
      this.size[i] = this.base[i] * grow * t * (0.75 + 0.25 * Math.sin(i * 7 + t * 30));
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.size.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    if (!any) this.alive = 0;
    return any;
  }
}
