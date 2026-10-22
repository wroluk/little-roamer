import * as THREE from 'three';
import { calvingBay, glacierFracture, GLACIER_MARGIN_WEIGHT, ICELAND_GLACIER_BOUNDS, southernGlacier } from './iceland-lagoon';
import { icelandNoise } from './iceland-noise';
import { iceCaveInBounds, iceCaveVaultRise } from './iceland-ice-cave';
import { ICELAND_CELL, icelandBedHeight, icelandGridZ, icelandIceGridHeight, icelandIceGridBedHeight,
  icelandIceGridSample, forEachIcelandIceTriangle, icelandTerrainColor, sampleIcelandTriangle } from './iceland-terrain';

type Vertex = { x: number; y: number; z: number; weight: number; cave: number };

/** Blend only shallow land contacts; high snow and underwater calving ice stay clean. */
function blendGlacierTerrainColors(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute('position'), colors = geometry.getAttribute('color');
  const ground = new Map<string, number[]>();
  const groundAt = (x: number, z: number) => {
    const key = `${x},${z}`;
    let color = ground.get(key);
    if (!color) { color = icelandTerrainColor(x, z).map(Math.fround); ground.set(key, color); }
    return color;
  };
  for (let i = 0; i < colors.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const blend = (1 - THREE.MathUtils.smoothstep(y - icelandBedHeight(x, z), 0, 3)) * (1 - calvingBay(x, z));
    if (blend <= 0) continue;
    const terrain = [0, 1, 2].map(channel =>
      sampleIcelandTriangle(x, z, (x, z) => groundAt(x, z)[channel]));
    colors.setXYZ(i, THREE.MathUtils.lerp(colors.getX(i), terrain[0], blend),
      THREE.MathUtils.lerp(colors.getY(i), terrain[1], blend),
      THREE.MathUtils.lerp(colors.getZ(i), terrain[2], blend));
  }
}

export function icelandGlacierColor(x: number, z: number, variation = 0) {
  const fracture = Math.min(1, glacierFracture(x, z) / 9);
  variation += (icelandNoise(x / 11 + 41, z / 23) - 0.5) * 0.09;
  return new THREE.Color().setRGB(0.78 + variation - fracture * 0.12,
    0.88 + variation - fracture * 0.09, 0.87 + variation - fracture * 0.07, THREE.SRGBColorSpace);
}

/** A solid ice surface with its own buried margins, independent of the rock bed. */
export function buildIcelandGlacierGeometry() {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const vertices = new Map<string, number>(), samples = new Map<string, Vertex>();
  const sample = (ix: number, iz: number): Vertex => {
    const key = `${ix},${iz}`;
    let vertex = samples.get(key);
    if (!vertex) {
      const x = ix * ICELAND_CELL, z = icelandGridZ(iz), y = icelandIceGridHeight(ix, iz);
      vertex = { x, z, y, weight: icelandIceGridSample(ix, iz, (x, z) => southernGlacier(x, z).weight),
        cave: iceCaveInBounds(x, z) ? y - icelandIceGridBedHeight(ix, iz)
          - icelandIceGridSample(ix, iz, iceCaveVaultRise) : 1 };
      samples.set(key, vertex);
    }
    return vertex;
  };
  const add = (p: Vertex, wall = false) => {
    const key = `${p.x},${p.y},${p.z}`;
    const found = vertices.get(key); if (found !== undefined) return found;
    const index = positions.length / 3;
    positions.push(p.x, p.y, p.z);
    const color = icelandGlacierColor(p.x, p.z,
      wall ? (icelandNoise(p.x / 9 + p.z / 13, p.y / 5) - 0.5) * 0.045 : 0);
    colors.push(color.r, color.g, color.b); vertices.set(key, index); return index;
  };
  const intersect = (a: Vertex, b: Vertex): Vertex => {
    if (a.x > b.x || a.x === b.x && a.z > b.z) [a, b] = [b, a];
    const t = (GLACIER_MARGIN_WEIGHT - a.weight) / (b.weight - a.weight);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t, weight: GLACIER_MARGIN_WEIGHT, cave: a.cave + (b.cave - a.cave) * t };
  };
  const emit = (triangle: Vertex[]) => {
    let polygon: Vertex[] = [];
    const crossings: Vertex[] = [];
    for (let i = 0; i < 3; i++) {
      const a = triangle[i], b = triangle[(i + 1) % 3];
      if (a.weight >= GLACIER_MARGIN_WEIGHT) polygon.push(a);
      if ((a.weight >= GLACIER_MARGIN_WEIGHT) !== (b.weight >= GLACIER_MARGIN_WEIGHT)) {
        const p = intersect(a, b); polygon.push(p); crossings.push(p);
      }
    }
    const walls: Vertex[][] = [];
    const contour = (points: Vertex[], boundary: Vertex[]) => {
      if (boundary.length !== 2) return;
      const first = points.findIndex(p => p === boundary[0]), next = points[(first + 1) % points.length];
      walls.push(next === boundary[1] ? boundary : [...boundary].reverse());
    };
    contour(polygon, crossings);
    if (triangle.some(p => iceCaveInBounds(p.x, p.z))) {
      const intersection = (a: Vertex, b: Vertex): Vertex => {
        if (a.x > b.x || a.x === b.x && a.z > b.z) [a, b] = [b, a];
        const av = a.cave, bv = b.cave;
        const t = av / (av - bv);
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
          z: a.z + (b.z - a.z) * t, weight: a.weight + (b.weight - a.weight) * t, cave: 0 };
      };
      for (let i = walls.length - 1; i >= 0; i--) {
        const [a, b] = walls[i], av = a.cave, bv = b.cave;
        if (av < 0 && bv < 0) walls.splice(i, 1);
        else if ((av < 0) !== (bv < 0)) walls[i] = av < 0 ? [intersection(a, b), b] : [a, intersection(a, b)];
      }
      const clipped: Vertex[] = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i], b = polygon[(i + 1) % polygon.length];
        const av = a.cave, bv = b.cave;
        if (av >= 0) clipped.push(a);
        if ((av >= 0) !== (bv >= 0)) {
          clipped.push(intersection(a, b));
        }
      }
      polygon = clipped;
    }
    for (let i = 1; i + 1 < polygon.length; i++) indices.push(add(polygon[0]), add(polygon[i]), add(polygon[i + 1]));
    const rings = [0, 0.08, 0.72, 1];
    const wallPoint = (p: Vertex, t: number) => {
      const bottom = Math.min(p.y - 3, icelandBedHeight(p.x, p.z) - 2);
      return { ...p, y: p.y + (bottom - p.y) * t };
    };
    for (const [a, b] of walls) for (let i = 1; i < rings.length; i++) {
      const at = add(wallPoint(a, rings[i - 1]), true), bt = add(wallPoint(b, rings[i - 1]), true);
      const ab = add(wallPoint(a, rings[i]), true), bb = add(wallPoint(b, rings[i]), true);
      indices.push(bt, at, ab, bt, ab, bb);
    }
  };
  forEachIcelandIceTriangle(ICELAND_GLACIER_BOUNDS, (a, b, c) => {
    emit([sample(...a), sample(...b), sample(...c)]);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  blendGlacierTerrainColors(geometry);
  return geometry;
}
