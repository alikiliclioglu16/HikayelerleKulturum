import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Tweens, ease } from './tween';
import { loadActor, loadGltf, play, type Actor } from '../home3d/actors';
import type { PageModel, TableModel } from '../types';
import { ReaderCinema } from './readerCinema';
import type { BuiltLayer } from '../art/scenes';
import { iznikTile, tulip } from '../art/kit';
import { Pen, rng } from '../art/pen';

const PAGE_W = 1;
const PAGE_D = 1.36;
const COVER_T = 0.022;
const PAGE_T = 0.045;
const PAGE_TOP = COVER_T + PAGE_T;

export type LayoutMode = 'landscape' | 'portrait';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LayerObj {
  pivot: THREE.Group;
  mesh: THREE.Mesh;
  built: BuiltLayer;
  upright: number;
  width: number;
  height: number;
}

interface ModelObj {
  actor: Actor;
  fx: THREE.Group;
  spec: PageModel;
  word?: string;
  animated: boolean;
  phase: number;
  walk: { to: THREE.Vector3; from: THREE.Vector3; speed: number; patrol: boolean } | null;
  visible: boolean;
}

interface PropObj {
  object: THREE.Object3D;
  word: string;
  anchor: THREE.Vector3;
}

export interface PickResult {
  word: string;
  x: number;
  y: number;
}

