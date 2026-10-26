import * as THREE from 'three';
import { carpetCanvas, carpetPixels, FRINGE, type CarpetStyle } from './kilim';
import { Tweens, ease } from '../three/tween';

/** A carpet design for a book: a generated kilim style, or a picture (`src`) made by an illustrator. */
export interface CarpetDesign extends CarpetStyle {
  src?: string;
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
  private cache = new Map<string, THREE.Texture>();
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
    this.cache.forEach((t) => t.dispose());
    this.cache.clear();
    if (this.current) this.apply(this.meshes[0], this.texture(this.current.key, this.current.design));
    this.invalidate();
  }

  private apply(m: THREE.Mesh, t: THREE.Texture) {
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.map = t;
    mat.needsUpdate = true;
    (m.customDepthMaterial as THREE.MeshDepthMaterial).map = t;
    (m.customDepthMaterial as THREE.MeshDepthMaterial).needsUpdate = true;
  }

  private texture(key: string, d: CarpetDesign) {
    let t = this.cache.get(key);
    if (t) return t;
    const { w, h } = this.size;
    if (d.src) {
      // a picture: cover the carpet with it, cropping what does not fit
      t = new THREE.TextureLoader().load(d.src, (tx) => {
        const img = tx.image as HTMLImageElement;
        const ia = img.width / img.height;
        const ca = w / h;
        if (ia > ca) {
          tx.repeat.set(ca / ia, 1);
          tx.offset.set((1 - ca / ia) / 2, 0);
        } else {
          tx.repeat.set(1, ia / ca);
          tx.offset.set(0, (1 - ia / ca) / 2);
        }
        this.invalidate();
      });
    } else {
      const [pw, ph] = carpetPixels(w, h);
      t = new THREE.CanvasTexture(carpetCanvas(d, pw, ph));
    }
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    this.cache.set(key, t);
    return t;
  }

  /** Show a design (cross-fades unless `instant`). */
  show(key: string, design: CarpetDesign, instant = false) {
    if (this.current?.key === key) return;
    this.current = { key, design };
    if (!this.geo) return;
    const [back, front] = this.meshes;
    const t = this.texture(key, design);
    if (instant) {
      this.apply(back, t);
      (front.material as THREE.MeshStandardMaterial).opacity = 0;
      this.invalidate();
      return;
    }
    this.apply(front, t);
    const fm = front.material as THREE.MeshStandardMaterial;
    const id = ++this.fading;
    this.tweens.add(900, fm.opacity, 1, (v) => (fm.opacity = v), ease.inOut).then(() => {
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
    this.cache.forEach((t) => t.dispose());
    this.geo?.dispose();
  }
}
