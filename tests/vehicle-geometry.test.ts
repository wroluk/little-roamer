import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicle } from '../src/game/vehicle';
import { disposeScene } from '../src/game/dispose';
import { MOON_HANDLING } from '../src/game/moon';

test('Modern bonnet and sloping cabin expose their exterior faces on both sides', async () => {
  await RAPIER.init();
  const scene = new THREE.Scene();
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  try {
    const vehicle = new Vehicle(scene, world, { x: 0, y: 0, z: 0 });
    scene.updateMatrixWorld(true);
    const hit = (origin: number[], direction: number[]) => {
      const hits = new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction))
        .intersectObject(vehicle.bodyVisual, true);
      assert.ok(hits.length, 'Exterior must be visible using ordinary front-face culling');
      return hits[0];
    };
    for (const x of [-0.4, 0, 0.4]) {
      const bonnet = hit([x, 2, -0.9], [0, -1, 0]);
      assert.ok(bonnet.point.y > 0.60 && bonnet.point.y < 0.65, 'Hit crowned bonnet, not chassis below');
      assert.ok(bonnet.face!.normal.y > 0.9);
    }
    for (const side of [-1, 1]) {
      const beltline = hit([side * 2, 0.44, 0.4], [-side, 0, 0]);
      assert.ok(Math.abs(beltline.point.x) > 0.8, 'Cabin and chassis must meet without a gap');
      const window = hit([side * 2, 0.9, 0], [-side, 0, 0]);
      assert.ok(Math.abs(window.point.x) > 0.68 && Math.abs(window.point.x) < 0.70);
      assert.ok(window.face!.normal.x * side > 0.9, 'Side glass must face outward');
      const material = (window.object as THREE.Mesh).material as THREE.MeshStandardMaterial;
      assert.equal(material.color.getHexString(), '315e66');
    }
    const windshield = hit([0, 0.9, -3], [0, 0, 1]);
    assert.ok(windshield.point.z < -0.3 && windshield.point.z > -0.33);
    assert.ok(windshield.face!.normal.z < -0.8);
  } finally {
    disposeScene(scene);
    world.free();
  }
});

