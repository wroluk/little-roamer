import { expect, test } from '@playwright/test';
import { glassfallPosition } from '../../src/game/mars-layout';
import { PASS_BOWL } from '../../src/game/northern-pass';
import { TRACTION_RAMPS } from '../../src/game/traction-ground';
import { WHEEL_RADIUS } from '../../src/game/vehicle';

type LabState = {
  car: string;
  tractionLab: boolean; position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  wheelSurfaces: string[]; contacts: number; mode: string; terrainParticles: number;
  terrainParticleCapacity: number;
  speed: number;
  terrainTracks: number;
  wheelSteering: number;
  wheels: {
    visualRpm: number; angularSpeed: number; load: number; slipRatio: number; slipSpeed: number;
    gripMultiplier: number; longitudinalFriction: number;
  }[];
};
type Game = {
  snapshot(): LabState; placeVehicle(x: number, z: number, heading: number): Promise<void>;
  vehicle: { model: import('three').Group; wheels: import('three').Group[]; capture(): void };
  follow: { orbit(yaw: number, pitch: number): void };
};

test.use({ video: 'on', deviceScaleFactor: 1 });

for (const trial of [
  { name: 'dirt', surface: 'dirt', lab: true, url: '/?dev=traction&start=pad&surface=dirt&car=modern' },
  { name: 'ice', surface: 'ice', lab: true, url: '/?dev=traction&start=pad&surface=ice&car=modern' },
  { name: 'impact glass', surface: 'mars-glass', lab: true, url: '/?dev=traction&start=pad&surface=mars-glass&car=modern' },
  { name: 'regolith', surface: 'regolith', lab: true, url: '/?dev=traction&start=pad&surface=regolith&car=modern' },
  { name: 'Blue Hollow ice', surface: 'ice', lab: false, url: '/?area=northern-reach&start=high-pass&car=modern' },
  { name: 'Vatnajökull ice', surface: 'ice', lab: false, url: '/?area=iceland&start=vatnajokull&car=modern' },
  { name: 'Glassfall glass', surface: 'mars-glass', lab: false, url: '/?area=mars&start=glassfall-plain&car=mars-scout' },
] as const) {
  const { surface, lab } = trial;
  const hollow = trial.name === 'Blue Hollow ice';
  test(`${trial.name}: visible slide, lift-off countersteer and moving recovery without telemetry`, async ({ page }, info) => {
    if (!lab) test.setTimeout(90_000);
    await page.goto(trial.url);
    await expect(page.locator('#start')).toBeEnabled();
    await page.locator('#start').click();
    if (hollow) {
      await page.evaluate(async start => (window as unknown as { __ROAMER__: Game }).__ROAMER__
        .placeVehicle(start.x + 5, start.z - 11, Math.PI), PASS_BOWL);
    } else if (trial.name === 'Glassfall glass') {
      const t = 0.32, dx = -75, dz = 99, length = Math.hypot(dx, dz);
      const bend = Math.sin(t * Math.PI) * 5;
      const start = glassfallPosition({ x: 282 + t * dx + bend * dz / length, z: -17 + t * dz - bend * dx / length });
      await page.evaluate(async ({ start, heading }) =>
        (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(start.x, start.z, heading),
      { start, heading: Math.atan2(-dx, -dz) });
    }
    await page.addStyleTag({ content: '#traction-lab { visibility: hidden; }' });
    const markingColor = lab ? await page.evaluate(() => {
      const scene = (window as unknown as { __ROAMER__: Game }).__ROAMER__.vehicle.model.parent!;
      const lines = scene.getObjectByName('Measured lane markings') as
        import('three').LineSegments<import('three').BufferGeometry, import('three').LineBasicMaterial> | undefined;
      if (!lines) throw new Error('Missing proving-ground reference lines.');
      return lines.material.color.getHexString();
    }) : null;
    if (lab) expect(markingColor).toBe(surface === 'ice' ? '456b75' : 'f5e8bc');
    await page.keyboard.down('KeyW');
    try {
      const { entry, powered, counter, recovery } = await page.evaluate(async ({
        recoveryDuration, entrySpeed, poweredSteps, counterSteps, turnRight,
      }) => {
        const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
        // Blue Hollow's eastern exit climbs; turn west to assess recovery in the bowl.
        const turnKey = turnRight ? 'KeyD' : 'KeyA', counterKey = turnRight ? 'KeyA' : 'KeyD';
        const key = (type: 'keydown' | 'keyup', code: string) =>
          window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
        const sample = (elapsed: number, startedAt: number) => {
          const s = game.snapshot(), q = s.rotation, v = s.velocity;
          const fx = -2 * (q.x * q.z + q.y * q.w), fz = -(1 - 2 * (q.x * q.x + q.y * q.y));
          const side = Math.abs(v.x * fz - v.z * fx), along = Math.abs(v.x * fx + v.z * fz);
          return {
            elapsed, wallElapsed: (performance.now() - startedAt) / 1000, position: s.position,
            speed: s.speed, sideSpeed: side, slipAngle: Math.atan2(side, along) * 180 / Math.PI,
            upright: 1 - 2 * (q.x * q.x + q.z * q.z), contacts: s.contacts, steering: s.wheelSteering,
            surfaces: s.wheelSurfaces,
          };
        };
        const deadline = performance.now() + 20_000;
        try {
          while (game.snapshot().speed < entrySpeed) {
            if (performance.now() > deadline) throw new Error(`The comparison did not reach its ${entrySpeed} m/s entry speed.`);
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          }
          const entry = game.snapshot();
          type Phase = { startedAt: number; endedAt: number; samples: ReturnType<typeof sample>[] };
          const phases: Phase[] = Array.from({ length: 3 }, () => ({ startedAt: 0, endedAt: 0, samples: [] }));
          const steps = [poweredSteps, counterSteps, Math.round(recoveryDuration * 60 / 1000)];
          const capture = game.vehicle.capture;
          let phaseIndex = 0, phaseStep = 0;
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            await new Promise<void>((resolve, reject) => {
              timer = setTimeout(() => reject(new Error(
                `The driving loop did not finish its fixed-step manoeuvre: phase=${phaseIndex}, steps=${phaseStep}/${steps[phaseIndex]}.`,
              )), 20_000);
              // Observe completed native steps; never advance physics or inject forces.
              game.vehicle.capture = () => {
                capture.call(game.vehicle);
                const phase = phases[phaseIndex];
                phase.samples.push(sample(++phaseStep / 60, phase.startedAt));
                if (phaseStep < steps[phaseIndex]) return;
                phase.endedAt = performance.now();
                phaseIndex++; phaseStep = 0;
                // Change ordinary keys here, before the next catch-up step reads them.
                if (phaseIndex === 1) {
                  key('keyup', turnKey); key('keyup', 'KeyW'); key('keydown', counterKey);
                } else if (phaseIndex === 2) key('keyup', counterKey);
                else {
                  game.vehicle.capture = capture;
                  resolve();
                  return;
                }
                phases[phaseIndex].startedAt = performance.now();
              };
              phases[0].startedAt = performance.now();
              key('keydown', turnKey);
            });
          } finally {
            clearTimeout(timer);
            game.vehicle.capture = capture;
          }
          const [powered, counter, recovery] = phases;
          return { entry, powered, counter, recovery };
        } finally {
          for (const code of ['KeyW', 'KeyA', 'KeyD']) key('keyup', code);
        }
      }, {
        recoveryDuration: hollow ? 1_200 : surface === 'mars-glass' ? lab ? 2_000 : 2_150 : 1_500,
        entrySpeed: hollow ? 8 : 10, poweredSteps: hollow ? 36 : 54, counterSteps: hollow ? 30 : 45,
        turnRight: hollow,
      });
      const turning = [...powered.samples, ...counter.samples];
      const peakAngle = Math.max(...turning.map(s => s.slipAngle));
      const peakSide = Math.max(...turning.map(s => s.sideSpeed));
      await info.attach(`${surface}-slide-and-recovery`, {
        body: JSON.stringify({ surface, lab, timing: 'native fixed steps; phase samples record exact durations; no manual stepping',
          entry, powered, counter, recovery, peakAngle, peakSide }),
        contentType: 'application/json',
      });
      expect(entry.speed).toBeLessThan(11);
      expect(entry.car).toBe(trial.name === 'Glassfall glass' ? 'mars-scout' : 'modern');
      if (surface === 'ice') {
        expect(peakAngle).toBeGreaterThanOrEqual(lab ? 40 : 12);
        expect(peakAngle).toBeLessThanOrEqual(lab ? 48 : 45);
        expect(peakSide).toBeGreaterThan(lab ? 5.5 : 2);
        if (hollow) {
          expect(entry.wheelSurfaces.every(id => id === surface)).toBe(true);
          expect([...turning, ...recovery.samples].every(s => s.surfaces.every(id => id === surface))).toBe(true);
        }
      } else if (surface === 'mars-glass') {
        expect(peakAngle).toBeGreaterThan(lab ? 40 : 20);
        expect(peakAngle).toBeLessThan(lab ? 65 : 85);
        expect(peakSide).toBeGreaterThan(lab ? 7 : 3);
        expect(entry.wheelSurfaces.every(id => id === surface)).toBe(true);
      } else {
        expect(peakAngle).toBeLessThan(9);
        expect(peakSide).toBeLessThan(1.7);
      }
      const final = recovery.samples.at(-1)!;
      // Check the same time window in both engines, not ten frames of variable duration.
      const recovered = recovery.samples.filter(s => s.elapsed >= final.elapsed - 0.15);
      expect(recovered.length).toBeGreaterThanOrEqual(2);
      expect(recovered.every(s => s.slipAngle < 3 && s.sideSpeed < 0.5)).toBe(true);
      expect(final.speed).toBeGreaterThan(surface === 'mars-glass' ? 2 : surface === 'ice' ? 3 : 4);
      expect(Math.hypot(final.position.x - counter.samples.at(-1)!.position.x,
        final.position.z - counter.samples.at(-1)!.position.z)).toBeGreaterThan(5);
      expect([...turning, ...recovery.samples].every(s => s.upright > 0.8 && s.contacts >= 2)).toBe(true);
      if (lab || surface === 'ice') expect(final.surfaces.every(id => id === surface)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${surface}-moving-recovery.png`) });
    } finally {
      await page.keyboard.up('KeyW');
      await page.keyboard.up('KeyA');
      await page.keyboard.up('KeyD');
    }
  });
}

for (const surface of ['ice', 'mud'] as const) {
  test(`${surface}: traverse drift and wheel loading through ordinary controls`, async ({ page }, info) => {
    await page.goto(`/?dev=traction&start=traverse&surface=${surface}&car=modern`);
    await expect(page.locator('#start')).toBeEnabled();
    await page.locator('#start').click();
    await page.addStyleTag({ content: '#traction-lab { visibility: hidden; }' });
    const trial = await page.evaluate(async () => {
      const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
      let driving = false;
      const pedal = (held: boolean) => {
        if (held === driving) return;
        driving = held;
        window.dispatchEvent(new KeyboardEvent(held ? 'keydown' : 'keyup', { code: 'KeyW', bubbles: true }));
      };
      const read = () => {
        const s = game.snapshot();
        return {
          at: performance.now(), position: s.position, velocity: s.velocity, speed: s.speed,
          upright: 1 - 2 * (s.rotation.x ** 2 + s.rotation.z ** 2),
          contacts: s.contacts, loads: s.wheels.map(w => w.load), surfaces: s.wheelSurfaces,
        };
      };
      const approach: ReturnType<typeof read>[] = [], coast: ReturnType<typeof read>[] = [];
      let entry: ReturnType<typeof read> | undefined;
      const capture = game.vehicle.capture;
      const deadline = performance.now() + 30_000;
      try {
        game.vehicle.capture = () => {
          capture.call(game.vehicle);
          const s = read();
          if (!entry) {
            approach.push(s);
            if (s.position.z <= -41) { entry = s; pedal(false); }
            else pedal(s.speed < 3);
          } else {
            coast.push(s);
            if (coast.length === 240) game.vehicle.capture = capture;
          }
        };
        pedal(game.snapshot().speed < 3);
        while (!entry || coast.length < 240) {
          if (performance.now() > deadline) throw new Error('The native traverse approach and four-second coast did not finish.');
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        }
        return { approach, entry, coast };
      } finally { game.vehicle.capture = capture; pedal(false); }
    });
    const end = trial.coast.at(-1)!;
    const sideTravel = trial.entry.position.x - end.position.x;
    const alongTravel = trial.entry.position.z - end.position.z;
    await info.attach(`${surface}-traverse`, {
      body: JSON.stringify({ surface, ...trial, sideTravel, alongTravel }), contentType: 'application/json',
    });
    expect(trial.entry.speed).toBeGreaterThan(2.5);
    expect(trial.entry.speed).toBeLessThan(3.5);
    if (surface === 'ice') {
      expect(sideTravel).toBeGreaterThan(1);
      expect(alongTravel).toBeGreaterThan(3);
      expect(-end.velocity.x).toBeGreaterThan(0.3);
    } else {
      expect(sideTravel).toBeLessThan(1.2);
      expect(alongTravel).toBeLessThan(1);
      expect(-end.velocity.x).toBeLessThan(0.3);
    }
    expect([...trial.approach, ...trial.coast].every(s => s.upright > 0.85 && s.contacts >= 2
      && s.position.x > 70 && s.position.x < 90 && s.position.z > -55 && s.position.z < -20)).toBe(true);
    expect(end.surfaces.every(id => id === surface)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${surface}-traverse-driving.png`) });
  });
}

