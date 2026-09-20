import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type Slab = [x: number, z: number, width: number, depth: number, height: number, turn: number];

/** Fractured bedrock: broad planar faces and oblique tops, never circular shelves. */
function fracturedFormation(slabs: Slab[], buried: number): THREE.BufferGeometry {
  const parts = slabs.map(([x, z, width, depth, height, turn], i) => {
    // A clipped rectangular footprint gives each slab long faces and narrow fracture edges.
    const outline = [[-0.5, -0.32], [-0.31, -0.5], [0.38, -0.5], [0.5, -0.16],
      [0.43, 0.43], [0.1, 0.5], [-0.5, 0.29]];
    const points: THREE.Vector3[] = [];
    for (const [corner, [u, v]] of outline.entries()) {
      points.push(new THREE.Vector3(u * width, -buried, v * depth));
      // Staggered fracture corners interrupt long, perfectly extruded side faces.
      const shoulder = 0.9 + 0.08 * Math.sin(corner * 2.1 + i);
      points.push(new THREE.Vector3(u * width * shoulder,
        height * (0.28 + 0.09 * Math.cos(corner + i)), v * depth * shoulder));
      // One sloping fracture plane, with a chipped corner; broad crown instead of a tip.
      const chip = corner === (i + 2) % outline.length ? 0.12 : 0;
      const top = height * (0.82 + u * 0.22 - v * 0.16 - chip);
      points.push(new THREE.Vector3((u * 0.78 + 0.06 * Math.sin(i + 1)) * width,
        top, (v * 0.82 - 0.05) * depth));
    }
    return new ConvexGeometry(points).rotateY(turn).translate(x, 0, z);
  });
  const result = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  if (!result) throw new Error('Could not create fractured rock formation.');
  return result;
}

// Each layout changes the massing: a split ridge, a leaning wall, or a stepped buttress.
const FRACTURE_LAYOUTS: Slab[][] = [
  [[-0.19, 0, 0.58, 0.85, 1, -0.16], [0.22, 0.08, 0.44, 0.7, 0.72, 0.19],
    [-0.3, 0.22, 0.38, 0.62, 0.34, -0.35]],
  [[0.02, -0.1, 0.87, 0.48, 0.88, 0.28], [-0.24, 0.17, 0.49, 0.57, 0.56, -0.22],
    [0.3, 0.12, 0.28, 0.52, 0.3, 0.5]],
  [[0.2, -0.08, 0.48, 0.72, 1.06, -0.3], [-0.18, 0.03, 0.6, 0.8, 0.65, 0.14],
    [-0.3, 0.19, 0.35, 0.6, 0.28, 0.4]],
];

function rockFormation(variant: number, width: number, depth: number, height: number, buried: number) {
  const layout = FRACTURE_LAYOUTS[Math.abs(Math.trunc(variant)) % FRACTURE_LAYOUTS.length];
  return fracturedFormation(layout.map(([x, z, w, d, h, turn]) =>
    [x * width, z * depth, w * width, d * depth, h * height, turn]), buried);
}

// Landmark layouts use world-space dimensions and individually composed masses.
// Their indices are explicitly assigned in the authored location data.
export const GRANITE_LANDMARKS: Slab[][] = [
  // Entrance wall: long, low, broken at one end.
  [[0, 0, 6.8, 2.7, 6, .15], [-2.4, .4, 2.1, 3, 3.2, -.25]],
  // Entrance sentinels: unequal separated blades with daylight between them.
  [[-2, 0, 2.2, 3.3, 11.5, -.25], [1.9, .3, 1.9, 2.6, 7.4, .4]],
  // Solitary broad, oblique block.
  [[0, 0, 5.2, 4.4, 5.5, -.55]],
  // Sawtooth ridge: four uneven peaks across a narrow spine.
  [[-2.5, 0, 1.7, 2.4, 4.5, .2], [-1, -.2, 1.9, 2.5, 8, -.3],
    [.7, .1, 1.8, 2.7, 10.5, .15], [2.2, .2, 1.7, 2, 6.2, -.4]],
  // Fallen fragments: a low, scattered rubble mound.
  [[0, 0, 3.4, 3.2, 4.3, .65], [-2, -.5, 2.9, 2.1, 2.6, -.7],
    [1.9, 1, 2.6, 2, 2.1, .2], [-1.2, 1.9, 2.2, 1.8, 1.4, .9]],
];