test('Lunar Rover has distinct batched details within the Scout envelope and switching disposes old visuals', async () => {
  await RAPIER.init();
  const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: -3, z: 0 });
  try {
    const car = new Vehicle(scene, world, { x: 0, y: 0, z: 0 }, 1, undefined, undefined, undefined, 'mars-scout');
    const scoutBounds = new THREE.Box3().setFromObject(car.model);
    const triangles = () => {
      let count = 0;
      car.model.traverse(object => {
        if (object instanceof THREE.Mesh) count += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
      });
      return count;
    };
    const scoutTriangles = triangles(), bodyHandle = car.body.handle;
    for (const model of ['lunar-rover', 'mars-scout', 'lunar-rover'] as const) {
      const oldResources = new Set<THREE.BufferGeometry | THREE.Material>();
      car.model.traverse(object => {
        if (object instanceof THREE.Mesh) {
          oldResources.add(object.geometry);
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) oldResources.add(material);
        }
      });
      const disposed = new Map([...oldResources].map(resource => [resource, 0]));
      for (const resource of oldResources)
        resource.addEventListener('dispose', () => disposed.set(resource, disposed.get(resource)! + 1));
      car.setModel(model);
      assert.ok([...disposed.values()].every(count => count === 1), 'release each old shared material/geometry once');
      assert.equal(car.body.handle, bodyHandle, 'changing trim must not rebuild physics');
      assert.equal(car.body.numColliders(), 2);
      assert.equal(car.controller.numWheels(), 4);
      assert.equal(car.wheels.length, 4); assert.equal(car.tires.length, 4);
      const bounds = new THREE.Box3().setFromObject(car.model);
      for (const axis of ['x', 'y', 'z'] as const) {
        assert.ok(bounds.min[axis] >= scoutBounds.min[axis] - 0.000001);
        assert.ok(bounds.max[axis] <= scoutBounds.max[axis] + 0.000001);
      }
      if (model === 'mars-scout') assert.equal(triangles(), scoutTriangles);
      else assert.ok(triangles() < scoutTriangles + 200, 'keep the redesign within the existing small model budget');
      const colors = new Set<string>();
      car.bodyVisual.traverse(object => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial)
          colors.add(object.material.color.getHexString());
      });
      assert.ok(colors.has(model === 'lunar-rover' ? 'b4a36c' : 'cc7739'));
      assert.equal(colors.has(model === 'lunar-rover' ? 'cc7739' : 'b4a36c'), false);
      if (model === 'lunar-rover') {
        car.model.updateMatrixWorld(true);
        const glazing: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[] = [];
        car.bodyVisual.traverse(object => {
          if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial
            && object.material.color.getHexString() === '294657') glazing.push(object);
        });
        assert.equal(glazing.length, 1, 'all cabin panes share one light-independent tint and batch');
        const glass = glazing[0].material;
        const vertices = glazing[0].geometry.getAttribute('position');
        const edge = (x: number, y: number, rear = false) => {
          const zs: number[] = [];
          for (let i = 0; i < vertices.count; i++) {
            if (Math.abs(vertices.getX(i) - x) < 0.000001 && Math.abs(vertices.getY(i) - y) < 0.000001)
              zs.push(vertices.getZ(i));
          }
          assert.ok(zs.length, 'corner and side glazing share their sill and header heights');
          return rear ? Math.max(...zs) : Math.min(...zs);
        };
        for (const x of [-0.6, 0, 0.6]) {
          const windshield = new THREE.Raycaster(new THREE.Vector3(x, 0.8, -3), new THREE.Vector3(0, 0, 1))
            .intersectObject(car.bodyVisual, true)[0];
          assert.equal((windshield.object as THREE.Mesh).material, glass,
            'all three panes stay outside the actual cabin facets with exactly the same finish');
          const normal = windshield.face!.normal;
          if (x === 0) {
            assert.ok(Math.abs(normal.x) < 0.001, 'wide centre pane faces forward without a central mullion');
            assert.ok(Math.abs(normal.y / normal.z) < 0.25, 'windshield leans less than 14 degrees from upright');
          } else assert.ok(Math.abs(normal.x / normal.z) > 0.8, 'corner panes wrap onto angled solid faces');
        }
        for (const side of [-1, 1]) {
          const bottom = edge(side * 0.707, 0.66), top = edge(side * 0.707, 1.035);
          const bottomGap = bottom - edge(side * 0.68, 0.66);
          const topGap = top - edge(side * 0.68, 1.035);
          assert.ok(bottomGap > 0.05 && bottomGap < 0.085, 'retain a narrow solid corner pillar');
          assert.ok(Math.abs(topGap - bottomGap) < 0.000001, 'pillar edges are parallel and evenly spaced');
          const rearBottom = edge(side * 0.707, 0.66, true), rearTop = edge(side * 0.707, 1.035, true);
          for (const y of [0.69, 0.83, 1]) {
            const t = (y - 0.66) / (1.035 - 0.66);
            const front = THREE.MathUtils.lerp(bottom, top, t), rear = THREE.MathUtils.lerp(rearBottom, rearTop, t);
            for (const [z, isGlass] of [[front - 0.02, false], [front + 0.02, true],
              [rear - 0.02, true], [rear + 0.02, false], [-0.4, true]] as const) {
              const hit = new THREE.Raycaster(new THREE.Vector3(side * 2, y, z), new THREE.Vector3(-side, 0, 0))
                .intersectObject(car.bodyVisual, true)[0];
              assert.ok(hit, 'side pane and its frame stay on the visible solid cabin');
              assert.equal((hit.object as THREE.Mesh).material === glass, isGlass,
                'actual exterior glass edges agree with the fitted outline on both sides');
            }
          }
          for (const z of [-1.02, 1]) {
            const wheel = new THREE.Raycaster(new THREE.Vector3(side * 0.89, 2, z), new THREE.Vector3(0, -1, 0))
              .intersectObject(car.model, true)[0];
            assert.ok(car.tires.some(tire => tire.children.includes(wheel.object)),
              'the exposed tire, not a guard or guard stay, is the first visible surface');
          }
          for (const dx of [-0.105, 0.105]) for (const dy of [-0.032, 0.032]) {
            const headlight = new THREE.Raycaster(new THREE.Vector3(side * 0.44 + dx, 0.39 + dy, -3), new THREE.Vector3(0, 0, 1))
              .intersectObject(car.bodyVisual, true)[0];
            assert.equal(((headlight.object as THREE.Mesh).material as THREE.MeshStandardMaterial).color.getHexString(),
              'edf5e4', 'rectangular lamps remain visible at all four corners');
          }
        }
        const nose = new THREE.Raycaster(new THREE.Vector3(0, 0.46, -3), new THREE.Vector3(0, 0, 1))
          .intersectObject(car.bodyVisual, true)[0];
        assert.ok(nose.point.z > -1.37, 'no projecting Scout bull bar across the front');
        const top = (z: number) => new THREE.Raycaster(new THREE.Vector3(0, 3, z), new THREE.Vector3(0, -1, 0))
          .intersectObject(car.bodyVisual, true)[0].point.y;
        assert.ok(top(-0.3) > top(0.85) + 0.13, 'short cabin steps down to a separate equipment deck');
        const rim = car.tires[0].children.find((object): object is THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> =>
          object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial
          && object.material.color.getHexString() === '8a9498')!;
        const isolated = new THREE.Mesh(rim.geometry, rim.material);
        isolated.updateMatrixWorld(true);
        for (let i = 0; i < 6; i++) {
          const angle = i * Math.PI / 3;
          const hits = (radius: number) => new THREE.Raycaster(
            new THREE.Vector3(0.8, Math.sin(angle) * radius, Math.cos(angle) * radius), new THREE.Vector3(-1, 0, 0))
            .intersectObject(isolated);
          assert.equal(hits(0.18).length, 0, 'six real openings through both dish faces');
          assert.ok(hits(0.26).length > 0, 'solid silver rim surrounds the openings');
        }
      }
    }
  } finally { disposeScene(scene); world.free(); }
});