test('loaded sand wheelspin throws a visible fan and lift-off quiets it without telemetry', async ({ page }, info) => {
  await page.goto('/?dev=traction&start=grade-25&surface=sand&car=modern');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  // Hide the diagnostic readout: the driving view must communicate the effect.
  await page.addStyleTag({ content: '#traction-lab { visibility: hidden; }' });
  const samples: LabState[] = [];
  await page.keyboard.down('KeyW');
  let spinning: LabState;
  try {
    await expect.poll(async () => {
      const current = await state();
      samples.push(current);
      return current.position.z < -27 && current.speed > 0 && current.speed < 2
        && current.contacts === 4
        && current.wheels.some(w => w.load > 0 && w.slipRatio > 0.65 && w.slipSpeed > 3)
        && Math.max(...current.wheels.map(w => w.gripMultiplier)) - Math.min(...current.wheels.map(w => w.gripMultiplier)) > 0.01
        && current.terrainParticles > 30;
    }, { timeout: 25_000, intervals: [50] }).toBe(true);
    spinning = await state();
    expect(spinning.contacts).toBe(4);
    expect(spinning.wheels.every(w => w.gripMultiplier >= 0.9 && w.gripMultiplier <= 1.1)).toBe(true);
    expect(Math.max(...spinning.wheels.map(w => w.visualRpm))
      - Math.min(...spinning.wheels.map(w => w.visualRpm))).toBeGreaterThan(0.5);
    expect(spinning.terrainParticles).toBeLessThanOrEqual(72);
    expect(spinning.terrainTracks).toBeGreaterThan(0);
    await page.screenshot({ path: info.outputPath('sand-wheelspin-driving.png') });
    await page.waitForTimeout(600);
  } finally { await page.keyboard.up('KeyW'); }
  await expect.poll(async () => Math.max(...(await state()).wheels.map(w => Math.abs(w.slipSpeed))),
    { timeout: 5_000 }).toBeLessThan(0.7);
  await page.waitForTimeout(900);
  const released = await state();
  expect(released.terrainParticles).toBeLessThan(spinning.terrainParticles / 2);
  await page.screenshot({ path: info.outputPath('sand-lift-off-driving.png') });
  await info.attach('sand-wheelspin-and-release', {
    body: JSON.stringify({ spinning, released, samples }), contentType: 'application/json',
  });
});

