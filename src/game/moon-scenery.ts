import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MOON_BASE, MOON_OVERLOOK, moonRandom, moonSurfaceHeight, moonTrailSample } from './moon-terrain';

export type MoonSolid = { x: number; y: number; z: number; hx: number; hy: number; hz: number };
export const MOON_EARTH_DIRECTION = new THREE.Vector3(0.16, 0.28, -1).normalize();
export const MOON_SHELTER = { x: MOON_BASE.x - 25, z: MOON_BASE.z + 5 };
const BASALT_COLOR = '#525451';
const HIGHLAND_COLOR = '#93958e';
export const MOON_BASALT_ROCKS = [
  { x: 22, z: 204 }, { x: 31, z: 207 }, { x: 38, z: 204 },
  { x: 129, z: 188 }, { x: 138, z: 192 }, { x: 146, z: 189 },
  { x: -28, z: 266 }, { x: -18, z: 270 }, { x: -11, z: 267 },
  { x: 130, z: 269 }, { x: 140, z: 273 }, { x: 149, z: 269 },
].map((point, i) => ({ ...point, width: 2.6 + moonRandom(i, 0, 60) * 2,
  depth: 1.5 + moonRandom(i, 0, 61), height: 0.9 + moonRandom(i, 0, 62) * 1.2,
  angle: -0.4 + moonRandom(i, 0, 63) * 0.8 }));
export const MOON_HIGHLAND_ROCKS = [
  { x: -228, z: -95, width: 3.2, depth: 2, height: 4.1, angle: 0.35 },
  { x: -218, z: -110, width: 2.5, depth: 2.1, height: 3.3, angle: -0.2 },
  { x: -218, z: -148, width: 3.4, depth: 1.7, height: 4.8, angle: 0.65 },
  { x: -217, z: -250, width: 2.8, depth: 2.4, height: 3.5, angle: -0.5 },
  { x: -170, z: -260, width: 3.6, depth: 2.2, height: 3.8, angle: 0.15 },
];

function groundRange(x: number, z: number, sx: number, sz: number) {
  let min = Infinity, max = -Infinity;
  const nx = Math.ceil(sx / 0.25), nz = Math.ceil(sz / 0.25);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const height = moonSurfaceHeight(x - sx / 2 + sx * i / nx, z - sz / 2 + sz * j / nz);
    min = Math.min(min, height); max = Math.max(max, height);
  }
  return { min, max };
}