test('both exploration rovers have identical wheel contacts and driving under Earth and Moon gravity', async () => {
  await RAPIER.init();
  for (const gravity of [-18, -3]) {
    const simulations = (['mars-scout', 'lunar-rover'] as const).map(model => {
      const scene = new THREE.Scene(), world = new RAPIER.World({ x: 0, y: gravity, z: 0 });
      world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.5, 100).setTranslation(0, -0.5, 0));
      const car = new Vehicle(scene, world, { x: 0, y: 1.2, z: 0 }, 1, undefined, undefined, undefined,
        model, gravity === -3 ? MOON_HANDLING : undefined);
      return { scene, world, car };
    });
    try {
      for (let frame = 0; frame < 420; frame++) {
        for (const { world, car } of simulations) {
          car.beforeStep({ steer: frame > 180 && frame < 240 ? 0.3 : 0, forward: frame >= 90 && frame < 300, reverse: false }, 1 / 60);
          world.step(); car.capture(); car.syncVisuals(1);
        }
        const [a, b] = simulations.map(s => s.car);
        assert.ok(a.position.distanceTo(b.position) < 0.000001);
        assert.deepEqual(a.body.linvel(), b.body.linvel());
        assert.deepEqual(a.body.rotation(), b.body.rotation());
        assert.deepEqual(a.terrainWheels.map(w => w.grounded), b.terrainWheels.map(w => w.grounded));
      }
      assert.ok(simulations[0].car.position.length() > 2, 'actually drive rather than only compare parked models');
    } finally { for (const { scene, world } of simulations) { disposeScene(scene); world.free(); } }
  }
});
