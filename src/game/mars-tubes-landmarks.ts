import * as THREE from 'three';
import { LAVA_TUBES, QUIET_VAULT, tubeCentreX, tubeOpening, type LavaTube } from './mars-tubes-layout';
import { groundMarsRock, marsRockGeometry } from './mars-landmarks';
import { marsRandom, marsSurfaceHeight } from './mars-terrain';

const ROOF_HALF_WIDTH = 22;
export function tubeRoofHeight(tube: LavaTube, x: number, z: number) {
  const u = (x - tubeCentreX(tube, z)) / ROOF_HALF_WIDTH;
  const left = Math.max(18, marsSurfaceHeight(tubeCentreX(tube, z) - ROOF_HALF_WIDTH, z));
  const right = Math.max(18, marsSurfaceHeight(tubeCentreX(tube, z) + ROOF_HALF_WIDTH, z));
  const edge = left + (right - left) * (u + 1) / 2;
  return edge + (1 - u * u) * (1.4 + 0.45 * Math.sin(z * 0.19 + x * 0.13));
}
function roofRows(tube: LavaTube) {
  const rows: number[] = [tube.north, tube.south];
  const step = 4;
  for (let z = Math.ceil(tube.north / step) * step; z < tube.south; z += step) rows.push(z);
  for (const z of tube.skylights) rows.push(z - 12, z, z + 12);
  return [...new Set(rows)].sort((a, b) => a - b);
}

export function tubeFloorRubble(tube: LavaTube) {
  const stones: { x: number; z: number; radius: number; height: number; turn: number }[] = [];
  for (let row = 0, z = tube.north + 5; z < tube.south - 4; row++, z += 6.5) {
    const lane = row % 2;
    const random = (channel: number) => marsRandom(row, tube.x + lane, channel + 70);
    const rz = z + (random(0) - 0.5) * 2;
    stones.push({ x: tubeCentreX(tube, rz) + (lane ? 1 : -1) * (0.4 + random(1) * 2.6),
      z: rz, radius: 0.5 + random(2) * 0.4, height: 0.16 + random(3) * 0.08, turn: random(4) * Math.PI });
  }
  return stones;
}

