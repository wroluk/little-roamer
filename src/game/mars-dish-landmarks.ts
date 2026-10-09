import * as THREE from 'three';
import { DISH_SITE, DISH_RELAYS } from './mars-dish-layout';
import { marsSurfaceHeight } from './mars-terrain';

type Add = (geometry: THREE.BufferGeometry, material: THREE.Material, solid?: boolean) => void;
type Palette = Record<'ivory' | 'orange' | 'dark' | 'light', THREE.Material>;

/** A closed, genuinely concave paraboloid shell; the same mesh supplies collision. */
export const DISH_RADIUS = 17;
export const DISH_DEPTH = 5.5;
export function dishBowlGeometry(segments = 64, rings = 12): THREE.BufferGeometry {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const ivory = new THREE.Color('#dedfd1'), panel = new THREE.Color('#c4c9bf'), back = new THREE.Color('#626b68');
  const count = 1 + segments * rings;
  for (let layer = 0; layer < 2; layer++) {
    positions.push(0, layer ? -0.32 : 0, 0); colors.push(...(layer ? back : ivory).toArray());
    for (let ring = 1; ring <= rings; ring++) for (let i = 0; i < segments; i++) {
      const radius = DISH_RADIUS * ring / rings, a = i * Math.PI * 2 / segments;
      positions.push(radius * Math.cos(a), DISH_DEPTH * (radius / DISH_RADIUS) ** 2 - layer * 0.32, radius * Math.sin(a));
      colors.push(...(layer ? back : (Math.floor(i / 4) + Math.floor(ring / 3)) % 4 === 0 ? panel : ivory).toArray());
    }
    const offset = layer * count;
    const tri = (a: number, b: number, c: number) => indices.push(...(layer ? [offset + a, offset + c, offset + b] : [offset + a, offset + b, offset + c]));
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      tri(0, 1 + next, 1 + i);
      for (let ring = 1; ring < rings; ring++) {
        const a = 1 + (ring - 1) * segments + i, d = 1 + (ring - 1) * segments + next;
        const b = 1 + ring * segments + i, c = 1 + ring * segments + next;
        tri(a, c, b); tri(a, d, c);
      }
    }
  }
  for (let i = 0; i < segments; i++) {
    const a = 1 + (rings - 1) * segments + i, b = 1 + (rings - 1) * segments + (i + 1) % segments;
    indices.push(a, b, a + count, b, b + count, a + count);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export function addDishRidgeDecor(cx: number, cz: number, add: Add, palette: Palette, distant = false) {
  const owns = (x: number, z: number) => Math.floor(x / 96) === cx && Math.floor(z / 96) === cz;
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, solid = true) =>
    add(new THREE.BoxGeometry(w, h, d).translate(x, y, z), material, solid);
  const beam = (a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material, solid = true) => {
    const geometry = new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 8);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    geometry.translate(...a.clone().add(b).multiplyScalar(0.5).toArray()); add(geometry, material, solid);
  };
  if (owns(DISH_SITE.x, DISH_SITE.z)) {
    const { x, z } = DISH_SITE, ground = marsSurfaceHeight(x, z);
    const origin = new THREE.Vector3(x, ground + 20, z);
    const normal = new THREE.Vector3(-0.58, 0.68, 0.45).normalize();
    const tilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    const world = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyQuaternion(tilt).add(origin);
    const bowl = dishBowlGeometry(distant ? 32 : 64, distant ? 6 : 12).applyQuaternion(tilt).translate(...origin.toArray());
    const panels = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, metalness: 0.12 });
    add(bowl, panels, true);
    const radius = DISH_RADIUS, depth = DISH_DEPTH;
    const ring = (r: number, y: number, tube: number, material: THREE.Material, solid = false) =>
      add(new THREE.TorusGeometry(r, tube, 5, distant ? 32 : 64).rotateX(-Math.PI / 2).translate(0, y, 0)
        .applyQuaternion(tilt).translate(...origin.toArray()), material, solid);
    ring(radius, depth, 0.22, palette.ivory, true);
    ring(radius, depth - 1.5, 0.17, palette.ivory);
    const ribs = distant ? 8 : 16;
    const shellY = (r: number) => depth * (r / radius) ** 2;
    const backY = (r: number) => shellY(r) - 2.8 + 1.3 * r / radius;
    // Deep radial Warren trusses, hoop braces and diagonal ties carry the reflector.
    for (let rib = 0; rib < ribs; rib++) {
      const a = rib * Math.PI * 2 / ribs;
      const at = (r: number, y: number, angle = a) => world(r * Math.cos(angle), y, r * Math.sin(angle));
      for (let j = 0; j < 6; j++) {
        const r0 = 2 + (radius - 2) * j / 6, r1 = 2 + (radius - 2) * (j + 1) / 6;
        beam(at(r0, backY(r0)), at(r1, backY(r1)), 0.13, palette.ivory, false);
        if (!distant) {
          beam(at(r0, shellY(r0) - 0.5), at(r1, shellY(r1) - 0.5), 0.10, palette.ivory, false);
          beam(at(r0, backY(r0)), at(r1, shellY(r1) - 0.5), 0.075, palette.ivory, false);
          beam(at(r1, backY(r1)), at(r1, shellY(r1) - 0.5), 0.075, palette.ivory, false);
        }
      }
      if (!distant) {
        beam(at(8, backY(8)), at(13, backY(13), a + Math.PI * 2 / ribs), 0.085, palette.ivory, false);
        // Fine radial panel joints stand clear of the reflective skin.
        for (let j = 1; j < 12; j++) {
          const r0 = radius * j / 12, r1 = radius * (j + 1) / 12;
          beam(at(r0, shellY(r0) + 0.065), at(r1, shellY(r1) + 0.065), 0.025, palette.dark, false);
        }
      }
    }
    for (const r of [8, 13]) ring(r, backY(r), 0.12, palette.ivory);
    if (!distant) for (const j of [3, 6, 9]) ring(radius * j / 12, shellY(radius * j / 12) + 0.065, 0.025, palette.dark);
    // Four paired truss arms hold the receiver at the focus, like a deep-space antenna.
    const focus = radius * radius / (4 * depth);
    for (let arm = 0; arm < 4; arm++) {
      const a = arm * Math.PI / 2 + Math.PI / 4;
      const foot = world(radius * 0.94 * Math.cos(a), depth * 0.94 ** 2, radius * 0.94 * Math.sin(a));
      const tip = world(1.1 * Math.cos(a), focus, 1.1 * Math.sin(a));
      const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).applyQuaternion(tilt).multiplyScalar(0.4);
      beam(foot.clone().add(side), tip.clone().add(side), 0.18, palette.ivory);
      beam(foot.clone().sub(side), tip.clone().sub(side), 0.18, palette.ivory);
      if (!distant) for (let j = 0; j < 4; j++) {
        beam(foot.clone().lerp(tip, j / 4).add(side), foot.clone().lerp(tip, (j + 1) / 4).sub(side), 0.075, palette.dark, false);
      }
    }
    add(new THREE.CylinderGeometry(1.55, 1.05, 2.6, 12).translate(0, focus, 0)
      .applyQuaternion(tilt).translate(...origin.toArray()), palette.ivory, true);
    ring(1.6, focus + 0.9, 0.12, palette.orange);
    add(new THREE.CylinderGeometry(0.85, 0.85, 0.18, 12).translate(0, focus - 1.4, 0)
      .applyQuaternion(tilt).translate(...origin.toArray()), palette.dark);
    // Three independent legs keep the service island open instead of enclosing it in a collision box.
    const apex = new THREE.Vector3(x, ground + 11, z);
    const braceHub = new THREE.Vector3(x, ground + 5.5, z);
    for (let leg = 0; leg < 3; leg++) {
      const a = leg * Math.PI * 2 / 3 + Math.PI / 6;
      const foot = new THREE.Vector3(x + Math.cos(a) * 8.2, 0, z + Math.sin(a) * 8.2);
      foot.y = marsSurfaceHeight(foot.x, foot.z);
      add(new THREE.CylinderGeometry(1.3, 1.7, 0.7, 6).translate(foot.x, foot.y + 0.2, foot.z), palette.dark, true);
      // Bury the entire angled end cap inside the foot, including its uphill edge.
      const heel = foot.clone().add(new THREE.Vector3(0, -0.25, 0));
      add(new THREE.CylinderGeometry(1, 1.15, 0.9, 8).translate(foot.x, foot.y + 0.35, foot.z), palette.dark, true);
      beam(heel, apex, 0.65, palette.ivory);
      beam(heel.clone().lerp(apex, 0.32), braceHub, 0.18, palette.orange);
    }
    // The rising braces terminate in a shared collar suspended from the azimuth bearing.
    beam(braceHub.clone().add(new THREE.Vector3(0, -0.3, 0)), apex, 0.42, palette.ivory);
    add(new THREE.CylinderGeometry(0.8, 0.8, 0.65, 12).translate(...braceHub.toArray()), palette.dark, true);
    add(new THREE.CylinderGeometry(0.85, 0.85, 0.18, 12).translate(x, ground + 5.88, z), palette.orange);
    add(new THREE.CylinderGeometry(3.2, 3.2, 1.4, 24).translate(x, ground + 11.1, z), palette.dark, true);
    add(new THREE.CylinderGeometry(3.35, 3.35, 0.25, 24).translate(x, ground + 11.9, z), palette.orange);
    // Fork mount and a broad horizontal elevation bearing, supported above the tripod.
    const axle = new THREE.Vector3(normal.z, 0, -normal.x).normalize();
    for (const side of [-1, 1]) {
      const lower = new THREE.Vector3(x, ground + 12, z).addScaledVector(axle, side * 2.4);
      const upper = origin.clone().addScaledVector(normal, -2.8).addScaledVector(axle, side * 3.3);
      beam(lower, upper, 0.85, palette.ivory);
      beam(upper.clone().addScaledVector(axle, -0.7), upper.clone().addScaledVector(axle, 0.7), 1.35, palette.dark);
    }
    const pivot = origin.clone().addScaledVector(normal, -2.8);
    beam(pivot.clone().addScaledVector(axle, -4.1), pivot.clone().addScaledVector(axle, 4.1), 0.65, palette.orange);
    beam(pivot, origin, 1.15, palette.dark);
    if (!distant) {
      // The access deck overlaps a bridge into the bearing housing, so it cannot hang free.
      box(x, ground + 10.1, z + 4.5, 8, 0.5, 2.2, palette.dark);
      box(x, ground + 10.24, z + 2, 2.9, 0.4, 5, palette.dark);
      for (const side of [-1, 1]) {
        // Both caps are buried: one inside the deck slab, the other inside the tripod joint.
        beam(new THREE.Vector3(x + side * 3.25, ground + 10.1, z + 4.5), braceHub, 0.18, palette.ivory);
      }
      // Human-scale guardrails and ladder make the machinery's size legible.
      for (const dx of [-3.8, -1.9, 0, 1.9, 3.8]) {
        beam(new THREE.Vector3(x + dx, ground + 10.25, z + 5.5), new THREE.Vector3(x + dx, ground + 11.5, z + 5.5), 0.065, palette.ivory, false);
      }
      for (const h of [10.85, 11.5]) beam(new THREE.Vector3(x - 3.8, ground + h, z + 5.5), new THREE.Vector3(x + 3.8, ground + h, z + 5.5), 0.065, palette.ivory, false);
      for (const dx of [-0.5, 0.5]) beam(new THREE.Vector3(x + dx, ground + 0.3, z + 5.8), new THREE.Vector3(x + dx, ground + 11.5, z + 5.8), 0.085, palette.orange);
      for (let h = 0.6; h < 10.5; h += 0.45) beam(new THREE.Vector3(x - 0.5, ground + h, z + 5.8), new THREE.Vector3(x + 0.5, ground + h, z + 5.8), 0.06, palette.ivory, false);
    }
    // Recessed service cabinets and low cable covers occupy the inside of the circuit.
    for (const [dx, dz, width] of distant ? [] : [[-12, 6, 3.4], [-8, 10, 2.6]]) {
      const y = marsSurfaceHeight(x + dx, z + dz);
      box(x + dx, y + 0.12, z + dz, width + 0.6, 0.4, 2.6, palette.dark);
      box(x + dx, y + 1.25, z + dz, width, 2.1, 2.1, palette.ivory);
      box(x + dx, y + 2.44, z + dz, width + 0.18, 0.24, 2.28, palette.orange);
      for (let vent = 0; vent < 4; vent++) box(x + dx - width * 0.28 + vent * width * 0.18, y + 1.25, z + dz + 1.06, 0.13, 1.2, 0.035, palette.dark, false);
    }
    if (!distant) box(x - 9, ground + 0.13, z + 4, 8, 0.22, 0.7, palette.dark);
  }
  // Compact relay array on the level service terrace, rather than on the steep rear slope.
  for (const { x, z, height, yaw } of DISH_RELAYS) if (owns(x, z)) {
    const y = marsSurfaceHeight(x, z);
    add(new THREE.CylinderGeometry(1.1, 1.5, 0.65, 6).translate(x, y + 0.15, z), palette.dark, true);
    beam(new THREE.Vector3(x, y + 0.2, z), new THREE.Vector3(x, y + height, z), 0.25, palette.ivory);
    add(new THREE.BoxGeometry(3.4, 1.8, 0.3).rotateY(yaw).translate(x, y + height - 1.2, z), palette.orange, true);
    if (!distant) for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(2.95, 1.38, 0.06).translate(0, 0, side * 0.19).rotateY(yaw)
        .translate(x, y + height - 1.2, z), palette.dark);
      for (let element = -2; element <= 2; element++) add(new THREE.BoxGeometry(0.3, 1.12, 0.06)
        .translate(element * 0.53, 0, side * 0.25).rotateY(yaw).translate(x, y + height - 1.2, z), palette.ivory);
    }
    beam(new THREE.Vector3(x, y + height - 0.1, z), new THREE.Vector3(x, y + height + 1, z), 0.055, palette.dark, false);
    box(x + 0.6, y + 1.05, z, 0.65, 1.1, 0.65, palette.ivory);
    for (const dx of [-1.8, 1.8]) beam(new THREE.Vector3(x + dx, marsSurfaceHeight(x + dx, z), z), new THREE.Vector3(x, y + 3.2, z), 0.1, palette.dark);
  }
}
