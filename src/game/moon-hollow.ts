import * as THREE from 'three';
import { MOON_HOLLOW_ROOF, moonHollowCentreX, moonSurfaceHeight } from './moon-terrain';

export function moonHollowOpening(z: number) {
  const t = Math.abs(z - MOON_HOLLOW_ROOF.skylight) / 12;
  return t < 1 ? 11.5 * Math.sqrt(1 - t * t) * (1 + 0.06 * Math.sin(z * 0.7)) : 0;
}

/** Closed roof skins and broken opening rims; the terrain provides the trench. */
export function moonHollowGeometry() {
  const vertices: number[] = [], colors: number[] = [];
  const rows = [172, 178, 184, 188, 192, 196, 200, 204, 208, 212, 218, 224, 230];
  const columns = 5, width = MOON_HOLLOW_ROOF.halfWidth;
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, underside: boolean) => {
    if (b.clone().sub(a).cross(c.clone().sub(a)).lengthSq() < 1e-8) return;
    for (const p of [a, b, c]) {
      vertices.push(p.x, p.y, p.z);
      const value = (underside ? 0.11 : 0.24) * (0.94 + 0.06 * Math.sin(p.x * 0.3 + p.z * 0.4));
      colors.push(value * 1.01, value, value * 0.97);
    }
  };
  const quad = (points: THREE.Vector3[], underside = false) => {
    tri(points[0], points[1], points[3], underside); tri(points[1], points[2], points[3], underside);
  };
  const vertex = (z: number, side: number, f: number, bottom: boolean) => {
    const opening = moonHollowOpening(z);
    const offset = side * (opening + (width - opening) * f), u = offset / width;
    const portal = z === MOON_HOLLOW_ROOF.north ? 1 : z === MOON_HOLLOW_ROOF.south ? -1 : 0;
    z += portal * (1 - u * u) * (1.3 + 0.5 * Math.sin(u * 7 + 0.4));
    const centre = moonHollowCentreX(z);
    const left = moonSurfaceHeight(centre - width, z), right = moonSurfaceHeight(centre + width, z);
    const edge = THREE.MathUtils.lerp(left, right, (u + 1) / 2);
    const top = edge - 0.35 + (1 - u * u)
      * (2.6 + 0.35 * Math.sin(z * 0.31 + u) + 0.55 * Math.sin(z * 0.61 + u * 6.3));
    const thickness = 2.2 + (1 - u * u) * (3.2 + 0.7 * Math.sin(z * 0.41 + u * 4));
    return new THREE.Vector3(centre + offset, top - (bottom ? thickness : 0), z);
  };
  for (let row = 1; row < rows.length; row++) {
    const a = rows[row - 1], b = rows[row];
    for (const side of [-1, 1]) {
      for (let j = 0; j < columns; j++) {
        const f = j / columns, g = (j + 1) / columns;
        for (const bottom of [false, true]) {
          const points = [vertex(a, side, f, bottom), vertex(b, side, f, bottom),
            vertex(b, side, g, bottom), vertex(a, side, g, bottom)];
          if ((side < 0) !== bottom) points.reverse();
          quad(points, bottom);
        }
        if (row === 1 || row === rows.length - 1) {
          const z = row === 1 ? a : b;
          const points = [vertex(z, side, f, false), vertex(z, side, g, false),
            vertex(z, side, g, true), vertex(z, side, f, true)];
          if ((side < 0) !== (row === rows.length - 1)) points.reverse();
          quad(points);
        }
      }
      for (const f of [0, 1]) {
        if (f === 0 && !moonHollowOpening(a) && !moonHollowOpening(b)) continue;
        const points = [vertex(a, side, f, false), vertex(a, side, f, true),
          vertex(b, side, f, true), vertex(b, side, f, false)];
        if ((side < 0) === (f === 0)) points.reverse();
        quad(points);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
