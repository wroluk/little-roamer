import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GLASSFALL_START, GLASSFALL_SCAR, glassfallRibbonMargin } from '../src/game/mars-glassfall-layout';
import { marsGlassMargin, marsSurfaceAt, marsSurfaceHeight, nearestMarsStart } from '../src/game/mars-terrain';
import { addGlassfallDecor, glassfallSkinGeometry, glassfallRelief } from '../src/game/mars-glassfall-landmarks';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';

before(async () => { await RAPIER.init(); });
test('all three flows connect continuously to the impact source pool', () => {
  for (const [x, z, bend] of [[177, 35, -6], [207, 82, 5], [263, 86, -5]]) {
    const dx = x - GLASSFALL_SCAR.x, dz = z - GLASSFALL_SCAR.z, length = Math.hypot(dx, dz);
    for (let step = 0; step <= 40; step++) {
      const t = step / 200, offset = Math.sin(t * Math.PI) * bend;
      const px = GLASSFALL_SCAR.x + t * dx + offset * dz / length;
      const pz = GLASSFALL_SCAR.z + t * dz - offset * dx / length;
      assert.ok(glassfallRibbonMargin(px, pz) > 0, 'no pale gap between source and flow');
      assert.equal(marsSurfaceAt(px, pz), 'mars-glass');
    }
  }
});
test('Glassfall glass contours form raised beveled slabs matching wheel boundaries', () => {
  let triangles = 0;
  let contourVertices = 0;
  let raisedVertices = 0;
  for (let cz = -1; cz <= 1; cz++) for (let cx = 1; cx <= 3; cx++) {
    const geometry = glassfallSkinGeometry(cx, cz); if (!geometry) continue;
    const p = geometry.getAttribute('position');
    for (let i = 0; i < p.count; i += 3) {
      const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
      assert.ok(marsGlassMargin(x, z) > -0.04, `contour approximation within 4 cm: ${x}, ${z}, ${marsGlassMargin(x, z)}`);
      if (marsGlassMargin(x, z) > 0) assert.equal(marsSurfaceAt(x, z), 'mars-glass');
      assert.ok(Math.abs((p.getX(i + 1) - p.getX(i)) * (p.getZ(i + 2) - p.getZ(i))
        - (p.getZ(i + 1) - p.getZ(i)) * (p.getX(i + 2) - p.getX(i))) > 1e-10);
      for (let j = 0; j < 3; j++) {
        const px = p.getX(i + j), pz = p.getZ(i + j);
        const relief = glassfallRelief(px, pz);
        assert.ok(Math.abs(p.getY(i + j) - marsSurfaceHeight(px, pz) - relief) < 0.0001);
        assert.ok(relief >= 0 && relief <= 0.45);
        if (relief > 0.3) raisedVertices++;
        if (Math.abs(px / 0.3 - Math.round(px / 0.3)) > 0.001
          || Math.abs(pz / 0.3 - Math.round(pz / 0.3)) > 0.001) contourVertices++;
      }
      triangles++;
    }
    geometry.dispose();
  }
  assert.ok(triangles > 600, `substantial melt ribbons: ${triangles} triangles`);
  assert.ok(contourVertices > 100, 'shoreline is clipped rather than snapped to grid triangles');
  assert.ok(raisedVertices > 100, 'glass has physical thickness, not just a surface tint');
  assert.equal(nearestMarsStart(GLASSFALL_SCAR.x, GLASSFALL_SCAR.z).id, 'glassfall-plain');
  assert.equal(marsSurfaceAt(GLASSFALL_START.x, GLASSFALL_START.z), 'regolith');
});

test('glass slabs supply matching collision without casting edge artifacts onto the ground', () => {
  let skins = 0;
  addGlassfallDecor(2, 0, (geometry, material, solid) => {
    if (geometry.hasAttribute('color')) {
      skins++;
      assert.equal(solid, true);
      assert.equal(material.userData.castShadow, false);
      assert.equal(material.polygonOffset, true);
      const colors = geometry.getAttribute('color');
      for (let i = 0; i < colors.count; i++) {
        assert.ok(Math.abs(colors.getX(i) - 0.008) < 1e-8);
        assert.equal(colors.getY(i), colors.getX(i));
        assert.equal(colors.getZ(i), colors.getX(i));
      }
    }
    geometry.dispose(); material.dispose();
  });
  assert.equal(skins, 1);
});

test('impact glass permits more lateral sliding than firm regolith with the actual Scout', () => {
  const slide = (surface: 'mars-glass' | 'regolith') => {
    const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.1, 100).setTranslation(0, -0.1, 0));
    const car = new Vehicle(scene, world, { x: 0, y: 1.2, z: 0 }, 1.45, () => surface, () => null, undefined, 'mars-scout');
    const tick = () => { car.beforeStep({ steer: 0, forward: false, reverse: false }, 1 / 60); world.step(); car.capture(); };
    try {
      for (let i = 0; i < 120; i++) tick();
      const initial = car.position.x; car.body.setLinvel({ x: 7, y: 0, z: 0 }, true);
      for (let i = 0; i < 120; i++) tick();
      return Math.abs(car.position.x - initial);
    } finally { world.free(); disposeScene(scene); }
  };
  const firm = slide('regolith'), glass = slide('mars-glass');
  assert.ok(glass > firm * 1.5, `glass=${glass}, firm=${firm}`);
});
