// Render the real game meshes/materials, not a surface-class palette.
// Run: node --import tsx scripts/render-iceland-aerial.ts
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({
  logLevel: 'error', server: { host: '127.0.0.1', port: 0, watch: null, hmr: false },
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(address && typeof address !== 'string', 'Aerial render server did not start');
  browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=metal'] });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/aerial-render', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><html><body></body></html>',
  }));
  await page.goto(`http://127.0.0.1:${address.port}/aerial-render`);
  console.log('Building full-detail Iceland terrain and actual game scenery…');
  const images = await page.evaluate(async () => {
    const source = await (await fetch('/src/game/iceland-scenery.ts')).text();
    const threeUrl = source.match(/from "([^"\n]*deps\/three\.js[^"\n]*)"/)?.[1];
    const rapierUrl = source.match(/from "([^"\n]*rapier[^"\n]*)"/)?.[1];
    if (!threeUrl || !rapierUrl) throw new Error('Missing browser rendering dependencies');
    const THREE = await import(/* @vite-ignore */ threeUrl);
    const { default: RAPIER } = await import(/* @vite-ignore */ rapierUrl);
    // @ts-expect-error Browser-only Vite module URL.
    const { generateIcelandChunk, ICELAND_MIN_CHUNK, ICELAND_MAX_CHUNK } = await import('/src/game/iceland-terrain.ts');
    // @ts-expect-error Browser-only Vite module URL.
    const { buildIcelandScenery } = await import('/src/game/iceland-scenery.ts');
    // @ts-expect-error Browser-only Vite module URL.
    const { AREAS } = await import('/src/game/areas.ts');
    // @ts-expect-error Browser-only Vite module URL.
    const { disposeScene } = await import('/src/game/dispose.ts');
    await RAPIER.init();
    const area = AREAS.iceland;
    const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(area.sky);
    // Driving-distance fog would hide the whole island from aerial altitude.
    scene.fog = null;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    const context = renderer.getContext();
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    let scenery: ReturnType<typeof buildIcelandScenery> | undefined;
    try {
      scene.add(new THREE.HemisphereLight(area.ambientLight, area.groundLight, 1.9));
      const sun = new THREE.DirectionalLight(area.sunlight, 2.6);
      // Same direction as the driving sun; cover the whole island, not a car-sized patch.
      sun.position.set(-1000, 1800, 800);
      sun.castShadow = true;
      sun.shadow.mapSize.set(4096, 4096);
      sun.shadow.normalBias = 0.06;
      sun.shadow.bias = -0.0001;
      Object.assign(sun.shadow.camera, { left: -1100, right: 1100, top: 1100, bottom: -1100, near: 1, far: 4000 });
      sun.shadow.camera.updateProjectionMatrix();
      scene.add(sun, sun.target);
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
      let chunks = 0, triangles = 0;
      for (let cz = ICELAND_MIN_CHUNK; cz <= ICELAND_MAX_CHUNK; cz++)
        for (let cx = ICELAND_MIN_CHUNK; cx <= ICELAND_MAX_CHUNK; cx++) {
          const chunk = generateIcelandChunk(cx, cz);
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(chunk.vertices, 3));
          geometry.setAttribute('normal', new THREE.BufferAttribute(chunk.normals, 3));
          geometry.setAttribute('color', new THREE.BufferAttribute(chunk.colors, 3));
          geometry.setIndex(new THREE.BufferAttribute(chunk.indices, 1));
          const mesh = new THREE.Mesh(geometry, material);
          mesh.receiveShadow = true;
          scene.add(mesh);
          chunks++; triangles += chunk.indices.length / 3;
        }
      scenery = buildIcelandScenery(world);
      scene.add(scenery.group);
      for (const name of ['Iceland · solid southern glaciers', 'Iceland · deep sea', 'Skógá · continuous river', 'Vatnajökull · layered ice cave'])
        if (!scene.getObjectByName(name)) throw new Error(`Missing actual scenery: ${name}`);
      const width = 3072, height = 3072;
      const camera = new THREE.OrthographicCamera(-area.half, area.half, area.half, -area.half, 1, 3000);
      camera.up.set(0, 0, -1);
      camera.position.set(0, 1800, 0); camera.lookAt(0, 0, 0);
      renderer.setSize(width, height);
      renderer.render(scene, camera);
      if (context.isContextLost()) throw new Error('Aerial WebGL context lost');
      if (context.getError() !== context.NO_ERROR) throw new Error('Aerial WebGL rendering error');
      return { data: renderer.domElement.toDataURL('image/png').split(',')[1], width, height, chunks, triangles };
    } finally {
      if (scenery) { scene.remove(scenery.group); scenery.dispose(); }
      disposeScene(scene);
      renderer.dispose();
      world.free();
    }
  });
  assert.deepEqual(errors, [], 'Browser errors during aerial rendering');
  assert.equal(images.chunks, 324, 'Render every terrain chunk at full detail');
  assert.ok(images.triangles > 1_000_000, 'Do not substitute coarse horizon terrain');
  await mkdir('artifacts/iceland', { recursive: true });
  const png = Buffer.from(images.data, 'base64');
  assert.equal(png.readUInt32BE(16), images.width);
  assert.equal(png.readUInt32BE(20), images.height);
  await writeFile('artifacts/iceland/iceland-aerial.png', png);
  console.log(`Rendered artifacts/iceland/iceland-aerial.png (${images.width} × ${images.height})`);
  console.log(`Used ${images.chunks} full-detail terrain chunks (${images.triangles} terrain triangles) plus game scenery.`);
} finally {
  await browser?.close();
  await server.close();
}
