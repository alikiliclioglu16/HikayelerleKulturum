import * as THREE from 'three';
import { canvas, tex, V3 } from './kit3d';

/**
 * The home page's slow cinematic life:
 *  - an opening crane shot,
 *  - a gentle hand-held drift and, every few seconds, a soft push-in towards something on the shelf,
 *  - a slow day-light cycle (warm gold, rose, soft morning) on the key light and the sky light,
 *  - a coloured "stained-glass" light that sweeps across the kilim wall,
 *  - floating dust motes in the light.
 * Everything is subtle, so the books stay easy to read and the cards stay in place.
 */

const SKY = [
  { key: '#FFE2B8', keyI: 2.5, sky: '#FFF2DE', ground: '#4A3020', hemiI: 0.85, beam: '#FFD27A' },
  { key: '#FFC9A8', keyI: 2.25, sky: '#FFE3DA', ground: '#4A2A24', hemiI: 0.8, beam: '#FF9A7A' },
  { key: '#FFF1DE', keyI: 2.6, sky: '#E8F2FF', ground: '#3E3426', hemiI: 0.95, beam: '#7AD8D2' },
  { key: '#FFD9C2', keyI: 2.35, sky: '#F1E4FF', ground: '#402C34', hemiI: 0.85, beam: '#C9A2FF' },
];

export interface CinemaTargets {
  camera: THREE.PerspectiveCamera;
  key: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  lampLight: THREE.PointLight | null;
  /** Points of interest the camera may drift towards (world positions), refreshed by the scene. */
  focus: () => THREE.Vector3[];
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

export class Cinema {
  readonly group = new THREE.Group();
  private basePos = new THREE.Vector3();
  private baseTarget = new THREE.Vector3();
  private dist = 10;
  private t = 0;
  private introT = 0;
  private shot: { from: number; dur: number; point: THREE.Vector3 } | null = null;
  private nextShot = 9;
  private beam: THREE.SpotLight;
  private motes: THREE.Points;
  private c1 = new THREE.Color();
  private c2 = new THREE.Color();
  enabled = true;

