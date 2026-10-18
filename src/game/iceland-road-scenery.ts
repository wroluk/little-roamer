import * as THREE from 'three';
import { ICELAND_RING_ROAD, RING_HALF_WIDTH } from './iceland-road';
import { icelandDrivingHeight } from './iceland-terrain';

/** Shared cross sections with mitered offsets: neighbouring spans use identical joins. */
export function buildIcelandRoadGeometry() {
  const route = ICELAND_RING_ROAD, count = route.length - 1;
  const joins = route.slice(0, -1).map((p, i) => {
    const before = route[(i + count - 1) % count], after = route[(i + 1) % count];
    const incoming = new THREE.Vector2(p.x - before.x, p.z - before.z).normalize();
    const outgoing = new THREE.Vector2(after.x - p.x, after.z - p.z).normalize();
    const normal = new THREE.Vector2(-incoming.y - outgoing.y, incoming.x + outgoing.x).normalize();
    const scale = 1 / normal.dot(new THREE.Vector2(-outgoing.y, outgoing.x));
    return { nx: normal.x * scale, nz: normal.y * scale };
  });
  const rows: { x: number; z: number; nx: number; nz: number; along: number }[] = [];
  let distance = 0;
  for (let i = 0; i < count; i++) {
    const a = route[i], b = route[i + 1], an = joins[i], bn = joins[(i + 1) % count];
    const length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.ceil(length / 1.2);
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      rows.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
        nx: an.nx + (bn.nx - an.nx) * t, nz: an.nz + (bn.nz - an.nz) * t, along: distance + length * t });
    }
    distance += length;
  }
  const point = (row: typeof rows[number], offset: number, lift: number) => {
    const x = row.x + row.nx * offset, z = row.z + row.nz * offset;
    return [x, icelandDrivingHeight(x, z) + lift, z];
  };
  const asphalt: number[] = [], triangles: number[] = [], paint: number[] = [];
  for (const row of rows) for (const offset of [-RING_HALF_WIDTH, 0, RING_HALF_WIDTH]) asphalt.push(...point(row, offset, 0.035));
  for (let i = 0; i < rows.length; i++) {
    const next = (i + 1) % rows.length, a = rows[i], b = rows[next];
    for (let lane = 0; lane < 2; lane++) {
      const left = i * 3 + lane, right = next * 3 + lane;
      triangles.push(left, right, left + 1, left + 1, right, right + 1);
    }
    for (const offset of [-4.65, 4.65, ...(a.along % 14 < 6 ? [0] : [])]) {
      const al = point(a, offset - 0.09, 0.055), ar = point(a, offset + 0.09, 0.055);
      const bl = point(b, offset - 0.09, 0.055), br = point(b, offset + 0.09, 0.055);
      paint.push(...al, ...bl, ...ar, ...ar, ...bl, ...br);
    }
  }
  const pavement = new THREE.BufferGeometry();
  pavement.setAttribute('position', new THREE.Float32BufferAttribute(asphalt, 3)); pavement.setIndex(triangles); pavement.computeVertexNormals();
  const markings = new THREE.BufferGeometry(); markings.setAttribute('position', new THREE.Float32BufferAttribute(paint, 3)); markings.computeVertexNormals();
  return { pavement, markings, rows: rows.length };
}

/** Thin continuous ribbons follow the same terrain/bridge height as the vehicle. */
export function buildIcelandRoadScenery(group: THREE.Scene) {
  const { pavement, markings } = buildIcelandRoadGeometry();
  for (const [g, color, name] of [[pavement, '#373d3d', 'Iceland · Ring Road'], [markings, '#d5d5bf', 'Iceland · road markings']] as const) {
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    mesh.name = name; mesh.receiveShadow = true; group.add(mesh);
  }
}