for (const trial of [
  { name: 'ash', surface: 'ash', packed: false, lab: true },
  { name: 'mars-dust', surface: 'mars-dust', packed: false, lab: true },
  { name: 'dirt', surface: 'dirt', packed: true, lab: true },
  { name: 'regolith', surface: 'regolith', packed: true, lab: true },
  { name: 'Rust Dunes Scout', surface: 'mars-dust', packed: false, lab: false },
  { name: 'Pale Mars dust Scout', surface: 'mars-dust', packed: false, lab: false, pale: true },
] as const) {
  test(`${trial.name}: material wheelspin spray and lift-off through normal controls`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const grade = trial.packed ? 32 : 25;
    const pale = 'pale' in trial;
    await page.goto(trial.lab ? `/?dev=traction&start=grade-${grade}&surface=${trial.surface}&car=modern`
      : `/?area=mars&start=${pale ? 'glassfall-plain' : 'rust-dunes'}&car=mars-scout`);
    await expect(page.locator('#start')).toBeEnabled();
    await page.locator('#start').click();
    await page.addStyleTag({ content: '#traction-lab { visibility: hidden; }' });
    const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
    await expect.poll(async () => (await state()).mode).toBe('playing');
    const start = trial.packed ? { x: TRACTION_RAMPS.find(r => r.degrees === grade)!.x, z: -33, heading: 0 }
      : trial.lab ? null : pale ? { x: 545, z: -150, heading: -2.8112749562894663 }
        : { x: -570, z: 12, heading: -Math.PI / 2 };
    const samples: LabState[] = [];
    let spinning: LabState;
    try {
      await page.evaluate(async ({ start, pale }) => {
        const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
        if (start) await game.placeVehicle(start.x, start.z, start.heading);
        if (pale) game.follow.orbit(-1.1, 0.18);
        // A round trip after placement allows rollback to select direction-change braking.
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
      }, { start, pale });
      await expect.poll(async () => {
        const current = await state(); samples.push(current);
        return current.contacts === 4 && current.wheelSurfaces.every(id => id === trial.surface)
          && current.wheels.some(w => w.load > 0 && w.slipRatio > (trial.packed ? 0.25 : 0.65) && w.slipSpeed > 3)
          && current.terrainParticles > (trial.packed ? 12 : 30);
      }, { timeout: 25_000, intervals: [50] }).toBe(true);
      spinning = samples.at(-1)!;
      expect(spinning.car).toBe(trial.lab ? 'modern' : 'mars-scout');
      expect(spinning.wheels.every(w => w.gripMultiplier === 1)).toBe(true);
      expect(spinning.terrainParticleCapacity).toBe(72);
      expect(spinning.terrainParticles).toBeLessThanOrEqual(72);
      if (pale) {
        await page.screenshot({ path: info.outputPath('material-wheelspin-side.png') });
        const colors = await page.evaluate(() => {
          const scene = (window as unknown as { __ROAMER__: Game }).__ROAMER__.vehicle.model.parent!;
          const mesh = scene.getObjectByName('terrain-particles') as import('three').InstancedMesh;
          const matrix = mesh.matrix.clone(), scale = mesh.position.clone();
          const colors: { r: number; g: number; b: number }[] = [];
          for (let i = 0; i < mesh.count; i++) {
            mesh.getMatrixAt(i, matrix); scale.setFromMatrixScale(matrix);
            if (Math.max(scale.x, scale.y, scale.z) < 1e-6) continue;
            colors.push({ r: mesh.instanceColor!.getX(i), g: mesh.instanceColor!.getY(i), b: mesh.instanceColor!.getZ(i) });
          }
          return colors;
        });
        await info.attach('pale-dust-colors', { body: JSON.stringify(colors), contentType: 'application/json' });
        expect(colors.length).toBeGreaterThan(0);
        expect(colors.every(c => c.g / c.r > 0.5 && c.b / c.r > 0.22)).toBe(true);
        await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(1.1, -0.18));
        await page.waitForTimeout(200);
      }
      await page.screenshot({ path: info.outputPath('material-wheelspin-driving.png') });
      await page.waitForTimeout(600);
    } finally { await page.keyboard.up('KeyW'); }
    const coast: LabState[] = [];
    await expect.poll(async () => {
      const current = await state(); coast.push(current);
      return current.contacts >= 2 && Math.max(...current.wheels.map(w => Math.abs(w.slipSpeed))) < 0.7
        && current.terrainParticles < spinning.terrainParticles * (trial.packed ? 0.9 : 0.7);
    }, { timeout: 8_000, intervals: [100] }).toBe(true);
    await page.screenshot({ path: info.outputPath('material-lift-off-driving.png') });
    await info.attach('material-wheelspin-and-release', {
      body: JSON.stringify({ trial, spinning, released: coast.at(-1), samples, coast }), contentType: 'application/json',
    });
    expect(errors).toEqual([]);
  });
}

