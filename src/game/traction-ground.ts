import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { Area } from './areas';
import { SURFACES, type SurfaceId } from './surfaces';
import type { Vehicle } from './vehicle';

export const TRACTION_RAMPS = [10, 20, 25, 32].map((degrees, i) => ({
  id: `grade-${degrees}`, name: `${degrees} deg`, x: -80 + i * 40, z: -8, heading: 0, degrees,
}));
export const TRACTION_STARTS = [
  { id: 'pad', name: 'Constant-radius arc', x: 38, z: 52, heading: 0 },
  { id: 'slalom', name: 'Slalom', x: 66, z: 60, heading: 0 },
  ...TRACTION_RAMPS,
  { id: 'split', name: 'Split grip', x: -36, z: 52, heading: 0 },
  { id: 'traverse', name: 'Traverse 15 deg / unload', x: 82, z: -25, heading: 0 },
] as const;
export const TRACTION_SURFACES = ['dirt', 'rock', 'grass', 'sand', 'ash', 'mars-dust', 'mud', 'snow', 'ice', 'regolith', 'mars-glass'] as const;
export type TractionSurface = typeof TRACTION_SURFACES[number];
const HALF = 120;
const clamp = (v: number) => THREE.MathUtils.clamp(v, 0, 1);

function vertexHeight(x: number, z: number) {
  for (const ramp of TRACTION_RAMPS) {
    const side = clamp((19 - Math.abs(x - ramp.x)) / 2);
    if (side > 0) return Math.fround(clamp((-z - 24) / 24) * 24
      * Math.tan(ramp.degrees * Math.PI / 180) * side);
  }
  const across = clamp((x - 65) / 32);
  const ends = clamp((z + 66) / 6) * clamp((-z - 14) / 6);
  const edge = clamp((105 - x) / 8);
  const bump = 0.34 * Math.exp(-((x - 81) ** 2 / 0.9 + (z + 38) ** 2 / 2));
  return Math.fround((across * 32 * Math.tan(15 * Math.PI / 180) + bump) * ends * edge);
}
// Same diagonal and float precision as the rendered/collidable one-metre grid.
export function tractionHeight(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z), u = x - ix, v = z - iz;
  const a = vertexHeight(ix, iz), b = vertexHeight(ix + 1, iz);
  const c = vertexHeight(ix, iz + 1), d = vertexHeight(ix + 1, iz + 1);
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v
    : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}

export function tractionMesh() {
  const vertices: number[] = [], indices: number[] = [];
  for (let z = -HALF; z <= HALF; z++) for (let x = -HALF; x <= HALF; x++)
    vertices.push(x, vertexHeight(x, z), z);
  const width = HALF * 2 + 1;
  for (let z = 0; z < width - 1; z++) for (let x = 0; x < width - 1; x++) {
    const a = z * width + x;
    indices.push(a, a + width, a + 1, a + 1, a + width, a + width + 1);
  }
  return { vertices: Float32Array.from(vertices), indices: Uint32Array.from(indices) };
}

