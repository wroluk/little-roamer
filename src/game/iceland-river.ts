import { LAGOON_WATER_BOUNDS } from './iceland-lagoon';
import * as THREE from 'three';
import { FALL } from './iceland-layout';
import { ICELAND_CELL, SKOGA_WATER_START, icelandGridZ, icelandSurfaceHeight, riverLevel } from './iceland-terrain';
import { reynisCoastWeight } from './iceland-reynisfjara';

export const SKOGA_WATER_MIN_X = -239 * ICELAND_CELL;
export const SKOGA_WATER_MAX_X = -208 * ICELAND_CELL;
export const SKOGA_SEA_Y = -0.015;
// Handoff happens while the river is narrower than its rectangular generator
// corridor. The sea owns all water south of this cross-section.
export const SKOGA_MOUTH_Z = 635;
export const REYNIS_SHALLOW_BOUNDS = { x0: -312, x1: -36, z0: 660, z1: 770.4 };
type Vertex = { x: number; y: number; z: number; depth: number };

/** Shared coastal palette: pale tidal shallows fade into opaque deep Atlantic water. */
export function icelandSeaTint(x: number, z: number) {
  // The submerged streaming apron is not a second shoreline.
  if (Math.max(Math.abs(x), Math.abs(z)) >= 768) return { color: new THREE.Color('#194451'), alpha: 1 };
  const depth = Math.max(0, -icelandSurfaceHeight(x, z));
  const blend = THREE.MathUtils.smoothstep(depth, 0, 8);
  const color = new THREE.Color('#75a9ab').lerp(new THREE.Color('#194451'), blend);
  return { color, alpha: 0.48 + 0.52 * THREE.MathUtils.smoothstep(depth, 0, 2.4) };
}

