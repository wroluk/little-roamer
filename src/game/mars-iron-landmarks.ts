import * as THREE from 'three';
import { IRON_FINS, type IronFin } from './mars-iron-layout';
import { marsSurfaceHeight } from './mars-terrain';

/** Closed stratified blade; all basal vertices are individually buried in the terrain. */
export function ironFinGeometry(fin: IronFin): THREE.BufferGeometry {
  const positions: number[] = [], colors: number[] = [];
  const rings: THREE.Vector3[][] = [];
  const palette = ['#713e30', '#a36545', '#504039', '#83513b', '#463a34'].map(c => new THREE.Color(c));
  const levels = [0, 0.12, 0.2, 0.58, 0.64, 1];
  const tops = [0.43, 0.82, 0.9, 0.76, 0.5].map((v, i) => v + 0.12 * Math.sin(fin.seed * 2.3 + i * 1.7));
  const c = Math.cos(fin.yaw), s = Math.sin(fin.yaw);
  for (const level of levels) {
    const ring: THREE.Vector3[] = [];
    for (const side of [-1, 1]) for (let k = 0; k < 5; k++) {
      const t = (side < 0 ? k : 4 - k) / 4;
      const width = fin.width * (0.65 + Math.sin(t * Math.PI) * 0.35) * (level === 1 ? 0.08 : 1 - level * 0.78);
      const lx = side * width + level * Math.sin(t * 5 + fin.seed) * 1.2, lz = (t - 0.5) * fin.length;
      const x = fin.x + lx * c + lz * s, z = fin.z - lx * s + lz * c;
      const ground = marsSurfaceHeight(x, z);
      const relief = level === 1 ? tops[Math.round(t * 4)] : level * 0.42 + level * 0.035 * Math.sin(t * 3 + fin.seed);
      const y = ground - 0.55 + fin.height * relief + level * 0.55;
      ring.push(new THREE.Vector3(x, y, z));
    }
    rings.push(ring);
  }
  const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.Color) => {
    for (const p of [a, c, b]) { positions.push(...p.toArray()); colors.push(color.r, color.g, color.b); }
  };
  for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < 10; i++) {
    const j = (i + 1) % 10, color = palette[r].clone().multiplyScalar(0.92 + 0.08 * Math.sin(i + fin.seed));
    triangle(rings[r][i], rings[r + 1][i], rings[r][j], color);
    triangle(rings[r][j], rings[r + 1][i], rings[r + 1][j], color);
  }
  for (let i = 1; i < 9; i++) triangle(rings[0][0], rings[0][i], rings[0][i + 1], palette[0]);
  // Bridge each pair of crest segments instead of fanning a sunken roof from one low end.
  const top = rings[rings.length - 1];
  for (let i = 0; i < 4; i++) {
    triangle(top[i], top[8 - i], top[i + 1], palette[4]);
    triangle(top[i], top[9 - i], top[8 - i], palette[4]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals(); return geometry;
}
export function addIronDecor(cx: number, cz: number, add: (g: THREE.BufferGeometry, m: THREE.Material, solid?: boolean) => void) {
  const fins = IRON_FINS.filter(f => Math.floor(f.x / 96) === cx && Math.floor(f.z / 96) === cz);
  if (!fins.length) return;
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, flatShading: true });
  for (const fin of fins) add(ironFinGeometry(fin), material, true);
}
