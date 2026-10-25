import * as THREE from 'three';

const lighting = THREE.ShaderChunk.lights_fragment_begin;
const start = lighting.indexOf('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )');
const end = lighting.indexOf('#if ( NUM_RECT_AREA_LIGHTS > 0 )');
const directional = lighting.slice(start, end)
  .replace('getDirectionalLightInfo( directionalLight, directLight );',
    'getDirectionalLightInfo( directionalLight, directLight );\nfloat tubeVisibility = staticSunVisibility();')
  .replace(/directLight.color \*= ([^;]+);/, 'tubeVisibility = min( tubeVisibility, $1 );')
  .replace('RE_Direct( directLight,', 'directLight.color *= tubeVisibility;\nRE_Direct( directLight,');
if (start < 0 || end < 0 || !directional.includes('tubeVisibility = min'))
  throw new Error('Static sunlight requires the supported Three.js directional-light shader');
const staticLighting = lighting.slice(0, start) + directional + lighting.slice(end);
const fragment = `
uniform sampler2D staticSunDepth;
uniform mat4 staticSunProjection;
uniform vec2 staticSunTexel;
uniform float staticSunBias;
varying vec3 vStaticSunPosition;
float staticSunTap(vec2 uv, vec3 receiver, vec2 gradient) {
  vec3 sampleDepth = texture2D(staticSunDepth, uv).rgb;
  float roofDepth = dot(sampleDepth.rg, vec2(65280.0, 255.0)) / 65535.0;
  float depth = receiver.z + dot(gradient, uv - receiver.xy);
  return mix(1.0, step(roofDepth - staticSunBias, depth), sampleDepth.b);
}
float staticSunVisibility() {
  vec3 p = (staticSunProjection * vec4(vStaticSunPosition, 1.0)).xyz;
  vec3 dx = dFdx(p), dy = dFdy(p);
  if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) return 1.0;
  // Compare at each texel's position on the receiver plane, not its centre depth.
  float determinant = dx.x * dy.y - dx.y * dy.x;
  vec2 gradient = abs(determinant) > 1e-12
    ? vec2(dy.y * dx.z - dx.y * dy.z, dx.x * dy.z - dy.x * dx.z) / determinant
    : vec2(0.0);
  vec2 texel = p.xy / staticSunTexel - 0.5;
  vec2 blend = fract(texel);
  vec2 uv = (floor(texel) + 0.5) * staticSunTexel;
  return mix(
    mix(staticSunTap(uv, p, gradient), staticSunTap(uv + vec2(staticSunTexel.x, 0.0), p, gradient), blend.x),
    mix(staticSunTap(uv + vec2(0.0, staticSunTexel.y), p, gradient),
      staticSunTap(uv + staticSunTexel, p, gradient), blend.x), blend.y);
}
`;
const worldPosition = `
vec4 staticSunPosition = vec4(transformed, 1.0);
#ifdef USE_BATCHING
  staticSunPosition = batchingMatrix * staticSunPosition;
#endif
#ifdef USE_INSTANCING
  staticSunPosition = instanceMatrix * staticSunPosition;
#endif
vStaticSunPosition = (modelMatrix * staticSunPosition).xyz;
`;

/** One CPU rasterization of fixed roofs; only direct sunlight is occluded. */
export class StaticSunlight {
  readonly texture: THREE.DataTexture;
  readonly projection = new THREE.Matrix4();
  private readonly materials = new Map<THREE.MeshStandardMaterial, () => void>();
  private readonly bias: number;
  private disposed = false;

