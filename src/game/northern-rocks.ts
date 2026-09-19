import * as THREE from 'three';

/** Closed, irregular rock strata. Broad lower rings form accessible sloping toes. */
function strata(rings: { y: number; radius: number; offset: number }[], stretch: number): THREE.BufferGeometry {
  const sides = 16, positions: number[] = [], indices: number[] = [];
  for (const [level, ring] of rings.entries()) for (let i = 0; i < sides; i++) {
    const angle = i * Math.PI * 2 / sides;
    const radius = ring.radius * (1 + 0.09 * Math.sin(angle * 3 + 0.6) + 0.05 * Math.cos(angle * 5));
    positions.push(Math.cos(angle) * radius + ring.offset,
      ring.y + (level === 0 ? 0 : 0.06 * ring.radius * Math.sin(angle * 2 + level)),
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

export function layeredRockGeometry(): THREE.BufferGeometry {
  return strata([
    { y: -1.5, radius: 11, offset: 0 }, { y: 2, radius: 9, offset: -0.5 },
    { y: 3, radius: 7, offset: -0.3 }, { y: 7, radius: 7.5, offset: 0.7 },
    { y: 8, radius: 5, offset: 1 }, { y: 12, radius: 4.5, offset: 0.4 },
    { y: 14, radius: 2.5, offset: -0.4 },
  ], 0.75);
}

export function rockRampGeometry(): THREE.BufferGeometry {
  return strata([
    { y: -0.7, radius: 9, offset: 0 }, { y: 0.1, radius: 7, offset: 0 },
    { y: 1.1, radius: 3.8, offset: 0.3 }, { y: 1.35, radius: 1, offset: 0.2 },
  ], 0.8);
}

/** Uneven shelves and a broken crown replace the stretched regular-solid silhouette. */
export function graniteTorGeometry(): THREE.BufferGeometry {
  return strata([
    { y: -1, radius: 3.2, offset: 0 }, { y: 1.2, radius: 3.1, offset: -0.2 },
    { y: 3.8, radius: 2.5, offset: -0.5 }, { y: 4.3, radius: 2.8, offset: -0.3 },
    { y: 7.1, radius: 2.3, offset: 0.2 }, { y: 7.6, radius: 1.9, offset: 0.4 },
    { y: 10.4, radius: 1.8, offset: 0.1 }, { y: 12.3, radius: 0.9, offset: -0.5 },
  ], 0.82);
}

export function coastStackGeometry(): THREE.BufferGeometry {
  return strata([
    { y: -0.3, radius: 2.2, offset: 0 }, { y: 1.2, radius: 1.9, offset: -0.15 },
    { y: 3.4, radius: 1.35, offset: 0.15 }, { y: 4.1, radius: 1.65, offset: 0.25 },
    { y: 6.6, radius: 1.4, offset: 0 }, { y: 8.5, radius: 1.1, offset: -0.25 },
    { y: 10, radius: 0.65, offset: -0.1 },
  ], 0.88);
}

export function shoalBoulderGeometry(): THREE.BufferGeometry {
  return strata([
    { y: -0.7, radius: 4, offset: 0 }, { y: -0.15, radius: 3.6, offset: -0.2 },
    { y: 0.2, radius: 2.6, offset: 0.3 }, { y: 0.5, radius: 1.5, offset: 0.5 },
    { y: 0.65, radius: 0.65, offset: 0.1 },
  ], 1.16);
}

export function weatheredArchGeometry(): THREE.BufferGeometry {
  // The outline follows the inner opening back to the foot, leaving a real passage.
  const outline = [[-12,-1],[-12,5],[-10,10],[-5,13],[3,12],[10,9],[12,-1],
    [6,-1],[6,5],[3,7],[-3,7],[-6,4],[-6,-1]];
  const shape = new THREE.Shape(outline.map(([x,y]) => new THREE.Vector2(x,y)));
  return new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: true,
    bevelThickness: 0.5, bevelSize: 0.6, bevelSegments: 1, steps: 1 }).translate(0, 0, -3);
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