export function createTractionGround(startId: string | null, initialSurface: string | null) {
  const start = TRACTION_STARTS.find(s => s.id === startId) ?? TRACTION_STARTS[0];
  let surface: TractionSurface = TRACTION_SURFACES.find(s => s === initialSurface) ?? 'dirt';
  let splitSurface: TractionSurface = 'ice';
  let ground: THREE.Mesh | undefined;
  let markingsMaterial: THREE.LineBasicMaterial | undefined;
  const markingColor = () => surface === 'ice' ? '#456b75' : '#f5e8bc';
  const surfaceAt = (x: number, z: number): SurfaceId =>
    z >= 8 && z <= 60 && x >= -44 && x < -36 ? splitSurface : surface;
  const colorAt = (x: number, z: number) => {
    const id = surfaceAt(x, z);
    return new THREE.Color(id === 'ice' ? '#b7d8df' : id === 'dirt' ? '#998a70' : SURFACES[id].particleColor);
  };
  const repaint = () => {
    if (!ground) return;
    markingsMaterial?.color.set(markingColor());
    const positions = ground.geometry.getAttribute('position');
    const colors = ground.geometry.getAttribute('color');
    for (let i = 0; i < positions.count; i++) {
      const color = colorAt(positions.getX(i), positions.getZ(i));
      colors.setXYZ(i, color.r, color.g, color.b);
    }

    colors.needsUpdate = true;
  };
  const area: Area = {
    id: 'valley', name: 'Traction lab (DEV)', label: 'DEVELOPMENT ONLY',
    tagline: 'Repeatable tyre trials.', description: 'Measured climbs, split grip, arc, slalom and traverse.',
    hint: 'Use the lab panel to choose a start and surface. Existing pedals and steering are unchanged.',
    welcomeEyebrow: 'DEVELOPMENT / TRACTION LAB', welcomeTitle: 'Four wheels. Known ground.',
    readyMessage: 'Traction lab ready.', ambientLight: '#e8eef0', groundLight: '#6f756c', sunlight: '#fff5df',
    spawn: { x: start.x, y: tractionHeight(start.x, start.z) + 1.2, z: start.z },
    spawnHeading: start.heading, half: HALF, climbingPower: 1.45,
    sky: '#b9cdd5', fogNear: 160, fogFar: 340,
    surfaceHeight: tractionHeight, surfaceAt, waterHeight: () => null,
    build(scene, world) {
      const data = tractionMesh(), geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(data.vertices, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(data.vertices.length), 3));
      geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
      geometry.computeVertexNormals();
      ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
      ground.name = 'Traction lab ground'; ground.receiveShadow = true;
      repaint(); scene.add(ground);
      world.createCollider(RAPIER.ColliderDesc.trimesh(data.vertices, data.indices).setFriction(0.9));
      const points: THREE.Vector3[] = [];
      const line = (x: number, z: number, xx: number, zz: number) =>
        points.push(new THREE.Vector3(x, tractionHeight(x, z) + 0.035, z),
          new THREE.Vector3(xx, tractionHeight(xx, zz) + 0.035, zz));
      for (const ramp of TRACTION_RAMPS) {
        for (const side of [-1, 1]) for (let z = -65; z < 0; z++)
          line(ramp.x + side * 16, z, ramp.x + side * 16, z + 1);
        for (const z of [-24, -32, -40, -48]) line(ramp.x - 16, z, ramp.x + 16, z);
      }
      for (let i = 0; i < 96; i++) {
        const a = i / 96 * Math.PI * 2, b = (i + 1) / 96 * Math.PI * 2;
        line(38 + Math.cos(a) * 15, 30 + Math.sin(a) * 15, 38 + Math.cos(b) * 15, 30 + Math.sin(b) * 15);
      }
      for (let x = 8; x <= 68; x += 5) line(x, 0, x, 60);
      for (let z = 0; z <= 60; z += 5) line(8, z, 68, z);
      for (const x of [-44, -36, -28]) line(x, 8, x, 60);
      for (const x of [79, 85]) for (let z = -60; z < -20; z++) line(x, z, x, z + 1);
      for (let x = -HALF; x < HALF; x += 2) {
        line(x, -117, x + 1, -117); line(x, 117, x + 1, 117);
        line(-117, x, -117, x + 1); line(117, x, 117, x + 1);
      }
      markingsMaterial = new THREE.LineBasicMaterial({ color: markingColor() });
      const markings = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), markingsMaterial);
      markings.name = 'Measured lane markings'; scene.add(markings);
      for (let i = 0; i < 6; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 6),
          new THREE.MeshStandardMaterial({ color: '#e69a42' }));
        cone.position.set(66 + (i % 2 ? 2 : -2), 0.35, 52 - i * 7);
        scene.add(cone);
      }
      for (const ramp of TRACTION_RAMPS) {
        const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Traction lab labels require a 2D canvas');
        ctx.fillStyle = '#26363a'; ctx.fillRect(0, 0, 256, 64);
        ctx.fillStyle = '#fff0cc'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(ramp.name, 128, 46);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8),
          new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide }));
        sign.position.set(ramp.x + 18, 1.4, -20); scene.add(sign);
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1),
          new THREE.MeshStandardMaterial({ color: '#59666a' }));
        pole.position.set(ramp.x + 18, 0.5, -20); scene.add(pole);
      }
    },
  };
  return {
    area, starts: TRACTION_STARTS,
    get surface() { return surface; },
    get splitSurface() { return splitSurface; },
    setSurface(value: string, split = false) {
      const valid = TRACTION_SURFACES.find(s => s === value);
      if (!valid) throw new Error(`Unknown traction lab surface: ${value}`);
      if (split) splitSurface = valid; else surface = valid;
      repaint();
    },
  };
}

