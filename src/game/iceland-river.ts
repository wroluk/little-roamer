import * as THREE from 'three';
import { FALL } from './iceland-layout';
import { ICELAND_CELL, SKOGA_WATER_START, icelandGridZ, icelandSurfaceHeight, riverLevel } from './iceland-terrain';

export const SKOGA_WATER_MIN_X = -239 * ICELAND_CELL;
export const SKOGA_WATER_MAX_X = -208 * ICELAND_CELL;
export const SKOGA_SEA_Y = -0.015;
// Handoff happens while the river is narrower than its rectangular generator
// corridor. The sea owns all water south of this cross-section.
export const SKOGA_MOUTH_Z = 635;
type Vertex = { x: number; y: number; z: number; depth: number };

/** Clip water to the actual terrain triangles, as in Northern Reach. */
export function buildIcelandRiverGeometry() {
  const positions: number[] = [], depths: number[] = [], colors: number[] = [];
  const shallow = new THREE.Color('#8bc7be'), deep = new THREE.Color('#397f88');
  const sea = new THREE.Color('#194451'), crestWater = new THREE.Color('#e8f2ef');
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
        .lerp(crestWater, crest * 0.85).lerp(sea, join);
      const shallowOpacity = Math.max(0, Math.min(1, v.depth / 0.35));
      const easedOpacity = shallowOpacity * shallowOpacity * (3 - 2 * shallowOpacity);
      const riverOpacity = 0.56 * easedOpacity + (0.92 - 0.56 * easedOpacity) * crest;
      colors.push(color.r, color.g, color.b, riverOpacity * (1 - join) + join);
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
  const vertices: number[] = [];
  const rectangle = (x0: number, x1: number, z0: number, z1: number) => {
    vertices.push(x0, SKOGA_SEA_Y, z0, x0, SKOGA_SEA_Y, z1, x1, SKOGA_SEA_Y, z0,
      x1, SKOGA_SEA_Y, z0, x0, SKOGA_SEA_Y, z1, x1, SKOGA_SEA_Y, z1);
  };
  rectangle(-5000, SKOGA_WATER_MIN_X, -5000, 5000);
  rectangle(SKOGA_WATER_MAX_X, 5000, -5000, 5000);
  rectangle(SKOGA_WATER_MIN_X, SKOGA_WATER_MAX_X, -5000, SKOGA_WATER_START);
  rectangle(SKOGA_WATER_MIN_X, SKOGA_WATER_MAX_X, SKOGA_MOUTH_Z, 5000);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}