export function moonSlabGeometry(rock: typeof MOON_BASALT_ROCKS[number]) {
  const vertices: number[] = [], indices: number[] = [], sides = 6;
  const footprint: { x: number; z: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = rock.angle + i / sides * Math.PI * 2;
    const radius = 0.85 + moonRandom(i, rock.x, 64) * 0.2;
    footprint.push({ x: rock.x + Math.cos(angle) * rock.width * radius,
      z: rock.z + Math.sin(angle) * rock.depth * radius });
  }
  const xs = footprint.map(p => p.x), zs = footprint.map(p => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const ground = groundRange((minX + maxX) / 2, (minZ + maxZ) / 2, maxX - minX, maxZ - minZ);
  for (const p of footprint) vertices.push(p.x, ground.min - 0.12, p.z);
  for (const [i, p] of footprint.entries()) vertices.push(rock.x + (p.x - rock.x) * 0.72,
    ground.max + rock.height * (0.7 + moonRandom(i, rock.z, 65) * 0.3), rock.z + (p.z - rock.z) * 0.72);
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    indices.push(i, i + sides, next, next, i + sides, next + sides);
    if (i > 0 && i < sides - 1) indices.push(0, i, next, sides, next + sides, i + sides);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  const flat = geometry.toNonIndexed(); geometry.dispose(); flat.computeVertexNormals();
  return flat;
}

const earthBlend = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
function earthNoise(x: number, y: number, z: number) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const u = earthBlend(x - ix), v = earthBlend(y - iy), w = earthBlend(z - iz);
  let value = 0;
  for (let dz = 0; dz <= 1; dz++) for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
    value += moonRandom(ix + dx, iz + dz, iy + dy + 47)
      * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
  }
  return value;
}
function earthTexture() {
  const width = 512, height = 256, data = new Uint8Array(width * height * 4);
  const ocean = [20, 76, 149], ground = [100, 133, 105], ice = [210, 226, 231];
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const lon = i / (width - 1) * Math.PI * 2, lat = (j / (height - 1) - 0.5) * Math.PI;
    const x = Math.cos(lat) * Math.cos(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.sin(lon);
    const field = Math.sin(lon * 2 + Math.sin(lat * 3) * 1.6)
      + Math.cos(lon * 3 - lat * 4) * 0.55 + Math.sin(lon * 7 + lat * 9) * 0.18;
    const land = earthBlend((field - 0.26) / 0.32) * (1 - earthBlend((Math.abs(lat) - 1.17) / 0.1));
    const polar = earthBlend((Math.abs(lat) - 1.22) / 0.11);
    // Spherical noise closes at the UV seam and poles, without repeated cloud dashes.
    const bend = earthNoise(x * 2 + 11, y * 2 + 7, z * 2 + 3) - 0.5;
    const clouds = earthNoise(x * 4 + bend * 2 + 17, y * 6 + 9, z * 4 - bend * 2 - 5) * 0.78
      + earthNoise(x * 13 + 3, y * 13 - 4, z * 13 + 8) * 0.22;
    const cloud = earthBlend((clouds - 0.39) / 0.4) * 0.72;
    const offset = (j * width + i) * 4;
    for (let k = 0; k < 3; k++) {
      const surface = ocean[k] + (ground[k] - ocean[k]) * land;
      const base = surface + (ice[k] - surface) * polar;
      data[offset + k] = base + (235 - base) * cloud;
    }
    data[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}
export function buildMoonSky() {
  const sky = new THREE.Group(); sky.name = 'Moon sky';
  const earth = new THREE.Mesh(new THREE.SphereGeometry(72, 48, 32),
    new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 1 }));
  earth.name = 'Earth'; earth.position.copy(MOON_EARTH_DIRECTION).multiplyScalar(1800);
  earth.frustumCulled = false;
  earth.rotation.set(0.18, -0.8, -0.25); sky.add(earth);
  // Translation follows the viewer, so Earth has no local parallax or apparent daily rise.
  earth.onBeforeRender = (_renderer, _scene, camera) => {
    earth.position.copy(camera.position).addScaledVector(MOON_EARTH_DIRECTION, 1800);
    earth.updateMatrixWorld();
  };
  return sky;
}

