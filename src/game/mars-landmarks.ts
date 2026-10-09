import { addIronDecor } from './mars-iron-landmarks';
import { ironWeight } from './mars-iron-layout';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { MARS_ROUTES, marsSurfaceHeight, marsTrailSample, marsRandom } from './mars-terrain';
import { disposeScene } from './dispose';
import { addDishRidgeDecor } from './mars-dish-landmarks';
import { addGlassfallDecor } from './mars-glassfall-landmarks';
import { glassfallWeight } from './mars-glassfall-layout';
import { DISH_SITE } from './mars-dish-layout';

export type MarsSolid = { vertices: Float32Array; indices: Uint32Array };
export type MarsDecor = { group: THREE.Group; solids: MarsSolid[]; dispose: () => void };

/** Chunk-owned scenery: authored hero forms, matching solids, and batched secondary details. */
export function buildMarsDecor(cx: number, cz: number): MarsDecor {
  const group = new THREE.Group(), solids: MarsSolid[] = [];
  const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const wayfindingMaterials = new Set<THREE.Material>();
  const mat = (color: string, glow = false) => new THREE.MeshStandardMaterial({ color, roughness: 0.8,
    flatShading: true, ...(glow ? { emissive: color, emissiveIntensity: 0.4 } : {}) });
  const ivory = mat('#e9dac2'), orange = mat('#c76c3d'), dark = mat('#39353e');
  const blue = mat('#425765'), pale = mat('#e9bd89'), light = mat('#e8e9c7', true);
  const glazing = new THREE.MeshStandardMaterial({ color: '#344d59', roughness: 0.25, metalness: 0.35, flatShading: true });
  const frame = mat('#f5ead5');
  const materials: THREE.Material[] = [ivory, orange, dark, blue, pale, light, glazing, frame];
  const owns = (x: number, z: number) => Math.floor(x / 96) === cx && Math.floor(z / 96) === cz;
  const add = (geo: THREE.BufferGeometry, material: THREE.Material, solid = false) => {
    if (solid) {
      const v = new Float32Array(geo.getAttribute('position').array);
      const indices = geo.index ? new Uint32Array(geo.index.array) : Uint32Array.from({ length: v.length / 3 }, (_, i) => i);
      solids.push({ vertices: v, indices });
    }
    const non = geo.index ? geo.toNonIndexed() : geo.clone();
    // Textured displays need their UVs after batching, including on the reverse face.
    if (!('map' in material && material.map)) non.deleteAttribute('uv');
    const batch = parts.get(material) ?? []; batch.push(non); parts.set(material, batch); geo.dispose();
  };
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, m: THREE.Material, solid = false) =>
    add(new THREE.BoxGeometry(w, h, d).translate(x, y, z), m, solid);
  const cylinder = (x: number, y: number, z: number, r: number, h: number, m: THREE.Material, solid = false) =>
    add(new THREE.CylinderGeometry(r, r, h, 16).translate(x, y, z), m, solid);
  for (const [x, z, r] of [[-28, 37, 10], [23, 37, 8], [6, 84, 11]]) if (owns(x, z)) {
    const y = marsSurfaceHeight(x, z);
    cylinder(x, y + 0.6, z, r, 1.2, dark, true);
    const dome = marsHabitatGeometry(r);
    add(dome.opaque.translate(x, y + 1.2, z), ivory, true);
    add(dome.glazed.translate(x, y + 1.2, z), glazing, true);
    add(dome.frame.translate(x, y + 1.2, z), frame);
    box(x, y + 2, z - r + 0.1, 3.8, 4, 3.2, orange, true);
    box(x, y + 2.05, z - r - 1.53, 2.7, 3.05, 0.06, dark);
    box(x, y + 3.1, z - r - 1.59, 2.1, 0.25, 0.05, light);
  }
  if (owns(0, 32)) {
    // Paint stays flush with the terrain and has no raised collision edge.
    const y = marsSurfaceHeight(0, 32) + 0.035;
    const octagonAngle = Math.PI / 8;
    add(new THREE.RingGeometry(11.45, 12.05, 8, 1, octagonAngle).rotateX(-Math.PI / 2).translate(0, y, 32), ivory);
    add(new THREE.RingGeometry(10.83, 10.94, 8, 1, octagonAngle).rotateX(-Math.PI / 2).translate(0, y + 0.004, 32), orange);
    for (let side = 0; side < 8; side++) {
      const angle = octagonAngle + side * Math.PI / 4;
      add(new THREE.PlaneGeometry(0.18, 1.1).rotateX(-Math.PI / 2).rotateY(angle)
        .translate(Math.sin(angle) * 10.3, y + 0.008, 32 + Math.cos(angle) * 10.3), side % 2 ? ivory : orange);
    }
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      // Broad, chamfered stencil numerals read as an outpost designation from the road.
      // Draw the glyphs directly so their shape does not depend on installed fonts.
      ctx.translate(512, 256); ctx.scale(1.4, 1.15); ctx.translate(-512, -256);
      const polygon = (points: [number, number][]) => {
        ctx.moveTo(...points[0]); for (const point of points.slice(1)) ctx.lineTo(...point); ctx.closePath();
      };
      ctx.fillStyle = '#f5ead5'; ctx.beginPath();
      polygon([[275, 68], [415, 68], [460, 113], [460, 397], [415, 442], [275, 442], [230, 397], [230, 113]]);
      polygon([[315, 134], [375, 134], [393, 152], [393, 358], [375, 376], [315, 376], [297, 358], [297, 152]]);
      ctx.fill('evenodd');
      ctx.fillRect(540, 68, 260, 66);
      ctx.beginPath(); polygon([[726, 132], [800, 132], [650, 442], [576, 442]]); ctx.fill();
      // Narrow breaks make the numerals look cut from a reusable industrial stencil.
      ctx.clearRect(229, 272, 69, 15); ctx.clearRect(392, 272, 69, 15);
      ctx.clearRect(635, 272, 110, 15);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
      const marker = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
      materials.push(marker);
      add(new THREE.PlaneGeometry(14, 8).rotateX(-Math.PI / 2).rotateY(Math.PI).translate(0, y + 0.025, 32), marker);
    }
  }
  for (const z of [25, 37, 49]) if (owns(-51, z)) {
    const x = -51, y = marsSurfaceHeight(x, z), tilt = 0.12;
    add(new THREE.BoxGeometry(12, 0.2, 7).rotateZ(tilt).translate(x, y + 2.8, z), blue, true);
    for (const dx of [-4, 4]) {
      const foot = marsSurfaceHeight(x + dx, z) - 0.08;
      const underside = y + 2.8 + dx * Math.tan(tilt) - 0.1 / Math.cos(tilt);
      cylinder(x + dx, (foot + underside) / 2, z, 0.16, underside - foot, dark, true);
      cylinder(x + dx, foot + 0.1, z, 0.42, 0.2, dark, true);
    }
    for (let dx = -5; dx <= 5; dx += 2) box(x + dx, y + 2.908 + dx * Math.tan(tilt), z, 0.07, 0.03, 7, ivory);
  }
  if (owns(-40, 84)) {
    const x = -40, z = 84, y = marsSurfaceHeight(x, z);
    add(new THREE.CylinderGeometry(3.2, 4.2, 5, 8).translate(x, y + 5.2, z), ivory, true);
    cylinder(x, y + 8, z, 3.15, 0.6, orange, true);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      const a = new THREE.Vector3(x + dx * 2.4, y + 4, z + dz * 2.4), b = new THREE.Vector3(x + dx * 5, y + 0.5, z + dz * 5);
      const leg = new THREE.CylinderGeometry(0.2, 0.3, a.distanceTo(b), 6);
      leg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
      leg.translate(...a.add(b).multiplyScalar(0.5).toArray()); add(leg, dark, true);
      cylinder(x + dx * 5, y + 0.2, z + dz * 5, 1, 0.4, orange, true);
    }
  }
  // Authored crown teeth: three different layered silhouettes away from the rim road.
  for (const [x, z, w, h] of [[-37, -275, 7, 11], [-22, -285, 5, 16], [26, -282, 8, 13], [14, -217, 2, 2.4]]) if (owns(x, z)) {
    add(groundMarsRock(marsRockGeometry(w, h, x * 0.1).rotateY(x * 0.13), x, z), pale, true);
  }
  // Split sentinel at the saddle and exposed shelf slabs give Dish Ridge its own geology.
  for (const [x, z, w, h] of [[150, -219, 3.8, 10], [160, -216, 2.5, 7], [183, -193, 5, 3.5],
    [207, -231, 4.5, 4], [304, -228, 3.6, 9], [281, -276, 4.2, 6], [177, -307, 5, 7]]) if (owns(x, z))
    add(groundMarsRock(marsRockGeometry(w, h, x * 0.17).rotateY(z * 0.09), x, z), orange, true);
  // Small plates form ejecta rays and low wind-worn scatter. Keep every road shoulder clear.
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
    const gx = cx * 5 + i, gz = cz * 5 + j, random = (channel: number) => marsRandom(gx, gz, channel);
    const x = cx * 96 + 3 + i * 18.6 + random(0) * 15, z = cz * 96 + 3 + j * 18.6 + random(1) * 15;
    if (marsTrailSample(x, z).distance < 10 || Math.hypot(x / 1.2, z - 44) < 78
      || Math.hypot(x - DISH_SITE.x, z - DISH_SITE.z) < 23 || glassfallWeight(x, z) > 0.45 || ironWeight(x, z) > 0.45 || random(2) < 0.43) continue;
    const slope = Math.hypot(marsSurfaceHeight(x + 2, z) - marsSurfaceHeight(x - 2, z),
      marsSurfaceHeight(x, z + 2) - marsSurfaceHeight(x, z - 2)) / 4;
    if (slope > 0.65) continue; // Loose stones collect on shelves, not vertical cliff faces.
    // Sparse chips, broad slabs and occasional knuckles have independent shape/rotation.
    const r = Math.hypot(x, z + 195), size = 0.45 + random(3) ** 2 * 2.5;
    const height = size * (random(4) < 0.7 ? 0.2 + random(5) * 0.35 : 0.65 + random(5) * 0.6);
    const geo = groundMarsRock(marsRockGeometry(size, height, random(6) * 100)
      .rotateY(random(7) * Math.PI * 2), x, z);
    add(geo, r < 125 ? pale : orange, true);
  }
  for (const route of MARS_ROUTES.filter(route => !['Habitat courtyard', 'Dish summit circuit'].includes(route.name))) for (let i = 1; i < route.points.length; i += route.points.length > 20 ? 4 : 1) {
    const p = route.points[i], a = route.points[i - 1];
    const length = Math.hypot(p.x - a.x, p.z - a.z);
    const x = p.x + (p.z - a.z) / length * 7, z = p.z - (p.x - a.x) / length * 7;
    if (!owns(x, z)) continue;
    const road = marsTrailSample(x, z);
    if (road.distance < road.halfWidth + 0.7) continue; // Keep neighboring branches clear at junctions.
    const y = marsSurfaceHeight(x, z);
    cylinder(x, y + 0.7, z, 0.13, 1.4, orange, true);
    cylinder(x, y + 1.45, z, 0.22, 0.16, light);
  }
  for (const [x, z, title, subtitle, code] of [[11, -12, 'CROWN CRATER', 'RIM ROAD / NORTH', '01'], [-13, -117, 'CROWN CRATER', 'RIM LOOP + FLOOR DESCENT', '02']] as const) if (owns(x, z)) {
    const y = marsSurfaceHeight(x, z);
    // Paired side pylons frame the display, with each foot seated on local terrain.
    for (const side of [-1, 1]) {
      const footY = marsSurfaceHeight(x + side * 2.95, z);
      add(new THREE.CylinderGeometry(0.5, 0.65, 0.24, 4).rotateY(Math.PI / 4)
        .translate(x + side * 2.95, footY + 0.1, z), dark, true);
      const pylon = new THREE.Shape();
      [[2.7, footY - y + 0.12], [3.2, footY - y + 0.12], [3.2, 3.58], [3, 3.86], [2.73, 3.86], [2.73, 1.55]]
        .forEach(([px, py], i) => i ? pylon.lineTo(side * px, py) : pylon.moveTo(side * px, py));
      pylon.closePath();
      add(new THREE.ExtrudeGeometry(pylon, { depth: 0.48, bevelEnabled: false, steps: 1 })
        .translate(x, y, z - 0.24), ivory, true);
      const stripBottom = footY + 0.4, stripTop = y + 3.5;
      for (const face of [-1, 1]) {
        box(x + side * 2.97, (stripBottom + stripTop) / 2, z + face * 0.265,
          0.065, stripTop - stripBottom, 0.025, light);
        box(x + side * 2.97, y + 1.65, z + face * 0.265, 0.3, 0.16, 0.03, orange);
      }
    }
    const outline = new THREE.Shape();
    [[-2.65, -1.2], [2.65, -1.2], [2.9, -0.95], [2.9, 0.95], [2.65, 1.2], [-2.65, 1.2], [-2.9, 0.95], [-2.9, -0.95]]
      .forEach(([px, py], i) => i ? outline.lineTo(px, py) : outline.moveTo(px, py));
    outline.closePath();
    add(new THREE.ExtrudeGeometry(outline, { depth: 0.28, bevelEnabled: false, steps: 1 })
      .translate(x, y + 3, z - 0.14), dark, true);
    for (const side of [-1, 1]) {
      box(x, y + 4.12, z + side * 0.155, 4.6, 0.065, 0.025, light);
      for (const dx of [-2.76, 2.76]) box(x + dx, y + 3, z + side * 0.155, 0.065, 1.65, 0.025, orange);
    }
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 384;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#14212b'; ctx.fillRect(0, 0, 1024, 384);
      ctx.fillStyle = '#edb56f'; ctx.fillRect(32, 30, 8, 324);
      ctx.font = 'bold 32px monospace'; ctx.fillText('MARS / SURFACE NAV', 66, 68);
      ctx.textAlign = 'right'; ctx.fillText(`H7 / ${code}`, 960, 68);
      ctx.strokeStyle = '#53636a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(66, 94); ctx.lineTo(960, 94); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillStyle = '#f5f1da'; ctx.font = 'bold 76px sans-serif'; ctx.fillText(title, 66, 192, 895);
      ctx.fillStyle = '#edb56f'; ctx.font = 'bold 43px sans-serif'; ctx.fillText(subtitle, 66, 269, 895);
      ctx.fillStyle = '#b9c9c9'; ctx.font = '26px monospace'; ctx.fillText('EXPLORATION NETWORK', 66, 337);
      for (let i = 0; i < 5; i++) ctx.fillRect(842 + i * 25, 317, 13, 20);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
      const sign = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }); materials.push(sign); wayfindingMaterials.add(sign);
      // Separate front-facing planes avoid mirrored back text and coplanar flicker.
      for (const side of [-1, 1]) add(new THREE.PlaneGeometry(5.25, 1.97)
        .rotateY(side < 0 ? Math.PI : 0).translate(x, y + 3, z + side * 0.18), sign);
    }
  }
  addDishRidgeDecor(cx, cz, add, { ivory, orange, dark, light });
  addGlassfallDecor(cx, cz, add);
  addIronDecor(cx, cz, add);
  for (const [material, geometries] of parts) {
    const geometry = mergeGeometries(geometries)!; geometries.forEach(g => g.dispose());
    const mesh = new THREE.Mesh(geometry, material);
    const display = material instanceof THREE.MeshBasicMaterial && material.map;
    mesh.castShadow = !display && material.userData.castShadow !== false; mesh.receiveShadow = !display;
    if (wayfindingMaterials.has(material)) mesh.name = 'mars-wayfinding-display';
    group.add(mesh);
  }
  for (const material of materials) if (!parts.has(material)) material.dispose();
  return { group, solids, dispose: () => { const scene = new THREE.Scene(); scene.add(group); disposeScene(scene); } };
}

