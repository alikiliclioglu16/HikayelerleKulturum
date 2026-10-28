import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Tweens, ease } from '../three/tween';
import { CULTURE_BUILDERS, placeholder } from './culture';
import { woodTexture, tileBandTexture, mosaicLamp } from './room';
import { motifIndex } from './kilim';
import { WallCarpet, type CarpetDesign } from './carpet';
import { fitToSlot, disposeObject, std, mesh, tex, canvas, V3 } from './kit3d';
import { Sparkles } from './sparkles';
import { Cinema } from './cinema';
import { loadActor, play, type Actor } from './actors';
import { LivingCover, type LiveCover } from './livingCover';

export interface CultureDef {
  id: string;
  name: string;
  en: string;
  icon?: string;
  fact: { tr: string; en: string };
  /** Optional GLB model, e.g. "/models/culture/cay.glb". Replaces the placeholder. */
  model?: string;
  /** Extra rotation for a GLB model, in degrees. */
  rotY?: number;
  /** Height on the shelf for a GLB model, in shelf units (default per item, about 0.3–0.56). */
  height?: number;
  /** Slot width on the shelf (default 0.46). Wide objects can take more room. */
  width?: number;
}

export interface ShelfBook {
  id: string;
  cover: HTMLCanvasElement;
  spine: string;
  /** A 3D character that stands next to this book (see HEROES). */
  hero?: string;
  /** The carpet design shown on the wall while this book is chosen. */
  carpet?: CarpetDesign;
  /** A sculpted 3D book (GLB) used instead of the flat cover on the shelf, and how its cover comes alive. */
  model?: string;
  live?: LiveCover;
}

/**
 * Animated characters that can stand beside their books (a book's `hero` in books/index.json), e.g.
 * `hoca: { url: '/models/characters/nasreddin-hoca.glb', height: 0.66, name: 'Nasreddin Hoca' }`.
 * Empty until the new character models arrive; the covers themselves come alive meanwhile (livingCover.ts).
 */
export const HEROES: Record<string, { url: string; height: number; name: string }> = {};

const SHELF_Y = 1.84;
const SHELF_DEPTH = 0.46;
const ITEM_Z = 0.22;
export const ITEM_GAP = 0.53;
const ITEM_SCALE = 1.22;
const SLOT_W = 0.46;
const SLOT_D = 0.4;
const MODEL_D = 0.56;
const BOOK_W = 0.95;
const BOOK_H = 1.29;
const BOOK_D = 0.13;
const BOOK_Z = 0.48;
export const BOOK_SP = 1.45;
const SIDE_DEPTH = 0.95;
// İznik tile backsplash just above the sideboard, peeking out between the books
const BAND_Y0 = 0.02;
const BAND_H = 0.26;
// the carpet covering the wall stops just above the tile band
const CARPET_BOTTOM = 0.34;

interface ItemObj {
  def: CultureDef;
  pivot: THREE.Group;
  inner: THREE.Object3D;
  hit: THREE.Mesh;
  x: number;
  w: number;
  lift: number;
  hopK: number;
  glow: GlowMat[];
}

interface GlowMat {
  mat: THREE.MeshStandardMaterial;
  color: THREE.Color;
  intensity: number;
}

const GLOW = new THREE.Color('#FFC46B');

/** Remember each material's own emissive so a hover glow can be blended in and out. */
function glowMats(o: THREE.Object3D): GlowMat[] {
  const out: GlowMat[] = [];
  const seen = new Set<THREE.Material>();
  o.traverse((n) => {
    const m = (n as THREE.Mesh).material;
    if (!m) return;
    for (const mat of Array.isArray(m) ? m : [m]) {
      const sm = mat as THREE.MeshStandardMaterial;
      if (seen.has(mat) || !sm.isMeshStandardMaterial) continue;
      seen.add(mat);
      out.push({ mat: sm, color: sm.emissive.clone(), intensity: sm.emissiveIntensity });
    }
  });
  return out;
}

function applyGlow(list: GlowMat[], k: number) {
  for (const g of list) {
    if (k <= 0.001) {
      g.mat.emissive.copy(g.color);
      g.mat.emissiveIntensity = g.intensity;
      continue;
    }
    // keep a material's own glow (like the shadow-play screen) and add a warm light on top
    g.mat.emissive.copy(g.color).multiplyScalar(g.intensity).lerp(GLOW, k * 0.42);
    g.mat.emissiveIntensity = 1;
  }
}

interface BookObj {
  id: string;
  group: THREE.Group;
  mesh: THREE.Mesh;
  baseRotY: number;
  lift: number;
  pulled: boolean;
  glow: GlowMat[];
  carpet?: CarpetDesign;
  /** The living 3D cover once it has loaded. */
  cover?: LivingCover;
  /** Seconds until the next little twinkle on the cover. */
  twinkle: number;
}

