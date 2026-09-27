// Render the actual game vehicles as transparent selection-button images.
// Run: node --import tsx scripts/render-car-thumbnails.ts
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const address = server.httpServer?.address();
if (!address || typeof address === 'string') throw new Error('Could not start thumbnail render server.');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  // A blank same-origin page lets us load the models without starting the game.
  await page.route('**/thumbnail-render', route => route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
  await page.goto(`http://127.0.0.1:${address.port}/thumbnail-render`);
  const images = await page.evaluate(async () => {
    // Resolve the same optimized module URLs (including hashes) as the vehicle.
    const source = await (await fetch('/src/game/vehicle.ts')).text();
    const threeUrl = source.match(/from "([^"\n]*deps\/three[^"\n]*)"/)?.[1];
    const rapierUrl = source.match(/from "([^"\n]*rapier[^"\n]*)"/)?.[1];
    if (!threeUrl || !rapierUrl) throw new Error('Missing browser model dependencies');
    const THREE = await import(/* @vite-ignore */ threeUrl);
    const { default: RAPIER } = await import(/* @vite-ignore */ rapierUrl);
    // @ts-expect-error Browser-only Vite module URL.
    const { Vehicle, VEHICLE_MODELS } = await import('/src/game/vehicle.ts');
    // @ts-expect-error Browser-only Vite module URL.
    const { disposeScene } = await import('/src/game/dispose.ts');
    await RAPIER.init();
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(360, 240);
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const images: Record<string, string> = {};
    for (const model of VEHICLE_MODELS) {
      const scene = new THREE.Scene();
      const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
      try {
        const vehicle = new Vehicle(scene, world, { x: 0, y: 0, z: 0 }, 1, undefined, undefined, undefined, model);
        scene.add(new THREE.HemisphereLight('#fef3d6', '#7f9f87', 1.9));
        const sun = new THREE.DirectionalLight('#fff0d1', 2.6);
        sun.position.set(-3, 7, -5);
        scene.add(sun);
        const bounds = new THREE.Box3().setFromObject(vehicle.model);
        const center = bounds.getCenter(new THREE.Vector3());
        const camera = new THREE.PerspectiveCamera(30, 1.5, 0.1, 100);
        camera.position.copy(center).add(new THREE.Vector3(4.5, 2.85, -5.25));
        camera.lookAt(center);
        renderer.render(scene, camera);
        images[model] = renderer.domElement.toDataURL('image/png').split(',')[1];
      } finally {
        disposeScene(scene);
        world.free();
      }
    }
    renderer.dispose();
    return images;
  });
  await mkdir('public/cars', { recursive: true });
  for (const [model, data] of Object.entries(images)) {
    await writeFile(`public/cars/${model}.png`, Buffer.from(data, 'base64'));
    console.log(`Rendered public/cars/${model}.png`);
  }
} finally {
  await browser.close();
  await server.close();
}