/** Flat triangular panels and shared struts, cut precisely at the foundation plane. */
export function marsHabitatGeometry(radius: number, detail = 3): { opaque: THREE.BufferGeometry; glazed: THREE.BufferGeometry; frame: THREE.BufferGeometry } {
  const source = new THREE.IcosahedronGeometry(1, detail);
  const positions = source.getAttribute('position');
  const opaque: number[] = [], glazed: number[] = [], struts: THREE.BufferGeometry[] = [];
  const edges = new Set<string>();
  const vertexKey = (v: THREE.Vector3) => v.toArray().map(n => n.toFixed(5)).join(',');
  for (let i = 0; i < positions.count; i += 3) {
    const triangle = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(positions, i + j));
    const polygon: THREE.Vector3[] = [];
    // Clip crossing faces instead of projecting lower vertices onto the equator.
    for (let j = 0; j < 3; j++) {
      const a = triangle[j], b = triangle[(j + 1) % 3];
      if (a.y >= 0) polygon.push(a.clone());
      if ((a.y < 0) !== (b.y < 0)) polygon.push(a.clone().lerp(b, -a.y / (b.y - a.y)).setY(0));
    }
    for (let j = 1; j + 1 < polygon.length; j++) {
      const face = [polygon[0], polygon[j], polygon[j + 1]];
      const normal = face[1].clone().sub(face[0]).cross(face[2].clone().sub(face[0]));
      if (normal.lengthSq() < 1e-12) continue;
      const centre = face[0].clone().add(face[1]).add(face[2]).divideScalar(3);
      // Glazed triangles face the courtyard; the lower skirt and crown stay insulated.
      const vertices = centre.z < -0.12 && centre.y > 0.18 && centre.y < 0.87 ? glazed : opaque;
      const scaled = face.map(v => new THREE.Vector3(v.x * radius, v.y * radius * 0.88, v.z * radius));
      for (const v of scaled) vertices.push(...v.toArray());
      for (let k = 0; k < 3; k++) {
        const a = scaled[k], b = scaled[(k + 1) % 3];
        const key = [vertexKey(a), vertexKey(b)].sort().join('|');
        if (edges.has(key)) continue;
        edges.add(key);
        const strut = new THREE.CylinderGeometry(radius * 0.007, radius * 0.007, a.distanceTo(b), 5);
        strut.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
        strut.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
        struts.push(strut);
      }
    }
  }
  source.dispose();
  const panels = (vertices: number[]) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  };
  const frame = mergeGeometries(struts)!;
  struts.forEach(g => g.dispose());
  return { opaque: panels(opaque), glazed: panels(glazed), frame };
}

