import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { SKOGA_BRIDGE } from './iceland-layout';
import { buildIcelandRiverGeometry, buildIcelandSeaGeometry } from './iceland-river';
import { buildIcelandGroundDetail } from './iceland-detail';
import { buildSkogafossWater } from './iceland-waterfall';
import { buildIcelandRoadScenery } from './iceland-road-scenery';
import { disposeScene } from './dispose';
import { COASTAL_TURNOUT, icelandSurfaceHeight } from './iceland-terrain';

/** A conforming feathered circle avoids a polygonal terrain-colour boundary. */
function buildCoastalTurnout(group: THREE.Scene) {
  const vertices: number[] = [], fades: number[] = [], indices: number[] = [];
  const rings = [0, 4, 8, 12, 15, 18, 20], segments = 72;
  for (const radius of rings) for (let i = 0; i < segments; i++) {
    const angle = i * Math.PI * 2 / segments;
    const x = COASTAL_TURNOUT.x + Math.cos(angle) * radius;
    const z = COASTAL_TURNOUT.z + Math.sin(angle) * radius;
    vertices.push(x, icelandSurfaceHeight(x, z) + 0.055, z);
    fades.push(radius <= 15 ? 1 : radius === 18 ? 0.6 : 0);
  }
  for (let ring = 0; ring < rings.length - 1; ring++) for (let i = 0; i < segments; i++) {
    const a = ring * segments + i, b = ring * segments + (i + 1) % segments;
    const c = (ring + 1) * segments + i, d = (ring + 1) * segments + (i + 1) % segments;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('turnoutFade', new THREE.Float32BufferAttribute(fades, 1));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: '#746e60', roughness: 1,
    transparent: true, opacity: 0.64, depthWrite: false, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'attribute float turnoutFade; varying float vTurnoutFade;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTurnoutFade = turnoutFade;');
    shader.fragmentShader = 'varying float vTurnoutFade;\n' + shader.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vTurnoutFade;');
  };
  const turnout = new THREE.Mesh(geometry, material);
  turnout.name = 'Iceland · coastal dirt turnout'; turnout.renderOrder = 1; group.add(turnout);
}

/** Small fixed pilot landmarks. Terrain remains streamed; all owned resources dispose together. */
export function buildIcelandScenery(world: RAPIER.World) {
  const group = new THREE.Scene(); group.name = 'Iceland · Skógafoss pilot';
  const solids: RAPIER.Collider[] = [];
  const material = (color: string, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness });
  const water = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.04, side: THREE.DoubleSide, transparent: true, depthWrite: false });
  // The transparent river meets the sea at a narrow, sea-level cross-section.
  // No second water surface sits beneath its upstream bed.
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, name: string, solid = false) => {
    const o = new THREE.Mesh(g, m); o.name = name; o.receiveShadow = true; group.add(o);
    if (solid) {
      const index = g.index?.array ?? Uint32Array.from({ length: g.attributes.position.count }, (_, i) => i);
      solids.push(world.createCollider(RAPIER.ColliderDesc.trimesh(Float32Array.from(g.attributes.position.array), Uint32Array.from(index)).setFriction(0.9)));
      o.castShadow = true;
    }
    return o;
  };
  const box = (x: number, y: number, z: number, sx: number, sy: number, sz: number, m: THREE.Material, name: string) =>
    mesh(new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z), m, name, true);
  const sea = buildIcelandSeaGeometry();
  mesh(sea, new THREE.MeshStandardMaterial({ color: '#194451', roughness: 0.35, metalness: 0.04 }), 'Iceland · deep sea');
  const river = buildIcelandRiverGeometry();
  mesh(river, water, 'Skógá · continuous river').renderOrder = 1;
  const waterfall = buildSkogafossWater(group);
  buildIcelandRoadScenery(group);
  buildCoastalTurnout(group);
  const detail = buildIcelandGroundDetail(group);
  solids.push(world.createCollider(RAPIER.ColliderDesc.trimesh(detail.collider.vertices, detail.collider.indices).setFriction(0.9)));
  // The cliff is the terrain itself. Only the road bridge adds structural geometry.
  const b = SKOGA_BRIDGE, concrete = material('#7a8078'), rail = material('#515c58');
  // The deck meets the graded bank at the same height. Prefer its concrete
  // surface over the terrain in the depth buffer, including the exposed verges.
  concrete.polygonOffset = true;
  concrete.polygonOffsetFactor = -1;
  concrete.polygonOffsetUnits = -1;
  box(b.x, b.y - 0.35, b.z, b.length, 0.7, b.width, concrete, 'Skógá · bridge deck');
  for (const side of [-1, 1]) {
    box(b.x, b.y + 0.8, b.z + side * 5.8, b.length, 0.25, 0.25, rail, 'Skógá · bridge rail');
    for (let i = -3; i <= 3; i++) box(b.x + i * 9, b.y + 0.4, b.z + side * 5.8, 0.25, 0.8, 0.25, rail, 'Skógá · bridge post');
    box(b.x + side * 13, 3.8, b.z, 2, 4.3, 9, concrete, 'Skógá · bridge pier');
  }
  const amber = material('#dda555');
  for (const x of [-559, -511]) for (const z of [579, 591]) {
    box(x, icelandSurfaceHeight(x, z) + 0.7, z, 0.25, 1.4, 0.25, amber, 'Skógá · ford marker');
  }
  return {
    group, colliderCount: solids.length,
    animate(dt: number, reducedMotion: boolean) {
      if (reducedMotion) return;
      waterfall.animate(dt, reducedMotion);
    },
    dispose() { for (const c of solids) world.removeCollider(c, true); disposeScene(group); },
  };
}
