import * as THREE from 'three';

/**
 * Slow cinematic life around the open book:
 *  - a gentle hand-held drift and a slow "breathing" push-in of the camera,
 *  - a day-light colour cycle on the sun and the sky light,
 *  - a soft patch of window light that slides across the table and changes colour,
 *  - dust motes in the light and steam rising from hot tea.
 * The movement is small, so the text and the pop-up stay easy to read.
 */

const SKY = [
  { key: '#FFF1DC', keyI: 1.9, sky: '#FFF7EC', ground: '#9C7A5E', hemiI: 2.1, sun: '#FFD27A', bg: '#C9DCE8' },
  { key: '#FFDCC0', keyI: 1.8, sky: '#FFEDE4', ground: '#9A6E5E', hemiI: 2.0, sun: '#FF9E7A', bg: '#E2D2D8' },
  { key: '#F2F6FF', keyI: 2.0, sky: '#EEF4FF', ground: '#8A7A6A', hemiI: 2.15, sun: '#8FE0D8', bg: '#C4E0E4' },
  { key: '#FFE6D2', keyI: 1.85, sky: '#F6ECFF', ground: '#937066', hemiI: 2.05, sun: '#D6AEFF', bg: '#D6D4EA' },
];

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  return t;
}

const DOT = dotTexture();