  constructor(private readonly o: CinemaTargets, wallY: number) {
    // a soft coloured spotlight sliding across the wall, like light through stained glass
    this.beam = new THREE.SpotLight('#FFD27A', 9, 9, 0.32, 0.9, 1.2);
    this.beam.position.set(0, wallY + 1.8, 3.2);
    this.beam.target.position.set(0, wallY, 0);
    this.beam.castShadow = false;
    this.group.add(this.beam, this.beam.target);

    // floating dust in the light
    const n = 150;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 7;
      pos[i * 3 + 1] = Math.random() * 2.9;
      pos[i * 3 + 2] = 0.15 + Math.random() * 1.4;
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const dot = tex(
      canvas(32, 32, (g, w) => {
        const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        r.addColorStop(0, 'rgba(255,255,255,1)');
        r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r;
        g.fillRect(0, 0, w, w);
      }),
    );
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, map: { value: dot }, color: { value: new THREE.Color('#FFE2A8') }, scale: { value: 400 } },
      vertexShader: `
        attribute float seed;
        uniform float time;
        uniform float scale;
        varying float vA;
        void main() {
          vec3 p = position;
          float s = seed * 6.2831;
          p.x += sin(time * 0.13 + s) * 0.35;
          p.y = mod(p.y + time * (0.03 + seed * 0.04), 2.9);
          p.z += cos(time * 0.17 + s * 1.3) * 0.12;
          vA = (0.35 + 0.65 * (0.5 + 0.5 * sin(time * (0.6 + seed) + s * 3.0))) * smoothstep(0.0, 0.4, p.y) * (1.0 - smoothstep(2.4, 2.9, p.y));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (0.012 + seed * 0.02) * scale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        uniform vec3 color;
        varying float vA;
        void main() {
          vec4 t = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(color, t.a * vA * 0.55);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.motes = new THREE.Points(geo, mat);
    this.motes.frustumCulled = false;
    this.group.add(this.motes);
  }

  /** Called after every layout: remember the framed camera pose. */
  setBase(pos: THREE.Vector3, target: THREE.Vector3, pxScale: number) {
    this.basePos.copy(pos);
    this.baseTarget.copy(target);
    this.dist = pos.distanceTo(target);
    (this.motes.material as THREE.ShaderMaterial).uniforms.scale.value = pxScale;
  }

  startIntro() {
    this.introT = 0.0001;
  }

  /** Advance the shot; returns true while anything is moving. */
  update(dt: number) {
    if (!this.enabled) return false;
    const s = dt / 1000;
    this.t += s;
    const t = this.t;
    const cam = this.o.camera;

    /* ---------- camera ---------- */
    const pos = this.basePos.clone();
    const target = this.baseTarget.clone();
    const D = this.dist;
    // hand-held drift: slow, layered sines on position and a smaller one on the target (parallax)
    pos.x += (Math.sin(t * 0.11) * 0.010 + Math.sin(t * 0.037 + 1.3) * 0.008) * D;
    pos.y += (Math.sin(t * 0.083 + 0.6) * 0.005 + Math.sin(t * 0.21) * 0.0015) * D;
    target.x += Math.sin(t * 0.11 + 0.4) * 0.004 * D;

    // push-in shots towards a point of interest
    if (!this.shot && t > this.nextShot && this.introT === 0) {
      const pts = this.o.focus();
      if (pts.length) this.shot = { from: t, dur: 8, point: pts[Math.floor(Math.random() * pts.length)].clone() };
    }
    if (this.shot) {
      const k = (t - this.shot.from) / this.shot.dur;
      if (k >= 1) {
        this.shot = null;
        this.nextShot = t + 7 + Math.random() * 5;
      } else {
        const w = k < 0.35 ? smoothstep(k / 0.35) : k > 0.7 ? smoothstep((1 - k) / 0.3) : 1;
        const dir = this.shot.point.clone().sub(pos);
        pos.addScaledVector(dir.normalize(), w * D * 0.06);
        target.lerp(this.shot.point, w * 0.12);
      }
    }

    // opening crane: from low and far, rising into place
    if (this.introT > 0) {
      this.introT += s / 3.2;
      const k = Math.min(1, this.introT);
      const e = 1 - Math.pow(1 - k, 3);
      pos.add(V3(-0.06 * D * (1 - e), -0.12 * D * (1 - e), 0.35 * D * (1 - e)));
      target.y -= 0.08 * D * (1 - e);
      if (k >= 1) this.introT = 0;
    }
    cam.position.copy(pos);
    cam.lookAt(target);
    cam.updateMatrixWorld();

    /* ---------- light colour cycle ---------- */
    const cycle = 56;
    const f = ((t / cycle) % 1) * SKY.length;
    const a = SKY[Math.floor(f)];
    const b = SKY[(Math.floor(f) + 1) % SKY.length];
    const m = smoothstep(f - Math.floor(f));
    const { key, hemi, lampLight } = this.o;
    key.color.copy(this.c1.set(a.key)).lerp(this.c2.set(b.key), m);
    key.intensity = a.keyI + (b.keyI - a.keyI) * m;
    hemi.color.copy(this.c1.set(a.sky)).lerp(this.c2.set(b.sky), m);
    hemi.groundColor.copy(this.c1.set(a.ground)).lerp(this.c2.set(b.ground), m);
    hemi.intensity = a.hemiI + (b.hemiI - a.hemiI) * m;
    // the sun slowly moves, so the shadows shift a little
    key.position.x = -2.6 + Math.sin(t * 0.05) * 1.2;

    // the stained-glass beam slides across the wall and changes colour
    this.beam.color.copy(this.c1.set(a.beam)).lerp(this.c2.set(b.beam), m);
    const bx = Math.sin(t * 0.09) * 3.2;
    this.beam.target.position.x = bx;
    this.beam.position.x = bx * 0.6 - 0.8;
    this.beam.intensity = 7 + Math.sin(t * 0.31) * 1.5;

    if (lampLight) lampLight.intensity = 2.2 * (0.9 + 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 13.1 + 1));

    const mm = this.motes.material as THREE.ShaderMaterial;
    mm.uniforms.time.value = t;
    (mm.uniforms.color.value as THREE.Color).copy(key.color);
    return true;
  }

  /** Put the camera back on its framed pose (used when motion is turned off). */
  reset() {
    this.o.camera.position.copy(this.basePos);
    this.o.camera.lookAt(this.baseTarget);
    this.o.camera.updateMatrixWorld();
  }
}
