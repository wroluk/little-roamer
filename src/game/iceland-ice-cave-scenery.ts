import * as THREE from 'three';
import { ICE_CAVE, iceCaveVaultRise } from './iceland-ice-cave';
import { GLACIER_MARGIN_WEIGHT, southernGlacier } from './iceland-lagoon';
import { icelandHash, icelandNoise } from './iceland-noise';
import { icelandGlacierColor } from './iceland-glacier';
import { ICELAND_CELL, icelandBedHeight, icelandGlacierHeight, icelandGridZ,
  icelandIceGridHeight, icelandIceGridBedHeight, icelandIceGridSample, forEachIcelandIceTriangle } from './iceland-terrain';

type CaveVertex = { x: number; y: number; z: number; clearance: number; rise: number; weight: number };

/** The cavity meets the outer glacier on the same triangles, not a planar portal collar. */
export function buildIceCaveGeometry() {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const samples = new Map<string, CaveVertex>(), vertices = new Map<string, number>();
  const sample = (ix: number, iz: number): CaveVertex => {
    const key = `${ix},${iz}`;
    let p = samples.get(key);
    if (!p) {
      const x = ix * ICELAND_CELL, z = icelandGridZ(iz);
      const bed = icelandIceGridBedHeight(ix, iz), rise = icelandIceGridSample(ix, iz, iceCaveVaultRise);
      const y = bed + rise;
      p = { x, y, z, rise, clearance: icelandIceGridHeight(ix, iz) - y,
        weight: icelandIceGridSample(ix, iz, (x, z) => southernGlacier(x, z).weight) };
      samples.set(key, p);
    }
    return p;
  };
  const add = (p: CaveVertex) => {
    const key = `${p.x},${p.y},${p.z}`, found = vertices.get(key);
    if (found !== undefined) return found;
    const index = positions.length / 3;
    positions.push(p.x, p.y, p.z);
    const band = icelandNoise(p.y / 1.7 + p.z / 19 + p.x / 23, p.x / 27);
    const grain = icelandNoise(p.x / 3, p.z / 5) * 0.035;
    const color = new THREE.Color().setRGB(0.16 + band * 0.22 + grain,
      0.42 + band * 0.24 + grain, 0.55 + band * 0.23 + grain, THREE.SRGBColorSpace);
    color.lerp(icelandGlacierColor(p.x, p.z), 1 - THREE.MathUtils.smoothstep(p.clearance, 2.5, 6));
    colors.push(color.r, color.g, color.b); vertices.set(key, index); return index;
  };
  const clip = (polygon: CaveVertex[], field: (p: CaveVertex) => number) => {
    const result: CaveVertex[] = [];
    for (let i = 0; i < polygon.length; i++) {
      let a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const av = field(a), bv = field(b);
      if (av >= 0) result.push(a);
      if ((av >= 0) !== (bv >= 0)) {
        if (a.x > b.x || a.x === b.x && a.z > b.z) [a, b] = [b, a];
        const t = field(a) / (field(a) - field(b));
        result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t,
          clearance: a.clearance + (b.clearance - a.clearance) * t,
          rise: a.rise + (b.rise - a.rise) * t, weight: a.weight + (b.weight - a.weight) * t });
      }
    }
    return result;
  };
  const emit = (triangle: CaveVertex[]) => {
    let polygon = clip(triangle, p => p.weight - GLACIER_MARGIN_WEIGHT);
    polygon = clip(polygon, p => p.clearance);
    polygon = clip(polygon, p => p.rise + 1);
    for (let i = 1; i + 1 < polygon.length; i++) indices.push(add(polygon[0]), add(polygon[i + 1]), add(polygon[i]));
  };
  forEachIcelandIceTriangle(ICE_CAVE, (a, b, c) => {
    emit([sample(...a), sample(...b), sample(...c)]);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

/** Roll the actual snow contour into one connected, ragged curtain at each mouth. */
export function buildIceCaveIcicles(cave: THREE.BufferGeometry, glacier: THREE.BufferGeometry) {
  const source = cave.getAttribute('position'), sourceIndex = cave.getIndex()!;
  const edges = new Map<string, { a: number; b: number; inside: number; count: number }>();
  for (let i = 0; i < sourceIndex.count; i += 3) for (let j = 0; j < 3; j++) {
    const a = sourceIndex.getX(i + j), b = sourceIndex.getX(i + (j + 1) % 3);
    const key = a < b ? `${a},${b}` : `${b},${a}`, edge = edges.get(key);
    if (edge) edge.count++;
    else edges.set(key, { a, b, inside: sourceIndex.getX(i + (j + 2) % 3), count: 1 });
  }
  const lipEdges: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
  const inwardAt = new Map<string, THREE.Vector3>();
  const key = (p: THREE.Vector3) => p.toArray().map(v => Math.round(v * 1000)).join(',');
  for (const edge of edges.values()) {
    if (edge.count !== 1) continue;
    const a = new THREE.Vector3().fromBufferAttribute(source, edge.a);
    const b = new THREE.Vector3().fromBufferAttribute(source, edge.b);
    if ([a, b].some(p => p.y - icelandBedHeight(p.x, p.z) < 4.8
      || Math.abs(p.y - icelandGlacierHeight(p.x, p.z)) > 0.02)) continue;
    const tangent = b.clone().sub(a).setY(0);
    if (tangent.lengthSq() < 1e-10) continue;
    const inward = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const inside = new THREE.Vector3().fromBufferAttribute(source, edge.inside).sub(a);
    if (inward.dot(inside) < 0) inward.negate();
    for (const p of [a, b]) {
      const k = key(p), previous = inwardAt.get(k);
      if (previous) previous.add(inward); else inwardAt.set(k, inward.clone());
    }
    lipEdges.push({ a, b });
  }
  for (const inward of inwardAt.values()) inward.normalize();
  const neighbours = new Map<string, { key: string; length: number }[]>(
    [...inwardAt.keys()].map(k => [k, []]));
  const endDistances = new Map([...inwardAt.keys()].map(k => [k, Infinity]));
  for (const { a, b } of lipEdges) {
    const ka = key(a), kb = key(b), length = a.distanceTo(b);
    neighbours.get(ka)!.push({ key: kb, length });
    neighbours.get(kb)!.push({ key: ka, length });
  }
  const pending = [...neighbours.keys()].filter(k => neighbours.get(k)!.length === 1);
  for (const k of pending) endDistances.set(k, 0);
  for (let i = 0; i < pending.length; i++) {
    const k = pending[i], distance = endDistances.get(k)!;
    for (const next of neighbours.get(k)!) if (distance + next.length < endDistances.get(next.key)!) {
      endDistances.set(next.key, distance + next.length); pending.push(next.key);
    }
  }
  const snowAt = new Map<string, { normal: THREE.Vector3; color: THREE.Color }>();
  const snowPositions = glacier.getAttribute('position'), snowNormals = glacier.getAttribute('normal');
  const snowColors = glacier.getAttribute('color'), p = new THREE.Vector3();
  for (let i = 0; i < snowPositions.count; i++) {
    p.fromBufferAttribute(snowPositions, i);
    if (p.x < ICE_CAVE.x0 || p.x > ICE_CAVE.x1 || p.z < ICE_CAVE.z0 || p.z > ICE_CAVE.z1) continue;
    const k = key(p);
    if (inwardAt.has(k)) snowAt.set(k, {
      normal: new THREE.Vector3().fromBufferAttribute(snowNormals, i),
      color: new THREE.Color().setRGB(snowColors.getX(i), snowColors.getY(i), snowColors.getZ(i)),
    });
  }
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const ceiling = new THREE.Mesh(cave, material); ceiling.updateMatrixWorld();
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0, 50);
  const roofAt = (x: number, z: number) => {
    ray.ray.origin.set(x, icelandBedHeight(x, z) + 2, z);
    return ray.intersectObject(ceiling)[0]?.point.y;
  };
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const columns = new Map<string, { start: number; links: number; normal: THREE.Vector3; point: THREE.Vector3;
    inward: THREE.Vector3 }>();
  const roots: { x: number; y: number; z: number; start: number; endDistance: number }[] = [];
  const icicles: { x: number; y: number; z: number; length: number; start: number }[] = [];
  const profileSize = 9, tipTint = new THREE.Color('#cbe6e5');
  const addColumn = (point: THREE.Vector3, inward: THREE.Vector3, normal: THREE.Vector3,
    snow: THREE.Color, tip: boolean, endDistance: number) => {
    const k = key(point), previous = columns.get(k);
    if (previous) return previous;
    const random = (channel: number) =>
      icelandHash(Math.round(point.x * 100) + channel * 17, Math.round(point.z * 100) + channel * 31);
    const reach = 0.85 + 0.3 * icelandNoise(point.x / 4, point.z / 5);
    let anchor: THREE.Vector3 | undefined;
    for (let inset = 0.65; inset <= 2.65; inset += 0.25) {
      const x = point.x + inward.x * inset, z = point.z + inward.z * inset, height = roofAt(x, z);
      if (height !== undefined && height + 0.22 < icelandGlacierHeight(x, z)) {
        anchor = new THREE.Vector3(x, height + 0.16, z); break;
      }
    }
    if (!anchor) throw new Error(`Unsupported glacier entrance lip at ${point.x}, ${point.z}`);
    let floor = -Infinity;
    for (const offset of [-0.45 * reach, 0, 0.3, 0.65])
      floor = Math.max(floor, icelandBedHeight(point.x + inward.x * offset, point.z + inward.z * offset));
    const length = Math.min(tip ? 1.4 + random(2) ** 0.8 * 2.2 : 0.7 + random(3) * 0.65,
      point.y - floor - 3.95);
    const middle = 0.6 + (length - 0.6) * 0.55;
    const profile = [[0, 0], [-0.21 * reach, 0.08], [-0.43 * reach, 0.3],
      [-0.4 * reach, 0.6], [-0.28 * reach, middle], [-0.1 * reach, length],
      [0, middle], [0.3, 0.48]];
    const start = positions.length / 3;
    const exposure = 0.02 + 0.98 * THREE.MathUtils.smoothstep(endDistance, 0, 3.2);
    for (let row = 0; row < profileSize; row++) {
      const [offset, drop] = row < profile.length ? profile[row] : [0, 0];
      const vertex = row === profile.length ? anchor
        : point.clone().addScaledVector(inward, offset).addScaledVector(THREE.Object3D.DEFAULT_UP, -drop);
      // Keep a finite closed cap, but bury it as the hanging profile retreats into the ice.
      if (row > 0 && row < profile.length) vertex.lerp(anchor, 1 - exposure);
      positions.push(vertex.x, vertex.y, vertex.z);
      const tint = snow.clone().lerp(tipTint, row >= 4 && row <= 6 ? 0.14 : 0);
      colors.push(tint.r, tint.g, tint.b);
    }
    const column = { start, links: 0, normal, point, inward };
    columns.set(k, column); roots.push({ x: point.x, y: point.y, z: point.z, start, endDistance });
    if (tip) icicles.push({ x: point.x, y: point.y, z: point.z, length, start });
    return column;
  };
  try {
    for (const { a, b } of lipEdges) {
      const ka = key(a), kb = key(b), first = snowAt.get(ka), last = snowAt.get(kb);
      if (!first || !last) throw new Error(`Cave entrance does not meet the snow mesh at ${ka} / ${kb}`);
      const length = a.distanceTo(b), count = Math.max(1, Math.ceil(length / 1.15));
      const fractions = [0];
      for (let j = 0; j < count; j++)
        fractions.push((j + 0.32 + 0.36 * icelandHash(Math.round(a.x * 100) + j * 17, Math.round(a.z * 100))) / count,
          (j + 1) / count);
      let previous: ReturnType<typeof addColumn> | undefined;
      for (const [j, t] of fractions.entries()) {
        const point = a.clone().lerp(b, t);
        const inward = inwardAt.get(ka)!.clone().lerp(inwardAt.get(kb)!, t).normalize();
        const normal = first.normal.clone().lerp(last.normal, t).normalize(), snow = first.color.clone().lerp(last.color, t);
        const endDistance = Math.min(endDistances.get(ka)! + t * length, endDistances.get(kb)! + (1 - t) * length);
        const current = addColumn(point, inward, normal, snow, j % 2 === 1, endDistance);
        if (previous) {
          for (let row = 0; row < profileSize; row++) {
            const next = (row + 1) % profileSize, x = previous.start, y = current.start;
            indices.push(x + row, y + row, x + next, y + row, y + next, x + next);
          }
          previous.links++; current.links++;
        }
        previous = current;
      }
    }
    for (const column of columns.values()) if (column.links === 1) {
      const contour = Array.from({ length: profileSize }, (_, row) => {
        const i = (column.start + row) * 3;
        const offset = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]).sub(column.point);
        return new THREE.Vector2(offset.dot(column.inward), offset.y);
      });
      for (const face of THREE.ShapeUtils.triangulateShape(contour, []))
        indices.push(...face.map(i => column.start + i));
    }
  } finally { material.dispose(); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const normals = geometry.getAttribute('normal');
  for (const { start, normal } of columns.values()) normals.setXYZ(start, normal.x, normal.y, normal.z);
  geometry.userData.icicleCount = icicles.length;
  geometry.userData.continuousLip = true;
  return { geometry, icicles, roots };
}
