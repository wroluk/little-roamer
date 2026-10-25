import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { StaticSunlight } from '../src/game/static-sunlight';
import { moonHollowGeometry } from '../src/game/moon-hollow';
import { MOON_SUN_OFFSET } from '../src/game/moon';
import { moonSurfaceHeight } from '../src/game/moon-terrain';
import { MARS_SUN_OFFSET } from '../src/game/mars-streaming';
import { LAVA_TUBES } from '../src/game/mars-tubes-layout';
import { lavaTubeGeometry } from '../src/game/mars-tubes-landmarks';
import { marsSurfaceHeight } from '../src/game/mars-terrain';

const matrixRow = (matrix: THREE.Matrix4, row: number) =>
  new THREE.Vector3(matrix.elements[row], matrix.elements[row + 4], matrix.elements[row + 8]);

function visibility(atlas: StaticSunlight, point: THREE.Vector3, normal = new THREE.Vector3(0, 1, 0)) {
  const p = point.clone().applyMatrix4(atlas.projection), image = atlas.texture.image;
  if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return 1;
  const data = image.data;
  // Same bilinearly weighted depth comparisons as the fragment shader.
  const depthScale = matrixRow(atlas.projection, 2).length();
  const depthNormal = normal.dot(matrixRow(atlas.projection, 2).normalize());
  const gradient = [0, 1].map(row => {
    const axis = matrixRow(atlas.projection, row), scale = axis.length();
    return Math.abs(depthNormal) > 1e-10 ? -normal.dot(axis.normalize()) / depthNormal * depthScale / scale : 0;
  });
  let result = 0;
  const u = p.x * image.width - 0.5, v = p.y * image.height - 0.5;
  for (const dx of [0, 1]) for (const dy of [0, 1]) {
    const x = Math.max(0, Math.min(image.width - 1, Math.floor(u) + dx));
    const y = Math.max(0, Math.min(image.height - 1, Math.floor(v) + dy));
    const offset = (y * image.width + x) * 4;
    const roof = (data[offset] * 256 + data[offset + 1]) / 65535;
    const weight = (dx ? u - Math.floor(u) : 1 - (u - Math.floor(u)))
      * (dy ? v - Math.floor(v) : 1 - (v - Math.floor(v)));
    const receiver = p.z + gradient[0] * ((x + 0.5) / image.width - p.x)
      + gradient[1] * ((y + 0.5) / image.height - p.y);
    result += !data[offset + 2] || receiver >= roof - 0.3 * depthScale ? weight : 0;
  }
  return result;
}

for (const area of ['moon', 'mars'] as const) test(`${area} fixed sunlight follows actual roof triangles, not rover position or skylight labels`, () => {
  const roofs = area === 'moon' ? [moonHollowGeometry()] : LAVA_TUBES.map(tube => lavaTubeGeometry(tube));
  const offset = area === 'moon' ? MOON_SUN_OFFSET : MARS_SUN_OFFSET;
  const sunlight = new THREE.Vector3(...offset).normalize();
  const atlas = new StaticSunlight(roofs, sunlight, area === 'moon' ? 0.2 : 0.3);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const meshes = roofs.map(g => new THREE.Mesh(g, material));
  const heightAt = area === 'moon' ? moonSurfaceHeight : marsSurfaceHeight;
  let blocked = 0, clear = 0, matched = 0;
  try {
    assert.ok(atlas.texture.image.data.byteLength < 2 * 1024 * 1024, 'bounded single 8-bit atlas per world');
    const bounds = area === 'moon' ? [-277, -213, 154, 246, 4] : [-517, -397, -586, -334, 8];
    const u = matrixRow(atlas.projection, 0).normalize();
    const v = matrixRow(atlas.projection, 1).normalize();
    for (let z = bounds[2]; z <= bounds[3]; z += bounds[4]) for (let x = bounds[0]; x <= bounds[1]; x += bounds[4]) {
      const p = new THREE.Vector3(x, heightAt(x, z) + 0.05, z);
      const hit = new THREE.Raycaster(p, sunlight).intersectObjects(meshes).length > 0;
      const stable = [-0.8, 0.8].every(du => [-0.8, 0.8].every(dv =>
        (new THREE.Raycaster(p.clone().addScaledVector(u, du).addScaledVector(v, dv), sunlight)
          .intersectObjects(meshes).length > 0) === hit));
      if (!stable) continue;
      const actual = visibility(atlas, p);
      assert.ok(Math.abs(actual - (hit ? 0 : 1)) < 1e-6, `${area}: sunlight mismatch at ${x},${z}`);
      matched++; if (hit) blocked++; else clear++;
    }
    assert.ok(blocked > 30 && clear > 30 && matched > 150, `both permanent shade and genuine sunlight: ${blocked}/${clear}`);
    assert.equal(visibility(atlas, new THREE.Vector3(1000, 0, 1000)), 1);
    let litRoof = 0;
    for (const roof of roofs) {
      const vertices = roof.getAttribute('position');
      for (let i = 0; i < vertices.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(vertices, i);
        const b = new THREE.Vector3().fromBufferAttribute(vertices, i + 1);
        const c = new THREE.Vector3().fromBufferAttribute(vertices, i + 2);
        const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
        if (normal.dot(sunlight) < 0.15) continue;
        const p = a.add(b).add(c).multiplyScalar(1 / 3).addScaledVector(normal, 0.04);
        if (new THREE.Raycaster(p, sunlight).intersectObjects(meshes).length) continue;
        assert.ok(visibility(atlas, p, normal) > 0.5, 'sun-facing roof surfaces must not acquire a false self-shadow');
        litRoof++;
      }
    }
    assert.ok(litRoof > 200);
    console.log(`${area} static sunlight: ${atlas.texture.image.width}×${atlas.texture.image.height}, ${blocked} shaded / ${clear} open samples`);
  } finally {
    atlas.dispose(); for (const roof of roofs) roof.dispose(); material.dispose();
  }
});