  constructor(geometries: readonly THREE.BufferGeometry[], sunlight: THREE.Vector3Like, texelSize = 0.4) {
    if (!geometries.length || !Number.isFinite(texelSize) || texelSize <= 0)
      throw new Error('Static sunlight needs roof geometry and a positive texel size');
    const direction = new THREE.Vector3().copy(sunlight).normalize();
    if (!Number.isFinite(direction.lengthSq()) || direction.lengthSq() < 0.99)
      throw new Error('Static sunlight needs a finite nonzero sun direction');
    const u = new THREE.Vector3().crossVectors(Math.abs(direction.y) > 0.99
      ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), direction).normalize();
    const v = new THREE.Vector3().crossVectors(direction, u);
    const bounds = new THREE.Box3(), point = new THREE.Vector3();
    const projected = geometries.map(geometry => {
      const position = geometry.getAttribute('position');
      if (!position || position.itemSize !== 3) throw new Error('Static sunlight roof has no 3D vertices');
      const vertices: THREE.Vector3[] = [];
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i);
        const p = new THREE.Vector3(point.dot(u), point.dot(v), point.dot(direction));
        if (![p.x, p.y, p.z].every(Number.isFinite)) throw new Error('Static sunlight roof has invalid vertices');
        bounds.expandByPoint(p); vertices.push(p);
      }
      return { vertices, index: geometry.index };
    });
    if (bounds.isEmpty()) throw new Error('Static sunlight roof is empty');
    bounds.min.addScalar(-1); bounds.max.addScalar(1);
    const size = bounds.getSize(new THREE.Vector3());
    const width = Math.ceil(size.x / texelSize), height = Math.ceil(size.y / texelSize);
    if (width > 2048 || height > 2048) throw new Error('Static sunlight atlas exceeds its fixed texture budget');
    const depth = new Float32Array(width * height).fill(-Infinity);
    for (const { vertices, index } of projected) {
      const count = index?.count ?? vertices.length;
      for (let i = 0; i < count; i += 3) {
        const triangle = [0, 1, 2].map(j => vertices[index ? index.getX(i + j) : i + j]);
        const [a, b, c] = triangle.map(p => new THREE.Vector3(
          (p.x - bounds.min.x) / size.x * width, (p.y - bounds.min.y) / size.y * height, p.z));
        const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
        if (Math.abs(denominator) < 1e-8) continue;
        const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
        const maxX = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
        const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
        const maxY = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
        for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
          const wa = ((b.y - c.y) * (x + 0.5 - c.x) + (c.x - b.x) * (y + 0.5 - c.y)) / denominator;
          const wb = ((c.y - a.y) * (x + 0.5 - c.x) + (a.x - c.x) * (y + 0.5 - c.y)) / denominator;
          const wc = 1 - wa - wb;
          if (wa < -1e-7 || wb < -1e-7 || wc < -1e-7) continue;
          const offset = y * width + x;
          depth[offset] = Math.max(depth[offset], wa * a.z + wb * b.z + wc * c.z);
        }
      }
    }
    const data = new Uint8Array(width * height * 4);
    for (let i = 0; i < depth.length; i++) if (Number.isFinite(depth[i])) {
      const encoded = Math.round((depth[i] - bounds.min.z) / size.z * 65535);
      data.set([encoded >> 8, encoded & 255, 255, 255], i * 4);
    }
    this.texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    this.texture.name = 'Fixed tube sunlight depth';
    this.texture.minFilter = this.texture.magFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false; this.texture.needsUpdate = true;
    this.projection.set(
      u.x / size.x, u.y / size.x, u.z / size.x, -bounds.min.x / size.x,
      v.x / size.y, v.y / size.y, v.z / size.y, -bounds.min.y / size.y,
      direction.x / size.z, direction.y / size.z, direction.z / size.z, -bounds.min.z / size.z,
      0, 0, 0, 1,
    );
    this.bias = 0.3 / size.z;
  }

  applyTo(object: THREE.Object3D) {
    if (this.disposed) throw new Error('Static sunlight has been disposed');
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        if (!(material instanceof THREE.MeshStandardMaterial) || this.materials.has(material)) continue;
        const previous = material.onBeforeCompile, cacheKey = material.customProgramCacheKey;
        const restore = () => {
          material.onBeforeCompile = previous; material.customProgramCacheKey = cacheKey;
          material.removeEventListener('dispose', restore); this.materials.delete(material);
          material.needsUpdate = true;
        };
        this.materials.set(material, restore); material.addEventListener('dispose', restore);
        material.onBeforeCompile = (shader, renderer) => {
          previous.call(material, shader, renderer);
          shader.uniforms.staticSunDepth = { value: this.texture };
          shader.uniforms.staticSunProjection = { value: this.projection };
          shader.uniforms.staticSunTexel = { value: new THREE.Vector2(1 / this.texture.image.width, 1 / this.texture.image.height) };
          shader.uniforms.staticSunBias = { value: this.bias };
          shader.vertexShader = 'varying vec3 vStaticSunPosition;\n' + shader.vertexShader
            .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + worldPosition);
          shader.fragmentShader = fragment + shader.fragmentShader
            .replace('#include <lights_fragment_begin>', staticLighting);
        };
        material.customProgramCacheKey = () => `${cacheKey.call(material)}|static-tube-sun-v2`;
        material.needsUpdate = true;
      }
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const restore of [...this.materials.values()]) restore();
    this.texture.dispose();
  }
}
