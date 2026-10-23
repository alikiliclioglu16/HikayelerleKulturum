import * as THREE from 'three';
import { Tweens, ease } from './tween';
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

    this.buildProps();
  }

  private buildProps() {
    const r = this.renderer;
    // Turkish tea glass on a saucer, standing on an İznik tile coaster
    const tea = new THREE.Group();
    const coaster = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.02, 0.36),
      [null, null, new THREE.MeshLambertMaterial({ map: canvasTexture(tileCanvas(), r) }), null, null, null].map(
        (m) => m ?? new THREE.MeshLambertMaterial({ color: '#E8EEF4' }),
      ),
    );
    coaster.position.y = 0.01;
    coaster.receiveShadow = true;
    coaster.castShadow = true;
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.018, 32), new THREE.MeshLambertMaterial({ color: '#D2372C' }));
    saucer.position.y = 0.03;
    saucer.castShadow = true;
    const profile: THREE.Vector2[] = [];
    const pts = [
      [0.0, 0],
      [0.042, 0],
      [0.05, 0.02],
      [0.04, 0.07],
      [0.034, 0.1],
      [0.04, 0.13],
      [0.055, 0.17],
      [0.06, 0.185],
    ];
    pts.forEach(([x, y]) => profile.push(new THREE.Vector2(x, y)));
    const glass = new THREE.Mesh(
      new THREE.LatheGeometry(profile, 32),
      new THREE.MeshLambertMaterial({ color: '#E8F4FA', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
    );
    glass.position.y = 0.04;
    const teaProfile = pts.slice(0, 7).map(([x, y]) => new THREE.Vector2(Math.max(0, x - 0.006), y * 0.82 + 0.004));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.004, 8, 40), new THREE.MeshLambertMaterial({ color: '#F2B33D' }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.04 + 0.185;
    const teaBody = new THREE.Mesh(new THREE.LatheGeometry(teaProfile, 32), new THREE.MeshLambertMaterial({ color: '#8E2A10' }));
    teaBody.position.y = 0.04;
    teaBody.castShadow = true;
    tea.add(coaster, saucer, teaBody, glass, rim);
    tea.position.set(-1.38, 0, 0.55);
    this.scene.add(tea);
    this.props.push({ object: tea, word: 'çay', anchor: new THREE.Vector3(-1.38, 0.22, 0.55) });

    // a tulip in a slim vase
    const tulipG = new THREE.Group();
    const vase = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          [0, 0],
          [0.07, 0],
          [0.09, 0.06],
          [0.06, 0.16],
          [0.035, 0.24],
          [0.045, 0.27],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        24,
      ),
      new THREE.MeshLambertMaterial({ color: '#1FA4A0' }),
    );
    vase.castShadow = true;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 8), new THREE.MeshLambertMaterial({ color: '#3E8E4E' }));
    stem.position.y = 0.38;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshLambertMaterial({ color: '#3E8E4E' }));
    leaf.scale.set(0.35, 1.7, 0.6);
    leaf.position.set(0.025, 0.34, 0);
    leaf.rotation.z = -0.4;
    const head = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          [0, 0],
          [0.035, 0.01],
          [0.05, 0.05],
          [0.045, 0.1],
          [0.03, 0.125],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        16,
      ),
      new THREE.MeshLambertMaterial({ color: '#D2372C', side: THREE.DoubleSide }),
    );
    head.position.y = 0.51;
    head.castShadow = true;
    tulipG.add(vase, stem, leaf, head);
    tulipG.position.set(1.42, 0, -0.45);
    this.scene.add(tulipG);
    this.props.push({ object: tulipG, word: 'lale', anchor: new THREE.Vector3(1.42, 0.62, -0.45) });
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
    this.renderer.render(this.scene, this.camera);
    if (this.tweens.active) {
      if (this.lastFrame) this.trackPerf(now - this.lastFrame);
      this.lastFrame = now;
      this.invalidate();
    } else {
      this.lastFrame = 0;
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

  /* ---------------- picking ---------------- */

  pick(clientX: number, clientY: number): PickResult | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [...this.layers.map((l) => l.mesh), ...this.props.map((p) => p.object)];
    const hits = this.raycaster.intersectObjects(targets, true);
    for (const hit of hits) {
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
    const hits = this.raycaster.intersectObjects([...this.layers.map((l) => l.mesh), ...this.props.map((p) => p.object)], true);
    for (const hit of hits) {
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
    this.layers.forEach((l) => this.disposeLayer(l));
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
