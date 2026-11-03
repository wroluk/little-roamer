import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { createStaticGroundTracks, GroundEffects, TRACK_CAPACITY } from '../src/game/ground-effects';
import { TerrainEffects, type ParticleColors } from '../src/game/terrain-effects';
import { SURFACES, type SurfaceId } from '../src/game/surfaces';
import { WHEEL_RADIUS, type Vehicle } from '../src/game/vehicle';
import { AREAS } from '../src/game/areas';
import { MOON_GRAVITY } from '../src/game/moon';
import { marsColor, marsPaleGroundWeight, marsSurfaceAt, marsSurfaceHeight } from '../src/game/mars-terrain';

function vehicle() {
  const contacts = Array.from({ length: 4 }, () => new THREE.Group());
  return { speed: 3, rotation: new THREE.Quaternion(), forward: new THREE.Vector3(0,0,-1),
    body: {linvel:()=>({x:0,y:0,z:0})},
    controller: { wheelContactNormal: () => ({ x: 0, y: 1, z: 0 }) },
    wheels: contacts.map(contact => {
      const wheel = new THREE.Group(); wheel.position.y = WHEEL_RADIUS; contact.add(wheel); return wheel;
    }),
    terrainWheels: contacts.map(contact => ({position:contact.position, grounded:true, surface:SURFACES.dirt, slip:0, slipSpeed:0, intensity:0.5})) } as unknown as Vehicle;
}

function sampleSpray(surface: SurfaceId, slip: number, slipSpeed: number,
  { grounded = true, reduced = false, palette }: { grounded?: boolean; reduced?: boolean; palette?: ParticleColors } = {}) {
  const scene = new THREE.Scene(), effects = new TerrainEffects(scene, () => null, () => 0, palette), car = vehicle();
  effects.setReduced(reduced);
  car.terrainWheels.forEach((wheel, i) => {
    wheel.surface = SURFACES[surface]; wheel.position.set(i * 5, 0, 0);
    wheel.grounded = grounded; wheel.intensity = i === 2 ? 1 : 0;
    wheel.slip = i === 2 ? slip : 0; wheel.slipSpeed = i === 2 ? slipSpeed : 0;
  });
  try {
    for (let i = 0; i < 15; i++) effects.update(1 / 60, car);
    const mesh = scene.getObjectByName('terrain-particles') as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), color = new THREE.Color();
    let largest = 0, furthestBack = -Infinity, furthestForward = Infinity;
    for (let i = 0; i < effects.count; i++) {
      mesh.getMatrixAt(i, matrix);
      position.setFromMatrixPosition(matrix); scale.setFromMatrixScale(matrix);
      assert.ok(Math.abs(position.x - 10) < 0.6, 'only the active contact should throw material');
      largest = Math.max(largest, scale.x, scale.y, scale.z);
      furthestBack = Math.max(furthestBack, position.z);
      furthestForward = Math.min(furthestForward, position.z);
    }
    if (effects.count) mesh.getColorAt(0, color);
    return { count: effects.count, largest, furthestBack, furthestForward, color };
  } finally { effects.dispose(); assert.equal(scene.children.length, 0); }
}

