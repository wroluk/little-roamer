import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { icelandHash } from './iceland-noise';
import { icelandSurfaceHeight } from './iceland-terrain';
import { REYNIS_COLUMN_FACE, REYNIS_STACKS } from './iceland-reynisfjara';

type AddSolid = (geometry: THREE.BufferGeometry, material: THREE.Material, name: string) => THREE.Mesh;

/** The columns share one draw call and one collider, with individual lengths and faces. */
export function addReynisfjaraScenery(addSolid: AddSolid) {
  const columns: THREE.BufferGeometry[] = [];
  const palette = ['#343c3b', '#404745', '#292f30', '#4c514c'];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 36; i++) {
    const seed = icelandHash(i + 72, row - 31);
    const x = REYNIS_COLUMN_FACE.x - 27 + i * 1.65 + (seed - 0.5) * 0.55;
    const z = REYNIS_COLUMN_FACE.z + 20 + row * 2.1 + (icelandHash(i, row + 9) - 0.5) * 1.2;
    const radius = 0.84 + seed * 0.24;
    const height = 5.5 + 3 * icelandHash(i - 23, row + 52) + 1.5 * (1 - Math.abs(i - 18) / 18);
    const ground = icelandSurfaceHeight(x, z);
    const geometry = new THREE.CylinderGeometry(radius * (0.83 + seed * 0.18), radius,
      height + 1.2, 6, 1);
    geometry.rotateY(seed * Math.PI / 3);
    geometry.translate(x, ground + height / 2 - 0.6, z);
    const tint = new THREE.Color(palette[(i + row * 3) % palette.length]);
    const colors: number[] = [];
    for (let j = 0; j < geometry.attributes.position.count; j++) colors.push(tint.r, tint.g, tint.b);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    columns.push(geometry);
  }
  const wall = mergeGeometries(columns);
  columns.forEach(column => column.dispose());
  if (!wall) throw new Error('Failed to merge Reynisfjara basalt columns');
  addSolid(wall, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }),
    'Reynisfjara · basalt column wall');

  for (let stack = 0; stack < REYNIS_STACKS.length; stack++) {
    const { x, z, height, radius } = REYNIS_STACKS[stack];
    const bottom = icelandSurfaceHeight(x, z) - 2;
    const rings = [
      { y: bottom, r: radius * 1.18 }, { y: -2, r: radius * 1.02 },
      { y: height - 17, r: radius * 0.98 }, { y: height - 7, r: radius * 0.84 },
      { y: height, r: radius * 0.52 },
    ];
    const sides = 9, vertices: number[] = [], indices: number[] = [];
    for (let ring = 0; ring < rings.length; ring++) for (let side = 0; side < sides; side++) {
      const angle = side * Math.PI * 2 / sides;
      const wobble = 0.82 + 0.28 * icelandHash(stack * 19 + side, ring + 28);
      const shift = ring * 0.65 * Math.sin(stack * 3 + ring);
      vertices.push(x + Math.cos(angle) * rings[ring].r * wobble + shift,
        rings[ring].y + (icelandHash(side + 44, ring + stack) - 0.5) * 1.1,
        z + Math.sin(angle) * rings[ring].r * wobble);
    }
    for (let ring = 0; ring < rings.length - 1; ring++) for (let side = 0; side < sides; side++) {
      const a = ring * sides + side, b = ring * sides + (side + 1) % sides;
      const c = a + sides, d = b + sides;
      indices.push(a, c, b, b, c, d);
    }
    for (let side = 1; side < sides - 1; side++) {
      indices.push(0, side, side + 1);
      const top = (rings.length - 1) * sides;
      indices.push(top, top + side + 1, top + side);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    addSolid(geometry, new THREE.MeshStandardMaterial({ color: palette[stack], roughness: 1, flatShading: true,
      side: THREE.DoubleSide }), `Reynisdrangar · sea stack ${stack + 1}`);
  }
}