export type Hit = { kind: 'item'; index: number } | { kind: 'book'; index: number } | { kind: 'hero'; index: number } | { kind: 'cat' };

const invisible = new THREE.MeshBasicMaterial({ visible: false });

export class HomeScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  private tweens = new Tweens();
  private raf = 0;
  private last = 0;
  private disposed = false;
  private shelf = new THREE.Group();
  private board: THREE.Mesh | null = null;
  private brackets: THREE.Group = new THREE.Group();
  readonly items: ItemObj[] = [];
  readonly books: BookObj[] = [];
  private booksGroup = new THREE.Group();
  private lamp: THREE.Group;
  private raycaster = new THREE.Raycaster();
  private key!: THREE.DirectionalLight;
  private frameTimes: number[] = [];
  private quality = 2;
  offset = 0;
  maxOff = 0;
  vel = 0;
  page = 0;
  perPage = 1;
  ppu = 100;
  ppuShelf = 100;
  reducedMotion: boolean;
  onFrame: (() => void) | null = null;
  private size = { W: 1, H: 1 };
  private sparkles = new Sparkles(220);
  private laidOut = false;
  private shelfLen = 0;
  private carpet: WallCarpet;
  private carpetBook = -1;
  /** Called when the carpet changes to another book's design (with the kilim motif index). */
  onCarpet: ((motif: number) => void) | null = null;
  motif = 0;
  private hemi!: THREE.HemisphereLight;
  private cinema!: Cinema;
  private heroes: { actor: Actor; book: number }[] = [];
  private cat: { actor: Actor; x: number; dir: 1 | -1; wait: number } | null = null;
  private clock = 0;

  constructor(readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.className = 'scene-canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(this.renderer.domElement);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.scene.background = new THREE.Color('#2B676B');
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.42;
    pmrem.dispose();

    this.carpet = new WallCarpet(0.03, this.tweens, () => this.invalidate());
    this.scene.add(this.carpet.group);
    this.buildRoom();
    this.scene.add(this.shelf, this.booksGroup, this.sparkles.points);
    this.lamp = mosaicLamp();
    this.lamp.position.set(-4, 0, 0.74);
    this.scene.add(this.lamp);
    let lampLight: THREE.PointLight | null = null;
    this.lamp.traverse((o) => {
      if ((o as THREE.PointLight).isPointLight) lampLight = o as THREE.PointLight;
    });
    this.cinema = new Cinema(
      { camera: this.camera, key: this.key, hemi: this.hemi, lampLight, focus: () => this.focusPoints() },
      1.4,
    );
    this.cinema.enabled = !this.reducedMotion;
    this.scene.add(this.cinema.group);
  }

  /** Points the camera may softly push towards: visible shelf items and the books on this page. */
  private focusPoints() {
    const pts: THREE.Vector3[] = [];
    this.items.forEach((it, i) => {
      if (this.itemVisible(i)) pts.push(V3(it.x + this.offset, SHELF_Y + 0.25, ITEM_Z));
    });
    const first = this.page * this.perPage;
    for (let i = first; i < Math.min(this.books.length, first + this.perPage); i++) {
      pts.push(V3(this.booksGroup.position.x + this.books[i].group.position.x, BOOK_H * 0.55, BOOK_Z));
    }
    return pts;
  }

  /** Turn the slow camera and light movement on or off. */
  setCinematic(on: boolean) {
    this.cinema.enabled = on && !this.reducedMotion;
    if (!this.cinema.enabled) this.cinema.reset();
    this.invalidate();
  }

  /* ---------------- room ---------------- */

  private buildRoom() {
    const hemi = new THREE.HemisphereLight('#FFF4E2', '#4A3020', 0.85);
    this.hemi = hemi;
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight('#FFE6C2', 2.5);
    key.position.set(-2.6, 5.6, 6.2);
    key.target.position.set(0.4, 1.1, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -7.5;
    sc.right = 7.5;
    sc.top = 4.2;
    sc.bottom = -1.8;
    sc.near = 1;
    sc.far = 22;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 3;
    this.key = key;
    this.scene.add(key, key.target);
    const fill = new THREE.DirectionalLight('#CFE6FF', 0.35);
    fill.position.set(5, 2.5, 5);
    this.scene.add(fill);

    // a lime-washed turquoise wall
    const plaster = tex(
      canvas(512, 512, (g, w, h) => {
        g.fillStyle = '#2F6E70';
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const r = 6 + Math.random() * 40;
          const grd = g.createRadialGradient(x, y, 0, x, y, r);
          const light = Math.random() > 0.5;
          grd.addColorStop(0, light ? 'rgba(255,255,255,0.035)' : 'rgba(0,30,30,0.05)');
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = grd;
          // draw wrapped so the texture tiles
          for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
        }
      }),
      [44 / 2.2, 18 / 2.2],
    );
    const wall = mesh(new THREE.PlaneGeometry(44, 18), std('#ffffff', { roughness: 0.95, map: plaster }), [0, 5, 0]);
    wall.castShadow = false;
    this.scene.add(wall);

    const band = mesh(new THREE.PlaneGeometry(44, BAND_H), std('#ffffff', { roughness: 0.3, map: tileBandTexture(44 / (BAND_H * 4)) }), [0, BAND_Y0 + BAND_H / 2, 0.003]);
    band.castShadow = false;
    this.scene.add(band);
    const moulding = std('#6E4024', { roughness: 0.5 });
    for (const y of [BAND_Y0 - 0.017, BAND_Y0 + BAND_H + 0.017]) this.scene.add(mesh(new THREE.BoxGeometry(44, 0.034, 0.03), moulding, [0, y, 0.015]));

    // sideboard the books stand on
    const top = std('#ffffff', { roughness: 0.55, map: woodTexture('#8A5530', [8, 1.2], 4) });
    const front = std('#ffffff', { roughness: 0.6, map: woodTexture('#6A3D20', [10, 1.4], 8) });
    const plain = std('#5C351C', { roughness: 0.6 });
    this.scene.add(mesh(new THREE.BoxGeometry(44, 0.05, SIDE_DEPTH + 0.05), [plain, plain, top, plain, std('#7A4728', { roughness: 0.5 }), plain], [0, -0.025, (SIDE_DEPTH + 0.05) / 2]));
    this.scene.add(mesh(new THREE.BoxGeometry(44, 2.4, SIDE_DEPTH), [plain, plain, plain, plain, front, plain], [0, -1.25, SIDE_DEPTH / 2]));
    this.scene.add(mesh(new THREE.BoxGeometry(44, 0.012, 0.006), std('#C99A42', { metalness: 0.8, roughness: 0.35 }), [0, -0.13, SIDE_DEPTH + 0.003]));
  }

  private buildShelf(L: number) {
    if (this.board) {
      this.shelf.remove(this.board);
      this.board.geometry.dispose();
    }
    this.shelf.remove(this.brackets);
    disposeObject(this.brackets);
    const shelfWood = std('#ffffff', { roughness: 0.55, map: woodTexture('#8A5530', [L / 3, 1], 11) });
    const edge = std('#7A4728', { roughness: 0.5 });
    this.board = mesh(new RoundedBoxGeometry(L, 0.06, SHELF_DEPTH, 2, 0.012), [edge, edge, shelfWood, edge, edge, edge], [0, SHELF_Y - 0.03, SHELF_DEPTH / 2]);
    this.shelf.add(this.board);
    this.brackets = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.3, 0);
    s.lineTo(0.3, -0.035);
    s.bezierCurveTo(0.17, -0.045, 0.05, -0.13, 0.045, -0.32);
    s.lineTo(0, -0.32);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
    geo.rotateY(-Math.PI / 2);
    geo.translate(0.02, 0, 0);
    const count = Math.max(2, Math.round(L / 2.4) + 1);
    for (let i = 0; i < count; i++) {
      const x = -L / 2 + 0.35 + (i * (L - 0.7)) / (count - 1);
      this.brackets.add(mesh(geo, edge, [x, SHELF_Y - 0.06, 0]));
    }
    this.shelf.add(this.brackets);
  }

  /* ---------------- items ---------------- */

  setItems(defs: CultureDef[]) {
    // each item gets its own slot width (wide objects like the coffee set get more room)
    const widths = defs.map((d) => d.width ?? SLOT_W);
    const pitch = widths.map((w) => w + ITEM_GAP - SLOT_W);
    const total = pitch.reduce((a, b) => a + b, 0);
    this.shelfLen = total;
    this.buildShelf(total + 0.5);
    let cursor = -total / 2;
    defs.forEach((def, i) => {
      const pivot = new THREE.Group();
      const x = cursor + pitch[i] / 2;
      cursor += pitch[i];
      pivot.position.set(x, SHELF_Y, ITEM_Z);
      const b = CULTURE_BUILDERS[def.id];
      const inner = fitToSlot(b ? b.build() : placeholder(), (b?.h ?? 0.4) * ITEM_SCALE, widths[i], SLOT_D);
      pivot.add(inner);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), invisible);
      pivot.add(hit);
      const item: ItemObj = { def, pivot, inner, hit, x, w: widths[i], lift: 0, hopK: 0, glow: glowMats(inner) };
      this.sizeHit(item);
      this.items.push(item);
      this.shelf.add(pivot);
    });
    this.loadModels();
  }

  private sizeHit(item: ItemObj) {
    const box = new THREE.Box3().setFromObject(item.inner);
    const h = Math.max(0.2, box.max.y - box.min.y) + 0.04;
    item.hit.scale.set(item.w + 0.04, h, SLOT_D);
    item.hit.position.set(0, h / 2, 0);
  }

  /** Swap placeholders for GLB models listed in items.json. */
  private async loadModels() {
    const withModels = this.items.filter((it) => it.def.model);
    if (!withModels.length) return;
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    await Promise.all(
      withModels.map(async (it) => {
        try {
          const gltf = await loader.loadAsync(it.def.model!);
          if (this.disposed) return;
          const obj = gltf.scene;
          obj.traverse((n) => {
            const m = n as THREE.Mesh;
            if (m.isMesh) {
              m.castShadow = true;
              m.receiveShadow = true;
            }
          });
          if (it.def.rotY) obj.rotation.y = THREE.MathUtils.degToRad(it.def.rotY);
          const wrap = new THREE.Group();
          wrap.add(obj);
          // models may be a little deeper than the drawn placeholders (a saucer, an island): they may use the whole shelf
          fitToSlot(wrap, (it.def.height ?? CULTURE_BUILDERS[it.def.id]?.h ?? 0.45) * ITEM_SCALE, it.w, MODEL_D);
          it.pivot.remove(it.inner);
          disposeObject(it.inner);
          it.inner = wrap;
          it.glow = glowMats(wrap);
          it.pivot.add(wrap);
          this.sizeHit(it);
          this.invalidate();
        } catch (e) {
          console.warn(`Model yüklenemedi: ${it.def.model}`, e);
        }
      }),
    );
  }

  /* ---------------- books ---------------- */

  setBooks(list: ShelfBook[]) {
    list.forEach((b, i) => {
      const coverTex = tex(b.cover);
      const spine = std(b.spine, { roughness: 0.5 });
      const pageTex = tex(
        canvas(64, 256, (g, w, h) => {
          g.fillStyle = '#F4EBD8';
          g.fillRect(0, 0, w, h);
          for (let x = 0; x < w; x += 3) {
            g.fillStyle = x % 6 ? 'rgba(120,90,50,0.10)' : 'rgba(255,255,255,0.3)';
            g.fillRect(x, 0, 1, h);
          }
        }),
      );
      const pages = std('#ffffff', { roughness: 0.85, map: pageTex });
      const front = std('#ffffff', { roughness: 0.48, map: coverTex });
      const geo = new RoundedBoxGeometry(BOOK_W, BOOK_H, BOOK_D, 2, 0.014);
      const m = mesh(geo, [pages, spine, pages, pages, front, spine], [0, BOOK_H / 2, 0]);
      const group = new THREE.Group();
      const baseRotY = [-0.05, 0.04, -0.02, 0.06, -0.04][i % 5];
      group.position.set(i * BOOK_SP, 0, BOOK_Z);
      group.rotation.y = baseRotY;
      group.add(m);
      this.booksGroup.add(group);
      this.books.push({ id: b.id, group, mesh: m, baseRotY, lift: 0, pulled: false, glow: glowMats(m), carpet: b.carpet, twinkle: 1 + i * 1.3 });
    });
    this.loadCovers(list);
    this.loadCharacters(list);
    this.showCarpet(0, true);
  }

  /** Sculpted books with living covers replace the flat placeholder books once they have loaded. */
  private async loadCovers(list: ShelfBook[]) {
    const withModels = list.map((b, i) => ({ b, i })).filter(({ b }) => b.model);
    if (!withModels.length) return;
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    await Promise.all(
      withModels.map(async ({ b, i }) => {
        try {
          const gltf = await loader.loadAsync(b.model!);
          if (this.disposed) return;
          const cover = new LivingCover(gltf.scene, b.live ?? { regions: [] });
          const box = cover.bounds;
          const size = box.getSize(new THREE.Vector3());
          const sc = BOOK_H / size.y;
          const r = cover.root;
          r.scale.setScalar(sc);
          // centred like the flat book; the back cover where the flat book's back was, the relief stands out in front
          r.position.set(-((box.min.x + box.max.x) / 2) * sc, -((box.min.y + box.max.y) / 2) * sc, -BOOK_D / 2 - box.min.z * sc);
          const book = this.books[i];
          book.mesh.material = invisible;
          book.mesh.castShadow = false;
          book.mesh.add(r);
          book.cover = cover;
          book.glow = glowMats(r);
          cover.calm = this.reducedMotion;
          this.invalidate();
        } catch (e) {
          console.warn('Kapak modeli yüklenemedi', b.model, e);
        }
      }),
    );
  }

  /** Living covers move, shine and twinkle (unless calm). Returns true while something moves. */
  private updateCovers(dt: number) {
    let any = false;
    const t = this.clock / 1000;
    this.books.forEach((b, i) => {
      if (!b.cover) return;
      any = true;
      b.cover.calm = this.reducedMotion;
      b.cover.update(this.reducedMotion ? 0 : t + i * 1.7, b.pulled ? 1 : b.lift);
      if (this.reducedMotion || !b.cover.live.twinkles?.length) return;
      b.twinkle -= dt / 1000;
      if (b.twinkle > 0) return;
      b.twinkle = 2.2 + Math.random() * 2.5;
      const tw = b.cover.live.twinkles[Math.floor(Math.random() * b.cover.live.twinkles.length)];
      const p = b.cover.coverPoint(tw[0], tw[1]);
      b.cover.root.localToWorld(p);
      this.sparkles.burst(p, V3(0.06, 0.05, 0.03), 4 + Math.round(Math.random() * 3), 0.55);
    });
    return any && !this.reducedMotion;
  }

  /** Heroes stand beside their books; a cat strolls along the front of the sideboard. */
  private async loadCharacters(list: ShelfBook[]) {
    const jobs = list.map(async (b, i) => {
      const h = b.hero ? HEROES[b.hero] : null;
      if (!h) return;
      try {
        const actor = await loadActor(h.url, h.height);
        if (this.disposed) return;
        actor.root.position.set(i * BOOK_SP + BOOK_W / 2 + 0.24, 0, BOOK_Z + 0.16);
        actor.root.rotation.y = -0.35;
        // start each idle at a different moment so they do not move in sync
        actor.mixer.update(Math.random() * 3);
        this.booksGroup.add(actor.root);
        this.heroes.push({ actor, book: i });
        this.invalidate();
      } catch (e) {
        console.warn('Karakter yüklenemedi', h.url, e);
      }
    });
    const cat = (async () => {
      try {
        const actor = await loadActor('/models/animals/kedi-yuruyen.glb', 0.3);
        if (this.disposed) return;
        actor.root.position.set(-8, 0, SIDE_DEPTH - 0.14);
        this.scene.add(actor.root);
        this.cat = { actor, x: -8, dir: 1, wait: 6 };
        play(actor, 'walk', 0);
      } catch (e) {
        console.warn('Kedi yüklenemedi', e);
      }
    })();
    await Promise.all([...jobs, cat]);
  }

  /** Make a hero react: a short run on the spot, then back to idle. */
  cheerHero(i: number) {
    const h = this.heroes[i];
    if (!h) return;
    play(h.actor, 'walk', 0.25);
    const base = h.actor.root.rotation.y;
    this.tweens.add(this.reducedMotion ? 0 : 1600, 0, 1, (k) => {
      h.actor.root.rotation.y = base + Math.sin(k * Math.PI * 2) * 0.6;
      h.actor.root.position.y = Math.abs(Math.sin(k * Math.PI * 4)) * 0.03;
    }, ease.linear).then(() => {
      h.actor.root.rotation.y = base;
      h.actor.root.position.y = 0;
      play(h.actor, 'idle', 0.4);
    });
    this.invalidate();
  }

  heroBook(i: number) {
    return this.heroes[i]?.book ?? -1;
  }

  /** The cat stops, looks at you and then hurries on. */
  poke() {
    if (!this.cat) return;
    const c = this.cat;
    c.wait = 0;
    play(c.actor, 'walk', 0.2);
    c.actor.mixer.timeScale = 2.2;
    window.setTimeout(() => c.actor && (c.actor.mixer.timeScale = 1), 1400);
  }

  catAnchor() {
    if (!this.cat) return null;
    return this.toScreen(this.cat.actor.root.position.clone().add(V3(0, 0.36, 0)));
  }

  private updateCharacters(dt: number) {
    const s = dt / 1000;
    for (const h of this.heroes) h.actor.mixer.update(s);
    const c = this.cat;
    if (!c) return;
    const half = this.size.W / this.ppu / 2 + 0.6;
    if (c.wait > 0) {
      c.wait -= s;
      return;
    }
    c.actor.mixer.update(s);
    const speed = 0.28 * c.actor.mixer.timeScale;
    c.x += c.dir * speed * s;
    c.actor.root.position.x = c.x;
    c.actor.root.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    if (Math.abs(c.x) > half) {
      // off screen: wait a while, then walk back the other way
      c.dir = c.dir > 0 ? -1 : 1;
      c.x = -c.dir * half;
      c.wait = 14 + Math.random() * 12;
    }
  }

  get pageCount() {
    return Math.max(1, Math.ceil(this.books.length / this.perPage));
  }

  private pageX(p: number) {
    const start = p * this.perPage;
    const count = Math.min(this.perPage, this.books.length - start);
    return -(start + (count - 1) / 2) * BOOK_SP;
  }

  setPage(p: number, animate = true) {
    this.page = Math.max(0, Math.min(this.pageCount - 1, p));
    const to = this.pageX(this.page);
    if (!animate || this.reducedMotion) this.booksGroup.position.x = to;
    else this.tweens.add(650, this.booksGroup.position.x, to, (v) => (this.booksGroup.position.x = v), ease.inOut);
    this.invalidate();
  }

  pageOfBook(i: number) {
    return Math.floor(i / this.perPage);
  }

  /* ---------------- layout ---------------- */

  /** Fit the room into the screen, leaving `top` and `bottom` pixels for the interface. */
  layout(top: number, bottom: number) {
    const W = this.host.clientWidth;
    const H = this.host.clientHeight;
    if (!W || !H) return;
    this.size = { W, H };
    this.renderer.setSize(W, H, false);
    const rx = 0;
    const ry = top;
    const rw = W;
    const rh = Math.max(80, H - top - bottom);
    const cam = this.camera;
    // Close-up framing like a real bookcase: the culture items at the top edge, the books filling the middle.
    // Height decides the zoom; a minimum width keeps one book (phones) or two books (larger screens) in view.
    const hw = (W >= 700 ? 2.5 : 1.25) / 2;
    const itemTop = SHELF_Y + 0.72;
    const corners: THREE.Vector3[] = [
      V3(-hw, itemTop, ITEM_Z),
      V3(hw, itemTop, ITEM_Z),
      V3(-hw, 0, BOOK_Z + BOOK_D / 2),
      V3(hw, 0, BOOK_Z + BOOK_D / 2),
    ];
    const center = V3(0, itemTop * 0.5, 0.45);
    const elev = THREE.MathUtils.degToRad(9);
    const dir = V3(0, Math.sin(elev), Math.cos(elev));
    cam.aspect = rw / rh;
    cam.clearViewOffset();
    cam.updateProjectionMatrix();
    let lo = 1;
    let hi = 80;
    const v = V3(0, 0, 0);
    for (let i = 0; i < 26; i++) {
      const d = (lo + hi) / 2;
      cam.position.copy(center).addScaledVector(dir, d);
      cam.lookAt(center);
      cam.updateMatrixWorld();
      let ok = true;
      for (const c of corners) {
        v.copy(c).project(cam);
        if (Math.abs(v.x) > 0.98 || Math.abs(v.y) > 0.99) {
          ok = false;
          break;
        }
      }
      if (ok) hi = d;
      else lo = d;
    }
    cam.position.copy(center).addScaledVector(dir, hi);
    cam.lookAt(center);
    cam.setViewOffset(rw, rh, -rx, -ry, W, H);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    this.fitCarpet();
    const pxScale = (rh / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)))) * this.renderer.getPixelRatio();
    this.sparkles.setScale(pxScale);
    this.cinema.setBase(cam.position, center, pxScale);
    this.ppu = this.unitPx(BOOK_Z, 0.6);
    this.ppuShelf = this.unitPx(ITEM_Z, SHELF_Y);
    const visW = W / this.ppu;
    const prevFirst = this.page * this.perPage;
    this.perPage = Math.max(1, Math.min(3, Math.floor((visW - 0.45) / BOOK_SP)));
    this.page = Math.min(this.pageCount - 1, Math.floor(prevFirst / this.perPage));
    this.booksGroup.position.x = this.pageX(this.page);

    const spare = visW - this.perPage * BOOK_SP;
    this.lamp.visible = spare >= 1.2 && H >= 520;
    this.lamp.position.x = -visW / 2 + 0.62;

    const visWs = W / this.ppuShelf;
    const content = this.shelfLen + (W >= 700 ? 1.5 : 0.3);
    this.maxOff = Math.max(0, (content - visWs) / 2);
    // start with the first items in view
    if (!this.laidOut) this.offset = this.maxOff;
    this.laidOut = true;
    this.offset = THREE.MathUtils.clamp(this.offset, -this.maxOff, this.maxOff);
    this.shelf.position.x = this.offset;
    this.invalidate();
  }

  private unitPx(z: number, y: number) {
    const a = this.toScreen(V3(0, y, z));
    const b = this.toScreen(V3(1, y, z));
    return Math.max(1, Math.abs(b.x - a.x));
  }

  toScreen(p: THREE.Vector3) {
    const v = p.clone().project(this.camera);
    return { x: ((v.x + 1) / 2) * this.size.W, y: ((1 - v.y) / 2) * this.size.H };
  }

  /** Screen bands: [top, bottom] in pixels. */
  shelfBand() {
    return [this.toScreen(V3(0, SHELF_Y + 0.68, ITEM_Z)).y, this.toScreen(V3(0, SHELF_Y - 0.12, SHELF_DEPTH)).y];
  }
  bookBand() {
    return [this.toScreen(V3(0, BOOK_H + 0.06, BOOK_Z)).y, this.toScreen(V3(0, -0.02, SIDE_DEPTH)).y];
  }

  /** Where the label of an item points to: just under the shelf, below the item. */
  itemAnchor(i: number) {
    const it = this.items[i];
    return this.toScreen(V3(it.x + this.offset, SHELF_Y - 0.06, SHELF_DEPTH));
  }

  itemVisible(i: number) {
    const x = this.items[i].x + this.offset;
    const half = this.size.W / this.ppuShelf / 2;
    return Math.abs(x) < half - SLOT_W * 0.3;
  }

  /** Where a book's card goes: the front edge of the sideboard, under the book. */
  bookAnchor(i: number) {
    const b = this.books[i];
    return this.toScreen(V3(this.booksGroup.position.x + b.group.position.x, 0, BOOK_Z + BOOK_D / 2));
  }

  /* ---------------- shelf scrolling ---------------- */

  setOffset(o: number) {
    this.offset = THREE.MathUtils.clamp(o, -this.maxOff, this.maxOff);
    this.shelf.position.x = this.offset;
    this.invalidate();
  }

  fling(velocityUnitsPerMs: number) {
    this.vel = this.reducedMotion ? 0 : velocityUnitsPerMs;
    this.invalidate();
  }

  scrollShelfBy(units: number) {
    this.vel = 0;
    const to = THREE.MathUtils.clamp(this.offset + units, -this.maxOff, this.maxOff);
    this.tweens.add(this.reducedMotion ? 0 : 520, this.offset, to, (v) => this.setOffset(v), ease.inOut);
    this.invalidate();
  }

  ensureItemVisible(i: number) {
    const half = this.size.W / this.ppuShelf / 2 - SLOT_W;
    const x = this.items[i].x + this.offset;
    if (x > half) this.scrollShelfBy(half - x);
    else if (x < -half) this.scrollShelfBy(-half - x);
  }

  /* ---------------- interaction ---------------- */

  pick(clientX: number, clientY: number): Hit | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [...this.items.map((i) => i.hit), ...this.books.map((b) => b.mesh), ...this.heroes.map((h) => h.actor.hit)];
    if (this.cat && this.cat.wait <= 0) targets.push(this.cat.actor.hit);
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit) return null;
    const hi = this.heroes.findIndex((h) => h.actor.hit === hit.object);
    if (hi >= 0) return { kind: 'hero', index: hi };
    if (this.cat && hit.object === this.cat.actor.hit) return { kind: 'cat' };
    const ii = this.items.findIndex((i) => i.hit === hit.object);
    if (ii >= 0) return { kind: 'item', index: ii };
    const bi = this.books.findIndex((b) => b.mesh === hit.object);
    return bi >= 0 ? { kind: 'book', index: bi } : null;
  }

  private applyItem(it: ItemObj) {
    const k = it.hopK;
    it.pivot.position.y = SHELF_Y + it.lift * 0.04 + ease.hop(k) * 0.18;
    it.pivot.rotation.y = ease.inOut(k) * Math.PI * 2;
    const s = 1 + it.lift * 0.05;
    it.pivot.scale.setScalar(s);
    applyGlow(it.glow, it.lift);
  }

  /** Sparkle burst around a shelf item or a book. */
  sparkle(kind: 'item' | 'book', i: number, strength = 1) {
    if (this.reducedMotion) return;
    if (kind === 'item') {
      const it = this.items[i];
      const h = it.hit.scale.y;
      this.sparkles.burst(V3(it.x + this.offset, SHELF_Y + h * 0.55, ITEM_Z), V3(it.w * 0.55, h * 0.45, SLOT_D * 0.5), Math.round(16 * strength), strength);
    } else {
      const b = this.books[i];
      const x = this.booksGroup.position.x + b.group.position.x;
      this.sparkles.burst(V3(x, BOOK_H * 0.55, b.group.position.z + BOOK_D), V3(BOOK_W * 0.55, BOOK_H * 0.45, 0.1), Math.round(22 * strength), strength * 1.2);
    }
    this.invalidate();
  }

  hoverItem(i: number | null) {
    this.items.forEach((it, n) => {
      const target = n === i ? 1 : 0;
      if (it.lift === target) return;
      this.tweens.add(this.reducedMotion ? 0 : 180, it.lift, target, (v) => {
        it.lift = v;
        this.applyItem(it);
      }, ease.out);
    });
    this.invalidate();
  }

  hopItem(i: number) {
    const it = this.items[i];
    if (this.reducedMotion) return;
    this.tweens.add(900, 0, 1, (k) => {
      it.hopK = k >= 1 ? 0 : k;
      this.applyItem(it);
    }, ease.linear);
    this.invalidate();
  }

  hoverBook(i: number | null) {
    if (i !== null) this.showCarpet(i);
    this.books.forEach((b, n) => {
      const target = n === i ? 1 : 0;
      if (b.lift === target || b.pulled) return;
      this.tweens.add(this.reducedMotion ? 0 : 200, b.lift, target, (v) => {
        b.lift = v;
        b.mesh.position.y = BOOK_H / 2 + v * 0.05;
        b.mesh.rotation.x = -v * 0.05;
        // a living cover lights itself up (sheen, glows); only a touch of warm light on top
        applyGlow(b.glow, v * (b.cover ? 0.12 : 0.5));
      }, ease.out);
    });
    this.invalidate();
  }

  /** Pull a book off the shelf towards the reader (or put it back). */
  pullBook(i: number | null) {
    this.books.forEach((b, n) => {
      const want = n === i;
      if (b.pulled === want) return;
      b.pulled = want;
      const z0 = b.group.position.z;
      const r0 = b.group.rotation.y;
      const y0 = b.mesh.position.y;
      this.tweens.add(this.reducedMotion ? 0 : 420, 0, 1, (k) => {
        b.group.position.z = z0 + ((want ? BOOK_Z + 0.32 : BOOK_Z) - z0) * k;
        b.group.rotation.y = r0 + ((want ? 0 : b.baseRotY) - r0) * k;
        b.mesh.position.y = y0 + ((want ? BOOK_H / 2 + 0.08 : BOOK_H / 2) - y0) * k;
      }, ease.inOut);
    });
    this.invalidate();
  }

  get carpetMotif() {
    return motifIndex(this.books[Math.max(0, this.carpetBook)]?.carpet?.motif ?? 'elibelinde');
  }

  /** Show the carpet design of a book on the wall. */
  showCarpet(i: number, instant = false) {
    const b = this.books[i];
    if (!b || i === this.carpetBook) return;
    this.carpetBook = i;
    const d = b.carpet ?? { motif: 'elibelinde' };
    this.carpet.show(b.id, d, instant);
    this.onCarpet?.(motifIndex(d.motif));
  }

  /** Make the carpet cover the visible wall. */
  private fitCarpet() {
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.03);
    const hit = (x: number, y: number) => {
      ray.setFromCamera(new THREE.Vector2(x, y), this.camera);
      return ray.ray.intersectPlane(plane, new THREE.Vector3()) ?? new THREE.Vector3();
    };
    const tl = hit(-1, 1);
    const br = hit(1, -1);
    const margin = this.size.W >= 700 ? 0.08 : 0.03;
    this.carpet.resize(tl.x + margin, br.x - margin, CARPET_BOTTOM - 0.06, Math.max(tl.y + 0.3, SHELF_Y + 1));
  }

  /** One orchestrated entrance: the culture items drop onto the shelf, books slide in. */
  intro() {
    if (this.reducedMotion) return;
    this.cinema.startIntro();
    const order = this.items.map((_, i) => i).sort((a, b) => Math.abs(this.items[a].x + this.offset) - Math.abs(this.items[b].x + this.offset));
    order.forEach((idx, n) => {
      const it = this.items[idx];
      it.pivot.position.y = SHELF_Y + 0.9;
      this.tweens.add(620, SHELF_Y + 0.9, SHELF_Y, (v) => (it.pivot.position.y = v), ease.back, 120 + n * 45);
    });
    const to = this.booksGroup.position.x;
    this.tweens.add(1000, to + 5, to, (v) => (this.booksGroup.position.x = v), ease.out, 200);
    this.invalidate();
  }

  /* ---------------- render loop ---------------- */

  invalidate() {
    if (this.raf || this.disposed) return;
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private frame(now: number) {
    this.raf = 0;
    const dt = this.last ? Math.min(50, now - this.last) : 16;
    this.tweens.update(now);
    let moving = this.tweens.active;
    if (this.sparkles.update(dt)) moving = true;
    this.clock += dt;
    if (!document.hidden && this.cinema.update(dt)) {
      moving = true;
      this.carpet.sway(this.clock / 1000);
    }
    if (!this.reducedMotion && (this.heroes.length || this.cat)) {
      this.updateCharacters(dt);
      moving = true;
    }
    if (this.updateCovers(dt)) moving = true;
    if (this.vel !== 0) {
      const before = this.offset;
      this.setOffset(this.offset + this.vel * dt);
      this.vel *= Math.pow(0.93, dt / 16);
      if (Math.abs(this.vel) < 0.00004 || this.offset === before) this.vel = 0;
      else moving = true;
    }
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
    if (moving) {
      if (this.last) this.trackPerf(now - this.last);
      this.last = now;
      this.invalidate();
    } else this.last = 0;
  }

  private trackPerf(dt: number) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 30) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes = [];
    if (avg > 38 && this.quality > 0) {
      this.quality--;
      if (this.quality === 1) this.renderer.setPixelRatio(1);
      if (this.quality === 0) {
        this.key.castShadow = false;
        this.renderer.shadowMap.enabled = false;
        this.scene.traverse((o) => {
          const m = (o as THREE.Mesh).material;
          if (m) (Array.isArray(m) ? m : [m]).forEach((x) => (x.needsUpdate = true));
        });
      }
      this.renderer.setSize(this.size.W, this.size.H, false);
    }
  }

  dispose() {
    this.disposed = true;
    this.carpet.dispose();
    cancelAnimationFrame(this.raf);
    disposeObject(this.scene);
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