test('area particle palette colours emitted rock fragments without changing other areas', () => {
  for (const override of [undefined, { rock: '#b76b49' }]) {
    const scene = new THREE.Scene(), effects = new TerrainEffects(scene, () => null, () => 0, override), car = vehicle();
    car.terrainWheels.forEach(wheel => { wheel.surface = SURFACES.rock; });
    for (let i = 0; i < 5; i++) effects.update(0.1, car);
    assert.ok(effects.count > 0);
    const mesh = scene.children.find(object => object instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
    const color = new THREE.Color(); mesh.getColorAt(0, color);
    assert.equal(color.getHexString(), override ? 'b76b49' : '7b8582');
    effects.dispose();
  }
});

test('only the slipping grounded wheel emits stationary debris and airborne wheels cannot accrue emission debt', () => {
  const scene = new THREE.Scene(), effects = new TerrainEffects(scene, () => null), car = vehicle();
  car.terrainWheels.forEach((wheel, i) => {
    wheel.position.set(i * 5, 0, 0);
    wheel.intensity = i === 2 ? 1 : 0;
    wheel.slip = i === 2 ? 0.8 : 0;
    wheel.slipSpeed = i === 2 ? 5 : 0;
  });
  try {
    for (let i = 0; i < 10; i++) effects.update(1 / 60, car);
    assert.ok(effects.count > 0);
    const mesh = scene.getObjectByName('terrain-particles') as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
    for (let i = 0; i < effects.count; i++) {
      mesh.getMatrixAt(i, matrix); position.setFromMatrixPosition(matrix);
      assert.ok(Math.abs(position.x - 10) < 0.5);
      assert.ok(position.z > 0, 'forward wheelspin should throw debris backwards');
    }
    effects.clear();
    car.terrainWheels.forEach(wheel => { wheel.grounded = false; wheel.intensity = 1; });
    for (let i = 0; i < 60; i++) effects.update(1 / 60, car);
    assert.equal(effects.count, 0);
    car.terrainWheels.forEach(wheel => { wheel.grounded = true; wheel.intensity = 0; });
    effects.update(1 / 60, car);
    assert.equal(effects.count, 0);
  } finally { effects.dispose(); }
});

test('Mars emits dark basalt in the tubes and retains rusty rock particles elsewhere', () => {
  for (const [x, z, expected] of [[-430, -400, '514640'], [398, -472, 'b76b49']] as const) {
    const scene = new THREE.Scene(), effects = new TerrainEffects(scene, () => null, () => 0, AREAS.mars.particleColors);
    const car = vehicle();
    car.terrainWheels.forEach(wheel => { wheel.surface = SURFACES.rock; wheel.position.set(x, 0, z); });
    for (let i = 0; i < 5; i++) effects.update(0.1, car);
    assert.ok(effects.count > 0);
    const mesh = scene.children.find(object => object instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
    const color = new THREE.Color(); mesh.getColorAt(0, color);
    assert.equal(color.getHexString(), expected);
    effects.dispose();
  }
});

test('pale Mars dust uses contact-local terrain colour while Rust Dunes and other materials retain their palettes', () => {
  const palette = AREAS.mars.particleColors!, tint = palette['mars-dust'];
  assert.equal(typeof tint, 'function');
  if (typeof tint !== 'function') throw new Error('Mars dust needs a contact-local palette.');
  for (const [x, z] of [[545, -150], [560, -100]]) {
    assert.equal(marsSurfaceAt(x, z), 'mars-dust');
    assert.ok(marsPaleGroundWeight(x, z) >= 0.3);
    const terrain = new THREE.Color().fromArray(marsColor(x, z, marsSurfaceHeight(x, z)));
    assert.equal(tint(x, z), `#${terrain.getHexString()}`);
    const scene = new THREE.Scene(), car = vehicle();
    const effects = new TerrainEffects(scene, () => null, () => 0, palette);
    car.terrainWheels.forEach((wheel, i) => {
      wheel.surface = SURFACES['mars-dust']; wheel.position.set(x, 0, z);
      wheel.intensity = i === 2 ? 1 : 0; wheel.slip = 0.9; wheel.slipSpeed = 5;
    });
    try {
      for (let i = 0; i < 15; i++) effects.update(1 / 60, car);
      assert.ok(effects.count > 0);
      const mesh = scene.getObjectByName('terrain-particles') as THREE.InstancedMesh;
      const color = new THREE.Color(), base = new THREE.Color(tint(x, z));
      for (let i = 0; i < effects.count; i++) {
        mesh.getColorAt(i, color);
        const shade = color.r / base.r;
        assert.ok(shade >= 0.65 && shade <= 0.95);
        assert.ok(Math.abs(color.g / base.g - shade) < 1e-6);
        assert.ok(Math.abs(color.b / base.b - shade) < 1e-6);
      }
    } finally { effects.dispose(); }
  }
  assert.equal(tint(-570, 12), SURFACES['mars-dust'].particleColor);
  assert.equal(tint(0, 44), SURFACES['mars-dust'].particleColor);
  const rust = new THREE.Color(SURFACES['mars-dust'].particleColor);
  const local = new THREE.Color().fromArray(marsColor(525, -300, marsSurfaceHeight(525, -300)));
  const transition = THREE.MathUtils.smoothstep(marsPaleGroundWeight(525, -300), 0.05, 0.3);
  assert.ok(transition > 0 && transition < 1);
  assert.equal(tint(525, -300), `#${rust.lerp(local, transition).getHexString()}`);
  assert.deepEqual(Object.keys(palette).sort(), ['mars-dust', 'rock']);
  assert.equal(AREAS.moon.particleColors, undefined);
});

test('sand wheelspin makes a denser larger contact-local fan, not a cloud from chassis speed', () => {
  const sample = (slip: number, slipSpeed: number, grounded = true) => sampleSpray('sand', slip, slipSpeed, { grounded });
  const rolling = sample(0, 0), spinning = sample(0.9, 5), braking = sample(0.9, -5);
  assert.ok(spinning.count >= rolling.count * 3, `${spinning.count} spin particles vs ${rolling.count} rolling`);
  assert.ok(spinning.largest > rolling.largest * 2);
  assert.ok(spinning.furthestBack > rolling.furthestBack + 0.5);
  assert.ok(braking.furthestForward < -0.5, 'negative rim slip should throw sand forwards');
  assert.equal(sample(0.9, 5, false).count, 0);
  assert.equal(sample(0.9, 0).count, rolling.count, 'a ratio alone must not trigger the amplified spray');
});

for (const surface of ['ash', 'mars-dust', 'dirt', 'regolith', 'lunar-regolith'] as const) {
  test(`${surface}: contact-local wheelspin spray follows actual slip, direction and reduced effects`, () => {
    const rolling = sampleSpray(surface, 0, 0), spinning = sampleSpray(surface, 0.9, 5);
    const reverse = sampleSpray(surface, 0.9, -5), reduced = sampleSpray(surface, 0.9, 5, { reduced: true });
    assert.ok(spinning.count >= rolling.count * 2, `${surface}: ${spinning.count} spin particles vs ${rolling.count} rolling`);
    assert.ok(spinning.largest > rolling.largest * 1.25);
    assert.ok(spinning.furthestBack > rolling.furthestBack + 0.2);
    assert.ok(reverse.furthestForward < -0.3);
    assert.equal(sampleSpray(surface, 0.9, 5, { grounded: false }).count, 0);
    assert.deepEqual(sampleSpray(surface, 0.9, 0), rolling, 'slip ratio alone must not amplify debris');
    assert.equal(sampleSpray(surface, 0, 5).count, rolling.count, 'rim speed alone must not amplify debris');
    assert.ok(reduced.count > rolling.count && reduced.count < spinning.count);
    const base = new THREE.Color(SURFACES[surface].particleColor);
    for (const component of ['r', 'g', 'b'] as const) {
      const shade = spinning.color[component] / base[component];
      assert.ok(shade >= 0.65 && shade <= 0.95, `${surface}: preserve material hue`);
    }
  });
}

test('packed dirt/regolith throw less material than loose dust, preserving excluded surfaces and palettes', () => {
  const dust = sampleSpray('mars-dust', 0.9, 5);
  for (const surface of ['dirt', 'regolith'] as const) {
    const packed = sampleSpray(surface, 0.9, 5);
    assert.ok(packed.count < dust.count && packed.largest < dust.largest);
  }
  for (const surface of Object.keys(SURFACES) as SurfaceId[]) {
    if (['sand', 'ash', 'mars-dust', 'dirt', 'regolith', 'lunar-regolith'].includes(surface)) continue;
    const rolling = sampleSpray(surface, 0, 0), spinning = sampleSpray(surface, 0.9, 5);
    assert.equal(spinning.count, rolling.count, `${surface}: no new amplified spray`);
    assert.equal(spinning.largest, rolling.largest);
  }
  const base = new THREE.Color('#638baa');
  for (const palette of [{ 'mars-dust': '#638baa' }, { 'mars-dust': (x: number) => x === 10 ? '#638baa' : '#ffffff' }]) {
    const sample = sampleSpray('mars-dust', 0.9, 5, { palette });
    assert.ok(sample.count > 0);
    const shade = sample.color.r / base.r;
    assert.ok(shade >= 0.65 && shade <= 0.95);
    assert.ok(Math.abs(sample.color.g / base.g - shade) < 1e-6);
    assert.ok(Math.abs(sample.color.b / base.b - shade) < 1e-6);
  }
});

test('expanded wheelspin spray stays within its pool, expires after contact loss and clears in reduced mode', () => {
  for (const surface of ['ash', 'mars-dust', 'dirt', 'regolith', 'lunar-regolith'] as const) {
    const scene = new THREE.Scene(), effects = new TerrainEffects(scene, () => null), car = vehicle();
    car.terrainWheels.forEach(wheel => {
      wheel.surface = SURFACES[surface]; wheel.intensity = 1; wheel.slip = 0.9; wheel.slipSpeed = 5;
    });
    try {
      for (let i = 0; i < 180; i++) {
        effects.update(1 / 60, car);
        assert.ok(effects.count <= effects.capacity && effects.capacity === 72);
      }
      assert.ok(effects.count > 0);
      effects.setReduced(true); assert.equal(effects.count, 0);
      for (let i = 0; i < 60; i++) effects.update(1 / 60, car);
      assert.ok(effects.count > 0 && effects.count <= 72);
      car.terrainWheels.forEach(wheel => { wheel.grounded = false; });
      for (let i = 0; i < 90; i++) effects.update(1 / 60, car);
      assert.equal(effects.count, 0);
      car.terrainWheels.forEach(wheel => { wheel.grounded = true; wheel.intensity = 0; });
      effects.update(1 / 60, car); assert.equal(effects.count, 0, 'airborne wheels must not accumulate emission debt');
    } finally { effects.dispose(); assert.equal(scene.children.length, 0); }
  }
});

test('whole grains clear steered tyres on slopes in both slip directions, including ordinary rolling', () => {
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  const centre = new THREE.Vector3(), axis = new THREE.Vector3(), relative = new THREE.Vector3();
  for (const surface of ['sand', 'ash', 'mars-dust', 'dirt', 'regolith', 'lunar-regolith'] as const) {
    for (const slipSpeed of [-5, 0, 5]) {
      for (const [pitch, roll, steer] of [[0, 0, 0], [0.44, 0, 0.5], [0, -0.3, -0.4]]) {
        const scene = new THREE.Scene(), effects = new TerrainEffects(scene, () => null), car = vehicle();
        const slope = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, 0, roll));
        const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(slope);
        car.rotation.copy(slope); car.forward.applyQuaternion(slope);
        Object.assign(car.controller, { wheelContactNormal: () => normal });
        car.terrainWheels.forEach((wheel, i) => {
          wheel.position.set(i * 5, 0, 0); wheel.surface = SURFACES[surface];
          wheel.intensity = i === 0 ? 1 : 0; wheel.slip = slipSpeed ? 0.9 : 0; wheel.slipSpeed = slipSpeed;
          car.wheels[i].parent!.quaternion.copy(slope);
          car.wheels[i].rotation.y = i < 2 ? steer : 0;
        });
        let visible = 0;
        try {
          const mesh = scene.getObjectByName('terrain-particles') as THREE.InstancedMesh;
          for (let frame = 0; frame < 40; frame++) {
            effects.update(1 / 60, car);
            for (let i = 0; i < mesh.count; i++) {
              mesh.getMatrixAt(i, matrix);
              position.setFromMatrixPosition(matrix); scale.setFromMatrixScale(matrix);
              const radius = 0.09 * Math.max(scale.x, scale.y, scale.z);
              if (radius < 1e-6) continue;
              visible++;
              for (const wheel of car.wheels) {
                wheel.updateWorldMatrix(true, false);
                centre.setFromMatrixPosition(wheel.matrixWorld);
                axis.setFromMatrixColumn(wheel.matrixWorld, 0).normalize();
                relative.subVectors(position, centre);
                const axial = relative.dot(axis);
                const radialGap = Math.max(0, Math.sqrt(Math.max(0, relative.lengthSq() - axial * axial)) - WHEEL_RADIUS - 0.02);
                const axialGap = Math.max(0, Math.abs(axial) - 0.24);
                if (visible === 1 && wheel === car.wheels[0]) {
                  assert.ok(radius >= 0.009, 'newborn grains must be visible, not hidden to pass clearance');
                  assert.ok(Math.hypot(radialGap, axialGap) - radius < 0.008,
                    'the first rendered fragment must remain connected to the lower tread');
                }
                assert.ok(radialGap ** 2 + axialGap ** 2 >= radius ** 2 - 1e-8,
                  `${surface}, slip ${slipSpeed}, pose ${pitch}/${roll}/${steer}: whole fragment must clear rubber`);
              }
            }
          }
          assert.ok(visible > 0, `${surface}: clearance must not hide the effect`);
        } finally { effects.dispose(); }
      }
    }
  }
});