function canvasTexture(canvas: HTMLCanvasElement, renderer: THREE.WebGLRenderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

function woodCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#9B5E36';
  g.fillRect(0, 0, 512, 512);
  const r = rng(5);
  // grain lines use whole sine periods so the texture tiles without seams
  for (let i = 0; i < 70; i++) {
    const y0 = r() * 512;
    const k = 1 + Math.floor(r() * 3);
    const amp = 2 + r() * 5;
    const ph = r() * Math.PI * 2;
    g.strokeStyle = r() > 0.5 ? 'rgba(70,35,15,0.18)' : 'rgba(255,220,180,0.10)';
    g.lineWidth = 1 + r() * 5;
    for (const dy of [-512, 0, 512]) {
      g.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const y = y0 + dy + Math.sin((x / 512) * Math.PI * 2 * k + ph) * amp;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  return c;
}

function pageCanvas(side: 'left' | 'right', target?: HTMLCanvasElement, deco?: { title: string; sub: string }): HTMLCanvasElement {
  const c = target ?? document.createElement('canvas');
  c.width = 512;
  c.height = Math.round(512 * PAGE_D);
  const g = c.getContext('2d')!;
  g.fillStyle = '#FFFBF2';
  g.fillRect(0, 0, c.width, c.height);
  // gutter shadow near the spine
  const grad = side === 'left' ? g.createLinearGradient(c.width, 0, c.width - 90, 0) : g.createLinearGradient(0, 0, 90, 0);
  grad.addColorStop(0, 'rgba(120,90,60,0.28)');
  grad.addColorStop(1, 'rgba(120,90,60,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  // thin border with corner rosettes
  g.strokeStyle = 'rgba(28,63,140,0.35)';
  g.lineWidth = 3;
  g.strokeRect(26, 26, c.width - 52, c.height - 52);
  if (deco) {
    g.textAlign = 'center';
    g.fillStyle = '#D2372C';
    let size = 46;
    g.font = `600 ${size}px "DynaPuff", system-ui`;
    while (g.measureText(deco.title).width > c.width - 110 && size > 26) {
      size -= 2;
      g.font = `600 ${size}px "DynaPuff", system-ui`;
    }
    g.fillText(deco.title, c.width / 2 - 8, 250);
    const pen = new Pen(200, 1);
    tulip(pen, 500, 960, 860);
    g.drawImage(pen.canvas, c.width / 2 - 8 - 60, 290, 120, 120);
    g.fillStyle = '#4A5675';
    g.font = '24px "Andika", system-ui';
    g.fillText(deco.sub, c.width / 2 - 8, c.height - 60);
  }
  return c;
}

function tileCanvas(): HTMLCanvasElement {
  const pen = new Pen(256, 1);
  iznikTile(pen, 0, 0, 1000, 1);
  return pen.canvas;
}

export class BookScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
  private tweens = new Tweens();
  private raf = 0;
  private layers: LayerObj[] = [];
  private props: PropObj[] = [];
  private models: ModelObj[] = [];
  private tableObjs: THREE.Object3D[] = [];
  private tableSession = 0;
  private cinema!: ReaderCinema;
  private clock = 0;
  /** Called after every rendered frame (for example to keep text in place while the camera drifts). */
  onFrame: (() => void) | null = null;
  private modelSession = 0;
  private lastTick = 0;
  private leftGroup = new THREE.Group();
  private turnGroup = new THREE.Group();
  private coverMat!: THREE.MeshLambertMaterial;
  private leftCanvas = document.createElement('canvas');
  private leftTex!: THREE.CanvasTexture;
  private raycaster = new THREE.Raycaster();
  private ro: ResizeObserver;
  private mode: LayoutMode = 'landscape';
  private region: Region = { x: 0, y: 0, w: 1, h: 1 };
  private frameTimes: number[] = [];
  private lastFrame = 0;
  private quality = 2;
  private light!: THREE.DirectionalLight;
  reducedMotion = false;
  private disposed = false;
  onResize: (() => void) | null = null;

  constructor(readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = 'scene-canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(this.renderer.domElement);

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.5;
    pmrem.dispose();
    const bg = new THREE.Color('#C9DCE8');
    this.scene.background = bg;
    this.scene.fog = new THREE.Fog(bg, 5.5, 11);

    this.buildWorld();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
  }

  /* ---------------- world ---------------- */

  private buildWorld() {
    const r = this.renderer;
    const hemi = new THREE.HemisphereLight('#FFF7EC', '#9C7A5E', 2.1);
    this.scene.add(hemi);
    const light = new THREE.DirectionalLight('#FFF1DC', 1.9);
    light.position.set(-2.2, 4.2, 2.6);
    light.target.position.set(0.3, 0, 0);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    const sc = light.shadow.camera;
    sc.left = -2.2;
    sc.right = 2.2;
    sc.top = 2;
    sc.bottom = -2;
    sc.near = 1;
    sc.far = 10;
    light.shadow.bias = -0.0008;
    light.shadow.radius = 4;
    this.light = light;
    this.scene.add(light, light.target);

    // desk
    const woodTex = canvasTexture(woodCanvas(), r);
    woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(4, 3);
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshLambertMaterial({ map: woodTex }));
    desk.rotation.x = -Math.PI / 2;
    desk.receiveShadow = true;
    this.scene.add(desk);

    // book
    const coverColor = new THREE.MeshLambertMaterial({ color: '#1C3F8C' });
    const edge = new THREE.MeshLambertMaterial({ color: '#EFE5D2' });
    const leftTex = canvasTexture(pageCanvas('left', this.leftCanvas), r);
    this.leftTex = leftTex;
    const rightTex = canvasTexture(pageCanvas('right'), r);
    const leftTop = new THREE.MeshLambertMaterial({ map: leftTex });
    const rightTop = new THREE.MeshLambertMaterial({ map: rightTex });

    const boardGeo = new THREE.BoxGeometry(PAGE_W + 0.05, COVER_T, PAGE_D + 0.08);
    const rightBoard = new THREE.Mesh(boardGeo, coverColor);
    rightBoard.position.set((PAGE_W + 0.05) / 2, COVER_T / 2, 0);
    rightBoard.receiveShadow = true;
    rightBoard.castShadow = true;
    this.scene.add(rightBoard);

    const blockGeo = new THREE.BoxGeometry(PAGE_W, PAGE_T, PAGE_D);
    const rightBlock = new THREE.Mesh(blockGeo, [edge, edge, rightTop, edge, edge, edge]);
    rightBlock.position.set(PAGE_W / 2, COVER_T + PAGE_T / 2, 0);
    rightBlock.receiveShadow = true;
    this.scene.add(rightBlock);

    // left half lives in a group hinged at the spine so the book can open
    this.coverMat = new THREE.MeshLambertMaterial({ color: '#1C3F8C' });
    this.leftGroup.position.set(0, PAGE_TOP, 0);
    const leftBoard = new THREE.Mesh(boardGeo, [coverColor, coverColor, coverColor, this.coverMat, coverColor, coverColor]);
    leftBoard.position.set(-(PAGE_W + 0.05) / 2, COVER_T / 2 - PAGE_TOP, 0);
    leftBoard.castShadow = true;
    leftBoard.receiveShadow = true;
    const leftBlock = new THREE.Mesh(blockGeo, [edge, edge, leftTop, edge, edge, edge]);
    leftBlock.position.set(-PAGE_W / 2, COVER_T + PAGE_T / 2 - PAGE_TOP, 0);
    leftBlock.receiveShadow = true;
    leftBlock.castShadow = true;
    this.leftGroup.add(leftBoard, leftBlock);
    this.scene.add(this.leftGroup);

    // spine
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.06, COVER_T * 1.2, PAGE_D + 0.08), coverColor);
    spine.position.set(0, COVER_T * 0.6, 0);
    this.scene.add(spine);

    // the page that turns
    const turnGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_D);
    turnGeo.rotateX(-Math.PI / 2);
    turnGeo.translate(PAGE_W / 2, 0, 0);
    const turnMesh = new THREE.Mesh(turnGeo, new THREE.MeshLambertMaterial({ color: '#FFFBF2', side: THREE.DoubleSide }));
    turnMesh.castShadow = true;
    this.turnGroup.add(turnMesh);
    this.turnGroup.position.set(0, PAGE_TOP + 0.003, 0);
    this.turnGroup.visible = false;
    this.scene.add(this.turnGroup);

    this.cinema = new ReaderCinema(this.camera, light, hemi, this.scene);
    this.cinema.enabled = !this.reducedMotion;
    this.scene.add(this.cinema.group);
  }

  /** Culture objects on the table around the book (GLB models from the shelf). */
  async setTable(list: TableModel[]) {
    const session = ++this.tableSession;
    for (const o of this.tableObjs) this.scene.remove(o);
    this.tableObjs = [];
    this.props = [];
    this.cinema.clearSteam();
    const r = this.renderer;
    await Promise.all(
      list.map(async (spec) => {
        try {
          const actor = await loadActor(spec.src, spec.h, spec.w);
          if (session !== this.tableSession || this.disposed) return;
          const g = new THREE.Group();
          g.position.set(spec.x, 0, spec.z);
          actor.root.rotation.y = THREE.MathUtils.degToRad(spec.rotY ?? 0);
          let lift = 0;
          if (spec.steam) {
            // a hot drink stands on an İznik tile coaster and steams
            const coaster = new THREE.Mesh(
              new THREE.BoxGeometry(spec.h * 1.5, 0.02, spec.h * 1.5),
              [0, 0, 1, 0, 0, 0].map((k) => (k ? new THREE.MeshLambertMaterial({ map: canvasTexture(tileCanvas(), r) }) : new THREE.MeshLambertMaterial({ color: '#E8EEF4' }))),
            );
            coaster.position.y = 0.01;
            coaster.castShadow = coaster.receiveShadow = true;
            g.add(coaster);
            lift = 0.02;
            this.cinema.addSteam(new THREE.Vector3(spec.x, spec.h * 0.92 + lift, spec.z));
          }
          actor.root.position.y = lift;
          g.add(actor.root);
          this.scene.add(g);
          this.tableObjs.push(g);
          if (spec.word) this.props.push({ object: g, word: spec.word, anchor: new THREE.Vector3(spec.x, spec.h + lift + 0.04, spec.z) });
          this.invalidate();
        } catch (e) {
          console.warn('Masa modeli yüklenemedi', spec.src, e);
        }
      }),
    );
  }

  /** Calm mode: no camera drift or idle animation, shorter page animations. */
  setCalm(on: boolean) {
    this.reducedMotion = on || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.cinema.enabled = !this.reducedMotion;
    if (!this.cinema.enabled) this.cinema.reset();
    this.invalidate();
  }

  /** Start the opening camera move (the camera settles onto the book). */
  introCamera() {
    if (!this.reducedMotion) this.cinema.startIntro();
    this.invalidate();
  }

  /* ---------------- layout + camera ---------------- */

  setLayout(mode: LayoutMode, region: Region) {
    this.mode = mode;
    this.region = region;
    this.frameCamera();
    this.invalidate();
  }

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.onResize?.();
    this.frameCamera();
    this.invalidate();
  }

  get size() {
    return { w: this.container.clientWidth, h: this.container.clientHeight };
  }

  private frameCamera() {
    const { w: W, h: H } = this.size;
    if (!W || !H) return;
    const reg = this.region;
    const rw = Math.max(50, reg.w);
    const rh = Math.max(50, reg.h);
    const landscape = this.mode === 'landscape';
    const min = landscape ? new THREE.Vector3(-1.06, 0, -0.74) : new THREE.Vector3(-0.02, 0, -0.74);
    const max = landscape ? new THREE.Vector3(1.06, 0.84, 0.74) : new THREE.Vector3(1.04, 0.86, 0.72);
    const center = min.clone().add(max).multiplyScalar(0.5);
    center.y = landscape ? 0.2 : 0.3;
    const elev = THREE.MathUtils.degToRad(landscape ? 40 : 30);
    const dir = new THREE.Vector3(0, Math.sin(elev), Math.cos(elev));
    const corners: THREE.Vector3[] = [];
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) corners.push(new THREE.Vector3(x, y, z));

    const cam = this.camera;
    cam.aspect = rw / rh;
    cam.clearViewOffset();
    cam.updateProjectionMatrix();
    let lo = 0.5;
    let hi = 30;
    for (let i = 0; i < 24; i++) {
      const d = (lo + hi) / 2;
      cam.position.copy(center).addScaledVector(dir, d);
      cam.lookAt(center);
      cam.updateMatrixWorld();
      let ok = true;
      for (const c of corners) {
        const v = c.clone().project(cam);
        if (Math.abs(v.x) > 0.96 || Math.abs(v.y) > 0.94 || v.z > 1) {
          ok = false;
          break;
        }
      }
      if (ok) hi = d;
      else lo = d;
    }
    cam.position.copy(center).addScaledVector(dir, hi);
    cam.lookAt(center);
    cam.setViewOffset(rw, rh, -reg.x, -reg.y, W, H);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const pxScale = (rh / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)))) * this.renderer.getPixelRatio();
    this.cinema.setBase(cam.position, center, pxScale);
  }

  /** Screen rectangle (CSS px) of the flat left page, for placing the text on it. */
  leftPageRect(): Region {
    const y = PAGE_TOP;
    const pts = [
      new THREE.Vector3(-PAGE_W + 0.06, y, -PAGE_D / 2 + 0.07),
      new THREE.Vector3(-0.08, y, -PAGE_D / 2 + 0.07),
      new THREE.Vector3(-PAGE_W + 0.06, y, PAGE_D / 2 - 0.07),
      new THREE.Vector3(-0.08, y, PAGE_D / 2 - 0.07),
    ].map((p) => this.toScreen(p));
    const left = Math.max(pts[0].x, pts[2].x);
    const right = Math.min(pts[1].x, pts[3].x);
    const top = Math.max(pts[0].y, pts[1].y);
    const bottom = Math.min(pts[2].y, pts[3].y);
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  toScreen(p: THREE.Vector3) {
    const { w, h } = this.size;
    const v = p.clone().project(this.camera);
    return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
  }

  /* ---------------- rendering ---------------- */

  invalidate() {
    if (this.raf || this.disposed) return;
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private frame(now: number) {
    this.raf = 0;
    this.tweens.update(now);
    const dt = this.lastTick ? Math.min(0.05, (now - this.lastTick) / 1000) : 0.016;
    this.lastTick = now;
    this.clock += dt;
    let alive = false;
    if (!document.hidden && this.cinema.update(dt)) alive = true;
    if (!this.reducedMotion && this.models.length) {
      this.updateModels(dt);
      alive = true;
    }
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
    if (this.tweens.active || alive) {
      if (this.lastFrame) this.trackPerf(now - this.lastFrame);
      this.lastFrame = now;
      this.invalidate();
    } else {
      this.lastFrame = 0;
      this.lastTick = 0;
    }
  }

  /** Idle life for the 3D models on the page: clips, walking, swaying trees, a wobbling pot. */
  private updateModels(dt: number) {
    const t = this.clock;
    for (const m of this.models) {
      if (!m.visible) continue;
      if (m.animated) m.actor.mixer.update(dt);
      const r = m.actor.root;
      if (m.walk) {
        const d = m.walk.to.clone().sub(r.position);
        d.y = 0;
        const len = d.length();
        const step = m.walk.speed * dt;
        if (len <= step && m.walk.patrol) {
          // turn round and walk back
          const w = m.walk;
          [w.to, w.from] = [w.from, w.to];
        } else if (len <= step) {
          r.position.x = m.walk.to.x;
          r.position.z = m.walk.to.z;
          m.walk = null;
          const end = THREE.MathUtils.degToRad(m.spec.endRotY ?? m.spec.rotY ?? 0);
          const from = r.rotation.y;
          this.tweens.add(500, 0, 1, (k) => (r.rotation.y = from + (end - from) * k), ease.inOut);
          play(m.actor, m.spec.anim && m.spec.anim !== 'none' ? m.spec.anim : 'idle', 0.4);
        } else {
          r.position.addScaledVector(d.normalize(), step);
          r.rotation.y = Math.atan2(d.x, d.z);
        }
      }
      const ph = m.phase;
      const g = m.fx;
      switch (m.spec.fx) {
        case 'sway':
          g.rotation.z = Math.sin(t * 1.1 + ph) * 0.035 + Math.sin(t * 2.3 + ph) * 0.01;
          g.rotation.x = Math.sin(t * 0.9 + ph * 2) * 0.02;
          break;
        case 'swing':
          g.rotation.z = Math.sin(t * 1.6 + ph) * 0.08;
          break;
        case 'wobble': {
          // every few seconds a little shake, as if something inside moved
          const k = (t + ph) % 3.2;
          const amp = k < 0.7 ? Math.sin((k / 0.7) * Math.PI) : 0;
          g.rotation.z = Math.sin(t * 28) * 0.06 * amp;
          g.position.y = Math.abs(Math.sin(t * 14)) * 0.012 * amp;
          break;
        }
        case 'breathe':
          g.scale.set(1, 1 + Math.sin(t * 1.4 + ph) * 0.03, 1);
          break;
        case 'bob':
          g.position.y = (Math.sin(t * 1.5 + ph) * 0.5 + 0.5) * 0.03;
          g.rotation.z = Math.sin(t * 1.1 + ph) * 0.05;
          break;
        case 'spin':
          g.rotation.y += dt * 0.6;
          break;
      }
    }
  }

  /** Lower the resolution and switch off shadows on slow devices. */
  private trackPerf(dt: number) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 24) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes = [];
    if (avg > 40 && this.quality > 0) {
      this.quality--;
      if (this.quality === 1) this.renderer.setPixelRatio(1);
      if (this.quality === 0) {
        this.renderer.shadowMap.enabled = false;
        this.light.castShadow = false;
        this.scene.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.Material | undefined;
          if (m) m.needsUpdate = true;
        });
      }
      this.resize();
    }
  }

  private wait(ms: number) {
    return this.tweens.add(ms, 0, 1, () => {}, ease.linear).then(() => undefined);
  }

  private dur(ms: number) {
    return this.reducedMotion ? 0 : ms;
  }

  /* ---------------- book animation ---------------- */

  /** Print the page title on the left page (visible when the text is shown in a card). */
  setLeftPage(deco: { title: string; sub: string } | null) {
    pageCanvas('left', this.leftCanvas, deco ?? undefined);
    this.leftTex.needsUpdate = true;
    this.invalidate();
  }

  setCover(canvas: HTMLCanvasElement) {
    const tex = canvasTexture(canvas, this.renderer);
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI;
    this.coverMat.map = tex;
    this.coverMat.color.set('#ffffff');
    this.coverMat.needsUpdate = true;
  }

  async open(fromClosed: boolean) {
    if (!fromClosed) {
      this.leftGroup.rotation.z = 0;
      this.invalidate();
      return;
    }
    this.leftGroup.rotation.z = -Math.PI;
    this.invalidate();
    await this.wait(this.dur(450));
    this.tweens.add(this.dur(1100), -Math.PI, 0, (v) => (this.leftGroup.rotation.z = v), ease.inOut);
    this.invalidate();
    await this.wait(this.dur(1100));
  }

  private makeLayer(b: BuiltLayer): LayerObj {
    const width = b.spec.w * PAGE_W;
    const height = b.spec.h;
    const geo = new THREE.PlaneGeometry(width, height);
    geo.translate(0, height / 2, 0);
    const tex = canvasTexture(b.canvas, this.renderer);
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
    const pivot = new THREE.Group();
    const depth = PAGE_D - 0.14;
    pivot.position.set(PAGE_W / 2 + (b.spec.x ?? 0) * PAGE_W, PAGE_TOP + 0.002, -PAGE_D / 2 + 0.06 + b.spec.z * depth);
    pivot.add(mesh);
    const upright = b.spec.z < 0.2 ? -0.07 : 0;
    pivot.rotation.x = -Math.PI / 2 + 0.01;
    pivot.visible = false;
    this.scene.add(pivot);
    return { pivot, mesh, built: b, upright, width, height };
  }

  private disposeLayer(l: LayerObj) {
    this.scene.remove(l.pivot);
    l.mesh.geometry.dispose();
    const m = l.mesh.material as THREE.MeshLambertMaterial;
    m.map?.dispose();
    m.dispose();
    l.mesh.customDepthMaterial?.dispose();
  }

  /** Fold the current pop-up down, turn the page, pop the next one up. */
  async showPage(next: BuiltLayer[], direction: 1 | -1 | 0) {
    const old = this.layers;
    const fold = this.dur(320);
    // fold the old pop-up flat, front layers first
    const folds = old
      .slice()
      .reverse()
      .map((l, i) =>
        this.tweens.add(fold, l.pivot.rotation.x, -Math.PI / 2 + 0.01, (v) => (l.pivot.rotation.x = v), ease.in, i * this.dur(60)),
      );
    this.invalidate();
    await Promise.all(folds);
    old.forEach((l) => this.disposeLayer(l));
    this.layers = [];

    if (direction !== 0) {
      this.turnGroup.visible = true;
      const from = direction > 0 ? 0 : Math.PI;
      const to = direction > 0 ? Math.PI : 0;
      this.tweens.add(this.dur(620), from, to, (v) => {
        this.turnGroup.rotation.z = v;
        this.turnGroup.position.y = PAGE_TOP + 0.003 + Math.sin(v) * 0.02;
      }, ease.inOut);
      this.invalidate();
      await this.wait(this.dur(620));
      this.turnGroup.visible = false;
    }

    this.layers = next.map((b) => this.makeLayer(b));
    const pops = this.layers.map((l, i) => {
      l.pivot.visible = true;
      return this.tweens.add(this.dur(620), -Math.PI / 2 + 0.01, l.upright, (v) => (l.pivot.rotation.x = v), ease.back, i * this.dur(110));
    });
    this.invalidate();
    await Promise.all(pops);
  }

  private pagePoint(x: number, z: number) {
    const depth = PAGE_D - 0.14;
    return new THREE.Vector3(PAGE_W / 2 + x * PAGE_W, PAGE_TOP + 0.003, -PAGE_D / 2 + 0.06 + z * depth);
  }

  /** 3D models (GLB) standing on the right page: characters, animals, trees, pots… */
  async setModels(list: PageModel[]) {
    const session = ++this.modelSession;
    const old = this.models;
    this.models = [];
    await Promise.all(
      old.map((m) =>
        this.tweens.add(this.dur(220), 1, 0.001, (v) => m.actor.root.scale.setScalar(v), ease.in).then(() => this.scene.remove(m.actor.root)),
      ),
    );
    this.invalidate();
    // every model pops up as soon as it has loaded, front ones a little later
    const rank = list.map((_, i) => i).sort((a, b) => list[a].z - list[b].z);
    const t0 = performance.now();
    await Promise.all(
      list.map(async (spec, i) => {
        let actor: Actor;
        try {
          actor = await loadActor(spec.src, spec.h, spec.w);
        } catch (e) {
          console.warn('Model yüklenemedi', spec.src, e);
          return;
        }
        if (session !== this.modelSession || this.disposed) return;
        const wait = Math.max(0, rank.indexOf(i) * 90 + (spec.delay ?? 0) * 1000 - (performance.now() - t0));
        this.placeModel(actor, spec, this.dur(wait));
      }),
    );
  }

  /** Start downloading models for a page that will be shown soon. */
  prefetch(list: PageModel[]) {
    for (const spec of list) void loadGltf(spec.src).catch(() => undefined);
  }

  private placeModel(actor: Actor, spec: PageModel, delay: number) {
    {
      // put the model inside an extra group so idle effects pivot around its feet
      const fx = new THREE.Group();
      const wrap = actor.root.children.filter((c) => c !== actor.hit);
      wrap.forEach((c) => fx.add(c));
      actor.root.add(fx);
      actor.root.position.copy(this.pagePoint(spec.x, spec.z));
      actor.root.position.y += spec.y ?? 0;
      actor.root.rotation.y = THREE.MathUtils.degToRad(spec.rotY ?? 0);
      if (spec.tint) {
        const tint = new THREE.Color(spec.tint);
        actor.root.traverse((n) => {
          const mesh = n as THREE.Mesh;
          if (!mesh.isMesh || mesh === actor.hit) return;
          const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
            const c = (m as THREE.MeshStandardMaterial).clone();
            c.color.copy(tint);
            if ('metalness' in c) {
              c.metalness = 0.25;
              c.roughness = 0.45;
            }
            return c;
          });
          mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
        });
      }
      const hasClips = Object.keys(actor.actions).length > 0;
      let walk: ModelObj['walk'] = null;
      if (hasClips && spec.walkTo && !this.reducedMotion) {
        walk = { to: this.pagePoint(spec.walkTo[0], spec.walkTo[1]), from: actor.root.position.clone(), speed: spec.speed ?? 0.11, patrol: !!spec.patrol };
        play(actor, 'walk', 0);
      } else if (spec.walkTo && this.reducedMotion) {
        actor.root.position.copy(this.pagePoint(spec.walkTo[0], spec.walkTo[1]));
        actor.root.rotation.y = THREE.MathUtils.degToRad(spec.endRotY ?? spec.rotY ?? 0);
      }
      if (!walk && hasClips) {
        if (spec.anim === 'none') Object.values(actor.actions).forEach((a) => a.stop());
        else if (spec.anim) play(actor, spec.anim, 0);
      }
      actor.mixer.update(Math.random() * 2);
      actor.root.scale.setScalar(0.001);
      const obj: ModelObj = { actor, fx, spec, word: spec.word, animated: hasClips && spec.anim !== 'none', phase: Math.random() * 10, walk, visible: false };
      this.models.push(obj);
      this.scene.add(actor.root);
      this.tweens.add(this.dur(520), 0.001, 1, (v) => {
        actor.root.scale.setScalar(v);
        obj.visible = true;
      }, ease.back, delay);
    }
    this.invalidate();
  }

  private pickModel(hit: Pick<THREE.Intersection, "object">) {
    const m = this.models.find((x) => x.actor.hit === hit.object);
    if (!m || !m.word) return null;
    const r = m.actor.root;
    if (!this.reducedMotion) this.tweens.add(480, 0, 1, (k) => (m.fx.position.y = ease.hop(k) * 0.08), ease.linear);
    this.invalidate();
    const top = r.position.clone();
    top.y += m.actor.hit.scale.y * r.scale.y + 0.02;
    return { word: m.word, ...this.toScreen(top) };
  }

  /* ---------------- picking ---------------- */

  pick(clientX: number, clientY: number): PickResult | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [...this.layers.map((l) => l.mesh), ...this.props.map((p) => p.object), ...this.models.map((m) => m.actor.hit)];
    const hits = this.raycaster.intersectObjects(targets, true);
    for (const hit of hits) {
      const mp = this.pickModel(hit);
      if (mp) return mp;
      const layer = this.layers.find((l) => l.mesh === hit.object);
      if (layer && hit.uv) {
        const b = layer.built;
        const u = hit.uv.x;
        const v = 1 - hit.uv.y;
        const ax = Math.min(b.aw - 1, Math.max(0, Math.floor(u * b.aw)));
        const ay = Math.min(b.ah - 1, Math.max(0, Math.floor(v * b.ah)));
        if (b.alpha[ay * b.aw + ax] < 100) continue;
        const spots = b.hotspots
          .filter((h) => u >= h.rect[0] && u <= h.rect[0] + h.rect[2] && v >= h.rect[1] && v <= h.rect[1] + h.rect[3])
          .sort((a, c) => a.rect[2] * a.rect[3] - c.rect[2] * c.rect[3]);
        if (spots.length) {
          this.hop(layer);
          const pt = this.hotspotPoint(layer, spots[0].rect);
          return { word: spots[0].word, ...pt };
        }
        this.hop(layer, 0.4);
        return null;
      }
      const prop = this.props.find((p) => {
        let o: THREE.Object3D | null = hit.object;
        while (o) {
          if (o === p.object) return true;
          o = o.parent;
        }
        return false;
      });
      if (prop) {
        this.hopProp(prop);
        return { word: prop.word, ...this.toScreen(prop.anchor) };
      }
    }
    return null;
  }

  isPickable(clientX: number, clientY: number): boolean {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects([...this.layers.map((l) => l.mesh), ...this.props.map((p) => p.object), ...this.models.map((m) => m.actor.hit)], true);
    for (const hit of hits) {
      if (this.models.some((m) => m.actor.hit === hit.object && m.word)) return true;
      const layer = this.layers.find((l) => l.mesh === hit.object);
      if (layer && hit.uv) {
        const b = layer.built;
        const u = hit.uv.x;
        const v = 1 - hit.uv.y;
        const ax = Math.min(b.aw - 1, Math.floor(u * b.aw));
        const ay = Math.min(b.ah - 1, Math.floor(v * b.ah));
        if (b.alpha[ay * b.aw + ax] < 100) continue;
        return b.hotspots.some((h) => u >= h.rect[0] && u <= h.rect[0] + h.rect[2] && v >= h.rect[1] && v <= h.rect[1] + h.rect[3]);
      }
      return true;
    }
    return false;
  }

  private hotspotPoint(layer: LayerObj, rect: [number, number, number, number]) {
    const cx = rect[0] + rect[2] / 2;
    const top = rect[1];
    const local = new THREE.Vector3((cx - 0.5) * layer.width, (1 - top) * layer.height, 0.01);
    layer.mesh.updateMatrixWorld();
    return this.toScreen(layer.mesh.localToWorld(local));
  }

  /** Find the object for a glossary word on the current page, make it hop and return where it is. */
  focusWord(lemma: string): { x: number; y: number } | null {
    const mm = this.models.find((m) => m.word === lemma);
    if (mm) return this.pickModel({ object: mm.actor.hit } as unknown as THREE.Intersection);
    for (const l of this.layers) {
      const spot = l.built.hotspots.find((h) => h.word === lemma);
      if (spot) {
        this.hop(l);
        return this.hotspotPoint(l, spot.rect);
      }
    }
    const prop = this.props.find((p) => p.word === lemma);
    if (prop) {
      this.hopProp(prop);
      return this.toScreen(prop.anchor);
    }
    return null;
  }

  hasWord(lemma: string): boolean {
    if (this.models.some((m) => m.word === lemma)) return true;
    return this.layers.some((l) => l.built.hotspots.some((h) => h.word === lemma)) || this.props.some((p) => p.word === lemma);
  }

  private hop(l: LayerObj, amount = 1) {
    if (this.reducedMotion) return;
    const base = l.upright;
    this.tweens.add(520, 0, 1, (k) => (l.pivot.rotation.x = base - ease.hop(k) * 0.16 * amount), ease.linear);
    this.invalidate();
  }

  private hopProp(p: PropObj) {
    if (this.reducedMotion) return;
    const y0 = 0;
    this.tweens.add(480, 0, 1, (k) => (p.object.position.y = y0 + ease.hop(k) * 0.08), ease.linear);
    this.invalidate();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.cinema.clearSteam();
    this.layers.forEach((l) => this.disposeLayer(l));
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