for (const reverse of [false, true]) {
  test(`${reverse ? 'reverse steered sand' : 'forward Martian dust'}: tyre clearance at the reported side angle`, async ({ page }, info) => {
    const surface = reverse ? 'sand' : 'mars-dust';
    await page.goto(`/?dev=traction&start=grade-25&surface=${surface}&car=modern`);
    await expect(page.locator('#start')).toBeEnabled();
    await page.locator('#start').click();
    await page.addStyleTag({ content: '#traction-lab { visibility: hidden; }' });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot().mode)).toBe('playing');
    try {
      const data = await page.evaluate(async ({ reverse, radius }) => {
        const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
        await game.placeVehicle(0, -33, reverse ? Math.PI : 0);
        game.follow.orbit(-1.1, 0.18);
        window.dispatchEvent(new KeyboardEvent('keydown', { code: reverse ? 'KeyS' : 'KeyW', bubbles: true }));
        if (reverse) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', bubbles: true }));
        const samples: { particles: number; overlaps: number; contacts: number; slip: number; steering: number }[] = [];
        const scene = game.vehicle.model.parent!;
        const mesh = scene.getObjectByName('terrain-particles') as import('three').InstancedMesh;
        const instance = mesh.matrix.clone(), position = game.vehicle.model.position.clone();
        const relative = position.clone(), axis = position.clone(), centre = position.clone(), scale = position.clone();
        const deadline = performance.now() + 15_000;
        let startedAt = 0;
        while (performance.now() < deadline) {
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          const state = game.snapshot();
          if (!startedAt) {
            if (state.contacts !== 4 || state.terrainParticles < 30
              || !state.wheels.some(w => w.load > 0 && w.slipRatio > 0.65 && Math.abs(w.slipSpeed) > 3)) continue;
            startedAt = performance.now();
          }
          let overlaps = 0;
          mesh.updateWorldMatrix(true, false);
          for (let i = 0; i < mesh.count; i++) {
            mesh.getMatrixAt(i, instance);
            scale.setFromMatrixScale(instance);
            const grainRadius = 0.09 * Math.max(scale.x, scale.y, scale.z);
            if (grainRadius < 1e-6) continue;
            position.setFromMatrixPosition(instance).applyMatrix4(mesh.matrixWorld);
            for (const wheel of game.vehicle.wheels) {
              wheel.updateWorldMatrix(true, false);
              centre.setFromMatrixPosition(wheel.matrixWorld);
              axis.setFromMatrixColumn(wheel.matrixWorld, 0).normalize();
              relative.subVectors(position, centre);
              const axial = relative.dot(axis);
              const radialGap = Math.max(0, Math.sqrt(Math.max(0, relative.lengthSq() - axial * axial)) - radius);
              const axialGap = Math.max(0, Math.abs(axial) - 0.24);
              if (radialGap * radialGap + axialGap * axialGap < grainRadius * grainRadius - 1e-8) overlaps++;
            }
          }
          samples.push({ particles: state.terrainParticles, overlaps, contacts: state.contacts,
            slip: Math.max(...state.wheels.map(w => Math.abs(w.slipSpeed))), steering: state.wheelSteering });
          if (performance.now() - startedAt >= 1_200) break;
        }
        return { samples, started: startedAt > 0 };
      }, { reverse, radius: WHEEL_RADIUS + 0.02 });
      await page.screenshot({ path: info.outputPath('tyre-clearance-side-angle.png') });
      await info.attach('tyre-clearance', { body: JSON.stringify(data), contentType: 'application/json' });
      expect(data.started).toBe(true);
      expect(data.samples.length).toBeGreaterThanOrEqual(4);
      expect(data.samples.every(s => s.particles > 0 && s.particles <= 72)).toBe(true);
      expect(data.samples.reduce((sum, s) => sum + s.overlaps, 0)).toBe(0);
      if (reverse) expect(data.samples.some(s => Math.abs(s.steering) > 0.2)).toBe(true);
    } finally {
      for (const code of ['KeyW', 'KeyS', 'KeyD']) await page.keyboard.up(code);
    }
  });
}

