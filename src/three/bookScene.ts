import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Tweens, ease } from './tween';
import { loadActor, loadGltf, play, type Actor } from '../home3d/actors';
import type { PageModel, TableModel } from '../types';
import { ReaderCinema, type Pose } from './readerCinema';
import { PROPS, HELD } from './props';
import { clockTower } from '../art/kit';
import { Performer, type State } from './performer';
import { POSES } from './acts';
import { Stage, type StageActor } from './stage';
import { PropActor } from './propActor';
import { ToyPerformer } from './toy';
import { Rain } from './rain';
import { Sparkles } from '../home3d/sparkles';
import type { PageData } from '../types';
import { CULTURE_BUILDERS } from '../home3d/culture';
import { mosaicLamp } from '../home3d/room';
import { fitToSlot } from '../home3d/kit3d';
import { WallCarpet, type CarpetDesign } from '../home3d/carpet';
import type { BuiltLayer } from '../art/scenes';
import { iznikTile, tulip } from '../art/kit';
import { Pen, rng } from '../art/pen';

const PAGE_W = 1;
const PAGE_D = 1.36;
const COVER_T = 0.022;
const PAGE_T = 0.045;
const PAGE_TOP = COVER_T + PAGE_T;

/** Camera shots: from high above, the closed book, the whole open book, and close on the pop-up. */
export type ShotKind = 'overhead' | 'cover' | 'wide' | 'close';

/** Things that always stand on the reading table, around the book (a little Turkish living room). */
const DESK_DECOR: TableModel[] = [
  { proc: 'lamba', word: 'lamba', x: -1.78, z: -0.95, h: 0.62 },
  { proc: 'nazar', word: 'nazar boncuğu', x: -1.22, z: 1.02, h: 0.2, rotY: 25 },
  { proc: 'lokum', word: 'lokum', x: -0.55, z: 1.16, h: 0.13, rotY: -10 },
  { proc: 'cini', word: 'çini', x: -0.9, z: -1.2, h: 0.24, rotY: 8 },
  { proc: 'lale', word: 'lale', x: 1.28, z: -1.12, h: 0.36 },
  { proc: 'mangala', word: 'mangala', x: 0.25, z: -1.25, h: 0.1, w: 0.42, rotY: -6 },
  { src: '/models/kenney/books.glb', word: 'kitap', x: 1.82, z: -0.75, h: 0.12, w: 0.3, rotY: 35 },
];

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
  born: number;
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

/** A set piece built in code, wrapped like a loaded model. */
function procActor(name: string): Actor {
  return procActorFrom((PROPS[name] ?? (() => new THREE.Group()))());
}

