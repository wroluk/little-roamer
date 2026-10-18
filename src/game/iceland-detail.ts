import * as THREE from 'three';
import { icelandHash, icelandNoise } from './iceland-noise';
import { icelandSurfaceHeight, icelandWaterHeight, trailDistance } from './iceland-terrain';
import { ringRoadAt } from './iceland-road';
import { solheimasandurApproachDistance, solheimasandurWeight, solheimasandurWreckClearance } from './iceland-sandur';
import { reynisBeachPathDistance } from './iceland-reynisfjara';

type Detail = { x: number; y: number; z: number; scale: number; seed: number; variant: number };
/** Clustered ground forms with low, matching solid shapes and clear driving lines. */
export function buildIcelandGroundDetail(group: THREE.Scene) {
  const stones: Detail[] = [], shrubs: Detail[] = [];
  for (let iz = 20; iz < 180; iz++) for (let ix = -163; ix < -37; ix++) {
    if (ix >= -97 && iz < 130) continue;
    const seed = icelandHash(ix, iz), x = ix * 4 + 3.5 * seed, z = iz * 4 + 3.5 * icelandHash(ix + 913, iz);
    if (ringRoadAt(x, z).distance < 8 || trailDistance(x, z) < 7 || reynisBeachPathDistance(x, z) < 7
      || icelandWaterHeight(x, z) !== null
      || solheimasandurWreckClearance(x, z) || solheimasandurApproachDistance(x, z) < 6) continue;
    const y = icelandSurfaceHeight(x, z);
    if (y < 0.6 || Math.max(Math.abs(icelandSurfaceHeight(x + 1, z) - y), Math.abs(icelandSurfaceHeight(x, z + 1) - y)) > 0.65) continue;
    const patch = icelandNoise(x / 23 + 17, z / 23 - 9);
    const sand = z > 615 || solheimasandurWeight(x, z) > 0.65;
    const variant = Math.min(2, Math.floor(icelandHash(ix + 141, iz - 53) * 3));
    if (seed < (sand ? 0.19 : 0.38) * Math.max(0, (patch - 0.25) * 2)) {
      stones.push({ x, y, z, scale: 0.22 + icelandHash(ix, iz + 71) * 0.65, seed, variant });
      if (seed < 0.08 && icelandWaterHeight(x + 0.9, z + 0.4) === null && trailDistance(x + 0.9, z + 0.4) >= 7
        && !solheimasandurWreckClearance(x + 0.9, z + 0.4) && solheimasandurApproachDistance(x + 0.9, z + 0.4) >= 6)
        stones.push({ x: x + 0.9, y: icelandSurfaceHeight(x + 0.9, z + 0.4), z: z + 0.4, scale: 0.17, seed: 0.65, variant: 1 });
    }
    if (!sand && patch > 0.48 && icelandHash(ix - 31, iz + 19) < 0.37 && icelandWaterHeight(x - 0.5, z) === null
      && trailDistance(x - 0.5, z) >= 7 && ringRoadAt(x - 0.5, z).distance >= 8)
      shrubs.push({ x: x - 0.5, y: icelandSurfaceHeight(x - 0.5, z), z, scale: 0.3 + seed * 0.45, seed, variant });
  }
  const vertices: number[] = [], indices: number[] = [];
  const addCollider = (p: Detail, vegetation: boolean) => {
    // Northern Reach uses one low six-sided mesh for many shrubs. Keep these
    // colliders below the visible crowns so a tyre can roll over ground cover.
    const radius = p.scale * (vegetation ? 0.73 : 0.55);
    const height = p.scale * (vegetation ? 0.26 : 0.23);
    const base = vertices.length / 3;
    for (let side = 0; side < 6; side++) {
      const angle = side * Math.PI / 3;
      vertices.push(p.x + Math.cos(angle) * radius, p.y - 0.025, p.z + Math.sin(angle) * radius);
    }
    vertices.push(p.x, p.y + height, p.z);
    for (let side = 0; side < 6; side++) indices.push(base + side, base + 6, base + (side + 1) % 6);
  };
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  for (const [items, vegetation] of [[stones, false], [shrubs, true]] as const) {
    for (let variant = 0; variant < 3; variant++) {
      const selected = items.filter(p => p.variant === variant);
      const geometry = vegetation
        ? new THREE.SphereGeometry(1, 6 + variant * 2, 3, 0, Math.PI * 2, 0, Math.PI / 2)
        : variant === 1 ? new THREE.DodecahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, variant === 2 ? 1 : 0);
      const mesh = new THREE.InstancedMesh(geometry,
        new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, side: vegetation ? THREE.DoubleSide : THREE.FrontSide }), selected.length);
      mesh.name = `${vegetation ? 'Iceland · low scrub clusters' : 'Iceland · scattered basalt gravel'} · variant ${variant + 1}`;
      selected.forEach((p, i) => {
        const sy = p.scale * (vegetation ? 0.42 + 0.1 * variant : 0.28 + 0.06 * variant);
        dummy.position.set(p.x, p.y + (vegetation ? 0.01 : sy * 0.12), p.z);
        dummy.rotation.set(0, p.seed * Math.PI * 2, 0);
        dummy.scale.set(p.scale * (variant === 1 ? 1.25 : 1), sy, p.scale * (0.65 + p.seed * 0.4));
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
        color.set(vegetation ? '#68784a' : '#424b48').lerp(new THREE.Color(vegetation ? '#8c8955' : '#777b6a'), p.seed);
        mesh.setColorAt(i, color);
        addCollider(p, vegetation);
      });
      // Dense, close ground detail produced unstable repeated shadows. Northern
      // Reach also leaves small shrub and rock instances out of its shadow pass.
      mesh.castShadow = false; mesh.receiveShadow = false;
      mesh.computeBoundingSphere(); group.add(mesh);
    }
  }
  return { stones: stones.length, shrubs: shrubs.length,
    collider: { vertices: Float32Array.from(vertices), indices: Uint32Array.from(indices) } };
}
