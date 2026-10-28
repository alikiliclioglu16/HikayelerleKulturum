import * as THREE from 'three';
import { carpetCanvas, carpetPixels, FRINGE, type CarpetStyle } from './kilim';
import { composeCarpet, loadCarpetPicture } from './carpetPicture';
import { Tweens, ease } from '../three/tween';

/** A carpet design for a book: a generated kilim style, or a picture (`src`) made by an illustrator. */
export interface CarpetDesign extends CarpetStyle {
  src?: string;
  /** Where the woven border ends inside the picture: top, right, bottom, left (fractions); see carpetPicture.ts. */
  inset?: [number, number, number, number];
}

/**
 * A carpet that covers a wall. It can be resized to fill whatever part of the wall is on screen and
 * cross-fades to another design (for example the design of the book under the mouse).
 * Two meshes share one gently swaying geometry: the back one shows the current design, the front one fades in the next.
 */
export class WallCarpet {
  readonly group = new THREE.Group();
  private geo: THREE.PlaneGeometry | null = null;
  private base: Float32Array = new Float32Array();
  private meshes: THREE.Mesh[] = [];
  private cache = new Map<string, Promise<THREE.Texture>>();
  private shown = 0;
  private size = { w: 0, h: 0 };
  private current: { key: string; design: CarpetDesign } | null = null;
  private fading = 0;

  constructor(
    z: number,
    private readonly tweens: Tweens,
    private readonly invalidate: () => void,
  ) {
    for (let i = 0; i < 2; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: '#E9E3DA',
        roughness: 0.97,
        alphaTest: i ? 0.02 : 0.5,
        transparent: i === 1,
        opacity: i ? 0 : 1,
        depthWrite: i === 0,
      });
      const m = new THREE.Mesh(new THREE.BufferGeometry(), mat);
      m.position.z = z + i * 0.002;
      m.castShadow = i === 0;
      m.receiveShadow = true;
      m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 });
      this.meshes.push(m);
      this.group.add(m);
    }
  }

  /** Fill the rectangle [left, right] × [bottom, top] of the wall (world units). */
  resize(left: number, right: number, bottom: number, top: number) {
    const w = right - left;
    const h = top - bottom;
    if (!(w > 0.2 && h > 0.2 && w < 200 && h < 200)) return;
    if (Math.abs(w - this.size.w) < 0.05 && Math.abs(h - this.size.h) < 0.05 && this.geo) {
      this.group.position.set((left + right) / 2, top, 0);
      return;
    }
    this.size = { w, h };
    this.geo?.dispose();
    const geo = new THREE.PlaneGeometry(w, h, Math.max(8, Math.round(w * 9)), Math.max(4, Math.round(h * 4)));
    geo.translate(0, -h / 2, 0);
    this.geo = geo;
    this.base = Float32Array.from(geo.attributes.position.array as Float32Array);
    this.meshes.forEach((m) => (m.geometry = geo));
    this.group.position.set((left + right) / 2, top, 0);
    // designs are drawn for one size; draw them again for the new one
    this.cache.forEach((t) => t.then((x) => x.dispose()));
    this.cache.clear();
    if (this.current) {
      const want = this.current.key;
      this.texture(want, this.current.design).then((t) => {
        if (this.current?.key !== want) return;
        this.apply(this.meshes[0], t);
        this.invalidate();
      });
    }
    this.invalidate();
  }

  private apply(m: THREE.Mesh, t: THREE.Texture) {
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.map = t;
    mat.needsUpdate = true;
    (m.customDepthMaterial as THREE.MeshDepthMaterial).map = t;
    (m.customDepthMaterial as THREE.MeshDepthMaterial).needsUpdate = true;
  }

  /** The carpet texture for a design at the current size (pictures are re-woven to fit; see carpetPicture.ts). */
  private texture(key: string, d: CarpetDesign): Promise<THREE.Texture> {
    let t = this.cache.get(key);
    if (t) return t;
    const { w, h } = this.size;
    const [pw, ph] = carpetPixels(w, h);
    const make = (c: HTMLCanvasElement) => {
      const tx = new THREE.CanvasTexture(c);
      tx.colorSpace = THREE.SRGBColorSpace;
      tx.anisotropy = 8;
      return tx;
    };
    t = d.src
      ? loadCarpetPicture(d.src, d.inset)
          .then((src) => make(composeCarpet(src, pw, ph, d.inset, key.length)))
          .catch(() => make(carpetCanvas(d, pw, ph)))
      : Promise.resolve(make(carpetCanvas(d, pw, ph)));
    this.cache.set(key, t);
    return t;
  }

  /** Start loading carpet pictures that will probably be shown soon (the next books on the shelf). */
  preload(designs: CarpetDesign[]) {
    for (const d of designs) if (d.src) loadCarpetPicture(d.src, d.inset).catch(() => {});
  }

  /** Show a design (cross-fades unless `instant`; a picture fades in once it has loaded). */
  show(key: string, design: CarpetDesign, instant = false) {
    if (this.current?.key === key) return;
    this.current = { key, design };
    if (!this.geo) return;
    const id = ++this.shown;
    this.texture(key, design).then((t) => {
      if (id !== this.shown) return;
      this.fadeTo(t, instant);
    });
  }

  private fadeTo(t: THREE.Texture, instant: boolean) {
    const [back, front] = this.meshes;
    if (instant || !(back.material as THREE.MeshStandardMaterial).map) {
      this.apply(back, t);
      (front.material as THREE.MeshStandardMaterial).opacity = 0;
      this.invalidate();
      return;
    }
    this.apply(front, t);
    const fm = front.material as THREE.MeshStandardMaterial;
    const id = ++this.fading;
    fm.opacity = 0;
    this.tweens.add(900, 0, 1, (v) => (fm.opacity = v), ease.inOut).then(() => {
      if (id !== this.fading) return;
      this.apply(back, t);
      fm.opacity = 0;
      this.invalidate();
    });
    this.invalidate();
  }

  /** The carpet moves a little, as if a draught went by. */
  sway(t: number) {
    if (!this.geo) return;
    const pos = this.geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const h = this.size.h;
    for (let i = 0; i < arr.length; i += 3) {
      const x = this.base[i];
      const k = Math.min(1, -this.base[i + 1] / h);
      arr[i + 2] = this.base[i + 2] + (Math.sin(x * 1.3 + t * 0.7) * 0.01 + Math.sin(x * 3.2 - t * 1.05) * 0.004) * k * k;
    }
    pos.needsUpdate = true;
    this.geo.computeVertexNormals();
  }

  /** How far the fringe hangs below the woven part (world units). */
  get fringe() {
    return this.size.h * FRINGE;
  }

  dispose() {
    this.cache.forEach((t) => t.then((x) => x.dispose()));
    this.geo?.dispose();
  }
}