test('a powered fast turn pushes wide and lift-off restores steering through the existing controls', async ({ page }, info) => {
  await page.goto('/?dev=traction&start=pad&surface=dirt&car=modern');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  const turningSamples = () => page.evaluate(async () => {
    const game = (window as unknown as {
      __ROAMER__: Game & { vehicle: { body: { angvel(): { y: number } } } };
    }).__ROAMER__;
    const samples = [];
    for (let frame = 0; frame < 30; frame++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const current = game.snapshot();
      const idealYaw = Math.abs(current.speed * Math.tan(current.wheelSteering) / 2.02);
      samples.push({ speed: current.speed, gain: Math.abs(game.vehicle.body.angvel().y) / idealYaw });
    }
    return samples;
  });
  await page.keyboard.down('KeyW');
  try {
    await expect.poll(async () => (await state()).speed, { timeout: 20_000 }).toBeGreaterThan(11);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(1_000);
    const powered = await turningSamples();
    await page.screenshot({ path: info.outputPath('firm-powered-turn.png') });
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(350);
    const released = await turningSamples();
    await page.screenshot({ path: info.outputPath('firm-lift-recovery.png') });
    const average = (samples: typeof powered) => samples.reduce((sum, value) => sum + value.gain, 0) / samples.length;
    expect(average(powered)).toBeGreaterThan(0.3);
    expect(average(powered)).toBeLessThan(0.72);
    expect(average(released)).toBeGreaterThan(average(powered) + 0.12);
    expect(released.every(sample => sample.speed > 3 && Number.isFinite(sample.gain))).toBe(true);
    expect((await state()).contacts).toBe(4);
    await info.attach('powered-lift-steering', {
      body: JSON.stringify({ powered, released, final: await state() }), contentType: 'application/json',
    });
  } finally {
    await page.keyboard.up('KeyW');
    await page.keyboard.up('KeyD');
  }
});