test('lunar grains follow reduced-gravity ballistic arcs without horizontal drag or a dust cloud', () => {
  const scene = new THREE.Scene(), effects = new TerrainEffects(scene, () => null), car = vehicle();
  car.terrainWheels.forEach((wheel, i) => {
    wheel.position.set(i * 5, 0, 0); wheel.surface = SURFACES['lunar-regolith'];
    wheel.intensity = i === 0 ? 1 : 0; wheel.slip = 0.9; wheel.slipSpeed = 5;
  });
  const mesh = scene.getObjectByName('terrain-particles') as THREE.InstancedMesh;
  const matrix = new THREE.Matrix4(), samples: THREE.Vector3[] = [];
  const dt = 1 / 60;
  try {
    for (let frame = 0; frame < 10 && !effects.count; frame++) effects.update(dt, car);
    assert.equal(effects.count, 1);
    car.terrainWheels[0].intensity = 0;
    for (let frame = 0; frame < 55; frame++) {
      mesh.getMatrixAt(0, matrix);
      samples.push(new THREE.Vector3().setFromMatrixPosition(matrix));
      assert.equal(effects.count, 1, 'a visible lunar grain outlives the short terrestrial fan');
      effects.update(dt, car);
    }
    for (let i = 2; i < samples.length; i++) {
      const a = samples[i - 2], b = samples[i - 1], c = samples[i];
      assert.ok(Math.abs((c.y - 2 * b.y + a.y) / (dt * dt) - MOON_GRAVITY) < 0.002);
      assert.ok(Math.abs(c.x - 2 * b.x + a.x) < 1e-6);
      assert.ok(Math.abs(c.z - 2 * b.z + a.z) < 1e-6);
    }
    assert.ok(samples[1].y > samples[0].y && samples.at(-1)!.y < samples.at(-2)!.y);
    assert.ok(Math.max(...samples.map(p => p.y)) > samples[0].y + 0.1);
    for (let i = 0; i < 90; i++) effects.update(dt, car);
    assert.equal(effects.count, 0);
    assert.ok(sampleSpray('lunar-regolith', 0.9, 5).largest < sampleSpray('sand', 0.9, 5).largest);
  } finally { effects.dispose(); assert.equal(scene.children.length, 0); }
});

