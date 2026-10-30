import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { islandGroundHeight, islandHash, islandRouteSample, ISLAND_STARTS } from './island-terrain';

export type IslandTree = { x: number; y: number; z: number; height: number; radius: number; palm: boolean; lean: number; angle: number };
export function islandTrees(): IslandTree[] {
  const trees: IslandTree[] = [];
  for (let j = -18; j <= 17; j++) for (let i = -19; i <= 19; i++) {
    const seed = islandHash(i + 370, j - 91), x = i * 9 + (seed - 0.5) * 7;
    const z = j * 9 + (islandHash(i - 40, j + 8) - 0.5) * 7, y = islandGroundHeight(x, z);
    const palm = y < 7;
    if (seed < (palm ? 0.48 : 0.12) || y < 1.8 || y > 39
      || islandRouteSample(x, z, true).distance < (palm ? 10 : 11)
      || ISLAND_STARTS.some(s => Math.hypot(x - s.position.x, z - s.position.z) < 13)
      || z > 8 && z < 120 && Math.abs(x - (64 + z * 0.32)) < 16 + z * 0.08
      || Math.abs(x) < 43 && Math.abs(z) < 12) continue;
    const slope = Math.max(Math.abs(islandGroundHeight(x + 1, z) - y), Math.abs(islandGroundHeight(x, z + 1) - y));
    if (slope > 0.85) continue;
    trees.push({ x, y, z, palm, height: (palm ? 10 : 13) + islandHash(i + 7, j - 44) * (palm ? 6 : 10),
      radius: palm ? 0.3 : 0.55 + seed * 0.35, lean: (palm ? 1.6 : 0.45) * seed,
      angle: islandHash(i + 31, j) * Math.PI * 2 });
  }
  return trees;
}

export function islandAqueductGeometry() {
  const pieces: THREE.BufferGeometry[] = [];
  for (const centre of [-24, 0, 24]) {
    const shape = new THREE.Shape();
    shape.moveTo(centre - 12, -3); shape.lineTo(centre - 9, -3); shape.lineTo(centre - 9, 14);
    for (let step = 0; step <= 24; step++) {
      const t = Math.PI * (1 - step / 24);
      shape.lineTo(centre + Math.cos(t) * 9, 14 + Math.sin(t) * 9);
    }
    shape.lineTo(centre + 9, -3); shape.lineTo(centre + 12, -3);
    shape.lineTo(centre + 12, 25.2); shape.lineTo(centre - 12, 25.2); shape.closePath();
    pieces.push(new THREE.ExtrudeGeometry(shape, { depth: 6.8, bevelEnabled: false, steps: 1 }).translate(0, 0, -3.4));
  }
  pieces.push(new THREE.BoxGeometry(76, 0.8, 8.4).translate(0, 25.6, 0));
  for (const side of [-1, 1]) pieces.push(new THREE.BoxGeometry(76, 0.85, 0.6).translate(0, 26.425, side * 4.5));
  const geometry = mergeGeometries(pieces.map(g => g.index ? g.toNonIndexed() : g));
  for (const piece of pieces) piece.dispose();
  if (!geometry) throw new Error('Island aqueduct geometry could not be merged');
  return geometry;
}