function procActorFrom(obj: THREE.Object3D): Actor {
  const root = new THREE.Group();
  root.add(obj);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false }));
  hit.scale.set(Math.max(0.02, size.x), Math.max(0.02, size.y), Math.max(0.02, size.z));
  hit.position.y = size.y / 2;
  root.add(hit);
  return { root, mixer: new THREE.AnimationMixer(root), actions: {}, current: null, hit, height: size.y };
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
  /** Magic things of the page that take part in the story (models with an `id`). */
  private things = new Map<string, PropActor>();
  private sparkles = new Sparkles(480);
  /** Rain from a magic cloud. */
  private rain = new Rain();
  /** Where the last thing left a character's hands (or a magic thing vanished), so the next one taken flies from there. */
  private lastRelease: { at: THREE.Vector3; time: number; word: string } | null = null;
  /** Something a character has just taken, waiting (hidden) for the other one to let go of it. */
  private pendingTake: { obj: THREE.Object3D; until: number; word: string } | null = null;
  /** True while the play is jumped to a moment (no flights then). */
  private seeking = false;
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
  private regions: { close: Region; wide: Region } = { close: { x: 0, y: 0, w: 1, h: 1 }, wide: { x: 0, y: 0, w: 1, h: 1 } };
  private shotKind: ShotKind = 'close';
  private performers = new Map<string, Performer | ToyPerformer>();
  /** The book's characters move as whole toys (hop, turn, lean) instead of bending (book.json → toyCast). */
  toyCast = false;
  private castBase = new Map<string, THREE.Vector3>();
  private castSession = 0;
  private spots: Record<string, [number, number, number]> = {};
  private focusWho: string | null = null;
  private frozen = false;
  /** A little scene shown on the tablet screen during a video call. */
  private screen: { scene: THREE.Scene; cam: THREE.PerspectiveCamera; rt: THREE.WebGLRenderTarget; used: boolean } | null = null;
  /** The page's play: characters acting in step with the narration. */
  stage: Stage | null = null;
  /** Loading progress of the page's characters (for a waiting message). */
  onCastProgress: ((loaded: number, total: number) => void) | null = null;
  private shotAz = 0;
  private shotCam = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
  private wall!: WallCarpet;
  private turnMesh!: THREE.Mesh;
  private turnBase!: Float32Array;
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
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.04;
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
    this.scene.fog = new THREE.Fog(bg, 6, 14);

    this.buildWorld();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
  }

  /* ---------------- world ---------------- */

  private buildWorld() {
    const r = this.renderer;
    const hemi = new THREE.HemisphereLight('#FFF7EC', '#9C7A5E', 2.1);
    this.scene.add(hemi, this.sparkles.points, this.rain.points);
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

    // a lacquered wooden table that catches the light
    const woodTex = canvasTexture(woodCanvas(), r);
    woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(4, 2.2);
    const desk = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 8),
      new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.22 }),
    );
    desk.rotation.x = -Math.PI / 2;
    desk.position.z = 1.4;
    desk.receiveShadow = true;
    this.scene.add(desk);
    // the table edge and the room's wall behind it, with a carpet like the one on the home page
    const edgeMat = new THREE.MeshStandardMaterial({ color: '#5C351C', roughness: 0.5 });
    const tableEdge = new THREE.Mesh(new THREE.BoxGeometry(16, 0.08, 0.06), edgeMat);
    tableEdge.position.set(0, -0.04, -2.6);
    this.scene.add(tableEdge);
    const plaster = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 12),
      new THREE.MeshStandardMaterial({ color: '#2F6E70', roughness: 0.95 }),
    );
    plaster.position.set(0, 5.5, -3.4);
    this.scene.add(plaster);
    this.wall = new WallCarpet(-3.36, this.tweens, () => this.invalidate());
    this.wall.resize(-3.6, 3.6, 0.2, 3.4);
    this.scene.add(this.wall.group);

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
    const turnGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_D, 28, 1);
    turnGeo.rotateX(-Math.PI / 2);
    turnGeo.translate(PAGE_W / 2, 0, 0);
    const turnMesh = new THREE.Mesh(turnGeo, new THREE.MeshLambertMaterial({ color: '#FFFBF2', side: THREE.DoubleSide }));
    turnMesh.castShadow = true;
    this.turnMesh = turnMesh;
    this.turnBase = Float32Array.from(turnGeo.attributes.position.array as Float32Array);
    this.turnGroup.add(turnMesh);
    this.turnGroup.position.set(0, PAGE_TOP + 0.003, 0);
    this.turnGroup.visible = false;
    this.scene.add(this.turnGroup);

    // warm light pool under the mosaic lamp on the table
    const spot = new THREE.SpotLight('#FFB872', 7, 5, 0.75, 0.85, 1.4);
    spot.position.set(-1.7, 1.2, -0.8);
    spot.target.position.set(-0.6, 0, 0.1);
    this.scene.add(spot, spot.target);

    this.cinema = new ReaderCinema(this.camera, light, hemi, this.scene);
    this.cinema.enabled = !this.reducedMotion;
    this.scene.add(this.cinema.group);
  }

  /** The carpet on the wall behind the table shows the book's design. */
  setWall(key: string, design: CarpetDesign) {
    this.wall.show(key, design, true);
  }

  private async loadDecor(spec: TableModel): Promise<THREE.Object3D | null> {
    if (spec.proc === 'lamba') {
      const lamp = mosaicLamp();
      return fitToSlot(lamp, spec.h, spec.h, spec.h);
    }
    if (spec.proc) {
      const b = CULTURE_BUILDERS[spec.proc];
      if (!b) return null;
      const o = b.build();
      o.traverse((n) => {
        const m = n as THREE.Mesh;
        if (m.isMesh) m.castShadow = m.receiveShadow = true;
      });
      const wrap = new THREE.Group();
      wrap.add(o);
      return fitToSlot(wrap, spec.h, spec.w ?? spec.h * 1.6, spec.w ?? spec.h * 1.6);
    }
    if (!spec.src) return null;
    return (await loadActor(spec.src, spec.h, spec.w)).root;
  }

  /** Objects on the table around the book: the room's own things plus the book's choice (`book.table`). */
  async setTable(list: TableModel[]) {
    const session = ++this.tableSession;
    for (const o of this.tableObjs) this.scene.remove(o);
    this.tableObjs = [];
    this.props = [];
    this.cinema.clearSteam();
    const r = this.renderer;
    const all = [...DESK_DECOR.filter((d) => !list.some((l) => l.word === d.word)), ...list];
    await Promise.all(
      all.map(async (spec) => {
        try {
          const obj = await this.loadDecor(spec);
          if (!obj || session !== this.tableSession || this.disposed) return;
          const g = new THREE.Group();
          g.position.set(spec.x, 0, spec.z);
          const inner = new THREE.Group();
          inner.add(obj);
          inner.rotation.y = THREE.MathUtils.degToRad(spec.rotY ?? 0);
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
          inner.position.y = lift;
          g.add(inner);
          this.scene.add(g);
          this.tableObjs.push(g);
          if (spec.word) this.props.push({ object: g, word: spec.word, anchor: new THREE.Vector3(spec.x, spec.h + lift + 0.04, spec.z) });
          this.invalidate();
        } catch (e) {
          console.warn('Masa nesnesi yüklenemedi', spec.src ?? spec.proc, e);
        }
      }),
    );
  }

  /** Calm mode: no camera drift or idle animation, shorter page animations. */
  setCalm(on: boolean) {
    this.reducedMotion = on || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.cinema.enabled = !this.reducedMotion;
    if (!this.cinema.enabled) this.cinema.reset();
    for (const p of this.performers.values()) p.calm = this.reducedMotion;
    for (const p of this.things.values()) p.calm = this.reducedMotion;
    this.invalidate();
  }

  /* ---------------- layout + camera shots ---------------- */

  /**
   * Screen areas for the shots (CSS pixels): `close` is where the pop-up should sit (beside the text card),
   * `wide` is the whole space between the top bar and the controls.
   */
  setLayout(close: Region, wide: Region) {
    this.regions = { close, wide };
    this.cinema.setView(this.size.w, this.size.h, this.renderer.getPixelRatio());
    this.cinema.setShot(this.computeShot(this.shotKind), 0);
    this.invalidate();
  }

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.cinema.setView(w, h, this.renderer.getPixelRatio());
    this.onResize?.();
    this.invalidate();
  }

  get size() {
    return { w: this.container.clientWidth, h: this.container.clientHeight };
  }

  /** Move the camera to a shot. `az` turns the camera around the book (degrees), so pages are seen from different sides. */
  shot(kind: ShotKind, ms = 1400, az?: number, arc = 0) {
    this.shotKind = kind;
    if (az !== undefined) this.shotAz = az;
    this.cinema.setShot(this.computeShot(kind), this.reducedMotion ? 0 : ms / 1000, arc);
    this.invalidate();
  }

  private computeShot(kind: ShotKind): Pose {
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const cfg = {
      overhead: { min: V(-2.1, 0, -1.4), max: V(2.2, 0.3, 1.5), cy: 0, el: 82, az: -28, reg: this.regions.wide, lim: 0.98 },
      cover: { min: V(-0.05, 0, -0.75), max: V(1.1, 0.12, 0.75), cy: 0.05, el: 50, az: 18, reg: this.regions.wide, lim: 0.5 },
      wide: { min: V(-1.12, 0, -0.8), max: V(1.12, 0.4, 0.8), cy: 0.12, el: 52, az: this.shotAz * 0.5, reg: this.regions.wide, lim: 0.9 },
      close: { min: V(0.02, 0, -0.66), max: V(1.0, 0.86, 0.46), cy: 0.34, el: 21, az: this.shotAz, reg: this.regions.close, lim: 1.02 },
    }[kind];
    const center = cfg.min.clone().add(cfg.max).multiplyScalar(0.5);
    center.y = cfg.cy;
    let tighten = 1;
    const hp = kind === 'close' ? this.focusPoint() : null;
    if (hp) {
      // lean towards the character who acts or speaks (or the magic thing), keeping the others in the picture
      center.x += (hp.x - center.x) * 0.45;
      center.z += (hp.z - center.z) * 0.35;
      center.y += (hp.y * 0.85 - center.y) * 0.4;
      tighten = 0.8;
    }
    const el = THREE.MathUtils.degToRad(cfg.el);
    const az = THREE.MathUtils.degToRad(cfg.az);
    const dir = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const corners: THREE.Vector3[] = [];
    for (const x of [cfg.min.x, cfg.max.x]) for (const y of [cfg.min.y, cfg.max.y]) for (const z of [cfg.min.z, cfg.max.z]) corners.push(V(x, y, z));
    const cam = this.shotCam;
    cam.fov = this.camera.fov;
    cam.aspect = Math.max(10, cfg.reg.w) / Math.max(10, cfg.reg.h);
    cam.updateProjectionMatrix();
    let lo = 0.3;
    let hi = 40;
    const v = V(0, 0, 0);
    for (let i = 0; i < 26; i++) {
      const d = (lo + hi) / 2;
      cam.position.copy(center).addScaledVector(dir, d);
      cam.lookAt(center);
      cam.updateMatrixWorld();
      let ok = true;
      for (const c of corners) {
        v.copy(c).project(cam);
        if (Math.abs(v.x) > cfg.lim || Math.abs(v.y) > cfg.lim * 0.97 || v.z > 1) {
          ok = false;
          break;
        }
      }
      if (ok) hi = d;
      else lo = d;
    }
    return { pos: center.clone().addScaledVector(dir, hi * tighten), target: center, region: { ...cfg.reg } };
  }

  /** Pixels per world unit at distance 1 (for particles sized in world units). */
  private pxScale() {
    const cam = this.camera as THREE.PerspectiveCamera;
    return this.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
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
    const raw = this.lastTick ? Math.min(0.25, (now - this.lastTick) / 1000) : 0.016;
    const dt = Math.min(0.05, raw);
    this.lastTick = now;
    this.clock += dt;
    let alive = false;
    // camera moves keep real time, so they end on time even when frames are slow
    if (!document.hidden && this.cinema.update(this.frozen ? 0 : raw)) alive = true;
    if (this.stage && this.stage.tick(this.frozen ? 0 : raw)) alive = true;
    if (!this.frozen && this.rain.update(dt)) {
      this.rain.setScale(this.pxScale());
      alive = true;
    }
    if (this.pendingTake && this.clock > this.pendingTake.until) {
      // nobody handed it over: it pops in by itself
      const o = this.pendingTake.obj;
      this.pendingTake = null;
      this.popIn(o);
    }
    if (this.sparkles.update(this.frozen ? 0 : raw * 1000)) {
      const cam = this.camera as THREE.PerspectiveCamera;
      this.sparkles.setScale(this.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))));
      alive = true;
    }
    if (!this.reducedMotion && this.models.length && !this.frozen) {
      this.updateModels(dt);
      alive = true;
    }
    if (this.screen?.used) {
      this.renderer.setRenderTarget(this.screen.rt);
      this.renderer.render(this.screen.scene, this.screen.cam);
      this.renderer.setRenderTarget(null);
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
        case 'grow': {
          // a plant grows up out of the soil, then sways a little
          const k = Math.min(1, Math.max(0, (t - m.born - 0.4) / 3.5));
          const e = 1 - Math.pow(1 - k, 3);
          g.scale.set(0.35 + 0.65 * e, 0.08 + 0.92 * e, 0.35 + 0.65 * e);
          g.rotation.z = Math.sin(t * 1.3 + ph) * 0.03 * e;
          break;
        }
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

  /** Close the book at once (before the opening shot). */
  closeNow() {
    this.leftGroup.rotation.z = -Math.PI;
    this.invalidate();
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
      this.tweens.add(this.dur(900), from, to, (v) => this.curl(v, direction), ease.inOut);
      this.invalidate();
      await this.wait(this.dur(900));
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

  /**
   * Bend the turning page: the spine side leads, the free edge lags behind and curls,
   * like a real paper page. `theta` goes 0 → π (forwards) or π → 0 (backwards).
   */
  private curl(theta: number, direction: 1 | -1) {
    const pos = this.turnMesh.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const base = this.turnBase;
    const lag = Math.sin(theta) * 1.1 * direction;
    for (let i = 0; i < arr.length; i += 3) {
      const u = base[i] / PAGE_W;
      // integrate the bent page from the spine: the angle grows less towards the free edge
      const n = 12;
      let x = 0;
      let y = 0;
      for (let k = 0; k < n; k++) {
        const uu = ((k + 0.5) / n) * u;
        const a = theta - lag * uu * uu;
        x += Math.cos(a) * (u / n) * PAGE_W;
        y += Math.sin(a) * (u / n) * PAGE_W;
      }
      arr[i] = x;
      arr[i + 1] = y;
    }
    pos.needsUpdate = true;
    this.turnMesh.geometry.computeVertexNormals();
    this.turnGroup.rotation.z = 0;
    this.turnGroup.position.y = PAGE_TOP + 0.004;
  }

  /** Freeze the scene (narration paused): characters, animals and the camera stop where they are. */
  freeze(on: boolean) {
    this.frozen = on;
    if (on) this.stage?.pause();
    this.invalidate();
  }

  /** The camera leans towards a character (or back to the whole pop-up). */
  focus(who: string | null) {
    if (who === this.focusWho) return;
    this.focusWho = who;
    if (this.shotKind === 'close') this.shot('close', 1600);
  }

  /** Where the camera leans in the close shot: the head of the character in focus, or the magic thing. */
  private focusPoint(): THREE.Vector3 | null {
    if (!this.focusWho) return null;
    const who = this.performers.get(this.focusWho);
    if (who) return who.headPosition();
    const thing = this.things.get(this.focusWho);
    if (!thing) return null;
    const at = thing.group.getWorldPosition(new THREE.Vector3());
    at.y += thing.height * 0.6;
    return at;
  }

  /**
   * Something (`word`) left a character's hands, or a magic thing vanished: a character who takes the same
   * thing gets it from there.
   */
  private released(at: THREE.Vector3, word: string, obj?: THREE.Object3D) {
    const wait = this.pendingTake;
    if (wait && wait.word === word && wait.obj !== obj && !this.seeking) {
      this.pendingTake = null;
      this.fly(wait.obj, at);
      return;
    }
    this.lastRelease = { at, time: this.clock, word };
  }

  /** Someone other than `taker` still has this thing in hand, or it is still on the page as a magic thing. */
  private stillElsewhere(word: string, taker: Performer | ToyPerformer) {
    for (const p of this.performers.values()) if (p !== taker && p.heldWord === word) return true;
    return this.models.some((m) => m.word === word && m.spec.id && this.things.get(m.spec.id)?.group.visible);
  }

  /**
   * Something has just come into a toy character's hands. Handed over by another (or a magic thing that just
   * vanished), it flies from there in a little arc with a trail of sparkles; when the other one has not let go
   * yet, it waits hidden until they do. Taken out of nowhere, it pops in with a burst.
   */
  private arrive(obj: THREE.Object3D, taker: Performer | ToyPerformer) {
    if (this.seeking || this.reducedMotion || !obj.parent) return;
    const word = (obj.userData.word as string | undefined) ?? '';
    const r = this.lastRelease;
    if (r && r.word === word && this.clock - r.time < 1.2) {
      this.lastRelease = null;
      this.fly(obj, r.at);
    } else if (word && this.stillElsewhere(word, taker)) {
      obj.visible = false;
      this.pendingTake = { obj, until: this.clock + 2.5, word };
      this.invalidate();
    } else this.popIn(obj);
  }

  private sizeOf(obj: THREE.Object3D) {
    return new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3()).length() * 0.5 || 0.04;
  }

  private fly(obj: THREE.Object3D, at: THREE.Vector3) {
    const host = obj.parent;
    if (!host) return;
    obj.visible = true;
    const home = obj.position.clone();
    const spin = obj.rotation.y;
    const v = new THREE.Vector3();
    const size = this.sizeOf(obj);
    host.updateMatrixWorld(true);
    const from = host.worldToLocal(at.clone());
    const lift = 0.1 + from.distanceTo(home) * 0.35;
    let last = 0;
    obj.position.copy(from);
    void this.tweens
      .add(this.dur(760), 0, 1, (k) => {
        obj.position.lerpVectors(from, home, k);
        obj.position.y += Math.sin(Math.PI * k) * lift;
        obj.rotation.y = spin + k * Math.PI * 2;
        if (k - last > 0.05) {
          last = k;
          this.sparkles.burst(obj.getWorldPosition(v), new THREE.Vector3(size * 0.5, size * 0.5, 0.02), 5, 0.45);
        }
      })
      .then(() => {
        obj.position.copy(home);
        obj.rotation.y = spin;
        this.sparkles.burst(obj.getWorldPosition(v), new THREE.Vector3(size, size, 0.04), 18, 0.9);
      });
    this.invalidate();
  }

  private popIn(obj: THREE.Object3D) {
    if (!obj.parent) return;
    obj.visible = true;
    const size = this.sizeOf(obj);
    const s0 = obj.scale.clone();
    obj.scale.setScalar(0.001);
    void this.tweens.add(this.dur(520), 0.001, 1, (k) => obj.scale.copy(s0).multiplyScalar(Math.max(0.001, k)), ease.back);
    this.sparkles.burst(obj.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(size, size, 0.04), 22, 1);
    this.invalidate();
  }

  private target(self: Performer | ToyPerformer, name: string): THREE.Vector3 | null {
    const head = self.headPosition();
    const side = (s: number) => head.clone().add(new THREE.Vector3(s * 0.45, 0.02, 0.15).applyQuaternion(self.root.quaternion));
    switch (name) {
      case 'reader':
        return this.camera.position.clone();
      case 'up':
        return head.clone().add(new THREE.Vector3(0, 0.6, 0.12));
      case 'left':
        return side(1);
      case 'right':
        return side(-1);
      case 'down':
        return head.clone().add(new THREE.Vector3(0, -0.4, 0.2).applyQuaternion(self.root.quaternion));
    }
    const other = this.performers.get(name);
    if (other) return other.headPosition();
    const spot = this.spots[name];
    if (spot) return this.pagePoint(spot[0], spot[2]).setY(PAGE_TOP + spot[1]);
    const m = this.models.find((x) => x.spec.id === name) ?? this.models.find((x) => x.word === name);
    if (m) return m.actor.root.position.clone().add(new THREE.Vector3(0, m.actor.height * 0.6, 0));
    return null;
  }

  /** The video-call screen: İzmir behind the grandparents, filmed by its own little camera. */
  private ensureScreen() {
    if (this.screen) return this.screen;
    const scene = new THREE.Scene();
    const pen = new Pen(1024, 0.75);
    const g = pen.c.createLinearGradient(0, 0, 0, pen.H);
    g.addColorStop(0, '#7EC4EE');
    g.addColorStop(1, '#D6EEF9');
    pen.rect(0, 0, 1000, pen.H, g as unknown as string);
    pen.rect(0, pen.H * 0.62, 1000, pen.H * 0.38, '#3D7FC1');
    for (let i = 0; i < 6; i++) pen.line([80 + i * 160, pen.H * 0.7 + (i % 2) * 30, 150 + i * 160, pen.H * 0.7 + (i % 2) * 30], 'rgba(255,255,255,0.6)', 6);
    clockTower(pen, 820, pen.H * 0.66, 420);
    const tex = new THREE.CanvasTexture(pen.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.05), new THREE.MeshBasicMaterial({ map: tex }));
    back.position.set(0, 0.4, -0.5);
    scene.add(back);
    scene.add(new THREE.HemisphereLight('#FFF7EC', '#9C7A5E', 2.4));
    const sun = new THREE.DirectionalLight('#FFF1DC', 1.6);
    sun.position.set(1, 2, 2);
    scene.add(sun);
    const cam = new THREE.PerspectiveCamera(30, 4 / 3, 0.05, 10);
    cam.position.set(0, 0.36, 1.45);
    cam.lookAt(0, 0.3, 0);
    const rt = new THREE.WebGLRenderTarget(640, 480);
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    this.screen = { scene, cam, rt, used: false };
    return this.screen;
  }

  /** A tablet on a stand whose screen shows the video call. */
  private tablet() {
    const s = this.ensureScreen();
    const g = new THREE.Group();
    const w = 0.42;
    const h = 0.315;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, h + 0.03, 0.014), new THREE.MeshStandardMaterial({ color: '#2B2F3A', roughness: 0.4 }));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: s.rt.texture, toneMapped: false }));
    glass.position.z = 0.0075;
    const panel = new THREE.Group();
    panel.add(body, glass);
    panel.position.y = 0.2 + h / 2;
    panel.rotation.x = -0.12;
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.05, 0.2, 16), new THREE.MeshStandardMaterial({ color: '#5A6070', roughness: 0.5 }));
    stand.position.y = 0.1;
    g.add(panel, stand);
    g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
    s.used = true;
    return g;
  }

  /** Load the page's characters, put them in their start places and prepare the page's play. */
  async setCast(page: PageData) {
    const session = ++this.castSession;
    this.stage = null;
    this.focusWho = null;
    for (const p of this.performers.values()) {
      p.leave();
      p.root.parent?.remove(p.root);
    }
    this.performers.clear();
    if (this.screen) this.screen.used = (page.models ?? []).some((m) => m.proc === 'tablet');
    this.castBase.clear();
    this.spots = page.spots ?? {};
    const cast = page.cast ?? [];
    if (!cast.length && !this.things.size) {
      this.onCastProgress?.(0, 0);
      return;
    }
    let loaded = 0;
    if (cast.length) this.onCastProgress?.(0, cast.length);
    else this.onCastProgress?.(0, 0);
    const list = await Promise.all(
      cast.map((c) =>
        (this.toyCast ? ToyPerformer.load(c.id) : Performer.load(c.id)).then(
          (p) => {
            this.onCastProgress?.(++loaded, cast.length);
            return p;
          },
          (e) => {
            console.warn('Karakter yüklenemedi', c.id, e);
            this.onCastProgress?.(++loaded, cast.length);
            return null;
          },
        ),
      ),
    );
    if (session !== this.castSession || this.disposed) return;
    const starts = new Map<string, State>();
    cast.forEach((c, i) => {
      const p = list[i];
      if (!p) return;
      const base = c.screen ? new THREE.Vector3(c.x, c.y ?? 0, c.z) : this.pagePoint(c.x, c.z);
      if (!c.screen) base.y += c.y ?? 0;
      this.castBase.set(c.id, base);
      starts.set(c.id, {
        pose: { ...(POSES[c.pose ?? 'stand'] ?? POSES.stand) },
        root: { x: 0, y: 0, z: 0, rotY: c.rotY ?? 0, lie: c.lie ?? 0 },
        eyes: c.eyes ?? 1,
        look: c.look ?? null,
        hold: c.hold ?? null,
      });
      p.targets = (name) => (c.screen && name === 'reader' ? this.ensureScreen().cam.position.clone() : this.target(p, name));
      p.makeProp = (name) => (HELD[name] ? HELD[name]() : null);
      p.surfaceAt = (pt) => this.surfaceAt(pt);
      p.calm = this.reducedMotion;
      if (p instanceof ToyPerformer) {
        p.onRelease = (at, obj) => this.released(at, (obj.userData.word as string | undefined) ?? '', obj);
        p.onTake = (obj) => this.arrive(obj, p);
      }
      this.performers.set(c.id, p);
      (c.screen ? this.ensureScreen().scene : this.scene).add(p.root);
    });
    const actors = new Map<string, StageActor>(this.performers);
    for (const spec of page.models ?? []) {
      const prop = spec.id ? this.things.get(spec.id) : undefined;
      if (!prop || !spec.id) continue;
      const f = spec.from ?? [0, 0, 0];
      starts.set(spec.id, { pose: {}, root: { x: f[0], y: f[1], z: f[2], rotY: 0, lie: 0, show: spec.hidden ? 0 : 1, tilt: 0, glow: 0.45 }, eyes: 1, look: null });
      prop.calm = this.reducedMotion;
      prop.onBurst = (at, half, k) => this.sparkles.burst(at, half, Math.max(3, Math.round(30 * k)), 1.1 * Math.max(0.4, k));
      prop.onRain = (at, width, seconds) => this.rain.start(at, Math.max(0.22, width), seconds, PAGE_TOP + 0.005);
      prop.onGone = (at) => this.released(at, spec.word ?? '');
      actors.set(spec.id, prop);
    }
    this.rain.stop();
    this.lastRelease = null;
    this.pendingTake = null;
    this.stage = new Stage(actors, starts, page.beats ?? []);
    this.stage.onFocus = (who) => this.focus(who);
    this.seeking = true;
    this.stage.reset(this.castBase);
    this.seeking = false;
    // appear with a soft pop, like the paper layers
    for (const p of this.performers.values()) {
      p.root.scale.setScalar(0.001);
      this.tweens.add(this.dur(500), 0.001, 1, (v) => p.root.scale.setScalar(v), ease.back);
    }
    this.invalidate();
  }

  /**
   * Where something put down near a table (a page model with `top`) lands: the nearest spot on the table top,
   * a little in from its edges. Null when no table is within reach.
   */
  private surfaceAt(p: THREE.Vector3): THREE.Vector3 | null {
    let best: THREE.Vector3 | null = null;
    let bestD = 0.28;
    for (const m of this.models) {
      if (!m.spec.top) continue;
      const box = new THREE.Box3();
      m.actor.root.traverse((n) => {
        const mesh = n as THREE.Mesh;
        if (mesh.isMesh && mesh !== m.actor.hit) box.expandByObject(mesh);
      });
      if (box.isEmpty()) continue;
      const mx = (box.max.x - box.min.x) * 0.22;
      const mz = (box.max.z - box.min.z) * 0.25;
      const x = THREE.MathUtils.clamp(p.x, box.min.x + mx, box.max.x - mx);
      const z = THREE.MathUtils.clamp(p.z, box.min.z + mz, box.max.z - mz);
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < bestD) {
        bestD = d;
        best = new THREE.Vector3(x, box.min.y + (box.max.y - box.min.y) * m.spec.top, z);
      }
    }
    return best;
  }

  /** Show the page's play frozen at `t` seconds (testing aid). */
  seekStage(t: number) {
    this.seeking = true;
    this.rain.stop();
    this.stage?.seek(t, this.castBase);
    this.seeking = false;
    this.rain.update(0.5);
    this.rain.setScale(this.pxScale());
    // a still frame is shown in the close shot, already leaning towards what is in focus
    this.shot('close', 0);
    this.frozen = true;
    this.invalidate();
  }

  /** Back to the page's first moment (when the page is shown again or "play again" is pressed). */
  resetStage() {
    if (!this.stage) return;
    this.rain.stop();
    this.seeking = true;
    this.stage.reset(this.castBase);
    this.seeking = false;
    this.focusWho = null;
    if (this.shotKind === 'close') this.shot('close', 900);
    this.invalidate();
  }

  /** Names of the page's characters, for tapping them. */
  private pickPerformer(obj: THREE.Object3D) {
    for (const p of this.performers.values()) if (p.hit === obj) return p;
    return null;
  }

  /** 3D models (GLB) standing on the right page: characters, animals, trees, pots… */
  async setModels(list: PageModel[]) {
    const session = ++this.modelSession;
    this.things.clear();
    for (const spec of list) {
      if (!spec.id) continue;
      const prop = new PropActor(!!spec.magic);
      // a hidden thing stays out of sight until the page's play starts and a beat brings it in
      prop.group.visible = !spec.hidden;
      this.things.set(spec.id, prop);
    }
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
          actor = spec.proc === 'tablet' ? procActorFrom(this.tablet()) : spec.proc ? procActor(spec.proc) : await loadActor(spec.src!, spec.h, spec.w);
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
    for (const spec of list) if (spec.src) void loadGltf(spec.src).catch(() => undefined);
  }

  private placeModel(actor: Actor, spec: PageModel, delay: number) {
    {
      // put the model inside an extra group so idle effects pivot around its feet
      const fx = new THREE.Group();
      const wrap = actor.root.children.filter((c) => c !== actor.hit);
      wrap.forEach((c) => fx.add(c));
      // a magic thing in the story moves inside its own group (see PropActor), around its place on the page
      const prop = spec.id ? this.things.get(spec.id) : undefined;
      if (prop) {
        prop.group.clear();
        prop.group.add(fx);
        prop.fit(actor.height, fx);
        actor.root.add(prop.group);
      } else actor.root.add(fx);
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
            // a texture atlas times the tint turns muddy: a tinted model is one flat colour
            (c as THREE.MeshStandardMaterial).map = null;
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
        play(actor, spec.walkAnim ?? 'walk', 0);
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
      const obj: ModelObj = { actor, fx, spec, word: spec.word, animated: hasClips && spec.anim !== 'none', phase: Math.random() * 10, born: this.clock + delay / 1000, walk, visible: false };
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
    const targets: THREE.Object3D[] = [
      ...this.layers.map((l) => l.mesh),
      ...this.props.map((p) => p.object),
      ...this.models.map((m) => m.actor.hit),
      ...[...this.performers.values()].flatMap((p) => (p.heldObject ? [p.hit, p.heldObject] : [p.hit])),
    ];
    const hits = this.raycaster.intersectObjects(targets, true);
    for (const hit of hits) {
      const holder = [...this.performers.values()].find((p) => {
        let o: THREE.Object3D | null = hit.object;
        while (o) {
          if (o === p.heldObject) return true;
          o = o.parent;
        }
        return false;
      });
      if (holder?.heldWord) return { word: holder.heldWord, ...this.toScreen(hit.point) };
      const who = this.pickPerformer(hit.object);
      if (who) return { word: who.def.name, ...this.toScreen(who.headPosition().add(new THREE.Vector3(0, 0.05, 0))) };
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
    const hits = this.raycaster.intersectObjects([...this.layers.map((l) => l.mesh), ...this.props.map((p) => p.object), ...this.models.map((m) => m.actor.hit), ...[...this.performers.values()].map((p) => p.hit)], true);
    for (const hit of hits) {
      if (this.pickPerformer(hit.object)) return true;
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
    this.screen?.rt.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
