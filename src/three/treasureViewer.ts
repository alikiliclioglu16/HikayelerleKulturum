import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadActor, type Actor } from '../home3d/actors';
import { ease } from './tween';

/**
 * A culture treasure turning slowly on a little round stand, in the treasure's card of the Kelime Sandığı.
 * Drag (or swipe) to turn it by hand; characters play their idle animation. One small renderer per open card.
 */
export class TreasureViewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  private turntable = new THREE.Group();
  private actor: Actor | null = null;
  private raf = 0;
  private last = 0;
  private spin = 0.55;
  private yaw = -0.5;
  private tilt = 0.12;
  private drag: { x: number; y: number; yaw: number; tilt: number; t: number } | null = null;
  private popStart = 0;
  private session = 0;
  private ro: ResizeObserver;
  private disposed = false;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private calm = false,
  ) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight('#FFF7EC', '#9C7A5E', 2.0));
    const sun = new THREE.DirectionalLight('#FFF1DC', 1.9);
    sun.position.set(-1.6, 3.2, 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.radius = 5;
    Object.assign(sun.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: 0.5, far: 8 });
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    // the round stand: an İznik-blue rim with a creamy top
    const stand = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.08, 64), new THREE.MeshStandardMaterial({ color: '#1C3F8C', roughness: 0.45 }));
    rim.position.y = -0.045;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.012, 64), new THREE.MeshStandardMaterial({ color: '#FFF4DE', roughness: 0.8 }));
    top.position.y = 0.0;
    top.receiveShadow = true;
    stand.add(rim, top);
    this.turntable.add(stand);
    this.scene.add(this.turntable);

    canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
  }

  /** Show a treasure's model (it pops onto the stand). */
  async show(src: string) {
    const session = ++this.session;
    // models are shared with the rest of the app (cached), so they are only taken off the stand here
    if (this.actor) {
      this.turntable.remove(this.actor.root);
      this.actor = null;
    }
    const actor = await loadActor(src, 0.78, 0.98);
    if (session !== this.session || this.disposed) return;
    actor.root.position.y = 0.006;
    this.turntable.add(actor.root);
    this.actor = actor;
    this.popStart = performance.now();
    this.start();
  }

  private resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // fit the stand and a treasure about a page-width tall, whatever the shape of the box
    const fitH = 1.62 / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    const fitW = fitH / Math.min(1, this.camera.aspect);
    const d = Math.max(fitH, fitW) * 1.05;
    this.camera.position.set(0, 0.36 + d * Math.sin(0.24), d * Math.cos(0.24));
    this.camera.lookAt(0, 0.36, 0);
    this.camera.updateProjectionMatrix();
    this.start();
  }

  private onDown = (e: PointerEvent) => {
    this.drag = { x: e.clientX, y: e.clientY, yaw: this.yaw, tilt: this.tilt, t: performance.now() };
    this.canvas.setPointerCapture?.(e.pointerId);
    this.canvas.classList.add('dragging');
  };

  private onMove = (e: PointerEvent) => {
    if (!this.drag) return;
    const w = Math.max(200, this.canvas.clientWidth);
    this.yaw = this.drag.yaw + ((e.clientX - this.drag.x) / w) * Math.PI * 2;
    this.tilt = THREE.MathUtils.clamp(this.drag.tilt + ((e.clientY - this.drag.y) / w) * 1.5, -0.15, 0.55);
    this.start();
  };

  private onUp = () => {
    if (!this.drag) return;
    this.drag = null;
    this.canvas.classList.remove('dragging');
  };

  private start() {
    if (!this.raf && !this.disposed) this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private frame(now: number) {
    this.raf = 0;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
    this.last = now;
    if (!this.drag && !this.calm) this.yaw += this.spin * dt;
    // without a hand on it, the treasure leans back to its resting tilt
    if (!this.drag) this.tilt += (0.12 - this.tilt) * Math.min(1, dt * 2);
    this.turntable.rotation.set(this.tilt, this.yaw, 0, 'XYZ');
    let s = 1;
    if (this.actor) {
      const k = Math.min(1, (now - this.popStart) / 520);
      s = 0.55 + 0.45 * ease.back(k);
      this.actor.root.scale.setScalar(s);
      this.actor.mixer.update(dt);
    }
    this.renderer.render(this.scene, this.camera);
    const moving = !this.calm || !!this.drag || Math.abs(this.tilt - 0.12) > 0.002 || (this.actor && now - this.popStart < 600) || (this.actor && Object.keys(this.actor.actions).length > 0);
    if (moving && !document.hidden) this.start();
    else this.last = 0;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
