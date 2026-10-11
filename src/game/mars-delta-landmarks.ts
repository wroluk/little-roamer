import * as THREE from 'three';
import { groundMarsRock, marsRockGeometry } from './mars-landmarks';

export function addDeltaDecor(cx: number, cz: number, add: (g: THREE.BufferGeometry, m: THREE.Material, solid?: boolean) => void) {
  const owns = (x: number, z: number) => Math.floor(x / 96) === cx && Math.floor(z / 96) === cz;
  const slabs = [[-368, 430, 9, 1.2], [-397, 405, 12, 1.5], [-420, 474, 8, 0.9],
    [-458, 393, 11, 1.1], [-493, 461, 7, 0.8], [-349, 522, 6, 1.1]];
  const local = slabs.filter(([x, z]) => owns(x, z));
  if (local.length) {
    const pale = new THREE.MeshStandardMaterial({ color: '#d3b695', roughness: 0.95, flatShading: true });
    for (const [x, z, width, height] of local)
      add(groundMarsRock(marsRockGeometry(width, height, x - z).rotateY(-0.4), x, z), pale, true);
  }
  if (owns(-458, 456)) {
    const dark = new THREE.MeshStandardMaterial({ color: '#50403b', roughness: 0.91, flatShading: true });
    add(groundMarsRock(marsRockGeometry(8, 7, 43).rotateY(0.7), -458, 456), dark, true);
  }
}