export function buildIslandScenery() {
  const group = new THREE.Group(), solids: THREE.Mesh[] = [];
  const batches = new Map<string, { color: string; geometries: THREE.BufferGeometry[]; solid: boolean; shadow: boolean }>();
  const add = (name: string, color: string, geometry: THREE.BufferGeometry, solid = false, shadow = false) => {
    let batch = batches.get(name);
    if (!batch) { batch = { color, geometries: [], solid, shadow }; batches.set(name, batch); }
    const plain = geometry.index ? geometry.toNonIndexed() : geometry;
    if (plain !== geometry) geometry.dispose();
    batch.geometries.push(plain);
  };
  const branch = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number) => {
    const direction = b.clone().sub(a);
    return new THREE.CylinderGeometry(r1, r0, direction.length(), 6)
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())))
      .translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  };
  add('Island aqueduct solids', '#baa77c', islandAqueductGeometry(), true, true);
  // Unequal stone bands and inset arch rings make the landmark read as masonry.
  for (const centre of [-24, 0, 24]) for (let step = 0; step < 17; step++) {
    const a = step * Math.PI / 17, b = (step + 0.88) * Math.PI / 17;
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape();
      shape.moveTo(centre + Math.cos(a) * 9, 14 + Math.sin(a) * 9);
      shape.lineTo(centre + Math.cos(a) * 10.4, 14 + Math.sin(a) * 10.4);
      shape.lineTo(centre + Math.cos(b) * 10.4, 14 + Math.sin(b) * 10.4);
      shape.lineTo(centre + Math.cos(b) * 9, 14 + Math.sin(b) * 9); shape.closePath();
      add('Island arch stones', '#c8b78b',
        new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false }).translate(0, 0, side < 0 ? -3.435 : 3.41));
    }
  }
  const trees = islandTrees();
  for (const [index, t] of trees.entries()) {
    let base = t.y;
    for (const dx of [-t.radius, 0, t.radius]) for (const dz of [-t.radius, 0, t.radius])
      base = Math.min(base, islandGroundHeight(t.x + dx, t.z + dz));
    const bottom = new THREE.Vector3(t.x, base - 0.3, t.z);
    const top = new THREE.Vector3(t.x + Math.cos(t.angle) * t.lean, t.y + t.height, t.z + Math.sin(t.angle) * t.lean);
    add('Island tree trunks', '#685540', branch(bottom, top, t.radius, t.radius * 0.48), true, true);
    if (t.palm) {
      // Broad folded blades, not flat disks; unequal droop and azimuths avoid a repeated star.
      for (let leaf = 0; leaf < 7; leaf++) {
        const angle = t.angle + leaf * Math.PI * 2 / 7;
        const length = 4.8 + islandHash(index, leaf + 2) * 2.2, positions: number[] = [];
        const cross = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
        const centre = (u: number) => top.clone().add(new THREE.Vector3(
          Math.cos(angle) * length * u, 2 * Math.sin(u * Math.PI) - 2.5 * u * u, Math.sin(angle) * length * u));
        for (let k = 0; k < 5; k++) {
          const u = k / 5, v = (k + 1) / 5;
          const a = centre(u), b = centre(v), w0 = Math.sin(u * Math.PI) * 0.85, w1 = Math.sin(v * Math.PI) * 0.85;
          const al = a.clone().addScaledVector(cross, w0), ar = a.clone().addScaledVector(cross, -w0);
          const bl = b.clone().addScaledVector(cross, w1), br = b.clone().addScaledVector(cross, -w1);
          for (const p of [a, al, b, al, bl, b, a, b, ar, ar, b, br]) positions.push(p.x, p.y, p.z);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.computeVertexNormals();
        add('Island palm fronds', '#3a8154', geometry, false, true);
      }
    } else {
      for (let lobe = 0; lobe < 3; lobe++) {
        const angle = t.angle + lobe * 2.4, radius = 3.5 + islandHash(index + 13, lobe) * 2.3;
        add(lobe % 2 ? 'Island canopy light' : 'Island canopy dark', lobe % 2 ? '#50854a' : '#326747',
          new THREE.IcosahedronGeometry(1, lobe === 0 ? 1 : 0).scale(radius, radius * 0.65, radius * 0.9)
            .translate(top.x + Math.cos(angle) * 2, top.y - lobe * 1.2, top.z + Math.sin(angle) * 2), false, true);
      }
      for (let root = 0; root < 4; root++) {
        const angle = t.angle + root * Math.PI / 2, x = t.x + Math.cos(angle) * 2.5, z = t.z + Math.sin(angle) * 2.5;
        const across = new THREE.Vector3(-Math.sin(angle) * 0.28, 0, Math.cos(angle) * 0.28);
        const end = new THREE.Vector3(x, Math.min(islandGroundHeight(x - across.x, z - across.z),
          islandGroundHeight(x + across.x, z + across.z)) - 0.3, z);
        const inner = new THREE.Vector3(t.x, base - 0.3, t.z), top = new THREE.Vector3(t.x, t.y + 2.8, t.z);
        const vertices = [inner, end, top].flatMap(p => [p.clone().sub(across), p.clone().add(across)]);
        const positions: number[] = [];
        for (const n of [0, 2, 4, 1, 5, 3, 0, 1, 3, 0, 3, 2, 2, 3, 5, 2, 5, 4, 4, 5, 1, 4, 1, 0])
          positions.push(...vertices[n].toArray());
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.computeVertexNormals();
        add('Island buttress roots', '#685540', geometry, true);
      }
    }
  }
  for (let i = 0; i < 1100; i++) {
    const x = (islandHash(i + 800, 1) - 0.5) * 350, z = (islandHash(i + 800, 2) - 0.5) * 330;
    const y = islandGroundHeight(x, z), route = islandRouteSample(x, z, true);
    if (y < 5 || y > 39 || route.distance < 8 || Math.abs(x) < 43 && Math.abs(z) < 12) continue;
    const size = 0.6 + islandHash(i, 9) * 1.3;
    let plantBase = y, plantTop = y;
    for (const dx of [-size, 0, size]) for (const dz of [-size, 0, size]) {
      const ground = islandGroundHeight(x + dx, z + dz);
      plantBase = Math.min(plantBase, ground); plantTop = Math.max(plantTop, ground);
    }
    if (plantTop - plantBase > size * 0.6) continue;
    add(i % 2 ? 'Island undergrowth light' : 'Island undergrowth dark', i % 2 ? '#63894a' : '#376b47',
      new THREE.IcosahedronGeometry(1, 0).scale(size, size * 0.55, size * 0.8).translate(x, plantBase + size * 0.1, z));
    if (i % 4 !== 0) continue;
    const rockSize = 0.7 + islandHash(i, 14) * 1.5;
    let minimum = y;
    for (const dx of [-rockSize, 0, rockSize]) for (const dz of [-rockSize, 0, rockSize])
      minimum = Math.min(minimum, islandGroundHeight(x + dx, z + dz));
    if (y - minimum > 1.4) continue;
    add('Island solid stones', '#788073', new THREE.DodecahedronGeometry(1, 0)
      .scale(rockSize, 1.3 + y - minimum, rockSize * 0.8).rotateY(i * 2.4).translate(x, minimum + 0.1, z), true);
  }
  // Sparse shoulder cairns identify the two departures without fencing the whole trail.
  for (const [x, z] of [[-24, 104], [-13, -40], [-89, -65], [77, 17], [96, 90]]) {
    if (islandRouteSample(x, z, true).distance < 6) continue;
    const y = islandGroundHeight(x, z);
    for (let layer = 0; layer < 3; layer++) add('Island cairns', '#c9bd93',
      new THREE.DodecahedronGeometry(0.65 - layer * 0.13, 0).scale(1, 0.5, 1).translate(x, y + 0.2 + layer * 0.43, z), true);
  }
  for (const [name, batch] of batches) {
    const geometry = mergeGeometries(batch.geometries);
    for (const g of batch.geometries) g.dispose();
    if (!geometry) throw new Error(`Island scenery batching failed: ${name}`);
    const material = new THREE.MeshStandardMaterial({ color: batch.color, roughness: 0.94,
      side: name === 'Island palm fronds' ? THREE.DoubleSide : THREE.FrontSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.castShadow = batch.shadow; mesh.receiveShadow = true; group.add(mesh);
    if (batch.solid) solids.push(mesh);
  }
  return { group, solids, trees };
}
