import * as THREE from 'three';

export function demoStrata(source: THREE.BufferGeometry, palette: readonly string[],
  colorAt?: (x: number, y: number, z: number, band: number) => THREE.Color) {
  const plain = source.index ? source.toNonIndexed() : source, a = plain.getAttribute('position');
  const positions: number[] = [], colors: number[] = [];
  for (let i = 0; i < a.count; i += 3) {
    const triangle = [0, 1, 2].map(k => new THREE.Vector3(a.getX(i + k), a.getY(i + k), a.getZ(i + k)));
    const bottom = Math.floor(Math.min(...triangle.map(p => p.y)) / 4), top = Math.floor(Math.max(...triangle.map(p => p.y)) / 4);
    for (let band = bottom; band <= top; band++) {
      let polygon = triangle;
      for (const plane of [(p: THREE.Vector3) => p.y - band * 4, (p: THREE.Vector3) => (band + 1) * 4 - p.y]) {
        const clipped: THREE.Vector3[] = [];
        for (let k = 0; k < polygon.length; k++) {
          const p = polygon[k], q = polygon[(k + 1) % polygon.length], dp = plane(p), dq = plane(q);
          if (dp >= 0) clipped.push(p);
          if ((dp >= 0) !== (dq >= 0)) clipped.push(p.clone().lerp(q, dp / (dp - dq)));
        }
        polygon = clipped;
      }
      const color = new THREE.Color(palette[((band % palette.length) + palette.length) % palette.length]);
      for (let k = 1; k + 1 < polygon.length; k++) {
        const [p, q, r] = [polygon[0], polygon[k], polygon[k + 1]];
        if (q.clone().sub(p).cross(r.clone().sub(p)).lengthSq() < 1e-12) continue;
        for (const point of [p, q, r]) {
          positions.push(point.x, point.y, point.z);
          (colorAt ? colorAt(point.x, point.y, point.z, band) : color).toArray(colors, colors.length);
        }
      }
    }
  }
  if (plain !== source) plain.dispose(); source.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from({ length: positions.length / 3 }, (_, i) => i), 1));
  geometry.computeVertexNormals();
  return geometry;
}
