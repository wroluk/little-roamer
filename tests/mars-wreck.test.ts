import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addWreckDecor } from '../src/game/mars-wreck-landmarks';
import { WRECK_SITE, WRECK_PASSAGE, wreckPoint, wreckClearance } from '../src/game/mars-wreck-layout';
import { marsSurfaceHeight, MARS_ROUTES, marsTrailSample } from '../src/game/mars-terrain';
import { driveMarsPath } from './mars-driving';
import { disposeScene } from '../src/game/dispose';

const disposeMaterials = (materials: Set<THREE.Material>) => {
  const textures = new Set([...materials].flatMap(m =>
    Object.values(m).filter((value): value is THREE.Texture => value instanceof THREE.Texture)));
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
};

before(async () => { await RAPIER.init(); });
test('wreck is a bounded, unmarked original structure with a tall fin and solid engine shells', () => {
  const bounds = new THREE.Box3(), meshes: THREE.Mesh[] = [], materials = new Set<THREE.Material>();
  let triangles = 0, structuralTriangles = 0;
  addWreckDecor(-7, 2, (g, m, solid) => {
    assert.equal(solid, true, 'every remaining visible wreck piece has matching collision');
    const count = (g.index?.count ?? g.getAttribute('position').count) / 3;
    triangles += count; if (solid) structuralTriangles += count;
    g.computeBoundingBox(); bounds.union(g.boundingBox!);
    assert.ok(Array.from(g.getAttribute('position').array).every(Number.isFinite));
    const colors = g.getAttribute('color');
    assert.equal(colors.count, g.getAttribute('position').count);
    assert.equal(g.getAttribute('uv'), undefined, 'the hull no longer needs texture coordinates');
    assert.ok(Array.from(colors.array).every(value => Number.isFinite(value) && value >= 0 && value <= 1));
    meshes.push(new THREE.Mesh(g, m)); materials.add(m);
  });
  assert.ok(triangles > 0 && triangles < 10000, `shuttle budget: ${triangles} triangles`);
  assert.equal(structuralTriangles, triangles, 'no decorative pass-through geometry');
  const edges = new Map<string, number>();
  for (const mesh of meshes) {
    const geometry = mesh.geometry, positions = geometry.getAttribute('position');
    const vertex = (i: number) => {
      const index = geometry.index ? geometry.index.getX(i) : i;
      return [positions.getX(index), positions.getY(index), positions.getZ(index)].map(n => Math.round(n * 1000)).join(',');
    };
    for (let i = 0; i < (geometry.index?.count ?? positions.count); i += 3) {
      const vertices = [vertex(i), vertex(i + 1), vertex(i + 2)];
      for (let j = 0; j < 3; j++) {
        const key = [vertices[j], vertices[(j + 1) % 3]].sort().join('/');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
  }
  assert.ok([...edges.values()].every(count => count === 2), 'inner and outer skins are capped into a closed wall volume');
  assert.ok(bounds.max.z - bounds.min.z > 60 && bounds.max.z - bounds.min.z < 95, 'buried shuttle fuselage extent');
  assert.ok(bounds.max.x - bounds.min.x > 45 && bounds.max.x - bounds.min.x < 80, 'asymmetric stabilizer span');
  assert.ok(bounds.max.y > marsSurfaceHeight(WRECK_SITE.x, WRECK_SITE.z) + 25, 'large tail fin rises above the buried fuselage');
  for (const material of materials) if (material instanceof THREE.MeshStandardMaterial) {
    assert.ok(Math.max(material.color.r, material.color.g, material.color.b) < 0.3, 'weathered gray, not ivory plating');
    assert.ok(!Object.values(material).some(value => value instanceof THREE.Texture), 'all wreck finishes are texture-free');
  }
  assert.ok(marsTrailSample(WRECK_SITE.x, WRECK_SITE.z).distance > 95);
  assert.ok(!MARS_ROUTES.some(r => /wreck|ship/i.test(r.name)));
  for (const p of WRECK_PASSAGE) {
    const ray = new THREE.Raycaster(new THREE.Vector3(p.x, marsSurfaceHeight(p.x, p.z) + 0.4, p.z), new THREE.Vector3(0, 1, 0), 0, 4);
    assert.equal(ray.intersectObjects(meshes).length, 0, 'clear exterior approach');
    assert.ok(wreckClearance(p.x, p.z), 'no scatter on the approach');
  }
  meshes.forEach(m => m.geometry.dispose());
  disposeMaterials(materials);
});

test('wreck finish uses deterministic vertex colors without texture-painted detail', () => {
  const scene = new THREE.Scene(), passes: THREE.Mesh[][] = [[], []];
  try {
    for (const pass of passes) addWreckDecor(-7, 2, (geometry, material) => {
      const mesh = new THREE.Mesh(geometry, material);
      pass.push(mesh); scene.add(mesh);
      assert.ok(material instanceof THREE.MeshStandardMaterial);
      assert.ok(material.vertexColors);
      assert.ok(!Object.values(material).some(value => value instanceof THREE.Texture));
    });
    assert.equal(passes[0].length, 4, 'outer, inner, cut edge and armor batches');
    for (let i = 0; i < passes[0].length; i++) {
      const a = passes[0][i].geometry, b = passes[1][i].geometry;
      assert.deepEqual(a.getAttribute('color').array, b.getAttribute('color').array);
      assert.ok(Array.from(a.getAttribute('normal').array).every(Number.isFinite));
    }
    const palette = passes[0].map(mesh => (mesh.material as THREE.MeshStandardMaterial).color.getHex());
    assert.equal(new Set(palette).size, 4, 'distinct hull, exhaust interior, cut edge and armor tones');
  } finally {
    disposeScene(scene);
  }
});

test('windward sand screens the hull from nearby main trails at chase-camera height', () => {
  const envelope = new Map<string, THREE.Vector3>(), materials = new Set<THREE.Material>();
  addWreckDecor(-7, 2, (geometry, material) => {
    materials.add(material);
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(positions, i);
      if (p.y < marsSurfaceHeight(p.x, p.z) + 0.4) continue;
      const key = `${Math.floor(p.x / 8)},${Math.floor(p.z / 8)}`;
      if (!envelope.has(key) || envelope.get(key)!.y < p.y) envelope.set(key, p);
    }
    geometry.dispose();
  });
  disposeMaterials(materials);
  assert.ok(envelope.size > 10, 'sample the fin, fuselage and engines');
  for (const route of MARS_ROUTES) {
    for (let i = 1; i < route.points.length; i++) for (let step = 0; step <= 20; step++) {
      const a = route.points[i - 1], b = route.points[i], t = step / 20;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (Math.hypot(x - WRECK_SITE.x, z - WRECK_SITE.z) > 310) continue;
      const eye = marsSurfaceHeight(x, z) + 4;
      for (const p of envelope.values()) {
        const top = p.y + 0.3;
        if (Math.hypot(p.x - x, p.z - z) > 250) continue;
        let margin = -Infinity;
        for (let s = 1; s < 100; s++) {
          const f = s / 100;
          margin = Math.max(margin, marsSurfaceHeight(x + (p.x - x) * f, z + (p.z - z) * f) - (eye + (top - eye) * f));
        }
        assert.ok(margin > 0.3, `screen at ${route.name} ${i}:${step}, fragment ${p.x},${p.z}: ${margin}`);
      }
    }
  }
});

test('real Scout follows the sandy exterior approach in both directions', async () => {
  const path = WRECK_PASSAGE.map(p => ({ ...p, y: marsSurfaceHeight(p.x, p.z) }));
  for (const points of [path, [...path].reverse()]) {
    const result = await driveMarsPath(points, 3000);
    assert.equal(result.next, points.length, JSON.stringify(result));
    assert.ok(result.minHeight > -0.3); assert.ok(result.contacts >= 2);
  }
});
