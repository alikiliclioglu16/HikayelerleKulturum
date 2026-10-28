import * as THREE from 'three';

/** A raindrop: a short blue streak with a bright tip, drawn once and shared. */
function dropTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createLinearGradient(0, 4, 0, 60);
  grd.addColorStop(0, 'rgba(120,200,255,0)');
  grd.addColorStop(0.65, 'rgba(110,190,250,0.85)');
  grd.addColorStop(1, 'rgba(230,248,255,1)');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(30, 4);
  g.lineTo(34, 4);
  g.quadraticCurveTo(39, 50, 32, 60);
  g.quadraticCurveTo(25, 50, 30, 4);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Rain falling from a magic cloud: blue drops pouring onto the page. One shower at a time; `start` begins it
 * under a point, `update` moves it (returns true while it falls). Drops are camera-facing sprites sized in world
 * units, so they read well at any screen size (call `setScale` like for the sparkles).
 */
export class Rain {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private vel: Float32Array;
  private n = 240;
  private left = 0;
  private fade = 0;
  private from = new THREE.Vector3();
  private width = 0.3;
  private floor = 0;
  private mat: THREE.ShaderMaterial;

  constructor() {
    this.pos = new Float32Array(this.n * 3);
    this.vel = new Float32Array(this.n);
    const size = new Float32Array(this.n);
    for (let i = 0; i < this.n; i++) size[i] = 0.035 + Math.random() * 0.025;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: dropTexture() }, scale: { value: 600 }, opacity: { value: 0 } },
      vertexShader: `
        attribute float size;
        uniform float scale;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        void main() {
          vec4 t = texture2D(map, vec2(gl_PointCoord.x, gl_PointCoord.y));
          gl_FragColor = vec4(t.rgb, t.a * opacity);
        }`,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.points.renderOrder = 9;
  }

  /** Viewport height in pixels (see Sparkles.setScale). */
  setScale(px: number) {
    this.mat.uniforms.scale.value = px;
  }

  /** Rain for `seconds` under `at` (the cloud's centre), over a strip `width` wide, onto the floor at `floor`. */
  start(at: THREE.Vector3, width: number, seconds: number, floor: number) {
    this.from.copy(at);
    this.width = width;
    this.floor = floor;
    this.left = seconds;
    for (let i = 0; i < this.n; i++) this.drop(i, true);
    this.points.visible = true;
  }

  stop() {
    this.left = 0;
    this.fade = 0;
    this.points.visible = false;
  }

  private drop(i: number, anywhere: boolean) {
    const x = this.from.x + (Math.random() - 0.5) * this.width;
    const z = this.from.z + (Math.random() - 0.5) * this.width * 0.7;
    const top = this.from.y - 0.03;
    const y = anywhere ? this.floor + Math.random() * (top - this.floor) : top - Math.random() * 0.05;
    this.pos.set([x, y, z], i * 3);
    this.vel[i] = 0.75 + Math.random() * 0.45;
  }

  update(dt: number) {
    if (!this.points.visible) return false;
    if (this.left > 0) {
      this.left -= dt;
      this.fade = Math.min(1, this.fade + dt * 3);
    } else this.fade = Math.max(0, this.fade - dt * 1.5);
    this.mat.uniforms.opacity.value = 0.95 * this.fade;
    if (this.fade <= 0 && this.left <= 0) {
      this.points.visible = false;
      return false;
    }
    for (let i = 0; i < this.n; i++) {
      this.pos[i * 3 + 1] -= this.vel[i] * dt;
      if (this.pos[i * 3 + 1] < this.floor) {
        if (this.left > 0) this.drop(i, false);
        else this.pos[i * 3 + 1] = this.floor - 1;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    return true;
  }
}
