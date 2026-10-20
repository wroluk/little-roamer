import * as THREE from 'three';
import { glacierFracture, GLACIER_MARGIN_WEIGHT, southernGlacier } from './iceland-lagoon';
import { icelandNoise } from './iceland-noise';
import { ICELAND_CELL, icelandBedHeight, icelandGridZ, icelandIceVertexHeight } from './iceland-terrain';

type Vertex = { x: number; y: number; z: number; weight: number };

/** A solid ice surface with its own buried margins, independent of the rock bed. */
export function buildIcelandGlacierGeometry() {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const vertices = new Map<string, number>(), samples = new Map<string, Vertex>();
  const sample = (ix: number, iz: number): Vertex => {
    const key = `${ix},${iz}`;
    let vertex = samples.get(key);
    if (!vertex) {
      const x = ix * ICELAND_CELL, z = icelandGridZ(iz), ice = southernGlacier(x, z);
      vertex = { x, z, y: icelandIceVertexHeight(x, z), weight: ice.weight }; samples.set(key, vertex);
    }
    return vertex;
  };
  const add = (p: Vertex, wall = false) => {
    const key = `${p.x},${p.y},${p.z}`;
    const found = vertices.get(key); if (found !== undefined) return found;
    const index = positions.length / 3;
    positions.push(p.x, p.y, p.z);
    const fracture = Math.min(1, glacierFracture(p.x, p.z) / 9);
    const variation = (icelandNoise(p.x / 11 + 41, p.z / 23) - 0.5) * 0.09
      + (wall ? (icelandNoise(p.x / 9 + p.z / 13, p.y / 5) - 0.5) * 0.045 : 0);
    const color = new THREE.Color().setRGB(0.78 + variation - fracture * 0.12,
      0.88 + variation - fracture * 0.09, 0.87 + variation - fracture * 0.07, THREE.SRGBColorSpace);
    colors.push(color.r, color.g, color.b); vertices.set(key, index); return index;
  };
  const intersect = (a: Vertex, b: Vertex): Vertex => {
    if (a.x > b.x || a.x === b.x && a.z > b.z) [a, b] = [b, a];
    const t = (GLACIER_MARGIN_WEIGHT - a.weight) / (b.weight - a.weight);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t, weight: GLACIER_MARGIN_WEIGHT };
  };
  const emit = (triangle: Vertex[]) => {
    const polygon: Vertex[] = [], crossings: Vertex[] = [];
    for (let i = 0; i < 3; i++) {
      const a = triangle[i], b = triangle[(i + 1) % 3];
      if (a.weight >= GLACIER_MARGIN_WEIGHT) polygon.push(a);
      if ((a.weight >= GLACIER_MARGIN_WEIGHT) !== (b.weight >= GLACIER_MARGIN_WEIGHT)) {
        const p = intersect(a, b); polygon.push(p); crossings.push(p);
      }
    }
    for (let i = 1; i + 1 < polygon.length; i++) indices.push(add(polygon[0]), add(polygon[i]), add(polygon[i + 1]));
    if (crossings.length !== 2) return;
    // The clipped polygon winds upward; reverse its contour edge for outward walls.
    const first = polygon.findIndex(p => p === crossings[0]), next = polygon[(first + 1) % polygon.length];
    const [a, b] = next === crossings[1] ? crossings : [...crossings].reverse();
    const rings = [0, 0.08, 0.72, 1];
    const wallPoint = (p: Vertex, t: number) => {
      const bottom = Math.min(p.y - 3, icelandBedHeight(p.x, p.z) - 2);
      return { ...p, y: p.y + (bottom - p.y) * t };
    };
    for (let i = 1; i < rings.length; i++) {
      const at = add(wallPoint(a, rings[i - 1]), true), bt = add(wallPoint(b, rings[i - 1]), true);
      const ab = add(wallPoint(a, rings[i]), true), bb = add(wallPoint(b, rings[i]), true);
      indices.push(bt, at, ab, bt, ab, bb);
    }
  };
  for (let iz = 37; iz < 222; iz++) for (let ix = 26; ix < 247; ix++) {
    const a = sample(ix, iz), b = sample(ix, iz + 1), c = sample(ix + 1, iz + 1), d = sample(ix + 1, iz);
    emit([a, b, d]); emit([d, b, c]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