function motes(n: number, box: THREE.Box3, size: number, rise: number, color: string, alpha: number, wander: number, blending: THREE.Blending = THREE.AdditiveBlending) {
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const s = box.getSize(new THREE.Vector3());
  for (let i = 0; i < n; i++) {
    pos[i * 3] = box.min.x + Math.random() * s.x;
    pos[i * 3 + 1] = Math.random() * s.y;
    pos[i * 3 + 2] = box.min.z + Math.random() * s.z;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      map: { value: DOT },
      color: { value: new THREE.Color(color) },
      scale: { value: 400 },
      y0: { value: box.min.y },
      hgt: { value: s.y },
      size: { value: size },
      rise: { value: rise },
      alpha: { value: alpha },
      wander: { value: wander },
    },
    vertexShader: `
      attribute float seed;
      uniform float time, scale, y0, hgt, size, rise, wander;
      varying float vA;
      void main() {
        vec3 p = position;
        float s = seed * 6.2831;
        float k = mod(p.y + time * (rise + seed * rise), hgt) / hgt;
        p.y = y0 + k * hgt;
        p.x += sin(time * 0.6 + s + k * 5.0) * 0.03 * (0.4 + k) + sin(time * 0.13 + s) * wander;
        p.z += cos(time * 0.5 + s * 1.3) * 0.03 * (0.4 + k);
        vA = smoothstep(0.0, 0.18, k) * (1.0 - smoothstep(0.55, 1.0, k)) * (0.5 + 0.5 * sin(time * (0.7 + seed) + s * 3.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = size * (0.6 + seed * 0.8) * (1.0 + k * rise * 6.0) * scale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D map;
      uniform vec3 color;
      uniform float alpha;
      varying float vA;
      void main() {
        vec4 t = texture2D(map, gl_PointCoord);
        gl_FragColor = vec4(color, t.a * vA * alpha);
      }`,
    transparent: true,
    depthWrite: false,
    blending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

export class ReaderCinema {
  readonly group = new THREE.Group();
  private basePos = new THREE.Vector3();
  private baseTarget = new THREE.Vector3();
  private dist = 4;
  private t = 0;
  private introT = 0;
  private sun: THREE.SpotLight;
  private dust: THREE.Points;
  private steams: THREE.Points[] = [];
  private c1 = new THREE.Color();
  private c2 = new THREE.Color();
  enabled = true;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private key: THREE.DirectionalLight,
    private hemi: THREE.HemisphereLight,
    private scene: THREE.Scene,
  ) {
    // window light falling on the table
    this.sun = new THREE.SpotLight('#FFD27A', 10, 9, 0.3, 0.9, 1.3);
    this.sun.position.set(-2.4, 3.4, -2.2);
    this.sun.target.position.set(0.3, 0, 0);
    this.group.add(this.sun, this.sun.target);
    this.dust = motes(110, new THREE.Box3(new THREE.Vector3(-1.8, 0.05, -1), new THREE.Vector3(2, 1.5, 1.1)), 0.016, 0.02, '#FFE6B0', 0.6, 0.2);
    this.group.add(this.dust);
  }

  /** Steam over a hot glass of tea (world position of the glass rim). */
  addSteam(at: THREE.Vector3) {
    const s = motes(16, new THREE.Box3(at.clone().add(new THREE.Vector3(-0.025, 0, -0.025)), at.clone().add(new THREE.Vector3(0.025, 0.32, 0.025))), 0.07, 0.07, '#FFFFFF', 0.3, 0.012, THREE.NormalBlending);
    this.steams.push(s);
    this.group.add(s);
  }

  clearSteam() {
    for (const s of this.steams) {
      this.group.remove(s);
      s.geometry.dispose();
      (s.material as THREE.Material).dispose();
    }
    this.steams = [];
  }

  setBase(pos: THREE.Vector3, target: THREE.Vector3, pxScale: number) {
    this.basePos.copy(pos);
    this.baseTarget.copy(target);
    this.dist = pos.distanceTo(target);
    for (const p of [this.dust, ...this.steams]) (p.material as THREE.ShaderMaterial).uniforms.scale.value = pxScale;
  }

  /** Start with the camera a little higher and further away, then settle on the book. */
  startIntro() {
    this.introT = 0.0001;
  }

  /** Where the camera is now relative to its framed pose, as a screen-space shift for text that sits on the page. */
  update(dt: number): boolean {
    const s = dt;
    this.t += s;
    const t = this.t;

    // particles always animate (cheap); the rest only when cinematic motion is on
    for (const p of [this.dust, ...this.steams]) (p.material as THREE.ShaderMaterial).uniforms.time.value = t;
    if (!this.enabled) return this.steams.length > 0;

    const cam = this.camera;
    const D = this.dist;
    const pos = this.basePos.clone();
    const target = this.baseTarget.clone();
    pos.x += (Math.sin(t * 0.13) * 0.006 + Math.sin(t * 0.047 + 1.3) * 0.005) * D;
    pos.y += (Math.sin(t * 0.091 + 0.6) * 0.004 + Math.sin(t * 0.23) * 0.001) * D;
    target.x += Math.sin(t * 0.11 + 0.4) * 0.003 * D;
    // slow breathing push-in
    const breathe = (0.5 - 0.5 * Math.cos(t * 0.07)) * 0.025;
    pos.lerp(target, breathe);
    if (this.introT > 0) {
      this.introT += s / 2.6;
      const k = Math.min(1, this.introT);
      const e = 1 - Math.pow(1 - k, 3);
      const away = pos.clone().sub(target).normalize();
      pos.addScaledVector(away, 0.22 * D * (1 - e));
      pos.y += 0.1 * D * (1 - e);
      if (k >= 1) this.introT = 0;
    }
    cam.position.copy(pos);
    cam.lookAt(target);
    cam.updateMatrixWorld();

    // day-light cycle
    const f = ((t / 60) % 1) * SKY.length;
    const a = SKY[Math.floor(f)];
    const b = SKY[(Math.floor(f) + 1) % SKY.length];
    const m = smoothstep(f - Math.floor(f));
    this.key.color.copy(this.c1.set(a.key)).lerp(this.c2.set(b.key), m);
    this.key.intensity = a.keyI + (b.keyI - a.keyI) * m;
    this.key.position.x = -2.2 + Math.sin(t * 0.05) * 1.1;
    this.hemi.color.copy(this.c1.set(a.sky)).lerp(this.c2.set(b.sky), m);
    this.hemi.groundColor.copy(this.c1.set(a.ground)).lerp(this.c2.set(b.ground), m);
    this.hemi.intensity = a.hemiI + (b.hemiI - a.hemiI) * m;
    const bg = this.scene.background as THREE.Color;
    bg.copy(this.c1.set(a.bg)).lerp(this.c2.set(b.bg), m);
    (this.scene.fog as THREE.Fog | null)?.color.copy(bg);

    // the patch of window light drifts across the table
    this.sun.color.copy(this.c1.set(a.sun)).lerp(this.c2.set(b.sun), m);
    const sx = Math.sin(t * 0.08) * 1.7 + 0.2;
    this.sun.target.position.set(sx, 0, Math.cos(t * 0.06) * 0.35);
    this.sun.position.x = sx * 0.5 - 2.2;
    this.sun.intensity = 9 + Math.sin(t * 0.27) * 2;
    (this.dust.material as THREE.ShaderMaterial).uniforms.color.value.copy(this.key.color);
    return true;
  }

  reset() {
    this.camera.position.copy(this.basePos);
    this.camera.lookAt(this.baseTarget);
    this.camera.updateMatrixWorld();
  }
}