/** Asymmetric strata make a rock read as eroded stone rather than a scaled sphere. */
export function marsRockGeometry(width: number, height: number, seed: number): THREE.BufferGeometry {
  const vertices: number[] = [], indices: number[] = [], rings = 5, sides = 9;
  const shape = (channel: number) => marsRandom(Math.round(seed * 1000), 0, channel);
  const taper = 0.32 + shape(0) * 0.5, lean = (shape(1) - 0.5) * 0.75;
  const depth = 0.42 + shape(2) * 0.6, twist = (shape(3) - 0.5) * 0.45;
  for (let j = 0; j < rings; j++) for (let i = 0; i < sides; i++) {
    const t = j / (rings - 1), a = i / sides * Math.PI * 2 + twist * t;
    const r = width * (1 - t * taper) * (0.82 + shape(4 + i) * 0.25 + 0.06 * Math.sin(seed + j * 2 + i));
    vertices.push(Math.cos(a) * r + t * width * lean,
      t * height * (0.86 + shape(14 + i) * 0.2), Math.sin(a) * r * depth);
    if (j < rings - 1) { const v = j * sides + i, next = j * sides + (i + 1) % sides;
      indices.push(v, next + sides, next, v, v + sides, next + sides); }
  }
  for (let i = 1; i < sides - 1; i++) { indices.push(0, i, i + 1); const o = (rings - 1) * sides; indices.push(o, o + i + 1, o + i); }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

/** Extend the rock's buried skirt down to the terrain under its whole footprint. */
export function groundMarsRock(geometry: THREE.BufferGeometry, x: number, z: number): THREE.BufferGeometry {
  geometry.translate(x, marsSurfaceHeight(x, z) - 0.2, z);
  const positions = geometry.getAttribute('position'), sides = 9;
  const base = Array.from({ length: sides }, (_, i) => new THREE.Vector3().fromBufferAttribute(positions, i));
  const heights = base.map(v => v.y);
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides, a = base[i], b = base[next];
    const steps = Math.max(2, Math.ceil(a.distanceTo(b) / 0.4));
    for (let j = 0; j <= steps; j++) {
      const t = j / steps, ground = marsSurfaceHeight(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t) - 0.3;
      heights[i] = Math.min(heights[i], ground); heights[next] = Math.min(heights[next], ground);
    }
  }
  heights.forEach((height, i) => positions.setY(i, height));
  geometry.computeVertexNormals(); return geometry;
}

export function attachMarsSolids(world: RAPIER.World, solids: MarsSolid[]): RAPIER.Collider[] {
  return solids.map(s => world.createCollider(RAPIER.ColliderDesc.trimesh(s.vertices, s.indices).setFriction(0.9)));
}
