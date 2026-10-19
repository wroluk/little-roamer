import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { icelandHash } from './iceland-noise';
import { icelandSurfaceHeight } from './iceland-terrain';
import { REYNIS_CAVE, REYNIS_COLUMN_FACE, REYNIS_STACKS } from './iceland-reynisfjara';

type AddSolid = (geometry: THREE.BufferGeometry, material: THREE.Material, name: string) => THREE.Mesh;

/** The columns share one draw call and one collider, with individual lengths and faces. */
export function addReynisfjaraScenery(addSolid: AddSolid) {
  const columns: THREE.BufferGeometry[] = [];
  const palette = ['#343c3b', '#404745', '#292f30', '#4c514c'];
  for (let row = 0; row < 10; row++) for (let i = 0; i < 34; i++) {
    const seed = icelandHash(i + 72, row - 31);
    const x = REYNIS_COLUMN_FACE.x - 20 + i * 1.6 + (seed - 0.5) * 0.4;
    const z = REYNIS_COLUMN_FACE.z + 31 - row * 2.0 + (icelandHash(i, row + 9) - 0.5) * 0.8;
    const radius = 0.84 + seed * 0.24;
    const ground = icelandSurfaceHeight(x, z);
    const crest = icelandSurfaceHeight(x, z - 2.5) + 0.25;
    const height = Math.max(0.6, crest - ground + 0.4 * icelandHash(i - 23, row + 52));
    if (ground < 2.6) continue;
    const geometry = new THREE.CylinderGeometry(radius * (0.83 + seed * 0.18), radius,
      height + 1.2, 6, 1);
    geometry.rotateY(seed * Math.PI / 3);
    geometry.translate(x, ground + height / 2 - 0.85, z - 0.55);
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

  // A shallow, open arch fills the heightfield cut. Its rear disappears into
  // the headland; the same solid shell forms a ceiling and tyre-proof sides.
  // Unequal spring points and changing sections, as in the Keyhole arches.
  // The outer ring is buried in the headland; only the broken inner rim reads.
  const profile = [[-9.4, 2.15], [-9.1, 6.1], [-7.3, 9.8], [-4.8, 12.4],
    [-1.8, 13.6], [1.4, 12.9], [4.7, 11.5], [7.3, 8.2], [9.0, 4.7], [9.8, 2.15]];
  const vertices: number[] = [], indices: number[] = [];
  const sections = 7, count = profile.length;
  for (let section = 0; section < sections; section++) {
    const t = section / (sections - 1);
    for (let outer = 0; outer < 2; outer++) for (let i = 0; i < count; i++) {
      const [px, py] = profile[i];
      const grain = icelandHash(i + 91, section + 43) - 0.5;
      const end = i === 0 || i === count - 1;
      const x = REYNIS_CAVE.x + px * (outer ? 1.65 : 1 - 0.14 * t)
        + grain * (outer ? 1.8 : 0.9) + t * 0.6;
      const z = REYNIS_CAVE.frontZ - t * (REYNIS_CAVE.frontZ - REYNIS_CAVE.backZ)
        + (1 - t) * (grain * 3.4 + px * 0.12);
      const y = outer ? (end ? 1.6 : Math.max(py + 2.2, icelandSurfaceHeight(x, z) - 0.8))
        : (end ? py : py + grain * 1.1 - t * 0.7);
      vertices.push(x, y, z);
    }
  }
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, c, b, d, c);
  for (let section = 0; section < sections; section++) {
    const base = section * count * 2;
    for (let i = 0; i < count - 1; i++) {
      if (section === 0 || section === sections - 1)
        quad(base + i, base + i + 1, base + count + i, base + count + i + 1);
      if (section < sections - 1) for (let outer = 0; outer < 2; outer++) {
        const a = base + outer * count + i;
        quad(a, a + count * 2, a + 1, a + count * 2 + 1);
      }
    }
  }
  const cave = new THREE.BufferGeometry();
  cave.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  cave.setIndex(indices);
  cave.computeVertexNormals();
  const caveColors: number[] = [], cavePositions = cave.getAttribute('position');
  for (let i = 0; i < cavePositions.count; i++) {
    const x = cavePositions.getX(i), y = cavePositions.getY(i), z = cavePositions.getZ(i);
    const grain = icelandHash(Math.floor(x / 3) + 41, Math.floor(z / 4) + Math.floor(y / 4));
    const tint = new THREE.Color('#303635').lerp(new THREE.Color('#555850'), grain * 0.48);
    if (y < 8) tint.multiplyScalar(0.82);
    caveColors.push(tint.r, tint.g, tint.b);
  }
  cave.setAttribute('color', new THREE.Float32BufferAttribute(caveColors, 3));
  addSolid(cave, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true,
    side: THREE.DoubleSide }), 'Hálsanefshellir · basalt sea cave');

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