export function mountTractionPanel(
  lab: ReturnType<typeof createTractionGround>, vehicle: () => Vehicle, restart: () => Promise<void>,
) {
  const panel = document.createElement('section');
  panel.id = 'traction-lab';
  panel.style.cssText = 'position:fixed;top:68px;left:12px;z-index:20;background:#172b30ee;color:#fff0cc;padding:10px;border-radius:8px;font:11px monospace;max-width:calc(100vw - 24px);pointer-events:auto';
  panel.setAttribute('aria-label', 'Development traction lab');
  const title = document.createElement('strong'); title.textContent = 'TRACTION LAB / DEV'; panel.append(title, document.createElement('br'));
  const select = (name: string, values: readonly { id: string; name: string }[], value: string) => {
    const label = document.createElement('label'); label.textContent = `${name} `;
    const input = document.createElement('select'); input.setAttribute('aria-label', name);
    for (const item of values) input.add(new Option(item.name, item.id));
    input.value = value; label.append(input); panel.append(label, document.createElement('br'));
    return input;
  };
  const start = lab.starts.find(s => s.x === lab.area.spawn.x && s.z === lab.area.spawn.z)!;
  const starts = select('Start', lab.starts, start.id);
  const heading = select('Heading', [
    { id: '0', name: 'Straight' }, { id: '0.65', name: 'Oblique 37 deg' }, { id: '3.141592653589793', name: 'Reverse approach' },
  ], '0');
  const updateStart = () => {
    const start = lab.starts.find(s => s.id === starts.value)!;
    const angle = Number(heading.value);
    const x = start.x + (start.id.startsWith('grade-') && angle === 0.65 ? 15 : 0);
    Object.assign(lab.area.spawn, { x, y: tractionHeight(x, start.z) + 1.2, z: start.z });
    lab.area.spawnHeading = angle + start.heading;
  };
  heading.addEventListener('change', updateStart);
  const surfaces = TRACTION_SURFACES.map(id => ({ id, name: id }));
  const surface = select('Surface', surfaces, lab.surface);
  const split = select('Left strip', surfaces, lab.splitSurface);
  surface.addEventListener('change', () => lab.setSurface(surface.value));
  split.addEventListener('change', () => lab.setSurface(split.value, true));
  starts.addEventListener('change', updateStart);
  const button = document.createElement('button'); button.textContent = 'Repeat start';
  button.addEventListener('click', () => { void restart(); }); panel.append(button);
  const readout = document.createElement('pre'); readout.style.margin = '6px 0 0'; panel.append(readout);
  document.body.append(panel);
  return {
    dispose: () => panel.remove(),
    update(playing: boolean) {
      panel.hidden = !playing;
      const car = vehicle(), v = car.body.linvel(), f = car.forward;
      const lateral = v.x * f.z - v.z * f.x;
      readout.textContent = `v ${car.speed.toFixed(2)} m/s | side ${lateral.toFixed(2)}\n`
        + car.wheelTelemetry.map((wheel, i) => `${['FL', 'FR', 'RL', 'RR'][i]} ${wheel.surface.padEnd(5)} ${wheel.grounded ? 'ON ' : 'AIR'} ${wheel.visualRpm.toFixed(0).padStart(3)} rpm ${wheel.load.toFixed(0).padStart(3)} N\n`
          + `   slip ${wheel.slipRatio.toFixed(2)} grip ${wheel.gripMultiplier.toFixed(2)} lateral ${wheel.lateralSpeed.toFixed(2)} m/s`).join('\n');
    },
  };
}