test('old grains cannot cross another tyre between render updates', () => {
  for (const intercept of [false, true]) {
    const scene = new THREE.Scene(), effects = new TerrainEffects(scene, () => null), car = vehicle();
    car.terrainWheels.forEach((wheel, i) => {
      wheel.position.set(i * 5, 0, 0); wheel.surface = SURFACES.sand;
      wheel.intensity = i === 0 ? 1 : 0; wheel.slip = 0.9; wheel.slipSpeed = 5;
    });
    const mesh = scene.getObjectByName('terrain-particles') as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4();
    try {
      effects.update(0.02, car); assert.equal(effects.count, 1);
      mesh.getMatrixAt(0, matrix);
      const first = new THREE.Vector3().setFromMatrixPosition(matrix);
      car.terrainWheels[0].intensity = 0;
      effects.update(0.02, car); assert.equal(effects.count, 1);
      mesh.getMatrixAt(0, matrix);
      const current = new THREE.Vector3().setFromMatrixPosition(matrix);
      const velocity = current.clone().sub(first).divideScalar(0.02);
      const dt = 0.4;
      const next = current.clone().addScaledVector(velocity, dt);
      next.y -= 8 * dt * dt;
      const middle = current.clone().add(next).multiplyScalar(0.5);
      assert.ok(current.distanceTo(middle) > WHEEL_RADIUS + 0.32, 'both endpoints clear the intervening tyre');
      if (intercept) {
        car.terrainWheels[2].position.copy(middle);
        car.terrainWheels[2].position.y -= WHEEL_RADIUS;
      }
      effects.update(dt, car);
      assert.equal(effects.count, intercept ? 0 : 1, 'retire only the grain whose swept path meets rubber');
    } finally { effects.dispose(); }
  }
});

