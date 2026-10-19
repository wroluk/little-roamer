import * as THREE from 'three';
import { ICELAND_RING_ROAD, RING_HALF_WIDTH } from './iceland-road';
import { icelandHash, icelandNoise } from './iceland-noise';
import { onSkogaBridge, SKOGA_BRIDGE } from './iceland-layout';
import { onJokulsaBridge, lagoonRouteDistance, JOKULSA_BRIDGE } from './iceland-lagoon';
import { lomagnupurRouteDistance } from './iceland-skeidararsandur';
import { solheimasandurApproachDistance } from './iceland-sandur';
import { reynisBeachPathDistance } from './iceland-reynisfjara';
import { ICELAND_CELL, icelandGridZ, icelandSurfaceHeight, trailDistance, icelandDrivingHeight } from './iceland-terrain';

type RoadVertex = { x: number; z: number; color: number[] };

/** Split overlays at every terrain triangle and deck edge, not just at sampled corners. */
function fitRoadToTerrain(source: THREE.BufferGeometry, lift: number) {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const lookup = new Map<string, number>(), heights = new Map<string, number>();
  const p = source.attributes.position, color = source.attributes.color;
  const split = (polygon: RoadVertex[], distance: (v: RoadVertex) => number): RoadVertex[][] => {
    const distances = polygon.map(distance);
    if (!distances.some(d => d > 1e-7) || !distances.some(d => d < -1e-7)) return [polygon];
    const sides: RoadVertex[][] = [[], []];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length], da = distances[i], db = distances[(i + 1) % polygon.length];
      if (da >= -1e-7) sides[0].push(a);
      if (da <= 1e-7) sides[1].push(a);
      if (da > 1e-7 && db < -1e-7 || da < -1e-7 && db > 1e-7) {
        const t = da / (da - db);
        const v = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
          color: a.color.map((c, j) => c + (b.color[j] - c) * t) };
        sides[0].push(v); sides[1].push(v);
      }
    }
    return sides.filter(side => side.length >= 3);
  };
  const ids = source.index?.array ?? Uint32Array.from({ length: p.count }, (_, i) => i);
  for (let i = 0; i < ids.length; i += 3) {
    const triangle = Array.from(ids.slice(i, i + 3), id => ({
      x: p.getX(id), z: p.getZ(id), color: color ? Array.from({ length: color.itemSize }, (_, j) => color.getComponent(id, j)) : [],
    }));
    const xs = triangle.map(v => v.x), zs = triangle.map(v => v.z);
    let polygons = [triangle];
    const cut = (distance: (v: RoadVertex) => number) => { polygons = polygons.flatMap(polygon => split(polygon, distance)); };
    for (let ix = Math.ceil(Math.min(...xs) / ICELAND_CELL); ix * ICELAND_CELL < Math.max(...xs); ix++)
      cut(v => v.x - ix * ICELAND_CELL);
    for (let iz = Math.floor(Math.min(...zs) / ICELAND_CELL); iz <= Math.ceil(Math.max(...zs) / ICELAND_CELL); iz++) {
      const z = icelandGridZ(iz);
      if (z > Math.min(...zs) && z < Math.max(...zs)) cut(v => v.z - z);
    }
    polygons = polygons.flatMap(polygon => {
      const x = polygon.reduce((sum, v) => sum + v.x, 0) / polygon.length;
      const z = polygon.reduce((sum, v) => sum + v.z, 0) / polygon.length;
      const ix = Math.floor(x / ICELAND_CELL);
      const iz = z >= icelandGridZ(196) && z < 470.4 ? 196 : Math.floor(z / ICELAND_CELL);
      const z0 = icelandGridZ(iz), z1 = icelandGridZ(iz + 1);
      return split(polygon, v => (v.x - ix * ICELAND_CELL) / ICELAND_CELL + (v.z - z0) / (z1 - z0) - 1);
    });
    for (const bridge of [SKOGA_BRIDGE, JOKULSA_BRIDGE]) {
      for (const side of [-1, 1]) {
        cut(v => v.x - bridge.x - side * bridge.length / 2);
        cut(v => v.z - bridge.z - side * bridge.width / 2);
      }
    }
    for (const polygon of polygons) {
      const x = polygon.reduce((sum, v) => sum + v.x, 0) / polygon.length;
      const z = polygon.reduce((sum, v) => sum + v.z, 0) / polygon.length;
      const deck = onSkogaBridge(x, z) ? SKOGA_BRIDGE : onJokulsaBridge(x, z) ? JOKULSA_BRIDGE : null;
      const vertex = (v: RoadVertex) => {
        const x = Math.fround(Math.round(v.x * 1e6) / 1e6), z = Math.fround(Math.round(v.z * 1e6) / 1e6);
        const groundKey = `${x},${z}`;
        let height = heights.get(groundKey);
        if (height === undefined) { height = icelandSurfaceHeight(x, z); heights.set(groundKey, height); }
        const y = Math.fround((deck ? Math.max(deck.y, height) : height) + lift);
        const key = `${groundKey},${y}`;
        let id = lookup.get(key);
        if (id === undefined) {
          id = positions.length / 3; lookup.set(key, id);
          positions.push(x, y, z); colors.push(...v.color);
        }
        return id;
      };
      for (let j = 1; j + 1 < polygon.length; j++) {
        const a = polygon[0], b = polygon[j], c = polygon[j + 1];
        if (Math.abs((b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z)) < 1e-8) continue;
        const ia = vertex(a), ib = vertex(b), ic = vertex(c);
        if (ia !== ib && ib !== ic && ia !== ic) indices.push(ia, ib, ic);
      }
    }
  }
  const fitted = new THREE.BufferGeometry();
  fitted.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (color) fitted.setAttribute('color', new THREE.Float32BufferAttribute(colors, color.itemSize));
  fitted.setIndex(indices); fitted.computeVertexNormals(); source.dispose();
  return fitted;
}

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
  const rows: { x: number; z: number; nx: number; nz: number; along: number; join: boolean }[] = [];
  let distance = 0;
  for (let i = 0; i < count; i++) {
    const a = route[i], b = route[i + 1], an = joins[i], bn = joins[(i + 1) % count];
    const length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.ceil(length / 1.2);
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      rows.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
        nx: an.nx + (bn.nx - an.nx) * t, nz: an.nz + (bn.nz - an.nz) * t, along: distance + length * t, join: j === 0 });
    }
    distance += length;
  }
  // Terrain clipping supplies the interior tessellation; retain every authored turn.
  const ribbonRows = rows.filter((row, i) => row.join || i % 4 === 0);
  const point = (row: typeof rows[number], offset: number, lift: number) => {
    const x = row.x + row.nx * offset, z = row.z + row.nz * offset;
    return [x, icelandDrivingHeight(x, z) + lift, z];
  };
  const asphalt: number[] = [], triangles: number[] = [], paint: number[] = [], asphaltColors: number[] = [], gravelVertices: number[] = [], gravelColors: number[] = [];
  for (const row of ribbonRows) for (const offset of [-RING_HALF_WIDTH, 0, RING_HALF_WIDTH]) {
    const p = point(row, offset, 0.035); asphalt.push(...p);
    const tint = new THREE.Color('#373d3d').multiplyScalar(0.91 + 0.18 * icelandNoise(p[0] / 8, p[2] / 11));
    asphaltColors.push(tint.r, tint.g, tint.b);
  }
  for (let i = 0; i < ribbonRows.length; i++) {
    const next = (i + 1) % ribbonRows.length, a = ribbonRows[i], b = ribbonRows[next];
    if (!onSkogaBridge(a.x, a.z) && !onJokulsaBridge(a.x, a.z)
      && !onSkogaBridge(b.x, b.z) && !onJokulsaBridge(b.x, b.z)) {
      for (const side of [-1, 1]) {
        const bands = [0, 0.18, 0.4, 0.65, 0.84, 1];
        const vertex = (row: typeof a, across: number) => {
          const width = 2.3 + 1.4 * icelandNoise(row.x / 7 + side * 41, row.z / 9);
          const p = point(row, side * (RING_HALF_WIDTH + width * across), 0.018);
          const fade = Math.max(0, Math.min(1, (across - 0.18) / 0.82));
          const alpha = (1 - fade * fade * (3 - 2 * fade))
            * (1 - Math.sin(Math.PI * fade) * 0.3 * icelandNoise(p[0] / 0.7, p[2] / 0.9));
          const tint = new THREE.Color('#383d41').multiplyScalar(0.82
            + 0.22 * icelandNoise(p[0] / 1.8, p[2] / 2.3) + 0.12 * icelandNoise(p[0] / 0.35, p[2] / 0.35));
          gravelVertices.push(...p); gravelColors.push(tint.r, tint.g, tint.b, alpha);
        };
        for (let band = 1; band < bands.length; band++) {
          const inner = bands[band - 1], outer = bands[band];
          vertex(a, inner); vertex(b, inner); vertex(a, outer);
          vertex(a, outer); vertex(b, inner); vertex(b, outer);
        }
      }
    }
    for (let lane = 0; lane < 2; lane++) {
      const left = i * 3 + lane, right = next * 3 + lane;
      triangles.push(left, right, left + 1, left + 1, right, right + 1);
    }
  }
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i], b = rows[(i + 1) % rows.length];
    for (const offset of [-4.65, 4.65, ...(a.along % 14 < 6 ? [0] : [])]) {
      const al = point(a, offset - 0.09, 0.055), ar = point(a, offset + 0.09, 0.055);
      const bl = point(b, offset - 0.09, 0.055), br = point(b, offset + 0.09, 0.055);
      paint.push(...al, ...bl, ...ar, ...ar, ...bl, ...br);
    }
  }
  const pavement = new THREE.BufferGeometry();
  pavement.setAttribute('position', new THREE.Float32BufferAttribute(asphalt, 3)); pavement.setAttribute('color', new THREE.Float32BufferAttribute(asphaltColors, 3)); pavement.setIndex(triangles); pavement.computeVertexNormals();
  const markings = new THREE.BufferGeometry(); markings.setAttribute('position', new THREE.Float32BufferAttribute(paint, 3)); markings.computeVertexNormals();
  const gravel = new THREE.BufferGeometry();
  gravel.setAttribute('position', new THREE.Float32BufferAttribute(gravelVertices, 3));
  gravel.setAttribute('color', new THREE.Float32BufferAttribute(gravelColors, 4)); gravel.computeVertexNormals();
  return { pavement: fitRoadToTerrain(pavement, 0.035), markings: fitRoadToTerrain(markings, 0.055),
    gravel: fitRoadToTerrain(gravel, 0.018), rows: ribbonRows.length };
}

