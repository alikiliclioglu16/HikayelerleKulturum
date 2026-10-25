import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { fitToSlot } from './kit3d';

/**
 * Animated GLB characters (skinned meshes with clips like Idle, Walking, Running).
 * Models are scaled to a height in scene units and stood on y = 0.
 */
export interface Actor {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  current: string | null;
  hit: THREE.Mesh;
  height: number;
}

let loaderP: Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader> | null = null;
function loader() {
  loaderP ??= import('three/examples/jsm/loaders/GLTFLoader.js').then((m) => new m.GLTFLoader());
  return loaderP;
}

const gltfCache = new Map<string, Promise<GLTF>>();
export async function loadGltf(url: string): Promise<GLTF> {
  if (!gltfCache.has(url)) gltfCache.set(url, loader().then((l) => l.loadAsync(url)));
  return gltfCache.get(url)!;
}

const invisible = new THREE.MeshBasicMaterial({ visible: false });

export async function loadActor(url: string, height: number): Promise<Actor> {
  const gltf = await loadGltf(url);
  const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
  const model = clone(gltf.scene) as THREE.Group;
  model.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
    }
  });
  const mixer = new THREE.AnimationMixer(model);
  const actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  // pose the model before measuring so the bounding box matches what is drawn
  const first = gltf.animations.find((c) => /idle/i.test(c.name)) ?? gltf.animations[0];
  if (first) {
    actions[first.name].play();
    mixer.update(0.01);
  }
  const wrap = new THREE.Group();
  wrap.add(model);
  fitToSlot(wrap, height, height * 3, height * 3);
  const root = new THREE.Group();
  root.add(wrap);
  const box = new THREE.Box3().setFromObject(wrap);
  const size = box.getSize(new THREE.Vector3());
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), invisible);
  hit.scale.set(Math.max(size.x, height * 0.45), size.y, Math.max(size.z, height * 0.35));
  hit.position.y = size.y / 2;
  root.add(hit);
  return { root, mixer, actions, current: first?.name ?? null, hit, height };
}

/** Cross-fade to a clip by (part of) its name. */
export function play(a: Actor, name: string, fade = 0.35, once = false) {
  const key = Object.keys(a.actions).find((k) => k.toLowerCase().includes(name.toLowerCase()));
  if (!key || key === a.current) return;
  const next = a.actions[key];
  next.reset();
  if (once) {
    next.setLoop(THREE.LoopOnce, 1);
    next.clampWhenFinished = true;
  } else next.setLoop(THREE.LoopRepeat, Infinity);
  next.play();
  if (a.current) a.actions[a.current].crossFadeTo(next, fade, false);
  a.current = key;
}