test('development lab swaps surfaces without geometry changes and repeats the chosen start', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?dev=traction&start=split&surface=mud');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  await expect(page.locator('#traction-lab')).toBeVisible();
  await expect.poll(async () => (await state()).contacts).toBe(4);
  expect((await state()).tractionLab).toBe(true);
  expect((await state()).wheelSurfaces).toEqual(['ice', 'mud', 'ice', 'mud']);
  await page.screenshot({ path: info.outputPath('split-driving.png') });
  const before = (await state()).position;
  await page.getByLabel('Surface', { exact: true }).selectOption('sand');
  await expect.poll(async () => (await state()).wheelSurfaces).toEqual(['ice', 'sand', 'ice', 'sand']);
  expect((await state()).position.y).toBeCloseTo(before.y, 1);
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state()).position.z).toBeLessThan(before.z - 5);
  await page.keyboard.up('KeyW');
  await page.getByRole('button', { name: 'Repeat start' }).click();
  await expect.poll(async () => (await state()).position.z).toBeCloseTo(52, 1);
  await page.getByLabel('Start', { exact: true }).selectOption('grade-25');
  await page.getByRole('button', { name: 'Repeat start' }).click();
  await expect.poll(async () => (await state()).position.x).toBeCloseTo(0, 1);
  await page.waitForTimeout(500);
  await page.screenshot({ path: info.outputPath('grade-25-driving.png') });
  await page.getByLabel('Start', { exact: true }).selectOption('pad');
  await page.getByRole('button', { name: 'Repeat start' }).click();
  await expect.poll(async () => (await state()).position.z).toBeCloseTo(52, 1);
  await page.waitForTimeout(500);
  await page.screenshot({ path: info.outputPath('pad-driving.png') });
  expect((await state()).wheels).toHaveLength(4);
  expect((await state()).wheels.every(w => w.load > 0 && Number.isFinite(w.visualRpm))).toBe(true);
  for (const [id, x] of [['slalom', 66], ['traverse', 82]] as const) {
    await page.getByLabel('Start', { exact: true }).selectOption(id);
    await page.getByRole('button', { name: 'Repeat start' }).click();
    await expect.poll(async () => (await state()).position.x).toBeCloseTo(x, 0);
    await page.waitForTimeout(500);
    await page.screenshot({ path: info.outputPath(`${id}-driving.png`) });
  }
  await info.attach('lab-state', { body: JSON.stringify(await state()), contentType: 'application/json' });
  expect(errors).toEqual([]);
});