export function tubeFloorRockGeometry(stone: ReturnType<typeof tubeFloorRubble>[number]) {
  // Northern Reach's roadside dodecahedra, flattened and embedded for wheel-sized bumps.
  const geometry = new THREE.DodecahedronGeometry(1, 0).rotateY(stone.turn)
    .scale(stone.radius, stone.height, stone.radius * 0.8);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = stone.x + positions.getX(i), z = stone.z + positions.getZ(i);
    positions.setXYZ(i, x, marsSurfaceHeight(x, z) + positions.getY(i) - 0.015, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function tubeRimRockGeometry(tube: LavaTube, z: number, side: number, dz: number) {
  const rz = z + dz + (z === tube.south ? -5 : z === tube.north ? 5 : 0);
  if (rz < tube.north + 4 || rz > tube.south - 4) return null;
  const opening = tubeOpening(tube, rz);
  const x = tubeCentreX(tube, rz) + side * (opening > 0 ? opening + 5.2 : 9.5);
  const geometry = marsRockGeometry(2.2 + Math.abs(dz) * 0.08,
    0.7 + (dz === 0 ? 0.35 : 0), z + side + dz).rotateY(z * 0.2);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const px = x + positions.getX(i), pz = rz + positions.getZ(i);
    positions.setXYZ(i, px, tubeRoofHeight(tube, px, pz) + positions.getY(i) - 0.45, pz);
  }
  geometry.computeVertexNormals();
  return { geometry, x: tubeCentreX(tube, rz), z: rz };
}

/** Two thin rock skins meet the trench shoulders; openings cut through both skins. */
export function lavaTubeGeometry(tube: LavaTube, cx?: number, cz?: number): THREE.BufferGeometry {
  const vertices: number[] = [], colors: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, underside = false) => {
    if (new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).lengthSq() < 1e-8) return;
    for (const p of [a, b, c]) {
      vertices.push(p.x, p.y, p.z);
      const shade = (underside ? 0.38 : 1) * (0.9 + 0.1 * Math.sin(p.x * 0.3 + p.z * 0.4));
      colors.push(0.12 * shade, 0.088 * shade, 0.073 * shade);
    }
  };
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, underside = false) => {
    tri(a, b, d, underside); tri(b, c, d, underside);
  };
  const vertex = (z: number, side: number, f: number, bottom: boolean) => {
    const opening = tubeOpening(tube, z);
    const x = tubeCentreX(tube, z) + side * (opening + (ROOF_HALF_WIDTH - opening) * f);
    const thickness = 1.35 + 0.38 * Math.sin(x * 0.6 + z * 0.37);
    return new THREE.Vector3(x, tubeRoofHeight(tube, x, z) - (bottom ? thickness : 0), z);
  };
  const rows = roofRows(tube), columns = 5;
  for (let row = 1; row < rows.length; row++) {
    const a = rows[row - 1], b = rows[row], mid = (a + b) / 2;
    if (cx !== undefined && (Math.floor(tubeCentreX(tube, mid) / 96) !== cx || Math.floor(mid / 96) !== cz)) continue;
    for (const side of [-1, 1]) {
      for (let j = 0; j < columns; j++) {
        const f = j / columns, g = (j + 1) / columns;
        for (const bottom of [false, true]) {
          const corners = [vertex(a, side, f, bottom), vertex(b, side, f, bottom),
            vertex(b, side, g, bottom), vertex(a, side, g, bottom)];
          if ((side < 0) !== bottom) corners.reverse();
          quad(corners[0], corners[1], corners[2], corners[3], bottom);
        }
        if (row === 1) quad(vertex(a, side, f, false), vertex(a, side, g, false),
          vertex(a, side, g, true), vertex(a, side, f, true));
        if (row === rows.length - 1) quad(vertex(b, side, g, false), vertex(b, side, f, false),
          vertex(b, side, f, true), vertex(b, side, g, true));
      }
      for (const f of [0, 1]) {
        if (f === 0 && !tubeOpening(tube, a) && !tubeOpening(tube, b)) continue;
        const corners = [vertex(a, side, f, false), vertex(a, side, f, true),
          vertex(b, side, f, true), vertex(b, side, f, false)];
        if ((side < 0) !== (f === 0)) corners.reverse();
        quad(corners[0], corners[1], corners[2], corners[3]);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function addTubesDecor(cx: number, cz: number, add: (g: THREE.BufferGeometry, m: THREE.Material, solid?: boolean) => void) {
  const owns = (x: number, z: number) => Math.floor(x / 96) === cx && Math.floor(z / 96) === cz;
  let roofMaterial: THREE.MeshStandardMaterial | undefined, basalt: THREE.MeshStandardMaterial | undefined;
  const rock = (geometry: THREE.BufferGeometry) => {
    basalt ??= new THREE.MeshStandardMaterial({ color: '#514640', roughness: 1, flatShading: true });
    add(geometry, basalt, true);
  };
  for (const tube of LAVA_TUBES) {
    if (Math.abs(cx - Math.floor(tube.x / 96)) > 1
      || cz < Math.floor((tube.north - 10) / 96) || cz > Math.floor((tube.south + 10) / 96)) continue;
    const roof = lavaTubeGeometry(tube, cx, cz);
    if (roof.getAttribute('position').count) {
      roofMaterial ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide });
      roofMaterial.userData.castShadow = false;
      add(roof, roofMaterial, true);
    } else roof.dispose();
    for (const stone of tubeFloorRubble(tube)) if (owns(stone.x, stone.z)) rock(tubeFloorRockGeometry(stone));
    for (const z of [tube.south, ...tube.skylights, tube.north]) {
      for (const side of [-1, 1]) for (const dz of [-6, 0, 6]) {
        const rim = tubeRimRockGeometry(tube, z, side, dz);
        if (!rim) continue;
        if (owns(rim.x, rim.z)) rock(rim.geometry); else rim.geometry.dispose();
      }
    }
    for (const z of [tube.south, ...tube.skylights, tube.north]) {
      for (let i = 0; i < 12; i++) {
        const side = i % 2 ? -1 : 1;
        const dz = -8 + Math.floor(i / 2) * 3.1;
        if (z === -456 && Math.abs(dz) < 3.5) continue;
        const x = tubeCentreX(tube, z + dz) + side * (5.6 + 1.8 * Math.sin(i * 2.3 + z));
        if (owns(x, z + dz)) rock(groundMarsRock(marsRockGeometry(2 + (i % 3) * 0.7,
          0.7 + (i % 4) * 0.36, z + i).rotateY(i * 1.3), x, z + dz));
      }
      // Low fallen plates cross the easy line; large collapse blocks stay at its sides.
      for (let i = 0; i < 3; i++) {
        const rz = z - 5 + i * 4.2, x = tubeCentreX(tube, rz) + (i - 1) * 1.2;
        if (owns(x, rz)) rock(groundMarsRock(marsRockGeometry(2.4, 0.32 + i * 0.04, z - i)
          .scale(1, 1, 0.65).rotateY(i * 0.8), x, rz));
      }
    }
  }
  if (owns(QUIET_VAULT.x, QUIET_VAULT.z)) {
    const { x, z } = QUIET_VAULT, y = marsSurfaceHeight(x, z) - 0.15;
    const shell = new THREE.MeshStandardMaterial({ color: '#292f30', metalness: 0.55, roughness: 0.47, flatShading: true });
    const inlay = new THREE.MeshStandardMaterial({ color: '#82b9ad', emissive: '#528d80', emissiveIntensity: 0.5, roughness: 0.65 });
    const plate = (points: number[][], depth: number, offset: number) => {
      const shape = new THREE.Shape();
      points.forEach(([px, py], i) => i ? shape.lineTo(px, py) : shape.moveTo(px, py));
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.09,
        bevelThickness: 0.09, bevelSegments: 1, curveSegments: 1 })
        .rotateZ(-0.09).translate(x, y, z + offset);
    };
    // Broken, nested gate leaves an actual void, not a glowing rectangle on a box.
    add(plate([[-4.8, -0.6], [-4.1, 4.8], [-0.8, 8.2], [-1.1, 6.3], [-2.8, 3.9], [-2.8, 0]], 1.1, 0), shell, true);
    add(plate([[3, -0.5], [4.5, 0.2], [4.1, 5.5], [0.2, 8.7], [0.5, 6.9], [2.7, 4.4]], 0.85, -0.6), shell, true);
    add(plate([[-1.2, 0], [-0.65, 4], [0.1, 5.2], [0.65, 3.1], [0.8, 0]], 0.65, 0.3), shell, true);
    add(plate([[-3.7, 0.5], [-3.65, 4.5], [-1.4, 6.85], [-1.48, 6.55], [-3.5, 4.3], [-3.5, 0.6]], 0.025, 1.21), inlay);
    add(plate([[3.25, 1.5], [3.48, 1.7], [3.38, 4.7], [1.1, 6.65], [1.05, 6.4], [3.2, 4.5]], 0.025, 0.36), inlay);
    for (let i = 0; i < 3; i++) add(plate([[-0.35, 1.3 + i * 0.65], [0.15, 1.5 + i * 0.65],
      [0.15, 1.61 + i * 0.65], [-0.35, 1.41 + i * 0.65]], 0.03, 1.06), inlay);
    rock(groundMarsRock(marsRockGeometry(3, 0.8, 84).scale(1.6, 1, 0.7), x - 3, z + 2));
  }
}
