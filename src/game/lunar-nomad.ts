import * as THREE from 'three';
import { batchVehicleMeshes, beveledBox, roverWheel, solidPanel } from './vehicle-geometry';

export function buildLunarNomad(body: THREE.Group, model: THREE.Group,
  wheels: THREE.Group[], tires: THREE.Group[], connections: { x: number; y: number; z: number }[], radius: number, rest: number) {
  const mat = (color: string, roughness = 0.7) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
  const shell = mat('#e5e4d9'), inset = mat('#bcc6c3'), teal = mat('#4b8c8d'), dark = mat('#273b3f');
  const rubber = mat('#202326'), hub = mat('#a2aeae', 0.4), solar = mat('#243c44', 0.3), red = mat('#a64e3c');
  hub.metalness = 0.4; solar.metalness = 0.3;
  const glass = new THREE.MeshBasicMaterial({ color: '#513c28', side: THREE.DoubleSide });
  const lamp = new THREE.MeshStandardMaterial({ color: '#edf5e4', emissive: '#e5eecb', emissiveIntensity: 0.5 });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => body.add(new THREE.Mesh(geometry, material));
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) =>
    add(new THREE.BoxGeometry(w, h, d).translate(x, y, z), material);
  const panel = (points: number[][], material: THREE.Material) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geometry.setIndex(points.slice(2).flatMap((_, i) => [0, i + 1, i + 2]));
    geometry.computeVertexNormals(); add(geometry, material);
  };
  const bar = (a: number[], b: number[], thickness: number, material: THREE.Material) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const geometry = new THREE.CylinderGeometry(thickness, thickness, start.distanceTo(end), 6);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()));
    add(geometry.translate(...start.add(end).multiplyScalar(0.5).toArray()), material);
  };
  const frontZ = (y: number) => -1.33 + (y - 0.52) * 0.81 / 0.64;
  // One continuous pressure hull; shoulder vertices share the windshield plane.
  add(solidPanel([-1, 1].flatMap(side => [
    [side * 0.57, 0.27, -1.3], [side * 0.7, 0.36, -1.3],
    [side * 0.7, 0.52, -1.33], [side * 0.7, 1.04, frontZ(1.04)],
    [side * 0.55, 1.16, -0.52], [side * 0.55, 1.16, 0.99],
    [side * 0.7, 1.04, 1.134], [side * 0.7, 0.91, 1.29],
    [side * 0.7, 0.36, 1.29], [side * 0.57, 0.27, 1.24],
  ])), shell);
  box(1.36, 0.25, 2.52, 0, 0.12, 0, dark);
  box(1.18, 0.1, 2.28, 0, -0.12, 0.02, hub);
  const windshield = (x: number, y: number) => [x, y, frontZ(y) - 0.008];
  panel([windshield(-0.605, 0.61), windshield(-0.55, 1.075),
    windshield(0.55, 1.075), windshield(0.605, 0.61)], glass);
  for (const side of [-1, 1]) {
    const x = side * 0.707;
    panel([[x, 0.64, frontZ(0.64) + 0.075], [x, 0.955, frontZ(0.955) + 0.075],
      [x, 0.955, -0.49], [x, 0.64, -0.49]], glass);
    for (const z of [-0.1, 0.37]) panel([[x, 0.97, z], [x, 1.025, z + 0.025],
      [x, 1.025, z + 0.36], [x, 0.97, z + 0.335]], glass);
    const rearBand = [[x, 0.35, 1.045], [x, 0.89, 1.045], [x, 0.86, 1.275], [x, 0.35, 1.275]];
    panel(side > 0 ? rearBand : rearBand.reverse(), teal);
    box(0.018, 0.55, 0.47, side * 0.713, 0.655, -0.17, dark);
    add(beveledBox(0.026, 0.51, 0.43, 0.015).translate(side * 0.727, 0.655, -0.17), inset);
    box(0.014, 0.024, 0.12, side * 0.748, 0.74, -0.1, dark);
    bar([side * 0.76, 0.49, 0.115], [side * 0.76, 0.8, 0.115], 0.014, teal);
    box(0.13, 0.065, 0.36, side * 0.73, 0.08, -0.19, hub);
    box(0.14, 0.22, 0.42, side * 0.75, 0.16, 0.25, teal);
    for (let i = 0; i < 3; i++) box(0.018, 0.045, 0.23, x, 0.5 + i * 0.085, 0.64, dark);
    bar([side * 0.81, -0.09, -0.42], [side * 0.81, -0.09, 0.45], 0.05, hub);
    for (const z of [-1.02, 1]) {
      bar([side * 0.49, -0.05, z * 0.65], [side * 0.86, -0.34, z], 0.06, dark);
      bar([side * 0.68, 0.17, z - 0.12], [side * 0.87, -0.32, z + 0.09], 0.04, hub);
    }
  }
  add(beveledBox(1.38, 0.16, 0.18, 0.025).translate(0, 0.26, -1.34), dark);
  box(0.57, 0.065, 0.016, 0, 0.42, -1.337, dark);
  for (const side of [-1, 1]) {
    box(0.19, 0.08, 0.018, side * 0.49, 0.42, -1.342, lamp);
    box(0.14, 0.035, 0.016, side * 0.49, 0.34, -1.342, teal);
  }
  box(1.02, 0.035, 0.18, 0, 1.17, -0.43, dark);
  for (const x of [-0.36, -0.12, 0.12, 0.36]) {
    add(new THREE.CylinderGeometry(0.073, 0.073, 0.07, 12).rotateX(Math.PI / 2).translate(x, 1.22, -0.52), dark);
    add(new THREE.CylinderGeometry(0.056, 0.056, 0.01, 12).rotateX(Math.PI / 2).translate(x, 1.22, -0.56), lamp);
  }
  box(1.01, 0.025, 0.9, 0, 1.175, 0.43, dark);
  box(0.95, 0.014, 0.84, 0, 1.195, 0.43, solar);
  for (const x of [-0.31, 0, 0.31]) box(0.009, 0.006, 0.84, x, 1.205, 0.43, hub);
  for (const z of [0.16, 0.43, 0.7]) box(0.95, 0.006, 0.009, 0, 1.205, z, hub);
  panel([[-0.56, 0.4, 1.297], [0.56, 0.4, 1.297], [0.56, 0.84, 1.297],
    [0.45, 0.9, 1.297], [-0.45, 0.9, 1.297], [-0.56, 0.84, 1.297]], teal);
  box(0.6, 0.32, 0.02, 0, 0.64, 1.31, dark);
  box(0.54, 0.26, 0.025, 0, 0.64, 1.325, inset);
  box(0.16, 0.025, 0.018, 0.1, 0.65, 1.346, dark);
  box(1.35, 0.12, 0.14, 0, 0.17, 1.33, dark);
  for (const x of [-0.52, 0.52]) box(0.13, 0.07, 0.02, x, 0.38, 1.31, red);
  for (const connection of connections) {
    const wheel = new THREE.Group(), spinner = roverWheel(radius, 'capped', rubber, dark, hub);
    wheel.add(spinner); wheel.position.set(connection.x, -rest, connection.z);
    model.add(wheel); wheels.push(wheel); tires.push(spinner);
  }
  for (const group of [body, ...tires]) batchVehicleMeshes(group);
}
