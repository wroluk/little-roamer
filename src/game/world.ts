import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RAMPS, rampEdgeDistance, seededRandom, START, surfaceHeight, terrainSamples, trailDistance, WORLD_HALF } from './terrain';

export function rampGeometry(width: number, length: number, height: number) {
  const w = width / 2;
  const l = length / 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -w, -4, l, w, -4, l, -w, -4, -l, w, -4, -l,
    -w, 0, l, w, 0, l, -w, height, -l, w, height, -l,
  ], 3));
  geometry.setIndex([4, 5, 6, 5, 7, 6, 0, 2, 1, 1, 2, 3,
    0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7,
    0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5]);
  geometry.computeVertexNormals();
  return geometry;
}

function hull(world: RAPIER.World, geometry: THREE.BufferGeometry, matrix: THREE.Matrix4) {
  const position = geometry.getAttribute('position');
  const vertices = new Float32Array(position.count * 3);
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i).applyMatrix4(matrix).toArray(vertices, i * 3);
  }
  const desc = RAPIER.ColliderDesc.convexHull(vertices);
  if (!desc) throw new Error('A world obstacle could not be built.');
  world.createCollider(desc.setFriction(0.85));
}

export function buildWorld(scene: THREE.Scene, world: RAPIER.World) {
  const random = seededRandom(73);
  const material = (color: THREE.ColorRepresentation) =>
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  const grass = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
  const sand = material('#d9b783');
  const coral = material('#d68a58');
  const rockMaterial = material('#829489');
  const trunkMaterial = material('#93775b');
  const leafMaterial = material('#488b69');
  const upperLeafMaterial = material('#68a377');
  const cream = material('#fff0ce');

  const { vertices, indices } = terrainSamples();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  const colors = new Float32Array(vertices.length);
  const color = new THREE.Color();
  const grassColor = new THREE.Color('#94b46c');
  const trailColor = new THREE.Color('#d9b580');
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const z = vertices[i + 2];
    const distance = trailDistance(x, z);
    const clearing = Math.hypot(x, z - START.z);
    const dirt = Math.max(1 - THREE.MathUtils.smoothstep(distance, 2.5, 4.5),
      1 - THREE.MathUtils.smoothstep(clearing, 6, 10));
    color.copy(grassColor).lerp(trailColor, dirt);
    color.multiplyScalar(0.95 + random() * 0.1);
    color.toArray(colors, i);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(geometry, grass);
  terrain.receiveShadow = true;
  scene.add(terrain);
  world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.9));

  const box = (size: THREE.Vector3, position: THREE.Vector3, mat: THREE.Material, solid = false) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat);
    mesh.position.copy(position);
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (solid) {
      world.createCollider(RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
        .setTranslation(position.x, position.y, position.z).setFriction(0.7));
    }
    return mesh;
  };
  box(new THREE.Vector3(152, 8, 152), new THREE.Vector3(0, -4.9, 0), sand);
  // The low, visible sandstone perimeter is also the physical world boundary.
  for (const side of [-1, 1]) {
    box(new THREE.Vector3(2, 11, 152), new THREE.Vector3(side * 75, 3.5, 0), sand, true);
    box(new THREE.Vector3(148, 11, 2), new THREE.Vector3(0, 3.5, side * 75), sand, true);
    box(new THREE.Vector3(2.3, 0.25, 152), new THREE.Vector3(side * 75, 9.1, 0), cream);
    box(new THREE.Vector3(148, 0.25, 2.3), new THREE.Vector3(0, 9.1, side * 75), cream);
  }

  for (const ramp of RAMPS) {
    const base = surfaceHeight(ramp.x, ramp.z) - 0.025;
    const geo = rampGeometry(ramp.width, ramp.length, ramp.height);
    const mesh = new THREE.Mesh(geo, coral);
    mesh.position.set(ramp.x, base, ramp.z);
    mesh.rotation.y = ramp.angle;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.updateMatrix();
    scene.add(mesh);
    hull(world, geo, mesh.matrix);
    // Painted slats follow the same incline, without separate collision geometry.
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(ramp.width - 0.5, 0.025, 0.13), cream);
      stripe.position.set(0, t * ramp.height + 0.035, ramp.length / 2 - t * ramp.length);
      stripe.rotation.x = Math.atan(ramp.height / ramp.length);
      mesh.add(stripe);
    }
  }

  const propAllowed = (x: number, z: number, margin: number) => {
    if (Math.hypot(x, z - START.z) < 15 || trailDistance(x, z) < margin) return false;
    return !RAMPS.some(ramp => rampEdgeDistance(x, z, ramp, 5, 14) < 0);
  };
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, 42);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let placed = 0;
  while (placed < rocks.count) {
    const x = (random() - 0.5) * 132;
    const z = (random() - 0.5) * 132;
    if (!propAllowed(x, z, 5)) continue;
    const size = 0.7 + random() * 1.8;
    dummy.position.set(x, surfaceHeight(x, z) + size * 0.35, z);
    dummy.scale.set(size * 1.4, size * 0.9, size);
    dummy.rotation.set(random() * 0.4, random() * Math.PI, random() * 0.3);
    dummy.updateMatrix();
    rocks.setMatrixAt(placed++, dummy.matrix);
    hull(world, rockGeometry, dummy.matrix);
  }
  scene.add(rocks);

  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 2.8, 6);
  const lowerGeo = new THREE.ConeGeometry(2.3, 4.6, 7);
  const upperGeo = new THREE.ConeGeometry(1.7, 3.6, 7);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMaterial, 65);
  const lower = new THREE.InstancedMesh(lowerGeo, leafMaterial, 65);
  const upper = new THREE.InstancedMesh(upperGeo, upperLeafMaterial, 65);
  placed = 0;
  while (placed < trunks.count) {
    const x = (random() - 0.5) * 137;
    const z = (random() - 0.5) * 137;
    if (!propAllowed(x, z, 7)) continue;
    const size = 0.65 + random() * 0.7;
    const y = surfaceHeight(x, z);
    dummy.scale.setScalar(size);
    dummy.rotation.set(0, random() * Math.PI, 0);
    const parts = [
      { mesh: trunks, geo: trunkGeo, y: 1.1 },
      { mesh: lower, geo: lowerGeo, y: 3.5 },
      { mesh: upper, geo: upperGeo, y: 5.6 },
    ];
    for (const part of parts) {
      dummy.position.set(x, y + part.y * size, z);
      dummy.updateMatrix();
      part.mesh.setMatrixAt(placed, dummy.matrix);
      hull(world, part.geo, dummy.matrix);
    }
    placed++;
  }
  for (const mesh of [trunks, lower, upper]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  const flowers = new THREE.InstancedMesh(new THREE.ConeGeometry(0.18, 0.6, 4), cream, 260);
  placed = 0;
  while (placed < flowers.count) {
    const x = (random() - 0.5) * 140;
    const z = (random() - 0.5) * 140;
    if (trailDistance(x, z) < 5 || Math.hypot(x, z - START.z) < 10) continue;
    dummy.position.set(x, surfaceHeight(x, z) + 0.2, z);
    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.scale.setScalar(0.7 + random() * 0.7);
    dummy.updateMatrix();
    flowers.setMatrixAt(placed++, dummy.matrix);
  }
  scene.add(flowers);

  const sign = (x: number, z: number, heading: string, sub: string, angle: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not create the trail signs.');
    ctx.fillStyle = '#f7ecd3';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#325955';
    ctx.lineWidth = 8;
    ctx.strokeRect(14, 14, 484, 228);
    ctx.fillStyle = '#325955';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(heading, 256, 114);
    ctx.font = '24px sans-serif';
    ctx.fillText(sub, 256, 165);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.1, 0.22),
      [trunkMaterial, trunkMaterial, trunkMaterial, trunkMaterial,
        new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }), trunkMaterial]);
    const y = surfaceHeight(x, z);
    board.position.set(x, y + 3.7, z);
    board.rotation.y = angle;
    board.castShadow = true;
    board.updateMatrix();
    scene.add(board);
    hull(world, board.geometry, board.matrix);
    box(new THREE.Vector3(0.28, 3.6, 0.28), new THREE.Vector3(x, y + 1.8, z), trunkMaterial, true);
  };
  sign(-8.8, 15, 'SUNSHINE VALLEY', 'THE LONG WAY IS THE GOOD WAY', 0.28);
  sign(14, -22, 'HIGHER GROUND', 'A LITTLE UP. A LITTLE OVER.', -0.3);
  sign(-46, 13, 'SCENIC LOOP', 'TAKE YOUR TIME', 1.2);

  const distant = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), material('#86b6a0'), 22);
  for (let i = 0; i < distant.count; i++) {
    const a = i / distant.count * Math.PI * 2;
    const h = 18 + random() * 28;
    dummy.position.set(Math.cos(a) * 132, h / 2 - 6, Math.sin(a) * 132);
    dummy.scale.set(20 + random() * 17, h, 20 + random() * 17);
    dummy.rotation.set(0, random(), 0);
    dummy.updateMatrix();
    distant.setMatrixAt(i, dummy.matrix);
  }
  scene.add(distant);
  const clouds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), material('#fff6e5'), 36);
  for (let i = 0; i < clouds.count; i++) {
    const cluster = Math.floor(i / 3);
    const a = cluster * 2.4;
    dummy.position.set(Math.sin(a) * 100 + (i % 3) * 6, 31 + (cluster % 4) * 4, Math.cos(a) * 100);
    dummy.scale.set(7, 2.5 + i % 3, 4);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    clouds.setMatrixAt(i, dummy.matrix);
  }
  scene.add(clouds);

  return { terrain, bounds: WORLD_HALF };
}
