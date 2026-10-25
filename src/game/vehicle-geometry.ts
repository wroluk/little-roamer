import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Closed, outward-facing panels, with independent normals at each crease. */
export function solidPanel(points: number[][]) {
  const geometry = new ConvexGeometry(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  geometry.setIndex(Array.from({ length: geometry.getAttribute('position').count }, (_, i) => i));
  return geometry;
}

/** A single small bevel catches the light without rounding away the toy silhouette. */
export function beveledBox(width: number, height: number, depth: number, bevel = 0.035) {
  const half = [width / 2, height / 2, depth / 2];
  const cut = Math.min(bevel, ...half.map(value => value * 0.4));
  const points: number[][] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    for (let axis = 0; axis < 3; axis++) {
      points.push([x, y, z].map((sign, i) => sign * (half[i] - (i === axis ? 0 : cut))));
    }
  }
  return solidPanel(points);
}

export function roverWheel(radius: number, rim: 'spoked' | 'vented' | 'capped',
  rubber: THREE.Material, dark: THREE.Material, hub: THREE.Material) {
  const spinner = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => spinner.add(new THREE.Mesh(geometry, material));
  const profile = [[0.3, -0.205], [0.4, -0.205], [radius - 0.025, -0.15], [radius - 0.02, 0.15], [0.4, 0.205], [0.3, 0.205]];
  add(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 24).rotateZ(Math.PI / 2), rubber);
  add(new THREE.CylinderGeometry(0.31, 0.31, 0.4, 16).rotateZ(Math.PI / 2), dark);
  for (const side of [-1, 1]) {
    if (rim === 'vented') {
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
        .rotateY(side * Math.PI / 2).translate(side * 0.205, 0, 0), hub);
    } else if (rim === 'capped') {
      add(new THREE.CylinderGeometry(0.282, 0.282, 0.028, 24).rotateZ(Math.PI / 2).translate(side * 0.2, 0, 0), hub);
      add(new THREE.TorusGeometry(0.285, 0.012, 4, 16).rotateY(Math.PI / 2).translate(side * 0.212, 0, 0), hub);
      add(new THREE.BoxGeometry(0.006, 0.34, 0.045).rotateX(0.6).translate(side * 0.218, 0, 0), dark);
    } else {
      add(new THREE.TorusGeometry(0.285, 0.023, 4, 16).rotateY(Math.PI / 2).translate(side * 0.208, 0, 0), hub);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        add(new THREE.BoxGeometry(0.018, 0.19, 0.037).rotateX(a).translate(side * 0.211, Math.cos(a) * 0.17, Math.sin(a) * 0.17), hub);
      }
    }
  }
  add(new THREE.CylinderGeometry(0.1, 0.1, 0.45, 8).rotateZ(Math.PI / 2), dark);
  for (let i = 0; i < 24; i++) for (const side of [-1, 1]) {
    const a = (i + (side > 0 ? 0.45 : 0)) * Math.PI / 12;
    add(new THREE.BoxGeometry(0.19, 0.038, 0.095).rotateY(side * 0.3).rotateX(a)
      .translate(side * 0.1, Math.cos(a) * (radius - 0.012), Math.sin(a) * (radius - 0.012)), rubber);
  }
  return spinner;
}

export function batchVehicleMeshes(group: THREE.Group) {
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const child of [...group.children]) {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) continue;
    const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    geometry.deleteAttribute('uv');
    const parts = batches.get(child.material) ?? []; parts.push(geometry); batches.set(child.material, parts);
    child.geometry.dispose(); group.remove(child);
  }
  for (const [material, parts] of batches) {
    const mesh = new THREE.Mesh(mergeGeometries(parts)!, material); parts.forEach(geometry => geometry.dispose());
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }
}

