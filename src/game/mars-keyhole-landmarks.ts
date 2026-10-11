import * as THREE from 'three';
import { KEYHOLE_ARCHES, KEYHOLE_CREST } from './mars-keyhole-layout';
import { groundMarsRock, marsRockGeometry } from './mars-landmarks';
import { marsSurfaceHeight } from './mars-terrain';

function strata(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  if (source !== geometry) geometry.dispose();
  const positions = source.getAttribute('position'), vertices: number[] = [], colors: number[] = [];
  const palette = ['#ad7655', '#b78460', '#a87151', '#c08e68'].map(c => new THREE.Color(c));
  const clip = (polygon: THREE.Vector3[], y: number, above: boolean) => {
    const result: THREE.Vector3[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const insideA = above ? a.y >= y : a.y <= y, insideB = above ? b.y >= y : b.y <= y;
      if (insideA) result.push(a);
      if (insideA !== insideB) result.push(a.clone().lerp(b, (y - a.y) / (b.y - a.y)));
    }
    return result;
  };
  for (let i = 0; i < positions.count; i += 3) {
    const face = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(positions, i + j));
    const first = Math.floor(Math.min(...face.map(v => v.y)) / 5), last = Math.floor(Math.max(...face.map(v => v.y)) / 5);
    for (let band = first; band <= last; band++) {
      const polygon = clip(clip(face, band * 5, true), (band + 1) * 5, false);
      const color = palette[((band % palette.length) + palette.length) % palette.length];
      for (let j = 1; j + 1 < polygon.length; j++) {
        const [a, b, c] = [polygon[0], polygon[j], polygon[j + 1]];
        if (b.clone().sub(a).cross(c.clone().sub(a)).lengthSq() < 1e-12) continue;
        for (const v of [a, b, c]) { vertices.push(v.x, v.y, v.z); colors.push(color.r, color.g, color.b); }
      }
    }
  }
  source.dispose();
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  result.computeVertexNormals();
  return result;
}

/** An eroded rock rib: unequal spring points and a thin, irregular walkable crown. */
export function keyholeArchGeometry(index = 0): THREE.BufferGeometry {
  const arch = KEYHOLE_ARCHES[index];
  const shape = new THREE.Shape();
  const outline = [
    [-88, -1], ...KEYHOLE_CREST.map(p => [p.x, p.y - 8]), [88, -1],
    [49, -1], [44, 6], [34, 14], [18, 22], [-2, 24], [-23, 19], [-39, 10], [-48, -1],
  ];
  outline.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 18, steps: 4, bevelEnabled: false, curveSegments: 1,
  });
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i) - 9;
    const endFade = Math.sin(Math.PI * (x + 88) / 176);
    const width = 0.73 + 0.18 * Math.sin(x * 0.075 + 0.8) + 0.09 * Math.cos(x * 0.19);
    const rz = z * width + 2.5 * Math.sin(x * 0.046) * endFade;
    const rx = x + 0.7 * Math.sin(z * 0.3 + x * 0.16) * endFade;
    const px = arch.x + arch.scale * (rx * Math.cos(arch.turn) + rz * Math.sin(arch.turn));
    const pz = arch.z + arch.scale * (-rx * Math.sin(arch.turn) + rz * Math.cos(arch.turn));
    const py = y < 0 ? marsSurfaceHeight(px, pz) - 1.8
      : 8 + arch.scale * (y + 0.55 * Math.sin(x * 0.08 + z * 0.22) * endFade);
    positions.setXYZ(i, px, py, pz);
  }
  return strata(geometry);
}

export function addKeyholeDecor(cx: number, cz: number, add: (g: THREE.BufferGeometry, m: THREE.Material, solid?: boolean) => void) {
  const owns = (x: number, z: number) => Math.floor(x / 96) === cx && Math.floor(z / 96) === cz;
  const parts: THREE.BufferGeometry[] = [];
  KEYHOLE_ARCHES.forEach((arch, i) => {
    if (owns(arch.x, arch.z)) parts.push(keyholeArchGeometry(i));
  });
  for (const [x, z, width, height] of [[92, 514, 12, 13], [130, 510, 8, 9],
    [-73, 557, 13, 12], [-65, 510, 8, 8], [113, 654, 7, 4], [-40, 462, 4, 2],
    [-49, 548, 11, 3.2], [-58, 515, 12, 4.1], [53, 547, 13, 3.4],
    [66, 511, 9, 2.8], [135, 477, 8, 3.5]]) {
    if (owns(x, z)) parts.push(strata(groundMarsRock(marsRockGeometry(width, height, x + z).rotateY(0.35), x, z)));
  }
  if (!parts.length) return;
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, flatShading: true });
  for (const geometry of parts) add(geometry, material, true);
}
