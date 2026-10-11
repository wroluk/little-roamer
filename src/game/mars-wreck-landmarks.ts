import * as THREE from 'three';
import { marsSurfaceHeight } from './mars-terrain';
import { WRECK_SITE, wreckPoint } from './mars-wreck-layout';

type Add = (g: THREE.BufferGeometry, m: THREE.Material, solid?: boolean) => void;

/** One thick, hollow hull section, with a rounded mouth and a sand-level side breach. */
export function addWreckDecor(cx: number, cz: number, emit: Add) {
  if (cx !== Math.floor(WRECK_SITE.x / 96) || cz !== Math.floor(WRECK_SITE.z / 96)) return;
  const outer = new THREE.MeshStandardMaterial({ color: '#7c8584', roughness: 1, metalness: 0.12, vertexColors: true });
  const inner = new THREE.MeshStandardMaterial({ color: '#545e5e', roughness: 1, vertexColors: true });
  const edge = new THREE.MeshStandardMaterial({ color: '#73716c', roughness: 1, vertexColors: true });
  const floor = marsSurfaceHeight(WRECK_SITE.x, WRECK_SITE.z);

  // Axial position, outer radius, inner radius, centre height. The far end sinks into sand.
  const profile = [
    [-50, 11.5, 10, 2], [-49, 12.5, 9.9, 1.6], [-47, 14.5, 10, 0.8],
    [-44, 17, 11.3, -1.2], [-40, 18.7, 13, -3.3], [-35, 19.5, 16.4, -5],
    [-29, 19.5, 17.6, -5.5], [-25, 19.5, 17.7, -6], [-23, 19.5, 17.7, -6.3],
    [-19, 19.45, 17.65, -6.8], [-12, 19.4, 17.6, -7.6], [-4, 19.3, 17.5, -8.5],
    [5, 19.2, 17.4, -9.7], [11, 19, 17.2, -10.5], [17, 18.8, 17, -11.3],
    [23, 18.5, 16.7, -12.3], [32, 18, 16.2, -13.6], [43, 17.2, 15.4, -15],
    [55, 16, 14.2, -17], [63, 15.2, 13.4, -19],
  ];
  const segments = 64, stride = segments + 1;
  const outside: THREE.Vector3[] = [], inside: THREE.Vector3[] = [];
  for (const [v, radius, bore, centre] of profile) {
    for (let j = 0; j <= segments; j++) {
      // The breach's roof edge is bent, but adjacent panels still share exactly the same vertices.
      const bend = v >= -23 && v <= 17 ? (Math.sin(v * 0.21) * 0.1 + Math.sin(v * 0.83) * 0.045) : 0;
      const angle = j / segments * Math.PI * 2 + bend * Math.max(0, 1 - Math.abs(j - 21) / 8);
      const tear = v === -23 || v === 17 ? (Math.sin(j * 0.77) * 0.65 + Math.sin(j * 0.23) * 0.9)
        * Math.max(0, 1 - Math.abs(j - 32) / 14) : 0;
      const p = (r: number) => new THREE.Vector3(r * Math.cos(angle), centre + r * Math.sin(angle), v + tear);
      outside.push(p(radius)); inside.push(p(bore));
    }
  }
  const present = (row: number, j: number) => {
    if (row < 0 || row >= profile.length - 1) return false;
    const column = (j + segments) % segments;
    return !(profile[row][0] >= -23 && profile[row + 1][0] <= 17 && column >= 21 && column < 44);
  };
  const outerIndices: number[] = [], innerIndices: number[] = [], armorShades: number[] = [];
  const edges: number[] = [], edgeColors: number[] = [];
  const quad = (indices: number[], a: number, b: number, c: number, d: number) => indices.push(a, b, c, a, c, d);
  const cap = (a: number, b: number) => {
    // A broad dark core between two skins gives broken walls real layered thickness.
    for (const [t0, t1, shade] of [[0, 0.2, 1], [0.2, 0.78, 0.55], [0.78, 1, 0.85]]) {
      const points = [outside[b].clone().lerp(inside[b], t0), outside[a].clone().lerp(inside[a], t0),
        outside[a].clone().lerp(inside[a], t1), outside[b].clone().lerp(inside[b], t1)];
      for (const i of [0, 1, 2, 0, 2, 3]) {
        const p = points[i];
        edges.push(p.x, p.y, p.z);
        edgeColors.push(shade, shade, shade);
      }
    }
  };
  for (let row = 0; row < profile.length - 1; row++) for (let j = 0; j < segments; j++) {
    if (!present(row, j)) continue;
    const a = row * stride + j, b = a + 1, d = a + stride, c = d + 1;
    quad(outerIndices, a, b, c, d);
    quad(innerIndices, a, d, c, b);
    const band = row < 2 || row === 6 || row === 14;
    const shoulder = row >= 2 && row <= 5 && j >= 20 && j < 28;
    armorShades.push(band ? 0.64 : shoulder ? 0.86 : 1);
    if (!present(row - 1, j)) cap(a, b);
    if (!present(row, j + 1)) cap(b, c);
    if (!present(row + 1, j)) cap(c, d);
    if (!present(row, j - 1)) cap(d, a);
  }
  const finish = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
    if (!geometry.hasAttribute('normal')) geometry.computeVertexNormals();
    geometry.rotateY(WRECK_SITE.turn).translate(WRECK_SITE.x, floor, WRECK_SITE.z);
    emit(geometry, material, true);
  };
  for (const [points, indices, material] of [
    [outside, outerIndices, outer], [inside, innerIndices, inner],
  ] as const) {
    const geometry = new THREE.BufferGeometry(), colors: number[] = [];
    points.forEach(p => {
      const soot = 0.92 + Math.sin(p.z * 0.065 + p.x * 0.08) * 0.04;
      const world = wreckPoint(p.x, p.z);
      const dust = 1 - THREE.MathUtils.smoothstep(floor + p.y - marsSurfaceHeight(world.x, world.z), 0, 3);
      colors.push(soot + dust * 0.025, soot - dust * 0.04, soot - dust * 0.07);
    });
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(p => p.toArray()), 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    if (material === outer) {
      // Split color boundaries without changing the shared surface normals or collision triangles.
      const armor = geometry.toNonIndexed(), color = armor.getAttribute('color');
      for (let i = 0; i < color.count; i++) {
        const shade = armorShades[Math.floor(i / 6)];
        color.setXYZ(i, color.getX(i) * shade, color.getY(i) * shade, color.getZ(i) * shade);
      }
      geometry.dispose();
      finish(armor, material);
    } else finish(geometry, material);
  }
  const brokenEdges = new THREE.BufferGeometry();
  brokenEdges.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
  brokenEdges.setAttribute('color', new THREE.Float32BufferAttribute(edgeColors, 3));
  finish(brokenEdges, edge);
}