export function buildMoonScenery() {
  const group = new THREE.Group(); group.name = 'Moon pilot scenery';
  const solids: MoonSolid[] = [];
  const batches = new Map<string, THREE.BufferGeometry[]>();
  const part = (color: string, geometry: THREE.BufferGeometry, x: number, y: number, z: number,
    sx: number, sy: number, sz: number, solid = false) => {
    geometry.scale(sx, sy, sz).translate(x, y, z);
    const batch = batches.get(color) ?? []; batch.push(geometry); batches.set(color, batch);
    if (solid) solids.push({ x, y, z, hx: sx / 2, hy: sy / 2, hz: sz / 2 });
  };
  const box = (color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, solid = false) =>
    part(color, new THREE.BoxGeometry(), x, y, z, sx, sy, sz, solid);
  const groundedBox = (color: string, x: number, z: number, sx: number, sz: number, requestedTop: number) => {
    const ground = groundRange(x, z, sx, sz), bottom = ground.min - 0.08;
    const top = Math.max(requestedTop, ground.max + 0.08);
    box(color, x, (bottom + top) / 2, z, sx, top - bottom, sz, true);
  };
  const bx = MOON_SHELTER.x, bz = MOON_SHELTER.z;
  // Keep the raised deck above its whole footprint, not just the centre sample.
  const base = Math.max(moonSurfaceHeight(bx, bz), groundRange(bx, bz, 9, 7).max - 0.45);
  box('#d8d6c9', bx, base + 2.8, bz, 8, 4.2, 6, true);
  box('#a89b6c', bx, base + 0.9, bz, 9, 0.6, 7, true);
  box('#233740', bx + 4.05, base + 3, bz, 0.1, 1.7, 3.4);
  box('#c47c3e', bx, base + 5.05, bz, 3, 0.35, 3);
  for (const dx of [-3.5, 3.5]) for (const dz of [-2.5, 2.5]) {
    const ground = moonSurfaceHeight(bx + dx, bz + dz), top = base + 1.1;
    groundedBox('#656569', bx + dx, bz + dz, 0.45, 0.45, top);
    groundedBox('#a89b6c', bx + dx, bz + dz, 1.4, 1.4, ground + 0.225);
  }
  for (const dz of [-7, 0, 7]) {
    const x = MOON_BASE.x - 35, z = MOON_BASE.z + dz;
    const y = moonSurfaceHeight(x, z);
    box('#3b5368', x, y + 1.5, z, 8, 0.15, 4.5, true);
    for (const dx of [-3, 3]) {
      groundedBox('#8a8b89', x + dx, z, 0.2, 0.2, y + 1.5);
    }
    for (const dx of [-2, 0, 2]) box('#72828b', x + dx, y + 1.59, z, 0.06, 0.02, 4.4);
  }
  const mastX = MOON_BASE.x + 10, mastZ = MOON_BASE.z + 16;
  const mastY = moonSurfaceHeight(mastX, mastZ);
  groundedBox('#b2b3ad', mastX, mastZ, 0.24, 0.24, mastY + 8.1);
  part('#d8d6c9', new THREE.SphereGeometry(1, 12, 6), mastX, mastY + 7.5, mastZ, 1.7, 0.5, 1.7);
  const instrumentX = MOON_OVERLOOK.x - 12, instrumentZ = MOON_OVERLOOK.z + 5;
  const instrumentY = moonSurfaceHeight(instrumentX, instrumentZ);
  groundedBox('#d8d6c9', instrumentX, instrumentZ, 1.7, 1.3, instrumentY + 1.6);
  box('#a89b6c', instrumentX, instrumentY + 2, instrumentZ, 0.12, 2.5, 0.12);
  for (let z = -280; z <= 260; z += 22) for (let x = -270; x <= 270; x += 22) {
    if (moonRandom(x, z, 20) < 0.46) continue;
    const px = x + (moonRandom(x, z, 21) - 0.5) * 16, pz = z + (moonRandom(x, z, 22) - 0.5) * 16;
    if (moonTrailSample(px, pz).distance < 13 || Math.hypot(px - MOON_BASE.x, pz - MOON_BASE.z) < 43) continue;
    const width = 0.7 + moonRandom(x, z, 23) ** 2 * 3.4, height = width * (0.45 + moonRandom(x, z, 24) * 0.4);
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    geometry.rotateY(moonRandom(x, z, 25) * Math.PI).scale(width, height, width * 0.8);
    const positions = geometry.getAttribute('position');
    let support = Infinity;
    for (let i = 0; i < positions.count; i++) {
      if (positions.getY(i) > 0) continue;
      support = Math.min(support, moonSurfaceHeight(px + positions.getX(i), pz + positions.getZ(i)) - positions.getY(i));
    }
    geometry.translate(px, support - height * 0.15, pz);
    const batch = batches.get('#777874') ?? []; batch.push(geometry); batches.set('#777874', batch);
  }
  for (const rock of [...MOON_BASALT_ROCKS, ...MOON_HIGHLAND_ROCKS]) {
    if (moonTrailSample(rock.x, rock.z).distance < rock.width + 13)
      throw new Error(`Moon rock overlaps a driving corridor at ${rock.x},${rock.z}`);
    const color = rock.z > 0 ? BASALT_COLOR : HIGHLAND_COLOR;
    const batch = batches.get(color) ?? [];
    batch.push(moonSlabGeometry(rock)); batches.set(color, batch);
  }
  for (const [color, geometries] of batches) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
    // Box and rock primitives differ in UV topology; all carry the same attributes.
    const sources = geometries.map(g => g.index ? g.toNonIndexed() : g);
    const geometry = mergeGeometries(sources);
    for (const source of sources) source.dispose();
    if (!geometry) throw new Error('Moon scenery batching failed');
    const mesh = new THREE.Mesh(geometry, material);
    const rocks = color === '#777874' || color === BASALT_COLOR || color === HIGHLAND_COLOR;
    mesh.name = rocks ? 'Moon solid rocks' : 'Moon base fixtures';
    mesh.castShadow = !rocks; mesh.receiveShadow = true; group.add(mesh);
    for (const source of geometries) source.dispose();
  }
  return { group, solids };
}
