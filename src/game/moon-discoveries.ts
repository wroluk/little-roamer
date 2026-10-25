import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { moonSurfaceHeight } from './moon-terrain';
import { createStaticGroundTracks, type GroundTrackStamp } from './ground-effects';

export const MOON_LANDING_SITE = { x: 78, z: 44, radius: 13 };
export const MOON_SURVEY_ROVER = { x: 290, z: 235, radius: 11 };
// Development references only: no signposts, regional spawns or in-game markers.
export const MOON_DISCOVERY_APPROACHES = [
  { site: MOON_LANDING_SITE, points: [
    { x: 75, z: 105 }, { x: 78, z: 88 }, { x: 78, z: 72 },
    { x: 78, z: 60 }, { x: 78, z: 52 },
  ] },
  { site: MOON_SURVEY_ROVER, points: [
    { x: 220, z: 235 }, { x: 245, z: 260 }, { x: 280, z: 260 },
    { x: 290, z: 253 }, { x: 290, z: 242 },
  ] },
] as const;

export function moonDiscoveryClearance(x: number, z: number) {
  return [MOON_LANDING_SITE, MOON_SURVEY_ROVER].some(site =>
    Math.hypot(x - site.x, z - site.z) < 23);
}

/** Small, static, original hardware; collision uses these same baked triangles. */
export function buildMoonDiscoveries() {
  const group = new THREE.Group(); group.name = 'Moon discoveries';
  const batches = new Map<string, THREE.BufferGeometry[]>();
  const ivory = '#c9c6b6', gold = '#aa823e', dark = '#353938', silver = '#878b88', blue = '#344853';
  const add = (color: string, geometry: THREE.BufferGeometry) => {
    geometry.deleteAttribute('uv');
    const batch = batches.get(color) ?? []; batch.push(geometry); batches.set(color, batch);
  };
  const box = (color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number,
    tilt = 0) => {
    const geometry = new THREE.BoxGeometry(sx, sy, sz);
    geometry.rotateZ(tilt).translate(x, y, z); add(color, geometry);
  };
  const beam = (color: string, a: THREE.Vector3, b: THREE.Vector3, radius = 0.065) => {
    const delta = b.clone().sub(a);
    const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), 6);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()));
    geometry.translate(...a.clone().add(b).multiplyScalar(0.5).toArray()); add(color, geometry);
  };
  const ground = (x: number, z: number, radius: number) => {
    let low = Infinity, high = -Infinity;
    for (let dx = -radius; dx <= radius; dx += 0.2) for (let dz = -radius; dz <= radius; dz += 0.2) {
      const y = moonSurfaceHeight(x + dx, z + dz);
      low = Math.min(low, y); high = Math.max(high, y);
    }
    return { low, high };
  };
  const foot = (x: number, z: number, radius: number) => {
    const range = ground(x, z, radius), top = range.high + 0.09;
    const bottom = range.low - 0.1;
    add(silver, new THREE.CylinderGeometry(radius, radius * 0.9, top - bottom, 12)
      .translate(x, (top + bottom) / 2, z));
    return new THREE.Vector3(x, top, z);
  };

  const { x, z } = MOON_LANDING_SITE;
  const deck = ground(x, z, 4.7).high + 1.65;
  // A low octagonal descent stage, with the ascent stage conspicuously absent.
  add(gold, new THREE.CylinderGeometry(2.45, 2.8, 1.55, 8, 1).rotateY(Math.PI / 8)
    .translate(x, deck, z));
  add(dark, new THREE.CylinderGeometry(2.46, 2.46, 0.16, 8).rotateY(Math.PI / 8)
    .translate(x, deck + 0.84, z));
  add(silver, new THREE.CylinderGeometry(0.72, 0.92, 0.25, 12).translate(x, deck + 1.02, z));
  add(dark, new THREE.CylinderGeometry(0.55, 0.55, 0.27, 12).translate(x, deck + 1.04, z));
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + i * Math.PI / 2, dx = Math.cos(angle), dz = Math.sin(angle);
    const pad = foot(x + dx * 5.3, z + dz * 5.3, 0.72);
    const root = new THREE.Vector3(x + dx * 2.1, deck + 0.4, z + dz * 2.1);
    beam(silver, root, pad, 0.12);
    beam(dark, new THREE.Vector3(x + dx * 2.3, deck - 0.65, z + dz * 2.3),
      pad.clone().lerp(root, 0.25), 0.075);
    box(dark, x + dx * 2.55, deck, z + dz * 2.55, 0.65, 0.65, 0.65);
  }
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2;
    const radius = i % 3 === 0 ? 2.5 : 2.63;
    const geometry = new THREE.BoxGeometry(0.8, 0.55 + (i % 3) * 0.16, 0.035);
    geometry.rotateZ((i % 2 ? 1 : -1) * 0.07).rotateY(Math.PI / 2 - angle);
    geometry.translate(x + Math.cos(angle) * radius, deck - 0.22, z + Math.sin(angle) * radius);
    add(i % 3 === 0 ? silver : '#c49b50', geometry);
  }
  const ladderBottom = new THREE.Vector3(x, moonSurfaceHeight(x, z + 4.2) + 0.08, z + 4.2);
  const ladderTop = new THREE.Vector3(x, deck + 0.9, z + 2.4);
  for (const dx of [-0.38, 0.38])
    beam(silver, ladderBottom.clone().add(new THREE.Vector3(dx, 0, 0)),
      ladderTop.clone().add(new THREE.Vector3(dx, 0, 0)), 0.045);
  for (let i = 0; i <= 7; i++) {
    const p = ladderBottom.clone().lerp(ladderTop, i / 7);
    beam(silver, p.clone().add(new THREE.Vector3(-0.4, 0, 0)), p.clone().add(new THREE.Vector3(0.4, 0, 0)), 0.035);
  }
  const instrument = (ix: number, iz: number) => {
    const g = ground(ix, iz, 0.65);
    box(gold, ix, (g.low + g.high) / 2 + 0.25, iz, 1.1, g.high - g.low + 0.7, 0.85);
    return g.high + 0.6;
  };
  const reflectorX = x + 7.8, reflectorZ = z + 2.8;
  const reflectorY = instrument(reflectorX, reflectorZ);
  box(silver, reflectorX, reflectorY + 0.1, reflectorZ, 1.3, 0.14, 1.05);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++)
    box(blue, reflectorX - 0.45 + col * 0.3, reflectorY + 0.19, reflectorZ - 0.3 + row * 0.3, 0.22, 0.025, 0.22);
  const seismoX = x - 6.8, seismoZ = z + 6.5;
  const seismoY = instrument(seismoX, seismoZ);
  add(ivory, new THREE.SphereGeometry(0.65, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2)
    .translate(seismoX, seismoY, seismoZ));
  const aerialBase = foot(x + 5.2, z - 5.3, 0.5);
  const aerialTop = aerialBase.clone().add(new THREE.Vector3(0, 3, 0));
  beam(silver, aerialBase, aerialTop, 0.04);
  for (const dz of [-0.3, 0, 0.3])
    beam(silver, aerialTop.clone().add(new THREE.Vector3(-0.8, dz, 0)), aerialTop.clone().add(new THREE.Vector3(0.8, dz, 0)), 0.025);
  // A segmented cable hugs the actual triangle surface instead of floating over it.
  for (let i = 0; i < 14; i++) {
    const a = { x: x - 2 - i * 4.8 / 14, z: z + 2 + i * 4.5 / 14 };
    const b = { x: x - 2 - (i + 1) * 4.8 / 14, z: z + 2 + (i + 1) * 4.5 / 14 };
    beam(dark, new THREE.Vector3(a.x, moonSurfaceHeight(a.x, a.z) + 0.04, a.z),
      new THREE.Vector3(b.x, moonSurfaceHeight(b.x, b.z) + 0.04, b.z), 0.025);
  }

  const rx = MOON_SURVEY_ROVER.x, rz = MOON_SURVEY_ROVER.z;
  const ry = ground(rx, rz, 2.6).high;
  box(dark, rx, ry + 0.62, rz, 2.4, 0.28, 3.6, -0.08);
  box(ivory, rx, ry + 1.02, rz + 0.45, 1.9, 0.55, 1.65, -0.08);
  box(gold, rx - 0.72, ry + 1.04, rz - 0.95, 0.45, 0.65, 0.9);
  const wheel = (wx: number, wz: number, loose = false) => {
    const wy = ground(wx, wz, 0.65).low + (loose ? 0.18 : 0.48);
    const pose = new THREE.Matrix4().compose(new THREE.Vector3(wx, wy, wz),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, loose ? -Math.PI / 2 + 0.22 : 0)),
      new THREE.Vector3(1, 1, 1));
    const component = (color: string, geometry: THREE.BufferGeometry) => add(color, geometry.applyMatrix4(pose));
    const geometry = new THREE.CylinderGeometry(0.66, 0.66, 0.36, 16, 1, true);
    component(dark, geometry.rotateZ(Math.PI / 2));
    for (const side of [-1, 1])
      component(dark, new THREE.RingGeometry(0.46, 0.66, 16).rotateY(side * Math.PI / 2).translate(side * 0.18, 0, 0));
    component(silver, new THREE.CylinderGeometry(0.16, 0.16, 0.42, 10).rotateZ(Math.PI / 2));
    for (let i = 0; i < 6; i++) {
      const a = new THREE.Vector3(0, 0, 0).applyMatrix4(pose);
      const b = new THREE.Vector3(0, Math.cos(i / 6 * Math.PI * 2) * 0.49, Math.sin(i / 6 * Math.PI * 2) * 0.49).applyMatrix4(pose);
      beam(silver, a, b, 0.025);
    }
    if (!loose) beam(silver, new THREE.Vector3(rx, ry + 0.5, wz), new THREE.Vector3(wx, wy, wz), 0.09);
  };
  wheel(rx - 1.5, rz + 1.15); wheel(rx + 1.5, rz + 1.15); wheel(rx - 1.5, rz - 1.15);
  wheel(rx + 4.1, rz - 3.3, true);
  beam(silver, new THREE.Vector3(rx, ry + 1.3, rz - 0.8), new THREE.Vector3(rx + 0.22, ry + 2.5, rz - 1));
  beam(silver, new THREE.Vector3(rx + 0.22, ry + 2.5, rz - 1), new THREE.Vector3(rx + 0.85, ry + 2.8, rz - 1.5));
  box(ivory, rx + 0.85, ry + 2.8, rz - 1.5, 0.65, 0.35, 0.4);
  box(dark, rx + 0.85, ry + 2.8, rz - 1.72, 0.3, 0.2, 0.06);
  box(blue, rx, ry + 1.65, rz + 0.6, 3.4, 0.1, 1.7, -0.16);
  for (const dx of [-1.1, -0.55, 0, 0.55, 1.1])
    box(silver, rx + dx, ry + 1.72 - dx * 0.16, rz + 0.6, 0.035, 0.035, 1.66);
  for (const dx of [-0.7, 0.7])
    beam(silver, new THREE.Vector3(rx + dx, ry + 1.2, rz + 0.6),
      new THREE.Vector3(rx + dx, ry + 1.6 - dx * 0.16, rz + 0.6), 0.035);
  for (const [color, sources] of batches) {
    const flat = sources.map(source => source.index ? source.toNonIndexed() : source);
    const geometry = mergeGeometries(flat);
    for (const source of new Set([...sources, ...flat])) source.dispose();
    if (!geometry) throw new Error('Moon discovery batching failed');
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.15 }));
    mesh.name = 'Moon discovery solids';
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
  }
  const stamps: GroundTrackStamp[] = [];
  for (const dx of [-1.5, 1.5]) for (let i = 0; i < 16; i++) {
    const t = (i + Math.sin(i * 5.37 + dx) * 0.12) / 15;
    stamps.push({ x: rx + dx - 1.5 * t * t + Math.sin(i * 9.37 + dx) * 0.035,
      z: rz + 1.5 + t * 10.8, angle: Math.atan2(-3 * t, 10.8),
      length: 0.45 + (0.5 + Math.sin(i * 4.73 + dx) * 0.5) * 0.55, surface: 'lunar-regolith' });
  }
  const tracks = createStaticGroundTracks(stamps, moonSurfaceHeight, 3);
  tracks.name = 'Moon survey tracks'; group.add(tracks);
  return group;
}