/** Thin continuous ribbons follow the same terrain/bridge height as the vehicle. */
export function buildIcelandRoadScenery(group: THREE.Scene) {
  const roadside = buildIcelandRoadside(group);
  const { pavement, markings, gravel } = buildIcelandRoadGeometry();
  for (const [g, color, name] of [[gravel, '#ffffff', 'Iceland · gravel shoulders'], [pavement, '#ffffff', 'Iceland · Ring Road'], [markings, '#d5d5bf', 'Iceland · road markings']] as const) {
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, vertexColors: g !== markings, roughness: 0.95, side: THREE.DoubleSide,
      transparent: g === gravel, depthWrite: g !== gravel,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    mesh.name = name; mesh.receiveShadow = true; group.add(mesh);
  }
  return roadside;
}

/** Solid roadside markers stay outside the driving corridor; tiny grit is decorative. */
export function buildIcelandRoadside(group: THREE.Scene) {
  const posts: THREE.Vector3[] = [], chips: THREE.Vector3[] = [];
  const vertices: number[] = [], indices: number[] = [];
  let distance = 0, nextPost = 0;
  for (let i = 1; i < ICELAND_RING_ROAD.length; i++) {
    const a = ICELAND_RING_ROAD[i - 1], b = ICELAND_RING_ROAD[i];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    while (nextPost < distance + length) {
      const t = (nextPost - distance) / length, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      for (const side of [-1, 1]) {
        const px = x - side * (b.z - a.z) / length * 7.8, pz = z + side * (b.x - a.x) / length * 7.8;
        const routes = Math.min(trailDistance(px, pz), lagoonRouteDistance(px, pz), lomagnupurRouteDistance(px, pz), solheimasandurApproachDistance(px, pz), reynisBeachPathDistance(px, pz));
        const h = icelandSurfaceHeight(px, pz);
        if (routes > 7 && h > 0 && !onSkogaBridge(x, z) && !onJokulsaBridge(x, z)) {
          posts.push(new THREE.Vector3(px, h, pz));
          for (let k = 0; k < 3; k++) {
            const cx = x - side * (b.z - a.z) / length * (5.8 + icelandHash(i, k)), cz = z + side * (b.x - a.x) / length * (5.8 + icelandHash(i, k));
            chips.push(new THREE.Vector3(cx + k * 0.4, icelandSurfaceHeight(cx + k * 0.4, cz), cz));
          }
        }
      }
      nextPost += 18;
    }
    distance += length;
  }
  const addInstances = (geometry: THREE.BufferGeometry, color: string, points: THREE.Vector3[], name: string, lift: number, grit = false, solid = false) => {
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 1 }), points.length);
    const dummy = new THREE.Object3D();
    points.forEach((p, i) => {
      dummy.position.copy(p); dummy.position.y += lift;
      dummy.rotation.y = icelandHash(i, 23) * 6.28;
      dummy.scale.setScalar(grit ? 0.7 + icelandHash(i, 94) * 0.6 : 1);
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      if (solid) {
        const base = vertices.length / 3, position = geometry.attributes.position;
        const vertex = new THREE.Vector3();
        for (let j = 0; j < position.count; j++) {
          vertex.fromBufferAttribute(position, j).applyMatrix4(dummy.matrix);
          vertices.push(vertex.x, vertex.y, vertex.z);
        }
        for (const index of geometry.index!.array) indices.push(base + index);
      }
    });
    mesh.name = name; mesh.castShadow = false; mesh.receiveShadow = false; group.add(mesh);
  };
  addInstances(new THREE.BoxGeometry(0.12, 1.05, 0.12), '#e8b62b', posts, 'Iceland · yellow road markers', 0.5, false, true);
  addInstances(new THREE.BoxGeometry(0.125, 0.12, 0.125), '#eee9d4', posts, 'Iceland · marker reflectors', 0.85);
  addInstances(new THREE.IcosahedronGeometry(0.16, 0).scale(1.4, 0.4, 1), '#41464a', chips, 'Iceland · shoulder grit', 0.025, true);
  return { collider: { vertices: Float32Array.from(vertices), indices: Uint32Array.from(indices) } };
}