test('filtered sunlight stays continuous across steep sunlit faces without weakening floor shade', () => {
  const roof = new THREE.BoxGeometry(24, 10, 20).translate(0, 6, 0);
  const atlas = new StaticSunlight([roof], new THREE.Vector3(...MOON_SUN_OFFSET), 0.2);
  try {
    const normal = new THREE.Vector3(0, 0, 1);
    for (let x = -10; x <= 10; x += 0.31) for (let y = 2; y <= 10; y += 0.27)
      assert.ok(visibility(atlas, new THREE.Vector3(x, y, 10.01), normal) > 0.999,
        `steep sun-facing wall must stay lit between texel centres at ${x},${y}`);
    assert.equal(visibility(atlas, new THREE.Vector3(0, 0, 0)), 0);
  } finally { atlas.dispose(); roof.dispose(); }
});

test('static sunlight composes direct shadow masks, preserves ambient, follows transformed meshes and cleans up swaps', () => {
  const roof = new THREE.BoxGeometry(12, 2, 12).translate(0, 10, 0);
  const atlas = new StaticSunlight([roof], new THREE.Vector3(0, 1, 0));
  const material = new THREE.MeshStandardMaterial(), original = material.onBeforeCompile;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
  let disposed = 0; atlas.texture.addEventListener('dispose', () => disposed++);
  try {
    assert.equal(visibility(atlas, new THREE.Vector3(0, 0, 0)), 0);
    assert.equal(visibility(atlas, new THREE.Vector3(0, 13, 0)), 1, 'the roof top is not a dark painted volume');
    atlas.applyTo(mesh); const patched = material.onBeforeCompile;
    atlas.applyTo(mesh); assert.equal(material.onBeforeCompile, patched, 'shared materials patch once');
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    assert.ok(shader.vertexShader.includes('modelMatrix * staticSunPosition'), 'moving wheels and body sample their actual world position');
    assert.ok(shader.vertexShader.includes('instanceMatrix * staticSunPosition'));
    assert.ok(shader.fragmentShader.includes('tubeVisibility = min( tubeVisibility,'), 'combine coverage without multiplying the same roof shadow twice');
    assert.ok(shader.fragmentShader.includes('directLight.color *= tubeVisibility'));
    assert.ok(shader.fragmentShader.includes('getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal )'), 'ambient fill is unchanged');
    assert.ok(shader.fragmentShader.includes('float tubeVisibility = staticSunVisibility();'), 'permanent shade also runs without USE_SHADOWMAP');
    assert.ok(shader.fragmentShader.includes('dFdx(p)') && shader.fragmentShader.includes('dot(gradient, uv - receiver.xy)'),
      'filtered taps compare depths on the actual receiver plane');
    material.dispose(); assert.equal(material.onBeforeCompile, original);
    atlas.applyTo(mesh);
    atlas.dispose(); atlas.dispose();
    assert.equal(material.onBeforeCompile, original); assert.equal(disposed, 1);
    assert.throws(() => atlas.applyTo(mesh), /disposed/);
  } finally { atlas.dispose(); roof.dispose(); mesh.geometry.dispose(); material.dispose(); }
});