test('leaving the lab disposes its panel and restores normal resets', async ({ page }) => {
  await page.goto('/?dev=traction&start=grade-20');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await page.locator('#pause').click(); await page.locator('#home').click();
  await page.locator('input[name="area"][value="samurai-village"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await expect(page.locator('#traction-lab')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('dev')).toBe(false);
  const state = await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  expect(state.tractionLab).toBe(false);
});

test('drive the measured loose climb, then repeat an offset oblique start', async ({ page }, info) => {
  await page.goto('/?dev=traction&start=grade-25&surface=sand');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  await page.keyboard.down('KeyW');
  try {
    await expect.poll(async () => Math.max(...(await state()).wheels.map(w => w.slipRatio)),
      { timeout: 25_000 }).toBeGreaterThan(0.15);
    const current = await state();
    expect(current.position.z).toBeLessThan(-24);
    expect(current.contacts).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: info.outputPath('loose-climb-driving.png') });
    await info.attach('loose-climb-state', { body: JSON.stringify(current), contentType: 'application/json' });
  } finally { await page.keyboard.up('KeyW'); }
  await page.getByLabel('Heading', { exact: true }).selectOption('0.65');
  await page.getByRole('button', { name: 'Repeat start' }).click();
  await expect.poll(async () => (await state()).position.x).toBeCloseTo(15, 1);
  expect((await state()).rotation.y).toBeCloseTo(Math.sin(0.65 / 2), 2);
  await page.keyboard.press('KeyR');
  await expect.poll(async () => (await state()).position.z).toBeCloseTo(-8, 1);
  expect((await state()).position.x).toBeCloseTo(15, 1);
});