/** Wheel axis is X; both faces are finished, including the rear-mounted spare. */
export function detailedWheel(style: 'classic' | 'modern', radius: number) {
  const group = new THREE.Group();
  const classic = style === 'classic';
  const rubber = new THREE.MeshStandardMaterial({ color: '#202829', roughness: 0.94 });
  const tread = new THREE.MeshStandardMaterial({ color: '#303839', roughness: 0.96 });
  const black = new THREE.MeshStandardMaterial({ color: '#182024', roughness: 0.34, metalness: 0.55 });
  const alloy = new THREE.MeshStandardMaterial({ color: classic ? '#ded4b9' : '#dce3e6', roughness: 0.3, metalness: 0.7 });
  const brake = new THREE.MeshStandardMaterial({ color: '#555b5b', roughness: 0.75, metalness: 0.45 });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
    if (!geometry.index) geometry.setIndex(Array.from({ length: geometry.getAttribute('position').count }, (_, i) => i));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const rimRadius = classic ? 0.285 : 0.325;
  const profile = [
    [rimRadius, -0.17], [rimRadius + 0.025, -0.185], [radius - 0.055, -0.18],
    [radius - 0.022, -0.135], [radius - 0.016, -0.09], [radius - 0.016, 0.09],
    [radius - 0.022, 0.135], [radius - 0.055, 0.18], [rimRadius + 0.025, 0.185],
    [rimRadius, 0.17], [rimRadius, -0.17],
  ];
  add(new THREE.LatheGeometry(profile.map(([r, x]) => new THREE.Vector2(r, x)), 40).rotateZ(Math.PI / 2), rubber);
  const block = new THREE.BoxGeometry(classic ? 0.095 : 0.085, 0.028, classic ? 0.09 : 0.065);
  for (let row = 0; row < 3; row++) for (let i = 0; i < (classic ? 28 : 36); i++) {
    const angle = (i + (row % 2) * 0.5) * Math.PI * 2 / (classic ? 28 : 36);
    const mesh = add(block, tread);
    mesh.position.set((row - 1) * 0.112, (radius - 0.014) * Math.cos(angle), (radius - 0.014) * Math.sin(angle));
    mesh.rotation.x = angle;
  }
  const disk = (r: number, depth: number, x: number, material: THREE.Material) => {
    const mesh = add(new THREE.CylinderGeometry(r, r, depth, 40).rotateZ(Math.PI / 2), material);
    mesh.position.x = x;
    return mesh;
  };
  const ring = (r: number, tube: number, x: number, material: THREE.Material) => {
    const mesh = add(new THREE.TorusGeometry(r, tube, 6, 40).rotateY(Math.PI / 2), material);
    mesh.position.x = x;
  };
  for (const side of [-1, 1]) {
    disk(rimRadius - 0.016, 0.02, side * 0.105, brake);
    ring(rimRadius - 0.009, 0.018, side * 0.174, black);
    ring(rimRadius, 0.012, side * 0.188, alloy);
    if (classic) {
      // Eight steel spokes leave real recessed ventilation openings.
      disk(0.13, 0.045, side * 0.18, alloy);
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        const spoke = add(new THREE.BoxGeometry(0.038, 0.16, 0.07), alloy);
        spoke.position.set(side * 0.177, Math.cos(angle) * 0.198, Math.sin(angle) * 0.198);
        spoke.rotation.x = angle;
      }
      ring(0.245, 0.012, side * 0.18, alloy);
    } else {
      // Five swept split spokes: dark sculpted blades with machined silver edges.
      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 2 / 5;
        const blade = (points: number[][], x: number, depth: number, material: THREE.Material) => {
          const vertices = [x, x + side * depth].flatMap(axial => points.map(([radial, tangent]) => [
            axial, radial * Math.cos(angle) - tangent * Math.sin(angle),
            radial * Math.sin(angle) + tangent * Math.cos(angle),
          ]));
          add(solidPanel(vertices), material);
        };
        blade([[0.075, -0.04], [0.15, -0.033], [0.315, -0.01], [0.29, 0.07]], side * 0.151, 0.045, black);
        blade([[0.09, -0.02], [0.14, -0.025], [0.257, -0.176], [0.225, -0.199]], side * 0.151, 0.045, black);
        blade([[0.09, 0.006], [0.12, 0.032], [0.29, 0.07], [0.31, 0.028]], side * 0.198, 0.006, alloy);
        blade([[0.09, -0.02], [0.11, -0.005], [0.253, -0.176], [0.225, -0.199]], side * 0.198, 0.006, alloy);
      }
      disk(0.105, 0.04, side * 0.175, black);
    }
    disk(0.064, 0.018, side * 0.207, alloy);
    disk(0.042, 0.021, side * 0.21, black);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      const bolt = disk(0.012, 0.012, side * 0.207, alloy);
      bolt.position.y = Math.cos(angle) * 0.088;
      bolt.position.z = Math.sin(angle) * 0.088;
    }
  }
  return group;
}
