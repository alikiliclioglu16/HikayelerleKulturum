import * as THREE from 'three';

export type P = [number, number];
export const V2 = (x: number, y: number) => new THREE.Vector2(x, y);
export const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Smooth Catmull-Rom curve through 2D profile points (x = radius, y = height). */
export function smooth(points: P[], n = 32): THREE.Vector2[] {
  return new THREE.SplineCurve(points.map(([x, y]) => V2(x, y)))
    .getPoints(n)
    .map((v) => V2(Math.max(0, v.x), v.y));
}

export function pts(points: P[]): THREE.Vector2[] {
  return points.map(([x, y]) => V2(x, y));
}

export function lathe(points: THREE.Vector2[], seg = 48, phiStart = 0, phiLength = Math.PI * 2) {
  return new THREE.LatheGeometry(points, seg, phiStart, phiLength);
}

export function std(color: string, o: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...o });
}

export function phys(color: string, o: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, metalness: 0, ...o });
}

export function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material | THREE.Material[],
  pos?: [number, number, number],
  rot?: [number, number, number],
  scale?: [number, number, number],
) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scale) m.scale.set(...scale);
  return m;
}

/** A cylinder between two points. */
export function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, seg = 10) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const m = mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
  return m;
}

export function tube(points: THREE.Vector3[], r: number, mat: THREE.Material, seg = 24) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), seg, r, 10), mat);
}

export function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  return c;
}

export function tex(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

export function ctex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  return tex(canvas(w, h, draw), repeat);
}

/** Bounding box fit: scale an object into a slot and stand it on y = 0, centered on x/z. */
export function fitToSlot(obj: THREE.Object3D, maxH: number, maxW: number, maxD: number) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(V3(0, 0, 0));
  const s = Math.min(maxH / Math.max(size.y, 1e-4), maxW / Math.max(size.x, 1e-4), maxD / Math.max(size.z, 1e-4));
  obj.scale.multiplyScalar(s);
  obj.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(obj);
  const c = b2.getCenter(V3(0, 0, 0));
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.position.y -= b2.min.y;
  return obj;
}

export function disposeObject(o: THREE.Object3D) {
  o.traverse((n) => {
    const m = n as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
      mat.dispose();
    }
  });
}