export const SEA_LANDMARKS: Slab[][] = [
  // Narrow fin, broadside to the approach.
  [[0, 0, 4.2, 1.6, 11, -.2]],
  // Split tooth with a low detached remnant.
  [[-1.2, 0, 1.7, 2.5, 9.8, .1], [1.1, .2, 1.5, 1.8, 5.5, -.3],
    [1.8, 1.3, 1, 1.4, 1.8, .6]],
  // Squat offshore fortress with a broken shoulder.
  [[-.3, -.1, 3.8, 3.6, 5.8, .45], [1.6, .8, 1.8, 2.3, 3.4, -.2]],
  // Three teeth stepping up along a fractured spine.
  [[-1.5, 0, 1.5, 2.4, 4.1, -.2], [0, 0, 1.6, 2.5, 7.2, .25], [1.4, 0, 1.3, 2, 10, -.15]],
];

export const LAYERED_LANDMARKS: Slab[][] = [
  [[0, 0, 17, 6, 8, .2], [-7, 1, 4, 7, 3, -.3]],
  [[-5, 0, 5, 7, 13, -.3], [3, 1, 6, 6, 8, .25]],
  [[0, 0, 12, 11, 7, -.6]],
  [[-6, 0, 5, 6, 6, -.3], [-2, 0, 5, 7, 11, .2], [3, 0, 5, 6, 15, -.2], [6, 1, 4, 5, 8, .4]],
  [[0, 0, 9, 8, 8, .6], [-6, 1, 7, 5, 4, -.7], [5, 3, 6, 5, 3, .4], [-1, 5, 5, 4, 2, -.2]],
  [[-4, 0, 7, 10, 12, -.4], [4, -2, 7, 4, 5, .3]],
  [[0, -3, 16, 4, 9, 0], [-6, 2, 4, 7, 5, -.1], [6, 2, 4, 7, 7, .2]],
  [[-5, 0, 5, 7, 5, .25], [0, 0, 6, 8, 8, -.15], [5, 0, 5, 7, 11, .3]],
];

/** Closed, irregular rock strata. Broad lower rings form accessible sloping toes. */
function strata(rings: { y: number; radius: number; offset: number }[], stretch: number, phase = 0): THREE.BufferGeometry {
  const sides = 16, positions: number[] = [], indices: number[] = [];
  for (const [level, ring] of rings.entries()) for (let i = 0; i < sides; i++) {
    const angle = i * Math.PI * 2 / sides;
    const radius = ring.radius * (1 + 0.09 * Math.sin(angle * 3 + 0.6 + phase)
      + 0.05 * Math.cos(angle * 5 - phase * 0.7));
    positions.push(Math.cos(angle) * radius + ring.offset,
      ring.y + (level === 0 ? 0 : 0.06 * ring.radius * Math.sin(angle * 2 + level + phase)),
      Math.sin(angle) * radius * stretch);
  }
  for (let level = 0; level < rings.length - 1; level++) for (let i = 0; i < sides; i++) {
    const a = level * sides + i, b = level * sides + (i + 1) % sides, c = a + sides, d = b + sides;
    indices.push(a, c, b, b, c, d);
  }
  const bottom = positions.length / 3;
  positions.push(rings[0].offset, rings[0].y, 0);
  const top = positions.length / 3, last = rings.at(-1)!;
  positions.push(last.offset, last.y, 0);
  for (let i = 0; i < sides; i++) {
    indices.push(i, (i + 1) % sides, bottom);
    const offset = (rings.length - 1) * sides;
    indices.push(offset + i, top, offset + (i + 1) % sides);
  }
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const geometry = indexed.toNonIndexed();
  indexed.dispose(); geometry.computeVertexNormals();
  return geometry;
}

export function layeredRockGeometry(variant = 0): THREE.BufferGeometry {
  if (variant >= 3) return fracturedFormation(LAYERED_LANDMARKS[variant - 3], 1.5);
  return rockFormation(variant, 19, 14, 14, 1.5);
}

export function rockRampGeometry(): THREE.BufferGeometry {
  return strata([
    { y: -0.7, radius: 9, offset: 0 }, { y: 0.1, radius: 7, offset: 0 },
    { y: 1.1, radius: 3.8, offset: 0.3 }, { y: 1.35, radius: 1, offset: 0.2 },
  ], 0.8);
}