/** Clip water to the actual terrain triangles, as in Northern Reach. */
export function buildIcelandRiverGeometry() {
  const positions: number[] = [], depths: number[] = [], colors: number[] = [];
  const shallow = new THREE.Color('#8bc7be'), deep = new THREE.Color('#397f88');
  const crestWater = new THREE.Color('#e8f2ef');
  const emit = (triangle: Vertex[]) => {
    const polygon: Vertex[] = [];
    for (let i = 0; i < 3; i++) {
      const a = triangle[i], b = triangle[(i + 1) % 3];
      if (a.depth >= 0) polygon.push(a);
      if ((a.depth >= 0) !== (b.depth >= 0)) {
        const t = a.depth / (a.depth - b.depth);
        polygon.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
          z: a.z + (b.z - a.z) * t, depth: 0 });
      }
    }
    for (let i = 1; i + 1 < polygon.length; i++) for (const v of [polygon[0], polygon[i], polygon[i + 1]]) {
      const t = Math.max(0, Math.min(1, (v.z - (SKOGA_MOUTH_Z - 32)) / 32));
      const join = t * t * (3 - 2 * t);
      positions.push(v.x, v.y + 0.008 * (1 - join) + SKOGA_SEA_Y * join, v.z); depths.push(v.depth);
      const approach = Math.max(0, Math.min(1, (v.z - (FALL.terrainLipZ - 6)) / 6));
      const wet = Math.max(0, Math.min(1, v.depth / 0.25));
      const crest = v.y > 40 ? approach * approach * (3 - 2 * approach) * wet * wet * (3 - 2 * wet) : 0;
      const color = shallow.clone().lerp(deep, Math.min(1, v.depth / 2))
        .lerp(crestWater, crest * 0.85).lerp(icelandSeaTint(v.x, v.z).color, join);
      const shallowOpacity = Math.max(0, Math.min(1, v.depth / 0.35));
      const easedOpacity = shallowOpacity * shallowOpacity * (3 - 2 * shallowOpacity);
      const riverOpacity = 0.56 * easedOpacity + (0.92 - 0.56 * easedOpacity) * crest;
      colors.push(color.r, color.g, color.b, riverOpacity * (1 - join) + icelandSeaTint(v.x, v.z).alpha * join);
    }
  };
  for (const [start, end, upper] of [[SKOGA_WATER_START, FALL.lipZ, true], [FALL.lipZ, SKOGA_MOUTH_Z, false]] as const) {
    const rows = [start];
    for (let j = Math.ceil(start / ICELAND_CELL); j * ICELAND_CELL < end; j++) {
      const z = icelandGridZ(j);
      if (z > start && z < end && (!upper || z <= FALL.terrainLipZ)) rows.push(z);
    }
    rows.push(end);
    const vertex = (x: number, z: number): Vertex => {
      const y = upper ? riverLevel(Math.min(z, FALL.terrainLipZ)) : riverLevel(Math.max(482, z));
      return { x, y, z, depth: y - icelandSurfaceHeight(x, upper ? Math.min(z, FALL.terrainLipZ) : z) };
    };
    for (let j = 0; j + 1 < rows.length; j++) for (let i = -239; i < -208; i++) {
      const a = vertex(i * ICELAND_CELL, rows[j]), b = vertex((i + 1) * ICELAND_CELL, rows[j]);
      const c = vertex(i * ICELAND_CELL, rows[j + 1]), d = vertex((i + 1) * ICELAND_CELL, rows[j + 1]);
      emit([a, c, b]); emit([b, c, d]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  // Four-component vertex colours let Three's standard shader apply the
  // per-vertex shallow opacity without a fragile custom shader override.
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  geometry.setAttribute('waterDepth', new THREE.Float32BufferAttribute(depths, 1));
  geometry.computeVertexNormals();
  return geometry;
}

/** Ocean takes over only after the river has reached sea level. */
export function buildIcelandSeaGeometry() {
  const vertices: number[] = [], colors: number[] = [];
  const tintCache = new Map<string, ReturnType<typeof icelandSeaTint>>();
  const cuts = (a: number, b: number) => {
    const result = [a];
    if (a < -840 && b > -840) result.push(-840);
    for (let v = Math.ceil(Math.max(a, -840) / 4.8) * 4.8; v < Math.min(b, 840); v += 4.8)
      if (v > a + 0.001) result.push(v);
    if (a < 840 && b > 840) result.push(840);
    result.push(b); return result;
  };
  const rectangle = (x0: number, x1: number, z0: number, z1: number) => {
    const xs = cuts(x0, x1), zs = cuts(z0, z1);
    const tintAt = (x: number, z: number) => {
      const key = `${x},${z}`;
      let tint = tintCache.get(key);
      if (!tint) {
        tint = Math.abs(x) >= 840 || Math.abs(z) >= 840
          ? { color: new THREE.Color('#194451'), alpha: 1 } : icelandSeaTint(x, z);
        tintCache.set(key, tint);
      }
      return tint;
    };
    const emit = (x: number, z: number) => {
      const tint = tintAt(x, z);
      vertices.push(x, SKOGA_SEA_Y, z); colors.push(tint.color.r, tint.color.g, tint.color.b, tint.alpha);
    };
    const same = (a: ReturnType<typeof tintAt>, b: ReturnType<typeof tintAt>) => a.alpha === b.alpha && a.color.equals(b.color);
    // Merge uniform deep-water/hidden inland cells. Retain fine cells only where
    // depth changes the coastal tint; identical flat water needs no dense grid.
    for (let j = 1; j < zs.length; j++) for (let i = 1; i < xs.length;) {
      const start = i - 1, tint = tintAt(xs[start], zs[j - 1]);
      const uniform = (k: number) => same(tint, tintAt(xs[k], zs[j - 1])) && same(tint, tintAt(xs[k], zs[j]));
      if (uniform(start) && uniform(i)) while (i + 1 < xs.length && uniform(i + 1)) i++;
      emit(xs[start], zs[j - 1]); emit(xs[start], zs[j]); emit(xs[i], zs[j - 1]);
      emit(xs[i], zs[j - 1]); emit(xs[start], zs[j]); emit(xs[i], zs[j]);
      i++;
    }

  };
  rectangle(-5000, SKOGA_WATER_MIN_X, -5000, 5000);
  rectangle(SKOGA_WATER_MAX_X, REYNIS_SHALLOW_BOUNDS.x0, -5000, 5000);
  rectangle(REYNIS_SHALLOW_BOUNDS.x0, REYNIS_SHALLOW_BOUNDS.x1, -5000, REYNIS_SHALLOW_BOUNDS.z0);
  rectangle(REYNIS_SHALLOW_BOUNDS.x0, REYNIS_SHALLOW_BOUNDS.x1, REYNIS_SHALLOW_BOUNDS.z1, 5000);
  rectangle(REYNIS_SHALLOW_BOUNDS.x1, LAGOON_WATER_BOUNDS.x0, -5000, 5000);
  rectangle(LAGOON_WATER_BOUNDS.x0, LAGOON_WATER_BOUNDS.x1, -5000, LAGOON_WATER_BOUNDS.z0);
  rectangle(LAGOON_WATER_BOUNDS.x0, LAGOON_WATER_BOUNDS.x1, LAGOON_WATER_BOUNDS.z1, 5000);
  rectangle(LAGOON_WATER_BOUNDS.x1, 5000, -5000, 5000);
  rectangle(SKOGA_WATER_MIN_X, SKOGA_WATER_MAX_X, -5000, SKOGA_WATER_START);
  rectangle(SKOGA_WATER_MIN_X, SKOGA_WATER_MAX_X, SKOGA_MOUTH_Z, 5000);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  geometry.computeVertexNormals();
  return geometry;
}

/** Transparent, depth-tinted shore water clipped to the same terrain triangles. */
export function buildReynisShallowGeometry() {
  const { x0, x1, z0, z1 } = REYNIS_SHALLOW_BOUNDS;
  const positions: number[] = [], colors: number[] = [];
  const shallow = new THREE.Color('#6aa7a6'), deep = new THREE.Color('#194451');
  const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
  const vertex = (x: number, z: number): Vertex => ({ x, z, y: SKOGA_SEA_Y + 0.008,
    depth: -icelandSurfaceHeight(x, z) });
  const emit = (triangle: Vertex[]) => {
    const polygon: Vertex[] = [];
    for (let i = 0; i < 3; i++) {
      const a = triangle[i], b = triangle[(i + 1) % 3];
      if (a.depth >= 0) polygon.push(a);
      if ((a.depth >= 0) !== (b.depth >= 0)) {
        const t = a.depth / (a.depth - b.depth);
        polygon.push({ x: a.x + (b.x - a.x) * t, y: a.y,
          z: a.z + (b.z - a.z) * t, depth: 0 });
      }
    }
    for (let i = 1; i + 1 < polygon.length; i++) for (const v of [polygon[0], polygon[i], polygon[i + 1]]) {
      positions.push(v.x, v.y, v.z);
      const depth = smooth(v.depth / 3.5);
      const edge = 1 - reynisCoastWeight(v.x);
      const towardOpenSea = smooth((v.z - z1 + 22) / 22);

      const shared = icelandSeaTint(v.x, v.z);
      const color = shallow.clone().lerp(deep, depth).lerp(shared.color, Math.max(edge, towardOpenSea));
      const boundary = Math.max(edge, towardOpenSea);
      const opacity = (0.34 + 0.6 * smooth(v.depth / 1.5)) * (1 - boundary) + shared.alpha * boundary;
      colors.push(color.r, color.g, color.b, opacity);
    }
  };
  const nx = Math.round((x1 - x0) / ICELAND_CELL), nz = Math.round((z1 - z0) / ICELAND_CELL);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * ICELAND_CELL, z = z0 + j * ICELAND_CELL;
    const a = vertex(x, z), b = vertex(x, z + ICELAND_CELL);
    const c = vertex(x + ICELAND_CELL, z + ICELAND_CELL), d = vertex(x + ICELAND_CELL, z);
    emit([a, b, d]); emit([d, b, c]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  geometry.computeVertexNormals();
  return geometry;
}
