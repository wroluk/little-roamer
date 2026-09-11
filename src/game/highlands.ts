import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { seededRandom } from './terrain';
import {
  FORDS, GLACIER, HIGHLANDS_START, HIGHLANDS_WATER_Y, VOLCANOES,
  glacierAmount, highlandsSamples, highlandsSurfaceHeight, highlandsWaterAt,
  lavaAmount, riverCenter, riverDistance, smooth,
} from './highlands-terrain';

export {
  FORDS, GLACIER, GLACIER_ASCENT, VOLCANO_ASCENT, HIGHLANDS_HALF, HIGHLANDS_GRID, HIGHLANDS_CELL, HIGHLANDS_START,
  HIGHLANDS_WATER_Y, VOLCANOES, highlandsHeight, highlandsSurfaceHeight,
  highlandsSamples, highlandsWaterAt, highlandsWaterHeight,
  highlandsSurfaceAt, riverCenter, riverDeepening,
} from './highlands-terrain';

function matchingHull(world: RAPIER.World, geometry: THREE.BufferGeometry, matrix: THREE.Matrix4) {
  const position = geometry.getAttribute('position');
  const vertices = new Float32Array(position.count * 3);
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i).applyMatrix4(matrix).toArray(vertices, i * 3);
  }
  const collider = RAPIER.ColliderDesc.convexHull(vertices);
  if (!collider) throw new Error('Could not build a highlands rock collider.');
  world.createCollider(collider.setFriction(0.9));
}

function terrainColors(vertices: Float32Array) {
  const colors = new Float32Array(vertices.length);
  const c = new THREE.Color();
  const charcoal = new THREE.Color('#354149');
  const ash = new THREE.Color('#576267');
  const basalt = new THREE.Color('#202d33');
  const moss = new THREE.Color('#859661');
  const deepMoss = new THREE.Color('#4e7060');
  const gravel = new THREE.Color('#83908a');
  const ice = new THREE.Color('#60b5cd');
  const blueIce = new THREE.Color('#3989ac');
  const snow = new THREE.Color('#e4f2ed');
  const ochre = new THREE.Color('#ad7650');
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    const z = vertices[i + 2];
    const variation = Math.sin(x * 0.13 + z * 0.21) * Math.sin(x * 0.071 - z * 0.095);
    const patch = 0.5 + 0.5 * Math.sin(x * 0.081 + Math.sin(z * 0.09) * 2) * Math.cos(z * 0.079);
    c.copy(charcoal).lerp(ash, 0.16 + 0.15 * patch);
    const flow = lavaAmount(x, z);
    c.lerp(basalt, flow * 0.8);
    c.lerp(deepMoss, flow * smooth((patch - 0.17) / 0.58));
    c.lerp(moss, flow * smooth((patch - 0.46) / 0.42) * 0.85);

    const river = riverDistance(x, z);
    c.lerp(deepMoss, (1 - smooth((Math.abs(river - 13) - 2) / 10)) * 0.6);
    c.lerp(gravel, (1 - smooth((Math.abs(river - 5)) / 8)) * 0.35);
    for (const ford of FORDS) {
      const lane = (1 - smooth((Math.abs(x - ford.x) - 5) / 4))
        * (1 - smooth((Math.abs(z - ford.z) - 29) / 13));
      c.lerp(gravel, lane * 0.65);
    }
    const routeX = -15 + 15 * smooth((z - 65) / 45);
    const route = (1 - smooth((Math.abs(x - routeX) - 3) / 4))
      * smooth((z - 60) / 12) * (1 - smooth((z - 133) / 12));
    c.lerp(gravel, route * 0.55);
    c.lerp(gravel, (1 - smooth((Math.hypot(x, z - HIGHLANDS_START.z) - 10) / 10)) * 0.65);

    for (const volcano of VOLCANOES) {
      const r = Math.hypot(x - volcano.x, z - volcano.z) / volcano.radius;
      const rim = 1 - smooth(Math.abs(r - 0.27) / 0.09);
      c.lerp(ochre, rim * 0.58);
      if (r < 0.14) c.lerp(ochre, (1 - smooth(r / 0.14)) * 0.75);
    }
    const glacial = (1 - smooth((glacierAmount(x, z) - 0.71) / 0.2));
    const mountainSnow = smooth((y - 18 - 2.5 * variation) / 16) * smooth((-z - 92) / 24);
    c.lerp(ice, glacial);
    const striation = 0.5 + 0.5 * Math.sin(x * 0.18 + z * 0.045 + 2 * Math.sin(z * 0.07));
    c.lerp(snow, mountainSnow * (1 - glacial) + glacial * (0.35 + striation * 0.55));
    c.lerp(blueIce, glacial * smooth((striation - 0.85) / 0.15) * 0.5);
    c.multiplyScalar(0.96 + 0.065 * variation);
    c.toArray(colors, i);
  }
  return colors;
}

