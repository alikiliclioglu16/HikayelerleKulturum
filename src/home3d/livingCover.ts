import * as THREE from 'three';

/**
 * A book cover that comes alive. The covers are sculpted 3D books (relief covers, see public/models/kapak);
 * the vertex shader moves the raised parts inside named regions of the cover (the characters sway, a little pot
 * hops, the bunting flutters) and the fragment shader adds a golden sheen that sweeps over the cover now and then,
 * plus glowing spots (the sun, magic seeds). Hovering makes the relief swell out of the cover.
 * The regions are set per book in books/index.json (cover.live) in cover coordinates: u from the left edge (0) to
 * the right edge (1), v from the bottom (0) to the top (1).
 */

export type LiveKind = 'sway' | 'bob' | 'hop' | 'flutter' | 'glow';

export interface LiveRegion {
  kind: LiveKind;
  /** Centre and radii of the region (an ellipse), in cover coordinates. */
  at: [number, number];
  r: [number, number];
  /** Pivot for `sway` (feet of a character, a wrist …), in cover coordinates. */
  pivot?: [number, number];
  /** Radians for sway, fraction of the cover height for bob/hop/flutter, brightness for glow. */
  amp: number;
  /** Radians per second. */
  speed?: number;
  phase?: number;
  /** Glow colour. */
  color?: string;
}

export interface LiveCover {
  regions: LiveRegion[];
  /** Spots that twinkle with little stars now and then, in cover coordinates. */
  twinkles?: [number, number][];
}

const MAX = 8;
const KIND: Record<LiveKind, number> = { sway: 0, bob: 1, hop: 2, flutter: 3, glow: 4 };

export class LivingCover {
  readonly root = new THREE.Group();
  private uniforms = {
    uTime: { value: 0 },
    uHover: { value: 0 },
    uShine: { value: 1 },
    uBoxMin: { value: new THREE.Vector3() },
    uBoxSize: { value: new THREE.Vector3(1, 1, 1) },
    uZRef: { value: 0 },
    uN: { value: 0 },
    uR: { value: Array.from({ length: MAX }, () => new THREE.Vector4()) },
    uP: { value: Array.from({ length: MAX }, () => new THREE.Vector4()) },
    uK: { value: Array.from({ length: MAX }, () => new THREE.Vector4()) },
    uC: { value: Array.from({ length: MAX }, () => new THREE.Color()) },
  };
  private box = new THREE.Box3();
  private front = 0;