test('lift-off preserves ice momentum and braking slows tyres relative to their contacts', async ({ page }, info) => {
  await page.goto('/?dev=traction&start=pad&surface=ice');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  await page.keyboard.down('KeyW');
  try {
    await expect.poll(async () => (await state()).speed, { timeout: 20_000 }).toBeGreaterThan(8);
  } finally { await page.keyboard.up('KeyW'); }
  const released = await state();
  await expect.poll(async () => (await state()).position.z).toBeLessThan(released.position.z - 5);
  const coasting = await state();
  expect(coasting.speed).toBeGreaterThan(3);
  expect(coasting.contacts).toBe(4);
  await page.screenshot({ path: info.outputPath('ice-coast-driving.png') });
  await page.keyboard.down('KeyS');
  try {
    const braking = await page.evaluate(async () => {
      const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
      for (let frame = 0; frame < 180; frame++) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const current = game.snapshot();
        if (current.speed > 2 && current.wheels.some(wheel =>
          wheel.load > 0 && wheel.slipSpeed < -0.1)) return current;
        if (current.speed < 0.5) throw new Error('The chassis stopped without a measured braking slip.');
      }
      throw new Error('No contact braking slip observed.');
    });
    expect(braking.wheels.some((wheel, i) =>
      wheel.angularSpeed < coasting.wheels[i].angularSpeed)).toBe(true);
    await page.screenshot({ path: info.outputPath('ice-brake-driving.png') });
    await info.attach('coast-brake-state', {
      body: JSON.stringify({ released, coasting, braking }), contentType: 'application/json',
    });
    await expect.poll(async () => (await state()).speed).toBeLessThan(0.5);
  } finally { await page.keyboard.up('KeyS'); }
});