test('stationary sand churn marks require actual grounded slip and reuse a footprint instead of stacking it', () => {
  const scene = new THREE.Scene(), effects = new GroundEffects(scene, () => 0, () => null), car = vehicle();
  car.terrainWheels.forEach((wheel, i) => {
    wheel.surface = SURFACES.sand; wheel.position.set(i * 5, 0, 0);
    wheel.slip = i === 2 ? 0.9 : 0; wheel.slipSpeed = i === 2 ? 5 : 0;
  });
  try {
    for (let i = 0; i < 240; i++) effects.update(1 / 60, car);
    assert.equal(effects.trackCount, 1, 'one spinning contact should keep one shallow visual footprint');
    effects.clear();
    car.terrainWheels[2].grounded = false;
    effects.update(1, car); assert.equal(effects.trackCount, 0);
    car.terrainWheels[2].grounded = true;
    car.terrainWheels[2].position.y = 1;
    effects.update(1, car); assert.equal(effects.trackCount, 0, 'a wheel on a raised object cannot churn terrain below it');
    car.terrainWheels[2].position.y = 0;
    car.terrainWheels[2].slipSpeed = 0;
    effects.update(1, car); assert.equal(effects.trackCount, 0);
    car.terrainWheels[2].slipSpeed = 5;
    effects.update(1, car); assert.equal(effects.trackCount, 1);
    car.terrainWheels[2].slip = car.terrainWheels[2].slipSpeed = 0;
    effects.update(19, car); assert.equal(effects.trackCount, 0);
    effects.clear();
    car.terrainWheels[2].slip = 0.9; car.terrainWheels[2].slipSpeed = 5;
    for (let i = 0; i < 600; i++) {
      car.terrainWheels[2].position.z += 0.4; effects.update(1 / 60, car);
    }
    assert.equal(effects.trackCount, TRACK_CAPACITY);
  } finally { effects.dispose(); assert.equal(scene.children.length, 0); }
});

