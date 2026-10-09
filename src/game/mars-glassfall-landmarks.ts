import * as THREE from 'three';
import { marsGlassAt, marsGlassMargin, marsSurfaceHeight, marsTrailSample, MARS_CELL, MARS_CELLS } from './mars-terrain';
import { glassfallWeight, GLASSFALL_SCAR } from './mars-glassfall-layout';
import { marsRockGeometry, groundMarsRock } from './mars-landmarks';

type Add = (geometry: THREE.BufferGeometry, material: THREE.Material, solid?: boolean) => void;
export function glassfallRelief(x: number, z: number): number {
  const t = Math.max(0, Math.min(1, marsGlassMargin(x, z) / 1.8));
  const bevel = t * t * (3 - 2 * t);
  return bevel * (0.38 + 0.07 * Math.sin(x * 0.16 + z * 0.11));
}
/** Beveled glass slabs seated on the terrain, shared by rendering and collision. */
export function glassfallSkinGeometry(cx: number, cz: number): THREE.BufferGeometry | null {
  if (cx < 1 || cx > 3 || cz < -1 || cz > 1) return null;
  const vertices: number[] = [], colors: number[] = [];
  const cell = MARS_CELL / 4, cells = MARS_CELLS * 4;
  const margins = new Map<number, number>();
  const heights = new Map<string, number>();
  const terrainHeights = new Map<string, number>();
  const terrainVertex = (i: number, j: number) => {
    const key = `${i},${j}`;
    let height = terrainHeights.get(key);
    if (height === undefined) {
      height = marsSurfaceHeight(i * MARS_CELL, j * MARS_CELL);
      terrainHeights.set(key, height);
    }
    return height;
  };
  const heightAt = (x: number, z: number) => {
    const key = `${x},${z}`;
    let height = heights.get(key);
    if (height === undefined) {
      const gx = x / MARS_CELL, gz = z / MARS_CELL;
      const i = Math.floor(gx), j = Math.floor(gz), u = gx - i, v = gz - j;
      const a = terrainVertex(i + 1, j), b = terrainVertex(i, j + 1);
      if (u + v <= 1) {
        const c = terrainVertex(i, j);
        height = c + u * (a - c) + v * (b - c);
      } else {
        const c = terrainVertex(i + 1, j + 1);
        height = c + (1 - u) * (b - c) + (1 - v) * (a - c);
      }
      height += glassfallRelief(x, z);
      heights.set(key, height);
    }
    return height;
  };
  const marginAt = (i: number, j: number) => {
    const key = j * (cells + 1) + i;
    let margin = margins.get(key);
    if (margin === undefined) {
      margin = marsGlassMargin(cx * 96 + i * cell, cz * 96 + j * cell);
      margins.set(key, margin);
    }
    return margin;
  };
  type Point = { x: number; z: number; margin: number };
  const emit = (points: Point[], depth = 0) => {
      if (points.every(p => p.margin <= 0)) return;
      if (depth < 3 && points.some(p => p.margin <= 0)) {
        const mid = points.map((a, k) => {
          const b = points[(k + 1) % 3], x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
          return { x, z, margin: marsGlassMargin(x, z) };
        });
        emit([points[0], mid[0], mid[2]], depth + 1);
        emit([mid[0], points[1], mid[1]], depth + 1);
        emit([mid[2], mid[1], points[2]], depth + 1);
        emit([mid[0], mid[1], mid[2]], depth + 1);
        return;
      }
      const clipped: { x: number; z: number }[] = [];
      for (let k = 0; k < 3; k++) {
        const a = points[k], b = points[(k + 1) % 3];
        if (a.margin > 0) clipped.push(a);
        if ((a.margin > 0) !== (b.margin > 0)) {
          let lo = 0, hi = 1;
          for (let n = 0; n < 7; n++) {
            const mid = (lo + hi) / 2;
            if ((marsGlassMargin(a.x + (b.x - a.x) * mid, a.z + (b.z - a.z) * mid) > 0) === (a.margin > 0)) lo = mid;
            else hi = mid;
          }
          const t = (lo + hi) / 2;
          clipped.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
        }
      }
      for (let k = 1; k < clipped.length - 1; k++) {
        const face = [clipped[0], clipped[k], clipped[k + 1]].map(p => ({ x: Math.fround(p.x), z: Math.fround(p.z) }));
        const [a, b, c] = face;
        if (Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)) < 1e-9) continue;
        for (const { x: px, z: pz } of face) {
          vertices.push(px, heightAt(px, pz), pz);
          colors.push(0.008, 0.008, 0.008);
        }
      }
  };
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const x = cx * 96 + i * cell, z = cz * 96 + j * cell;
    if (x < 164 || x > 301 || z < -31 || z > 101) continue;
    for (const triangle of [[[0, 0], [0, 1], [1, 0]], [[1, 0], [0, 1], [1, 1]]]) {
      const points = triangle.map(([dx, dz]) => {
        const px = x + dx * cell, pz = z + dz * cell;
        return { x: px, z: pz, margin: marginAt(i + dx, j + dz) };
      });
      emit(points);
    }
  }
  if (!vertices.length) return null;
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals(); return geometry;
}