  constructor(
    model: THREE.Object3D,
    readonly live: LiveCover,
  ) {
    let geo: THREE.BufferGeometry | null = null;
    model.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      geo ??= m.geometry;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) this.patch(mat as THREE.MeshStandardMaterial);
    });
    this.root.add(model);
    if (geo) this.measure(geo);
  }

  /** Bounds of the model, the cover plane and the depth range of the relief inside each region. */
  private measure(geo: THREE.BufferGeometry) {
    geo.computeBoundingBox();
    this.box.copy(geo.boundingBox!);
    const min = this.box.min;
    const size = this.box.getSize(new THREE.Vector3());
    this.uniforms.uBoxMin.value.copy(min);
    this.uniforms.uBoxSize.value.copy(size);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    const zs: number[] = [];
    for (let i = 0; i < n; i++) {
      const u = (pos.getX(i) - min.x) / size.x;
      const v = (pos.getY(i) - min.y) / size.y;
      if (u > 0.12 && u < 0.88 && v > 0.1 && v < 0.9) zs.push(pos.getZ(i));
    }
    zs.sort((a, b) => a - b);
    const pct = (a: number[], p: number) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0);
    this.uniforms.uZRef.value = pct(zs, 0.4);
    this.front = pct(zs, 0.97);
    const regions = this.live.regions.slice(0, MAX);
    this.uniforms.uN.value = regions.length;
    regions.forEach((r, i) => {
      // the raised part inside the region: from about the median depth to the top of the relief
      const inside: number[] = [];
      for (let k = 0; k < n; k++) {
        const du = ((pos.getX(k) - min.x) / size.x - r.at[0]) / r.r[0];
        const dv = ((pos.getY(k) - min.y) / size.y - r.at[1]) / r.r[1];
        if (du * du + dv * dv < 1) inside.push(pos.getZ(k));
      }
      inside.sort((a, b) => a - b);
      const lo = pct(inside, 0.3);
      const hi = Math.max(lo + 0.002, pct(inside, 0.7));
      const pv = r.pivot ?? r.at;
      this.uniforms.uR.value[i].set(r.at[0], r.at[1], r.r[0], r.r[1]);
      this.uniforms.uP.value[i].set(pv[0], pv[1], r.amp, r.speed ?? 1.5);
      this.uniforms.uK.value[i].set(KIND[r.kind], r.phase ?? 0, lo, hi);
      this.uniforms.uC.value[i].set(r.color ?? '#FFE9A8');
    });
  }

  private patch(mat: THREE.MeshStandardMaterial) {
    const u = this.uniforms;
    mat.customProgramCacheKey = () => 'living-cover';
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, u);
      const decl = /* glsl */ `
        uniform float uTime, uHover, uShine, uZRef;
        uniform vec3 uBoxMin, uBoxSize;
        uniform int uN;
        uniform vec4 uR[${MAX}], uP[${MAX}], uK[${MAX}];
        uniform vec3 uC[${MAX}];
        varying vec2 vCov;
        varying float vFront;
      `;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${decl}`)
        .replace(
          '#include <begin_vertex>',
          /* glsl */ `
          #include <begin_vertex>
          vec2 cov = (position.xy - uBoxMin.xy) / uBoxSize.xy;
          vCov = cov;
          vFront = normal.z;
          vec3 p = transformed;
          for (int i = 0; i < ${MAX}; i++) {
            if (i >= uN) break;
            vec4 R = uR[i]; vec4 P = uP[i]; vec4 K = uK[i];
            if (K.x > 3.5) continue;
            vec2 d = (cov - R.xy) / R.zw;
            float e = length(d);
            if (e >= 1.0) continue;
            float w = (1.0 - smoothstep(0.5, 1.0, e)) * smoothstep(K.z, K.w, position.z);
            float s = sin(uTime * P.w + K.y);
            float boost = 1.0 + 0.8 * uHover;
            // hovering: the raised parts step a little out of the cover
            p.z += 0.035 * uBoxSize.y * uHover * w;
            if (K.x < 0.5) {
              vec2 piv = uBoxMin.xy + P.xy * uBoxSize.xy;
              float a = P.z * s * w * boost;
              vec2 q = p.xy - piv;
              p.xy = piv + vec2(q.x * cos(a) - q.y * sin(a), q.x * sin(a) + q.y * cos(a));
            } else if (K.x < 1.5) {
              p.y += P.z * uBoxSize.y * s * w * boost;
            } else if (K.x < 2.5) {
              float h = max(0.0, s);
              p.y += P.z * uBoxSize.y * h * h * w * boost;
            } else {
              p.y += P.z * uBoxSize.y * sin(uTime * P.w + cov.x * 22.0 + K.y) * w * boost;
            }
          }
          transformed = p;
          `,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${decl}`)
        .replace(
          '#include <dithering_fragment>',
          /* glsl */ `
          #include <dithering_fragment>
          float front = smoothstep(0.3, 0.7, vFront);
          // a golden sheen sweeping diagonally over the cover every few seconds
          float diag = vCov.x * 0.75 + vCov.y * 0.65;
          float pos = mod(uTime * 0.55, 4.2) - 0.8;
          float band = exp(-pow((diag - pos) * 12.0, 2.0));
          gl_FragColor.rgb += vec3(1.0, 0.9, 0.62) * band * front * uShine * (0.1 + 0.18 * uHover);
          for (int i = 0; i < ${MAX}; i++) {
            if (i >= uN) break;
            vec4 K = uK[i];
            if (K.x < 3.5) continue;
            vec4 R = uR[i]; vec4 P = uP[i];
            float e = length((vCov - R.xy) / R.zw);
            float m = 1.0 - smoothstep(0.35, 1.0, e);
            float pulse = 0.55 + 0.45 * sin(uTime * P.w + K.y);
            gl_FragColor.rgb += uC[i] * m * P.z * pulse * uShine * (1.0 + uHover);
          }
          `,
        );
    };
    mat.needsUpdate = true;
  }

  /** Advance the animation (seconds) and set how much the cover is hovered (0..1). */
  update(t: number, hover: number) {
    this.uniforms.uTime.value = t;
    this.uniforms.uHover.value = hover;
  }

  /** Calm mode: no motion and no sheen. */
  set calm(on: boolean) {
    this.uniforms.uShine.value = on ? 0 : 1;
  }

  /** A point on the cover (cover coordinates) in the model's own space, slightly in front of the relief. */
  coverPoint(u: number, v: number, out = new THREE.Vector3()) {
    const min = this.box.min;
    const size = this.box.getSize(new THREE.Vector3());
    return out.set(min.x + u * size.x, min.y + v * size.y, this.front + 0.02 * size.y);
  }

  get bounds() {
    return this.box;
  }
}
