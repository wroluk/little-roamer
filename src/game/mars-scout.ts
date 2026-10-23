import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { solidPanel } from './vehicle-geometry';

/** Angular expedition rover built around the established four wheel contact positions. */
export function buildMarsScout(body: THREE.Group, model: THREE.Group,
  wheels: THREE.Group[], tires: THREE.Group[], connections: { x: number; y: number; z: number }[], radius: number, rest: number,
  lunar = false) {
  const mat = (color: string, roughness = 0.7) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
  const shell = mat(lunar ? '#e4e7e8' : '#e8e7df'), accent = mat(lunar ? '#b4a36c' : '#cc7739'), dark = mat('#282c30');
  const rubber = mat('#202326'), hub = mat('#8a9498', 0.4);
  const glass = lunar ? new THREE.MeshBasicMaterial({ color: '#294657', side: THREE.DoubleSide })
    : mat('#263c48', 0.2);
  const red = mat('#ad4635');
  if (glass instanceof THREE.MeshStandardMaterial) { glass.metalness = 0.3; glass.side = THREE.DoubleSide; }
  const lamp = new THREE.MeshStandardMaterial({ color: '#edf5e4', emissive: '#e5eecb', emissiveIntensity: 0.5 });
  const add = (g: THREE.BufferGeometry, m: THREE.Material, parent = body) => parent.add(new THREE.Mesh(g, m));
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) =>
    add(new THREE.BoxGeometry(w, h, d).translate(x, y, z), m);
  const bar = (a: number[], b: number[], thickness: number, material: THREE.Material) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const geometry = new THREE.CylinderGeometry(thickness, thickness, start.distanceTo(end), 6);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()));
    add(geometry.translate(...start.add(end).multiplyScalar(0.5).toArray()), material);
  };
  const panel = (vertices: number[][], material: THREE.Material) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
    geometry.setIndex(vertices.slice(2).flatMap((_, i) => [0, i + 1, i + 2]));
    geometry.computeVertexNormals(); add(geometry, material);
  };
  if (lunar) {
    // Actual front corner facets support the wraparound glazing.
    add(solidPanel([-1, 1].flatMap(side => [
      [side * 0.47, 0.28, -1.3], [side * 0.7, 0.28, -1.04], [side * 0.7, 0.28, 0.44],
      [side * 0.47, 0.58, -1.27], [side * 0.7, 0.58, -1.01], [side * 0.7, 0.57, 0.44],
      [side * 0.47, 1.1, -1.17], [side * 0.7, 1.1, -0.91], [side * 0.7, 1.1, 0.24],
    ])), shell);
    box(1.36, 0.22, 0.48, 0, 0.36, -1.04, shell);
    const sill = 0.66, header = 1.035;
    const frontZ = (y: number) => -1.27 + (y - 0.58) * 0.1 / 0.52;
    const frontGlass = (x: number, y: number) =>
      [x, y, frontZ(y) + Math.max(0, Math.abs(x) - 0.47) * 0.26 / 0.23 - 0.006];
    const sideFront = (y: number) => frontZ(y) + 0.26 + 0.045;
    const sideRear = (y: number) => 0.44 - (y - 0.57) * 0.2 / 0.53 - 0.18;
    panel([frontGlass(-0.435, sill), frontGlass(0.435, sill),
      frontGlass(0.435, header), frontGlass(-0.435, header)], glass);
    for (const side of [-1, 1]) {
      panel([frontGlass(side * 0.495, sill), frontGlass(side * 0.68, sill),
        frontGlass(side * 0.68, header), frontGlass(side * 0.495, header)], glass);
      panel([[side * 0.707, sill, sideFront(sill)], [side * 0.707, header, sideFront(header)],
        [side * 0.707, header, sideRear(header)], [side * 0.707, sill, sideRear(sill)]], glass);
    }
  } else {
    const profile = new THREE.Shape();
    const outline = [[-1.3, 0.28], [-1.26, 0.49], [-0.68, 1.02], [0.61, 1.05], [1.22, 0.75], [1.3, 0.29]];
    outline.forEach(([z, y], i) => i ? profile.lineTo(-z, y) : profile.moveTo(-z, y)); profile.closePath();
    add(new THREE.ExtrudeGeometry(profile, { depth: 1.3, bevelEnabled: true, bevelSegments: 1,
      steps: 1, bevelSize: 0.055, bevelThickness: 0.055 }).rotateY(Math.PI / 2).translate(-0.65, 0, 0), shell);
  }
  box(1.4, 0.29, 2.54, 0, 0.1, 0, dark);
  box(1.18, 0.12, 2.3, 0, -0.12, 0.02, hub);
  if (lunar) box(1.3, 0.22, 1.26, 0, 0.39, 0.72, shell);
  for (const side of [-1, 1]) {
    const x = side * 0.707;
    if (lunar) {
      panel([[side * 0.66, 0.35, 0.5], [side * 0.66, 0.44, 0.5],
        [side * 0.66, 0.44, 1.22], [side * 0.66, 0.35, 1.22]], accent);
    } else {
      panel([[side * 0.035, 0.56, -1.266], [side * 0.61, 0.56, -1.266],
        [side * 0.61, 0.974, -0.813], [side * 0.035, 0.974, -0.813]], glass);
      panel([[x, 0.55, -1.16], [x, 0.98, -0.68], [x, 0.98, -0.21], [x, 0.57, -0.31]], glass);
      panel([[x, 0.58, -0.22], [x, 0.98, -0.12], [x, 0.98, 0.46], [x, 0.58, 0.4]], glass);
      panel([[x, 0.43, 0.48], [x, 0.56, 0.5], [x, 0.56, 1.12], [x, 0.43, 1.18]], accent);
    }
    box(0.028, 0.027, 0.18, x + side * 0.015, 0.49, 0.22, dark);
    // Open wheel wells leave room for suspension travel above the exposed arms.
    bar([side * 0.81, -0.1, -0.42], [side * 0.81, -0.1, 0.45], 0.055, hub);
    for (const z of [-1.02, 1]) {
      bar([side * 0.5, -0.05, z * 0.64], [side * 0.87, -0.35, z], 0.065, dark);
      bar([side * 0.69, 0.18, z - 0.12], [side * 0.88, -0.33, z + 0.09], 0.045, hub);
    }
    // Rear equipment grille and small flank identification bars.
    const grilleX = lunar ? side * 0.486 : x;
    box(0.025, 0.23, 0.34, grilleX, 0.8, 0.69, dark);
    for (let i = 0; i < 4; i++) box(0.031, 0.018, 0.3, grilleX + side * 0.006, 0.71 + i * 0.055, 0.69, hub);
    box(0.035, 0.028, 0.16, x, lunar ? 0.55 : 0.81, lunar ? -0.1 : 0.17, accent);
    box(0.035, 0.18, 0.028, x, lunar ? 0.47 : 0.73, lunar ? -0.04 : 0.23, accent);
  }
  if (lunar) {
    box(1.4, 0.14, 0.18, 0, 0.11, -1.33, dark);
    box(1.2, 0.17, 0.07, 0, 0.385, -1.3, dark);
    for (const side of [-1, 1]) {
      box(0.28, 0.13, 0.04, side * 0.44, 0.39, -1.343, dark);
      box(0.23, 0.08, 0.012, side * 0.44, 0.39, -1.368, lamp);
    }
    for (const y of [0.34, 0.385, 0.43]) box(0.35, 0.018, 0.008, 0, y, -1.338, hub);
  } else {
    box(1.23, 0.32, 0.12, 0, 0.2, -1.34, dark);
    for (let i = -3; i <= 3; i++) box(0.035, 0.2, 0.018, i * 0.11, 0.2, -1.411, hub);
    for (const side of [-1, 1]) {
      bar([side * 0.63, -0.04, -1.46], [side * 0.63, 0.47, -1.46], 0.045, dark);
      add(new THREE.CylinderGeometry(0.118, 0.118, 0.09, 12).rotateX(Math.PI / 2).translate(side * 0.47, 0.5, -1.35), dark);
      add(new THREE.CylinderGeometry(0.09, 0.09, 0.014, 12).rotateX(Math.PI / 2).translate(side * 0.47, 0.5, -1.402), lamp);
    }
    bar([-0.63, 0.46, -1.46], [0.63, 0.46, -1.46], 0.045, dark);
    bar([-0.63, -0.02, -1.46], [0.63, -0.02, -1.46], 0.045, dark);
  }
  for (const side of [-1, 1]) box(0.18, 0.085, 0.035, side * 0.54, 0.33, 1.37, red);
  box(0.84, 0.095, 0.11, 0, lunar ? 1.145 : 1.15, -0.57, dark);
  for (let i = -4; i <= 4; i++) box(0.067, 0.059, 0.016, i * 0.083, lunar ? 1.145 : 1.15, -0.633, lamp);
  // Open roof rack and rear access hatch stay readable from the following camera.
  if (lunar) {
    const solar = mat('#294657', 0.2); solar.metalness = 0.3;
    box(0.96, 0.4, 0.6, 0, 0.7, 0.86, accent);
    box(1, 0.045, 0.64, 0, 0.915, 0.86, dark);
    box(0.82, 0.016, 0.48, 0, 0.946, 0.86, solar);
    for (const x of [-0.27, 0, 0.27]) box(0.012, 0.006, 0.48, x, 0.957, 0.86, shell);
  } else {
    for (const side of [-1, 1]) {
      bar([side * 0.51, 1.26, -0.21], [side * 0.51, 1.26, 0.61], 0.025, hub);
      for (const z of [-0.21, 0.2, 0.61]) bar([side * 0.51, 1.1, z], [side * 0.51, 1.26, z], 0.018, hub);
    }
    for (const z of [-0.21, 0.61]) bar([-0.51, 1.26, z], [0.51, 1.26, z], 0.025, hub);
    for (const z of [-0.14, 0.08, 0.3, 0.52]) box(1.02, 0.025, 0.045, 0, 1.115, z, dark);
    panel([[-0.43, 1.025, 0.8], [0.43, 1.025, 0.8], [0.43, 0.863, 1.13], [-0.43, 0.863, 1.13]], dark);
    for (let i = 0; i < 6; i++) {
      const z = 0.83 + i * 0.053, y = 1.028 - (z - 0.8) * 0.491;
      bar([-0.39, y, z], [0.39, y, z], 0.008, hub);
    }
  }
  box(0.62, 0.35, 0.035, 0, 0.53, 1.337, dark);
  box(0.54, 0.28, 0.04, 0, 0.53, 1.359, shell);
  box(0.16, 0.035, 0.045, 0.1, 0.56, 1.388, hub);
  if (lunar) box(0.46, 0.045, 0.012, 0, 0.46, 1.386, accent);
  box(1.4, 0.12, 0.13, 0, 0.06, 1.4, dark);
  bar([lunar ? 0.4 : 0.55, 0.91, 0.86], [lunar ? 0.4 : 0.55, 1.53, 0.86], 0.013, dark);
  for (const connection of connections) {
    const wheel = new THREE.Group(), spinner = new THREE.Group();
    const tireProfile = [[0.3, -0.205], [0.4, -0.205], [radius - 0.025, -0.15], [radius - 0.02, 0.15], [0.4, 0.205], [0.3, 0.205]];
    add(new THREE.LatheGeometry(tireProfile.map(([r, y]) => new THREE.Vector2(r, y)), 24).rotateZ(Math.PI / 2), rubber, spinner);
    add(new THREE.CylinderGeometry(0.31, 0.31, 0.4, 16).rotateZ(Math.PI / 2), dark, spinner);
    for (const side of [-1, 1]) {
      if (lunar) {
        const dish = new THREE.Shape();
        dish.absarc(0, 0, 0.285, 0, Math.PI * 2, false);
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3, hole = new THREE.Path();
          hole.moveTo(Math.cos(a - 0.2) * 0.14, Math.sin(a - 0.2) * 0.14);
          for (const [r, angle] of [[0.235, a - 0.2], [0.235, a + 0.2], [0.14, a + 0.2]])
            hole.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          hole.closePath(); dish.holes.push(hole);
        }
        add(new THREE.ExtrudeGeometry(dish, { depth: 0.026, bevelEnabled: false, curveSegments: 12, steps: 1 })
          .rotateY(side * Math.PI / 2).translate(side * 0.205, 0, 0), hub, spinner);
      } else {
        add(new THREE.TorusGeometry(0.285, 0.023, 4, 16).rotateY(Math.PI / 2).translate(side * 0.208, 0, 0), hub, spinner);
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          add(new THREE.BoxGeometry(0.018, 0.19, 0.037).rotateX(a).translate(side * 0.211, Math.cos(a) * 0.17, Math.sin(a) * 0.17), hub, spinner);
        }
      }
    }
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.45, 8).rotateZ(Math.PI / 2), dark, spinner);
    for (let i = 0; i < 24; i++) for (const side of [-1, 1]) {
      const a = (i + (side > 0 ? 0.45 : 0)) * Math.PI / 12;
      add(new THREE.BoxGeometry(0.19, 0.038, 0.095).rotateY(side * 0.3).rotateX(a)
        .translate(side * 0.1, Math.cos(a) * (radius - 0.012), Math.sin(a) * (radius - 0.012)), rubber, spinner);
    }
    wheel.add(spinner); wheel.position.set(connection.x, -rest, connection.z); model.add(wheel); wheels.push(wheel); tires.push(spinner);
  }
  for (const group of [body, ...tires]) {
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const child of [...group.children]) {
      if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) continue;
      const g = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone(); g.deleteAttribute('uv');
      const parts = batches.get(child.material) ?? []; parts.push(g); batches.set(child.material, parts);
      child.geometry.dispose(); group.remove(child);
    }
    for (const [material, parts] of batches) {
      const mesh = new THREE.Mesh(mergeGeometries(parts)!, material); parts.forEach(g => g.dispose());
      mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    }
  }
}
