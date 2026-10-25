import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { moonSurfaceHeight } from '../../src/game/moon-terrain';
import { marsSurfaceHeight } from '../../src/game/mars-terrain';

test.use({ deviceScaleFactor: 1 });
for (const area of ['moon', 'mars'] as const) test(`${area} tube shade survives distant and disabled dynamic shadows`, async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`/?area=${area}&start=${area === 'moon' ? 'skylight-hollow' : 'lava-tubes'}&car=lunar-nomad`);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const heightAt = area === 'moon' ? moonSurfaceHeight : marsSurfaceHeight;
  const bounds = area === 'moon' ? [-266, -222, 150, 214] : [-450, -406, -382, -306];
  const points: { x: number; y: number; z: number }[] = [];
  for (let z = bounds[2]; z <= bounds[3]; z += 4) for (let x = bounds[0]; x <= bounds[1]; x += 4)
    points.push({ x, y: heightAt(x, z), z });
  const view = area === 'moon'
    ? { position: { x: -248, y: 12, z: 144 }, target: { x: -246, y: 8, z: 183 }, fov: 65 }
    : { position: { x: -430, y: 11, z: -302 }, target: { x: -430, y: 8, z: -350 }, fov: 65 };
  const result = await page.evaluate(async ({ view, points }) => {
    type Game = {
      vehicle: { model: import('three').Group }; camera: import('three').PerspectiveCamera;
      renderer: import('three').WebGLRenderer;
      setPhotoView(v: typeof view): Promise<void>;
      snapshot(): { drawCalls: number; triangles: number; textures: number };
    };
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    await game.setPhotoView(view);
    const source = await (await fetch('/src/game/moon-scenery.ts')).text();
    const threeUrl = source.match(/from "([^"\n]*deps\/three[^"\n]*)"/)?.[1];
    if (!threeUrl) throw new Error('Missing Three.js browser module');
    const THREE = await import(/* @vite-ignore */ threeUrl);
    const scene = game.vehicle.model.parent! as import('three').Scene, renderer = game.renderer;
    const sun = scene.children.find(o => o instanceof THREE.DirectionalLight) as import('three').DirectionalLight;
    if (!sun) throw new Error('No world sunlight');
    const offset = sun.position.clone().sub(sun.target.position), direction = offset.clone().normalize();
    const roofMeshes: import('three').Object3D[] = [];
    scene.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      if (o.name === 'Moon hollow roof' || materials.some((m: import('three').Material) =>
        m instanceof THREE.MeshStandardMaterial && m.vertexColors && m.side === THREE.DoubleSide))
        roofMeshes.push(o);
    });
    scene.updateMatrixWorld(true); renderer.render(scene, game.camera);
    const width = renderer.domElement.width, height = renderer.domElement.height;
    const samples: { offset: number; shade: boolean }[] = [];
    for (const p of points) {
      const point = new THREE.Vector3(p.x, p.y + 0.03, p.z), projected = point.clone().project(game.camera);
      if (Math.abs(projected.x) > 0.88 || Math.abs(projected.y) > 0.88 || projected.z > 1) continue;
      const cameraDistance = point.distanceTo(game.camera.position);
      const sightline = new THREE.Raycaster(game.camera.position, point.clone().sub(game.camera.position).normalize());
      const first = sightline.intersectObjects(scene.children, true)[0];
      if (!first || Math.abs(first.distance - cameraDistance) > 0.4) continue;
      const shade = new THREE.Raycaster(point, direction).intersectObjects(roofMeshes).length > 0;
      const stable = [-0.8, 0.8].every(dx => [-0.8, 0.8].every(dz => {
        const origin = point.clone().add(new THREE.Vector3(dx, 0, dz));
        return (new THREE.Raycaster(origin, direction).intersectObjects(roofMeshes).length > 0) === shade;
      }));
      if (!stable) continue;
      const px = Math.floor((projected.x + 1) * 0.5 * width), py = Math.floor((projected.y + 1) * 0.5 * height);
      samples.push({ offset: (py * width + px) * 4, shade });
    }
    const oldPosition = sun.position.clone(), oldTarget = sun.target.position.clone(), enabled = renderer.shadowMap.enabled;
    const renders: { name: string; image: string; values: number[] }[] = [];
    try {
      for (const name of ['near', 'far', 'disabled']) {
        sun.target.position.copy(game.camera.position);
        if (name === 'far') sun.target.position.add(new THREE.Vector3(600, 0, 600));
        sun.position.copy(sun.target.position).add(offset);
        renderer.shadowMap.enabled = name !== 'disabled';
        renderer.render(scene, game.camera);
        const pixels = new Uint8Array(width * height * 4), gl = renderer.getContext();
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        renders.push({ name, image: renderer.domElement.toDataURL('image/png'),
          values: samples.map(s => (pixels[s.offset] + pixels[s.offset + 1] + pixels[s.offset + 2]) / 3) });
      }
    } finally {
      sun.position.copy(oldPosition); sun.target.position.copy(oldTarget); renderer.shadowMap.enabled = enabled;
    }
    return { samples: samples.map(s => s.shade), renders, state: game.snapshot(),
      shadowSize: sun.shadow.mapSize.toArray(), shadowWidth: sun.shadow.camera.right - sun.shadow.camera.left };
  }, { view, points });
  const shaded = result.samples.flatMap((shade, i) => shade ? [i] : []), lit = result.samples.flatMap((shade, i) => shade ? [] : [i]);
  expect(shaded.length, JSON.stringify(result.samples)).toBeGreaterThanOrEqual(10);
  expect(lit.length).toBeGreaterThanOrEqual(10);
  const [near, far, disabled] = result.renders;
  for (const i of shaded) {
    expect(Math.abs(near.values[i] - far.values[i]), `near/far shaded pixel ${i}`).toBeLessThanOrEqual(3);
    expect(Math.abs(far.values[i] - disabled.values[i]), `far/disabled shaded pixel ${i}`).toBeLessThanOrEqual(3);
  }
  const average = (values: number[], indices: number[]) => indices.reduce((sum, i) => sum + values[i], 0) / indices.length;
  expect(average(far.values, shaded)).toBeLessThan(average(far.values, lit) * 0.75);
  expect(result.shadowSize).toEqual([1024, 1024]); expect(result.shadowWidth).toBe(48);
  expect(errors).toEqual([]);
  const folder = `artifacts/${area}/static-tube-shadows/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  for (const render of result.renders)
    await writeFile(`${folder}/${render.name}.png`, Buffer.from(render.image.split(',')[1], 'base64'));
  await writeFile(`${folder}/evidence.json`, JSON.stringify({ ...result,
    renders: result.renders.map(({ name, values }) => ({ name, values })) }, null, 2));
});

test('static tube shading follows car swaps and does not leak into Earth worlds', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?area=moon&start=skylight-hollow&car=lunar-nomad');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  const shaders = () => page.evaluate(() => {
    type Game = { vehicle: { model: import('three').Group }; snapshot(): { textures: number; area: string } };
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    const patched: boolean[] = [];
    game.vehicle.model.traverse(object => {
      if (!('material' in object)) return;
      const materials = object.material as import('three').Material | import('three').Material[];
      for (const material of Array.isArray(materials) ? materials : [materials])
        if ('isMeshStandardMaterial' in material) patched.push(material.onBeforeCompile.toString().includes('staticSunDepth'));
    });
    return { patched, state: game.snapshot() };
  });
  const counts: number[] = [];
  for (const name of ['Mars Scout', 'Lunar Rover', 'Lunar Nomad', 'Mars Scout', 'Lunar Nomad']) {
    await page.getByRole('radio', { name }).check();
    await page.waitForTimeout(200);
    const sample = await shaders();
    expect(sample.patched.length).toBeGreaterThan(4);
    expect(sample.patched.every(Boolean)).toBe(true);
    counts.push(sample.state.textures);
  }
  expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  await page.locator('input[name="area"][value="valley"]').check();
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  expect((await shaders()).state.area).toBe('valley');
  expect((await shaders()).patched.some(Boolean)).toBe(false);
  expect(errors).toEqual([]);
});

test('reported southern roof face has no sunlight-atlas pattern', async ({ page }, info) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?area=moon&start=skylight-hollow&car=lunar-nomad');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const result = await page.evaluate(async () => {
    const source = await (await fetch('/src/game/moon-scenery.ts')).text();
    const threeUrl = source.match(/from "([^"\n]*deps\/three[^"\n]*)"/)?.[1];
    if (!threeUrl) throw new Error('Missing Three.js browser module');
    const THREE = await import(/* @vite-ignore */ threeUrl);
    type Game = { vehicle: { model: import('three').Group }; camera: import('three').PerspectiveCamera;
      renderer: import('three').WebGLRenderer; setPhotoView(view: {
        position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number }; fov: number;
      }): Promise<void> };
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    await game.setPhotoView({ position: { x: -253.213, y: 16.214, z: 269.189 },
      target: { x: -249.582, y: 13.952, z: 256.524 }, fov: 48 });
    const scene = game.vehicle.model.parent! as import('three').Scene, renderer = game.renderer;
    const roof = scene.getObjectByName('Moon hollow roof') as import('three').Mesh<
      import('three').BufferGeometry, import('three').MeshStandardMaterial>;
    const sun = scene.children.find(o => o instanceof THREE.DirectionalLight) as import('three').DirectionalLight;
    const direction = sun.position.clone().sub(sun.target.position).normalize();
    const capture = () => {
      renderer.render(scene, game.camera);
      const width = renderer.domElement.width, height = renderer.domElement.height;
      const gl = renderer.getContext(), pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return { pixels, image: renderer.domElement.toDataURL('image/png'), width, height };
    };
    const current = capture();
    const samples = new Set<number>(), vertices = roof.geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(vertices, i);
      const b = new THREE.Vector3().fromBufferAttribute(vertices, i + 1);
      const c = new THREE.Vector3().fromBufferAttribute(vertices, i + 2);
      const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      if (normal.dot(direction) < 0.1 || normal.dot(game.camera.position.clone().sub(a)) <= 0) continue;
      for (let u = 0.1; u <= 0.8; u += 0.1) for (let v = 0.1; v <= 0.9 - u; v += 0.1) {
        const p = a.clone().multiplyScalar(1 - u - v).addScaledVector(b, u).addScaledVector(c, v);
        const projected = p.clone().project(game.camera);
        if (Math.abs(projected.x) > 0.95 || Math.abs(projected.y) > 0.95) continue;
        const origin = p.clone().addScaledVector(normal, 0.01);
        if (new THREE.Raycaster(origin, direction).intersectObject(roof).length) continue;
        const distance = p.distanceTo(game.camera.position);
        const hit = new THREE.Raycaster(game.camera.position, p.clone().sub(game.camera.position).normalize())
          .intersectObjects(scene.children, true)[0];
        if (!hit || hit.object !== roof || Math.abs(hit.distance - distance) > 0.03) continue;
        const x = Math.floor((projected.x + 1) * 0.5 * current.width);
        const y = Math.floor((projected.y + 1) * 0.5 * current.height);
        samples.add((y * current.width + x) * 4);
      }
    }
    const bias = renderer.properties.get(roof.material).uniforms.staticSunBias;
    const previous = bias.value;
    let reference: ReturnType<typeof capture>;
    try { bias.value = 2; reference = capture(); } finally { bias.value = previous; }
    const differences = [...samples].map(offset => Math.max(...[0, 1, 2].map(channel =>
      Math.abs(current.pixels[offset + channel] - reference.pixels[offset + channel]))));
    return { current: current.image, reference: reference.image, samples: samples.size,
      patterned: differences.filter(d => d > 3).length, maximumDifference: Math.max(...differences) };
  });
  const folder = `artifacts/moon/static-tube-shadows/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  await writeFile(`${folder}/reported-current.png`, Buffer.from(result.current.split(',')[1], 'base64'));
  await writeFile(`${folder}/reported-unoccluded-reference.png`, Buffer.from(result.reference.split(',')[1], 'base64'));
  await writeFile(`${folder}/reported-roof.json`, JSON.stringify({
    samples: result.samples, patterned: result.patterned, maximumDifference: result.maximumDifference,
  }, null, 2));
  expect(result.samples).toBeGreaterThan(150);
  expect(result.patterned, JSON.stringify({ samples: result.samples, patterned: result.patterned,
    maximumDifference: result.maximumDifference })).toBe(0);
  expect(errors).toEqual([]);
});