/** Clip every submerged terrain triangle at the waterline: no floating banks or opaque water over dry land. */
function waterGeometry(vertices: Float32Array, indices: Uint32Array) {
  const positions: number[] = [];
  const colors: number[] = [];
  const deep = new THREE.Color('#269fae');
  const shallow = new THREE.Color('#8de1db');
  const c = new THREE.Color();
  type Point = { x: number; y: number; z: number };
  for (let i = 0; i < indices.length; i += 3) {
    const triangle: Point[] = [];
    for (let k = 0; k < 3; k++) {
      const index = indices[i + k] * 3;
      triangle.push({ x: vertices[index], y: vertices[index + 1], z: vertices[index + 2] });
    }
    if (triangle.every(point => point.y >= HIGHLANDS_WATER_Y)) continue;
    const clipped: Point[] = [];
    for (let k = 0; k < 3; k++) {
      const a = triangle[k];
      const b = triangle[(k + 1) % 3];
      if (a.y < HIGHLANDS_WATER_Y) clipped.push(a);
      if ((a.y < HIGHLANDS_WATER_Y) !== (b.y < HIGHLANDS_WATER_Y)) {
        const t = (HIGHLANDS_WATER_Y - a.y) / (b.y - a.y);
        clipped.push({ x: a.x + (b.x - a.x) * t, y: HIGHLANDS_WATER_Y, z: a.z + (b.z - a.z) * t });
      }
    }
    for (let k = 1; k + 1 < clipped.length; k++) {
      for (const point of [clipped[0], clipped[k], clipped[k + 1]]) {
        positions.push(point.x, HIGHLANDS_WATER_Y + 0.015, point.z);
        c.copy(shallow).lerp(deep, smooth((HIGHLANDS_WATER_Y - point.y) / 0.5));
        colors.push(c.r, c.g, c.b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function buildHighlands(scene: THREE.Scene, world: RAPIER.World) {
  const random = seededRandom(240819);
  const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.94, flatShading: true });
  const dark = material('#35454b');
  const pale = material('#d1e6df');
  const amber = material('#e9b356');
  const { vertices, indices } = highlandsSamples();
  const terrainGeometry = new THREE.BufferGeometry();
  terrainGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  terrainGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
  terrainGeometry.setAttribute('color', new THREE.BufferAttribute(terrainColors(vertices), 3));
  terrainGeometry.computeVertexNormals();
  const terrain = new THREE.Mesh(terrainGeometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, flatShading: true }));
  terrain.name = 'Highlands · shared render and collision terrain';
  terrain.receiveShadow = true;
  scene.add(terrain);
  world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.95));

  const water = new THREE.Mesh(waterGeometry(vertices, indices),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.08 }));
  water.name = 'Glacial meltwater · shallow non-solid surface';
  scene.add(water);
  const ripples: number[] = [];
  for (let i = 0; i < 1100; i++) {
    const x = (random() * 2 - 1) * 237;
    const z = i < 850 ? riverCenter(x) + (random() - 0.5) * 24 : -83 + random() * 140;
    const rx = i < 850 ? x : 16 + random() * 28;
    const length = 0.5 + random() * 1.8;
    if (!highlandsWaterAt(rx, z) || !highlandsWaterAt(rx + length, z)) continue;
    ripples.push(rx, HIGHLANDS_WATER_Y + 0.04, z, rx + length, HIGHLANDS_WATER_Y + 0.04, z + 0.1);
  }
  const rippleGeometry = new THREE.BufferGeometry();
  rippleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ripples, 3));
  scene.add(new THREE.LineSegments(rippleGeometry,
    new THREE.LineBasicMaterial({ color: '#b6eeea', transparent: true, opacity: 0.52 })));

  const dummy = new THREE.Object3D();
  // Every cliff block has an identical visible box and collider, with at least
  // 20m of exposed height even over the highest adjacent boundary vertex.
  const cliffGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cliffs = new THREE.InstancedMesh(cliffGeometry, material('#45565b'), 96);
  const caps = new THREE.InstancedMesh(cliffGeometry, pale, 96);
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 24; i++) {
      const along = -230 + i * 20;
      const vertical = side < 2;
      const edge = side % 2 === 0 ? -1 : 1;
      const x = vertical ? edge * 242 : along;
      const z = vertical ? along : edge * 242;
      let highest = 0;
      for (let sample = -10; sample <= 10; sample += 1) {
        highest = Math.max(highest, highlandsSurfaceHeight(vertical ? edge * 240 : along + sample,
          vertical ? along + sample : edge * 240));
      }
      const top = highest + 20 + random() * 5;
      const height = top + 8;
      dummy.position.set(x, top - height / 2, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(vertical ? 4 : 20, height, vertical ? 20 : 4);
      dummy.updateMatrix();
      const index = side * 24 + i;
      cliffs.setMatrixAt(index, dummy.matrix);
      cliffs.setColorAt(index, new THREE.Color().setHSL(0.52, 0.10, 0.27 + random() * 0.08));
      world.createCollider(RAPIER.ColliderDesc.cuboid(dummy.scale.x / 2, height / 2, dummy.scale.z / 2)
        .setTranslation(x, dummy.position.y, z).setFriction(0.85));
      dummy.position.y = top + 0.15;
      dummy.scale.y = 0.3;
      dummy.updateMatrix();
      caps.setMatrixAt(index, dummy.matrix);
    }
  }
  cliffs.name = 'Visible basalt world boundary';
  cliffs.receiveShadow = true;
  scene.add(cliffs, caps);

  const reserved = (x: number, z: number, margin: number) => {
    if (Math.abs(x) > 224 || Math.abs(z) > 224 || riverDistance(x, z) < 25 + margin) return true;
    if (Math.hypot(x, z - HIGHLANDS_START.z) < 30 + margin) return true;
    if (z > 55 && z < 150 && Math.abs(x) < 26 + margin) return true;
    if (FORDS.some(ford => Math.abs(x - ford.x) < 15 + margin
      && Math.abs(z - ford.z) < ford.length / 2 + 22 + margin)) return true;
    // Keep summits, glacier approaches and broad cardinal volcano runups clear;
    // only the outer lava skirts can contain rocks.
    if (glacierAmount(x, z) < 1.12) return true;
    if (VOLCANOES.some(v => {
      const dx = Math.abs(x - v.x);
      const dz = Math.abs(z - v.z);
      const radius = Math.hypot(dx, dz);
      return radius < v.radius * 0.76 + margin
        || (radius < v.radius + 16 && Math.min(dx, dz) < 16 + margin);
    })) return true;
    return false;
  };

  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rockMaterials = [material('#35434a'), material('#76855b')];
  for (let kind = 0; kind < 2; kind++) {
    const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterials[kind], 110);
    let placed = 0;
    for (let attempt = 0; attempt < 14000 && placed < rocks.count; attempt++) {
      const x = (random() - 0.5) * 446;
      const z = (random() - 0.5) * 446;
      const size = 0.65 + random() ** 2 * 2.2;
      if (reserved(x, z, size * 1.8)) continue;
      if (kind === 1 && lavaAmount(x, z) < 0.25 && random() > 0.32) continue;
      dummy.position.set(x, highlandsSurfaceHeight(x, z) + size * 0.25, z);
      dummy.scale.set(size * 1.4, size * (kind === 1 ? 0.6 : 0.85), size);
      dummy.rotation.set(random() * 0.3, random() * Math.PI * 2, random() * 0.2);
      dummy.updateMatrix();
      rocks.setMatrixAt(placed, dummy.matrix);
      rocks.setColorAt(placed, new THREE.Color().setScalar(0.84 + random() * 0.3));
      matchingHull(world, rockGeometry, dummy.matrix);
      placed++;
    }
    rocks.count = placed;
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    scene.add(rocks);
  }

  const columnGeometry = new THREE.CylinderGeometry(1, 1.1, 1, 6);
  const columns = new THREE.InstancedMesh(columnGeometry, dark, 70);
  let columnCount = 0;
  for (let attempt = 0; attempt < 3000 && columnCount < columns.count; attempt++) {
    const cluster = attempt % 2 === 0 ? { x: -195, z: 116 } : { x: 189, z: 124 };
    const x = cluster.x + (random() - 0.5) * 40;
    const z = cluster.z + (random() - 0.5) * 34;
    if (reserved(x, z, 3)) continue;
    const height = 2.2 + random() * 6.5;
    dummy.position.set(x, highlandsSurfaceHeight(x, z) + height / 2 - 0.12, z);
    dummy.rotation.set(0, random() * 0.3, 0);
    dummy.scale.set(1.1 + random(), height, 1.1 + random());
    dummy.updateMatrix();
    columns.setMatrixAt(columnCount++, dummy.matrix);
    matchingHull(world, columnGeometry, dummy.matrix);
  }
  columns.count = columnCount;
  columns.castShadow = true;
  columns.receiveShadow = true;
  scene.add(columns);

  const iceGeometry = new THREE.DodecahedronGeometry(1, 0);
  const iceBlocks = new THREE.InstancedMesh(iceGeometry, material('#93d3df'), 32);
  for (let i = 0; i < iceBlocks.count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = GLACIER.x + side * (48 + random() * 37);
    const z = -121 - random() * 76;
    const height = 2 + random() * 4;
    dummy.position.set(x, highlandsSurfaceHeight(x, z) + height * 0.4, z);
    dummy.rotation.set(random() * 0.2, random() * Math.PI, side * 0.15);
    dummy.scale.set(1.6 + random(), height, 1.7 + random());
    dummy.updateMatrix();
    iceBlocks.setMatrixAt(i, dummy.matrix);
    matchingHull(world, iceGeometry, dummy.matrix);
  }
  iceBlocks.castShadow = true;
  iceBlocks.receiveShadow = true;
  scene.add(iceBlocks);

  // Amber poles frame a 15m clear lane. The cylinder colliders match the poles;
  // nothing is placed in the tested approach-to-exit corridor.
  const polePositions: { x: number; z: number }[] = [];
  for (const ford of FORDS) {
    for (const along of [-27, -15, 15, 27]) {
      for (const side of [-1, 1]) polePositions.push({ x: ford.x + side * 8, z: ford.z + along });
    }
  }
  const poleGeometry = new THREE.CylinderGeometry(0.14, 0.14, 2.5, 6);
  const poles = new THREE.InstancedMesh(poleGeometry, amber, polePositions.length);
  const bands = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.145, 0.145, 0.35, 6), pale, polePositions.length);
  for (let i = 0; i < polePositions.length; i++) {
    const { x, z } = polePositions[i];
    const y = highlandsSurfaceHeight(x, z);
    dummy.position.set(x, y + 1.25, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    matchingHull(world, poleGeometry, dummy.matrix);
    dummy.position.y = y + 2.08;
    dummy.updateMatrix();
    bands.setMatrixAt(i, dummy.matrix);
  }
  scene.add(poles, bands);

  const sign = (x: number, z: number, title: string, subtitle: string, angle = 0) => {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 384;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not create the highlands trail signs.');
    context.fillStyle = '#233d43';
    context.fillRect(0, 0, 1024, 384);
    context.strokeStyle = '#d7b56b';
    context.lineWidth = 10;
    context.strokeRect(20, 20, 984, 344);
    context.fillStyle = '#e9f0df';
    context.textAlign = 'center';
    context.font = 'bold 76px sans-serif';
    context.fillText(title, 512, 166, 932);
    context.fillStyle = '#96d5ce';
    context.font = '32px sans-serif';
    context.fillText(subtitle, 512, 252, 934);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const boardGeometry = new THREE.BoxGeometry(7.2, 2.7, 0.24);
    const board = new THREE.Mesh(boardGeometry, dark);
    const y = highlandsSurfaceHeight(x, z);
    board.position.set(x, y + 4.1, z);
    board.rotation.y = angle;
    board.updateMatrix();
    scene.add(board);
    matchingHull(world, boardGeometry, board.matrix);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(7.15, 2.65),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }));
    face.position.z = 0.125;
    board.add(face);
    const back = face.clone();
    back.position.z = -0.125;
    back.rotation.y = Math.PI;
    board.add(back);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.1, 6), dark);
    post.position.set(x, y + 1.55, z);
    post.updateMatrix();
    scene.add(post);
    matchingHull(world, post.geometry, post.matrix);
  };
  sign(-12, 113, 'ÍSLAND · HIGHLANDS', 'VOLCANOES  /  MOSS FIELDS  /  GLACIER');
  for (const ford of FORDS) sign(ford.x + 15, ford.z + 34, ford.name, 'SHALLOW CROSSING  ·  FOLLOW AMBER POLES');
  sign(-150, -10, 'ELDFELL', 'ROUND THE RIM  ·  EXPLORE THE CRATER', 0.15);
  sign(150, -4, 'RAUÐAFELL', 'RED EARTH  ·  ANCIENT LAVA', -0.2);
  sign(-31, -78, 'BLÁJÖKULL', 'THE BLUE GLACIER  ·  CLIMB THE WIDE SLOPE');

  // One surface with a hard snowline avoids coplanar, flickering snow-cap meshes.
  const distantGeometry = new THREE.ConeGeometry(1, 1, 7, 5).toNonIndexed();
  const mountainVertices = distantGeometry.getAttribute('position');
  const mountainColors = new Float32Array(mountainVertices.count * 3);
  const mountainColor = new THREE.Color('#526d78');
  const snowColor = new THREE.Color('#d8e8e7');
  for (let i = 0; i < mountainVertices.count; i += 3) {
    const lowest = Math.min(mountainVertices.getY(i), mountainVertices.getY(i + 1), mountainVertices.getY(i + 2));
    const color = lowest >= 0.099 ? snowColor : mountainColor;
    for (let j = 0; j < 3; j++) color.toArray(mountainColors, (i + j) * 3);
  }
  distantGeometry.setAttribute('color', new THREE.BufferAttribute(mountainColors, 3));
  const distant = new THREE.InstancedMesh(distantGeometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), 24);
  for (let i = 0; i < distant.count; i++) {
    const angle = i * Math.PI * 2 / distant.count;
    const radius = 355 + random() * 35;
    const height = 78 + random() * 76;
    const width = 55 + random() * 42;
    dummy.position.set(Math.sin(angle) * radius, height / 2 - 6, Math.cos(angle) * radius);
    dummy.rotation.set(0, angle + random(), 0);
    dummy.scale.set(width, height, width * 0.85);
    dummy.updateMatrix();
    distant.setMatrixAt(i, dummy.matrix);
  }
  distant.name = 'Inaccessible distant mountain skyline';
  scene.add(distant);
}