export function addGlassfallDecor(cx: number, cz: number, add: Add) {
  if (cx < 1 || cx > 3 || cz < -1 || cz > 1) return;
  const pale = new THREE.MeshStandardMaterial({ color: '#dac49c', roughness: 0.9, flatShading: true });
  const charcoal = new THREE.MeshStandardMaterial({ color: '#242e30', roughness: 0.23, metalness: 0.25, flatShading: true });
  const glass = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.65, metalness: 0, flatShading: true,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  glass.userData.castShadow = false;
  const used = new Set<THREE.Material>();
  const put: Add = (geometry, material, solid = true) => { used.add(material); add(geometry, material, solid); };
  const owns = (x: number, z: number) => Math.floor(x / 96) === cx && Math.floor(z / 96) === cz;
  const rock = (x: number, z: number, width: number, height: number, yaw: number, material: THREE.Material) => {
    if (!owns(x, z)) return;
    put(groundMarsRock(marsRockGeometry(width, height, x * 0.37 + z * 0.13).rotateY(yaw), x, z), material);
  };
  const skin = glassfallSkinGeometry(cx, cz);
  if (skin) put(skin, glass, true);
  // A compact source cluster sits in the shared melt pool, away from the driving routes.
  rock(GLASSFALL_SCAR.x, GLASSFALL_SCAR.z, 3.4, 5.8, 0.5, charcoal);
  for (const [x, z, width, height, yaw] of [
    [277, -20, 3.2, 4.1, -0.4], [286, -21, 2.8, 5.2, 0.8],
    [288, -15, 2.5, 3.3, -0.7], [279, -12, 2.9, 2.7, 1.2],
    [275, -15, 1.9, 2.1, 0.3],
  ]) rock(x, z, width, height, yaw, charcoal);
  // Paired threshold slabs mark arrival; a split shield frames the basin against its eastern wall.
  for (const [x, z, w, h, yaw] of [[182, -57, 4.2, 3.2, 0.4], [177, -49, 2.8, 5.5, 0.5],
    [335, 20, 5.5, 15, -0.4], [338, 34, 6.5, 10, -0.7], [326, 47, 4, 3.8, -0.3],
    [193, 92, 6, 2, 0.7], [217, 98, 4, 2.8, 0.9], [159, 49, 4.5, 2, -0.8]]) rock(x, z, w, h, yaw, pale);
  // Sparse, elongated ejecta plates follow the impact's radial pattern, clear of every road.
  for (let ray = 0; ray < 5; ray++) for (let step = 0; step < 3; step++) {
    const angle = 1.25 + ray * 0.34, radius = 36 + step * 18;
    const x = GLASSFALL_SCAR.x + Math.cos(angle) * radius, z = GLASSFALL_SCAR.z + Math.sin(angle) * radius;
    if (glassfallWeight(x, z) < 0.4 || marsGlassAt(x, z) || marsTrailSample(x, z).distance < 10) continue;
    rock(x, z, 2.3 + step * 0.6, 0.65 + (ray % 3) * 0.45, angle, pale);
  }
  for (const material of [pale, charcoal, glass]) if (!used.has(material)) material.dispose();
}