/** Connected granite slabs with offset fracture planes and low buttresses. */
export function graniteTorGeometry(variant = 0): THREE.BufferGeometry {
  if (variant >= 3) return fracturedFormation(GRANITE_LANDMARKS[variant - 3], 1);
  return rockFormation(variant + 1, 6.4, 5.2, 12.3, 1);
}

export function coastStackGeometry(variant = 0): THREE.BufferGeometry {
  if (variant >= 3) return fracturedFormation(SEA_LANDMARKS[variant - 3], .4);
  return rockFormation(variant + 2, 4.6, 3.8, 10.8, 0.4);
}

export function shoalBoulderGeometry(): THREE.BufferGeometry {
  return strata([
    { y: -0.7, radius: 4, offset: 0 }, { y: -0.15, radius: 3.6, offset: -0.2 },
    { y: 0.2, radius: 2.6, offset: 0.3 }, { y: 0.5, radius: 1.5, offset: 0.5 },
    { y: 0.65, radius: 0.65, offset: 0.1 },
  ], 1.16);
}

export function weatheredArchGeometry(variant = 0): THREE.BufferGeometry {
  // Trace the outer crown clockwise, then return through the open underside.
  // The second landmark has a narrow window and a tall, broken left shoulder.
  const outline = variant === 1
    ? [[-11,-2],[-12,4],[-10,12],[-7,16],[-3,13],[3,12],[8,8],[10,-2],
      [4,-2],[4,4],[2,7],[-2,8],[-5,5],[-5,-2]]
    : [[-14,-2],[-14,3],[-12,8],[-10,12],[-6,15],[-2,14],[2,15],[7,12],[10,11],[13,5],[14,-2],
      [6,-2],[6,3],[4,6],[2,7],[-2,7.4],[-5,5],[-6,-2]];
  const contour = outline.map(([x, y]) => new THREE.Vector2(x, y));
  const cap = THREE.ShapeUtils.triangulateShape(contour, []);
  const positions: number[] = [], indices: number[] = [];
  const depths = [-4.4, -1.3, 2, 4.2];
  for (const [layer, depth] of depths.entries()) {
    for (const [i, [x, y]] of outline.entries()) {
      const spread = [0.92, 1.03, 1, 0.88][layer];
      positions.push(x * spread + .25 * Math.sin(layer * 2 + i * .6),
        y + (y > 0 ? .22 * Math.sin(i * 1.9 + layer) : 0),
        depth + .5 * Math.sin(i * 1.3 + layer * .8));
    }
  }
  const n = outline.length;
  // Clockwise outline: front cap points -Z; sides point away from the solid.
  for (let layer = 0; layer < depths.length - 1; layer++) for (let i = 0; i < n; i++) {
    const a = layer * n + i, b = layer * n + (i + 1) % n, c = a + n, d = b + n;
    indices.push(a, c, b, b, c, d);
  }
  for (const [a, b, c] of cap) {
    indices.push(c, b, a);
    const offset = (depths.length - 1) * n;
    indices.push(a + offset, b + offset, c + offset);
  }
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const arch = indexed.toNonIndexed();
  indexed.dispose();
  arch.computeVertexNormals();
  const feet = fracturedFormation(variant === 1
    ? [[-10, 1, 6, 7, 5, -.3], [9, -1, 5, 6, 3, .4]]
    : [[-12, 1, 7, 8, 6, -.25], [12, -1, 7, 7, 4.2, .3], [-14, -3, 4, 4, 2.5, .7]], 2);
  const result = mergeGeometries([arch, feet]);
  arch.dispose(); feet.dispose();
  if (!result) throw new Error('Could not create natural arch.');
  return result;
}

/** Static concave formations must retain their recesses and openings in physics. */
export function rockColliderMesh(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4) {
  const mesh = geometry.clone().applyMatrix4(matrix);
  const vertices = new Float32Array(mesh.getAttribute('position').array);
  const indices = mesh.index ? new Uint32Array(mesh.index.array)
    : Uint32Array.from({ length: vertices.length / 3 }, (_, i) => i);
  mesh.dispose();
  return { vertices, indices };
}
