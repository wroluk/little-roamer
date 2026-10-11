import * as THREE from 'three';
import { groundMarsRock, marsRockGeometry } from './mars-landmarks';

export function addDunesDecor(cx: number, cz: number, add: (g: THREE.BufferGeometry, m: THREE.Material, solid?: boolean) => void) {
  const local = [[-472, 12, 15, 5], [-456, 26, 8, 3], [-479, -10, 10, 2.5], [-603, 62, 6, 1.1]]
    .filter(([x, z]) => Math.floor(x / 96) === cx && Math.floor(z / 96) === cz);
  if (!local.length) return;
  const material = new THREE.MeshStandardMaterial({ color: '#55463c', roughness: 0.94, flatShading: true });
  for (const [x, z, width, height] of local)
    add(groundMarsRock(marsRockGeometry(width, height, x * 0.3).rotateY(0.4), x, z), material, true);
}