if (process.env.ROAMER_INCLUDE_ICELAND === '1') test('Iceland black sand keeps sand handling but emits dark particles', () => {
  const scene = new THREE.Scene();
  const effects = new TerrainEffects(scene, () => null, () => 0, AREAS.iceland.particleColors);
  const car = vehicle();
  car.terrainWheels.forEach(wheel => { wheel.surface = SURFACES.sand; });
  for (let i = 0; i < 5; i++) effects.update(0.1, car);
  assert.ok(effects.count > 0);
  const mesh = scene.getObjectByName('terrain-particles') as THREE.InstancedMesh;
  const color = new THREE.Color(); mesh.getColorAt(0, color);
  assert.equal(color.getHexString(), '4a4d4a');
  effects.dispose();
});

test('ground marks require contact and movement, stay bounded, expire, and dispose', () => {
  const scene=new THREE.Scene(), marks=new GroundEffects(scene,()=>0,()=>0.2), car=vehicle();
  for(let i=0;i<600;i++) { car.terrainWheels.forEach(w=>{w.position.z+=0.4;}); marks.update(1/60,car); }
  assert.equal(marks.trackCount,TRACK_CAPACITY);
  marks.clear();
  car.terrainWheels.forEach(w=>{w.grounded=false;});
  marks.update(1,car); assert.equal(marks.trackCount,0);
  car.terrainWheels.forEach(w=>{w.grounded=true;w.surface=SURFACES.water;});
  marks.update(0.1,car);
  car.terrainWheels.forEach(w=>{w.position.z+=1.2;});
  marks.update(0.1,car); assert.equal(marks.rippleCount,2);
  car.terrainWheels.forEach(w=>{w.grounded=false;});
  marks.update(2,car); assert.equal(marks.rippleCount,0);
  car.terrainWheels.forEach(w=>{w.grounded=true;w.surface=SURFACES.mud;});
  marks.update(0.1,car);
  car.terrainWheels.forEach(w=>{w.position.x+=4;});marks.update(0.1,car);
  assert.equal(marks.trackCount,4);
  marks.update(31,car);assert.equal(marks.trackCount,0);
  marks.dispose();assert.equal(scene.children.length,0);
});

