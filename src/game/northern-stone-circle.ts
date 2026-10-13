import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Broad, split slabs with clipped corners, unequal shoulders and broken crowns. */
function slab(width: number, depth: number, height: number, seed: number): THREE.BufferGeometry {
  const outline = [[-0.5, -0.25], [-0.29, -0.5], [0.28, -0.46], [0.5, -0.15],
    [0.44, 0.33], [0.18, 0.5], [-0.35, 0.41], [-0.51, 0.09]];
  const points: THREE.Vector3[] = [];
  for (const [j, [x, z]] of outline.entries()) {
    const chip = 0.035 * Math.sin(seed * 3.1 + j * 2.7);
    points.push(new THREE.Vector3((x + chip) * width, -0.65, z * depth));
    points.push(new THREE.Vector3((x * 1.02 + chip) * width,
      height * (0.29 + 0.045 * Math.sin(j + seed)), (z + chip) * depth));
    points.push(new THREE.Vector3((x * 0.93 + 0.025 * Math.sin(seed)) * width,
      height * (0.77 + x * 0.08), z * depth * 0.97));
    const broken = j === seed % 8 || j === (seed + 1) % 8 ? 0.13 : 0;
    points.push(new THREE.Vector3((x * 0.76 + 0.06 * Math.sin(seed)) * width,
      height * (0.94 + x * 0.15 - z * 0.09 - broken), (z * 0.77 + 0.015) * depth));
  }
  return new ConvexGeometry(points);
}

export function stoneCircleGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const granite = new THREE.Color('#8c9189'), moss = new THREE.Color('#566747');
  const add = (geometry: THREE.BufferGeometry, seed: number) => {
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i += 3) {
      const cx = (positions.getX(i) + positions.getX(i + 1) + positions.getX(i + 2)) / 3;
      const cz = (positions.getZ(i) + positions.getZ(i + 1) + positions.getZ(i + 2)) / 3;
      const facet = 0.89 + 0.09 * Math.sin(cx * 2.3 + cz * 1.7 + seed);
      for (let j = i; j < i + 3; j++) {
        const y = positions.getY(j);
        const weather = 0.5 + 0.5 * Math.sin(positions.getX(j) * 1.4 + positions.getZ(j) * 0.85);
        const damp = (1 - THREE.MathUtils.smoothstep(y, 0.15, 2.1)) * (0.35 + weather * 0.4);
        granite.clone().multiplyScalar(facet).lerp(moss, damp).toArray(colors, j * 3);
      }
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(geometry);
  };

  // A loose ellipse, with a missing southern stone and varied slab orientations.
  // Each footprint stays inside the hollow's level floor and below the enclosing hills.
  const stones = [
    [-11, -2, 3.8, 1.7, 5.3, -0.15, 0.07],
    [-8, -9, 3.1, 1.8, 4.5, 0.7, -0.08],
    [-1, -12, 3.7, 1.65, 5.8, -0.2, 0.04],
    [7, -9.5, 2.8, 1.9, 4.6, -0.7, -0.12],
    [11.5, -3, 3.5, 1.65, 5.2, -1.2, 0.08],
    [10, 5, 3.1, 1.8, 3.8, -1.6, 0.13],
    [6.5, 10.5, 2.9, 1.6, 4.4, 0.4, -0.07],
    [-6, 10, 3.5, 1.8, 4.9, -0.35, 0.06],
    [-10.5, 5, 2.8, 1.6, 3.6, 0.7, -0.17],
  ];
  stones.forEach(([x, z, width, depth, height, turn, lean], i) => {
    add(slab(width, depth, height, i + 1).rotateZ(lean).rotateY(turn).translate(x, 0, z), i + 1);
  });
  // The central marker snapped at its base. Both pieces rest in the grass;
  // the southern entrance and the middle of the circle remain open to the car.
  add(slab(2.7, 1.7, 1.55, 12).rotateY(0.2).translate(-2.4, 0, -3.7), 12);
  add(slab(2.2, 1.5, 3.7, 13).rotateX(Math.PI / 2).rotateY(-0.4).translate(-3.6, 0.55, -5.1), 13);
  add(slab(1.7, 1.3, 0.65, 14).rotateY(0.9).translate(1.1, 0, -4.8), 14);

  const merged = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  if (!merged) throw new Error('Could not create the Northern Reach stone circle.');
  return merged;
}