test('reduced terrain effects clear existing marks and leave sparser new ones', () => {
  const scene=new THREE.Scene(), effects=new TerrainEffects(scene,()=>null,()=>0), car=vehicle();
  effects.ground.update(0.1,car);
  car.terrainWheels.forEach(w=>{w.position.x+=4;});effects.ground.update(0.1,car);
  assert.ok(effects.ground.trackCount>0);
  effects.setReduced(true);assert.equal(effects.ground.trackCount,0);
  effects.update(0.1,car);assert.equal(effects.ground.trackCount,0);
  for(let i=0;i<20;i++) {
    car.terrainWheels.forEach(w=>{w.position.x+=0.4;});
    effects.update(0.1,car);
  }
  assert.ok(effects.ground.trackCount>0);
  effects.dispose();assert.equal(scene.children.length,0);
});

test('black sand marks respond to steering, braking, and acceleration', () => {
  const scene=new THREE.Scene(), marks=new GroundEffects(scene,()=>0,()=>null), car=vehicle();
  car.terrainWheels.forEach(w=>{w.surface=SURFACES.ash;});
  marks.update(0.1,car);
  car.terrainWheels.forEach(w=>{w.position.z+=1;});
  marks.update(0.1,car);
  assert.equal(marks.trackCount,0);
  car.terrainWheels.forEach(w=>{w.position.z+=1.4;});
  marks.update(0.1,car,{steer:1,forward:true,reverse:false});
  assert.equal(marks.trackCount,4);
  car.terrainWheels.forEach(w=>{w.position.z+=2.7;});
  marks.update(0.1,car,{steer:0,forward:false,reverse:true});
  assert.equal(marks.trackCount,8);
  car.terrainWheels.forEach(w=>{w.position.z+=2.7;});
  (car as unknown as {speed:number}).speed=5;
  marks.update(0.1,car,{steer:0,forward:true,reverse:false});
  assert.equal(marks.trackCount,12);
  marks.dispose();
});

test('static lunar impressions match the live driving stamp geometry and palette', () => {
  const scene = new THREE.Scene(), height = (x: number, z: number) => x * 0.1 + z * 0.2;
  const effects = new GroundEffects(scene, height, () => null), car = vehicle();
  car.terrainWheels.forEach(wheel => { wheel.surface = SURFACES['lunar-regolith']; });
  effects.update(0.1, car);
  car.terrainWheels.forEach(wheel => { wheel.position.z = 1; });
  effects.update(0.1, car, { steer: 1, forward: false, reverse: false });
  const fixed = createStaticGroundTracks([{
    x: Math.sin(9.37) * 0.045, z: 1, angle: 0,
    length: 0.45 + (0.5 + Math.sin(4.73) * 0.5) * 0.55 + 0.42, surface: 'lunar-regolith',
  }], height);
  scene.add(fixed);
  try {
    const live = scene.children.find(object => object instanceof THREE.Mesh && object.visible && object !== fixed);
    assert.ok(live instanceof THREE.Mesh);
    assert.deepEqual(fixed.geometry.getAttribute('position').array, live.geometry.getAttribute('position').array.slice(0, 36));
    const a = fixed.geometry.getAttribute('color'), b = live.geometry.getAttribute('color');
    for (let i = 0; i < 12; i++) {
      assert.equal(a.getX(i), b.getX(i)); assert.equal(a.getY(i), b.getY(i)); assert.equal(a.getZ(i), b.getZ(i));
      assert.ok(Math.abs(a.getW(i) * 2.15 - b.getW(i)) < 0.000001);
    }
  } finally {
    effects.dispose(); fixed.geometry.dispose(); fixed.material.dispose(); scene.remove(fixed);
  }
});
