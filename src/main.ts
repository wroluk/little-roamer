import './styles.css';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicle } from './game/vehicle';
import { FollowCamera } from './game/camera';
import { FixedClock } from './game/driving';
import { RAMPS } from './game/terrain';
import { FORDS, VOLCANOES, GLACIER, GLACIER_ASCENT, VOLCANO_ASCENT } from './game/highlands';
import { AREAS, isAreaId, type Area, type AreaId } from './game/areas';
import { disposeScene } from './game/dispose';
import { TerrainEffects } from './game/terrain-effects';
import { Controls, element } from './ui/controls';
import { registerOfflinePlay } from './pwa';

type Mode = 'loading' | 'ready' | 'playing' | 'paused' | 'error';
let mode: Mode = 'loading';
let controls: Controls | undefined;
const hasFailed = () => mode === 'error';

function showError(error: unknown) {
  mode = 'error';
  controls?.setEnabled(false);
  element('welcome').hidden = true;
  element('paused').hidden = true;
  element('travelling').hidden = true;
  element('error').hidden = false;
  element('error-message').textContent = error instanceof Error
    ? `${error.message} Try reloading in a current Safari, Chrome, or Firefox with WebGL enabled.`
    : 'Something interrupted the game. Please reload in a current browser with WebGL enabled.';
  element<HTMLButtonElement>('pause').disabled = true;
  element<HTMLButtonElement>('reset').disabled = true;
  element<HTMLSelectElement>('area-select').disabled = true;
  console.error('Little Roamer:', error);
}

element('reload').addEventListener('click', () => window.location.reload());
registerOfflinePlay();
window.addEventListener('error', event => showError(event.error ?? new Error(event.message)));
window.addEventListener('unhandledrejection', event => showError(event.reason));

async function boot() {
  const canvas = element<HTMLCanvasElement>('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    showError(new Error('The graphics connection was interrupted.'));
  });
  const camera = new THREE.PerspectiveCamera(48, 1, 0.15, 900);
  const ambient = new THREE.HemisphereLight('#fef3d6', '#7f9f87', 1.9);
  const sun = new THREE.DirectionalLight('#fff0d1', 2.6);
  sun.position.set(-25, 45, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 100;
  sun.shadow.normalBias = 0.06;
  sun.shadow.bias = -0.0001;

  element('loading-status').textContent = 'Waking up four little wheels';
  await RAPIER.init();
  if (hasFailed()) return;
  function createArea(area: Area) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(area.sky);
    scene.fog = new THREE.Fog(area.sky, area.fogNear, area.fogFar);
    const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    world.timestep = 1 / 60;
    try {
      area.build(scene, world);
      const vehicle = new Vehicle(scene, world, area.spawn, area.climbingPower, area.surfaceAt, area.waterHeight);
      const follow = new FollowCamera(camera, world, vehicle, area.surfaceHeight, area.id === 'highlands');
      // Populate scene queries and settle all four wheels before handing over control.
      for (let i = 0; i < 90; i++) {
        vehicle.beforeStep({ steer: 0, forward: false, reverse: false }, 1 / 60);
        world.step();
        vehicle.capture();
      }
      vehicle.syncVisuals(1);
      const terrainEffects = new TerrainEffects(scene, area.waterHeight);
      return { scene, world, vehicle, follow, terrainEffects };
    } catch (error) {
      world.free();
      disposeScene(scene);
      throw error;
    }
  }
  const requestedArea = new URLSearchParams(window.location.search).get('area');
  let area = AREAS[isAreaId(requestedArea) ? requestedArea : 'valley'];
  let { scene, world, vehicle, follow, terrainEffects } = createArea(area);
  const areaSelect = element<HTMLSelectElement>('area-select');
  function presentArea() {
    scene.add(ambient, sun, sun.target);
    ambient.color.set(area.id === 'highlands' ? '#e9f5ff' : '#fef3d6');
    ambient.groundColor.set(area.groundLight);
    sun.color.set(area.sunlight);
    camera.fov = area.id === 'highlands' ? 54 : 48;
    camera.updateProjectionMatrix();
    document.body.dataset.area = area.id;
    areaSelect.value = area.id;
    element('area-label').textContent = area.label;
    element('area-tagline').textContent = area.tagline;
    element('welcome-description').textContent = area.description;
    element('welcome-eyebrow').textContent = area.id === 'highlands' ? 'ICELAND HIGHLANDS / FIRE & ICE' : 'A LITTLE FOUR-WHEEL ESCAPE';
    element('welcome-title').textContent = area.id === 'highlands' ? 'Wilder outside.' : 'Big outside.';
    element('hint').textContent = area.hint;
    element('surface-label').textContent = vehicle.currentSurface.label;
    element('surface-trait').textContent = vehicle.currentSurface.trait;
    element('loading-status').textContent = area.id === 'highlands'
      ? 'A bigger escape. Find the amber river-crossing posts.'
      : 'All packed. The valley is yours.';
    element<HTMLButtonElement>('reset').title = `Return to the ${area.name} starting area (R)`;
  }
  presentArea();
  const clock = new FixedClock();
  let lastTime = performance.now();
  let toastTimer = 0;
  let playingTime = 0;
  let slowFrames = 0;
  let graphicsReduced = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let surfaceCueTimer = 0;
  let lastSurfaceCue = -Infinity;

  const toast = (message: string) => {
    element('toast').textContent = message;
    element('toast').classList.add('visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => element('toast').classList.remove('visible'), 2500);
  };
  const pause = () => {
    if (mode !== 'playing') return;
    mode = 'paused';
    controls?.setEnabled(false);
    clock.reset();
    element('paused').hidden = false;
    element<HTMLButtonElement>('reset').disabled = true;
    element<HTMLButtonElement>('pause').disabled = true;
    element('resume').focus();
  };
  const resume = () => {
    if (mode !== 'paused' && mode !== 'ready') return;
    mode = 'playing';
    document.body.classList.add('playing');
    element('welcome').hidden = true;
    element('paused').hidden = true;
    element<HTMLButtonElement>('pause').disabled = false;
    element<HTMLButtonElement>('reset').disabled = false;
    controls?.setEnabled(true);
    clock.reset();
    lastTime = performance.now();
    follow.reset();
    (document.activeElement as HTMLElement | null)?.blur();
  };
  const reset = () => {
    if (mode !== 'playing') return;
    controls?.clear();
    vehicle.reset();
    terrainEffects.clear();
    clock.reset();
    follow.reset();
    toast('Back on your wheels. Off you go.');
  };
  controls = new Controls(pause, reset);
  element('start').addEventListener('click', resume);
  element('resume').addEventListener('click', resume);
  element('pause').addEventListener('click', pause);
  element('reset').addEventListener('click', reset);
  areaSelect.addEventListener('focus', () => controls?.clear());
  async function travel(id: AreaId) {
    if (mode === 'loading' || mode === 'error' || id === area.id) return;
    mode = 'loading';
    controls?.setEnabled(false);
    clock.reset();
    areaSelect.disabled = true;
    element<HTMLButtonElement>('pause').disabled = true;
    element<HTMLButtonElement>('reset').disabled = true;
    element<HTMLButtonElement>('start').disabled = true;
    element('welcome').hidden = true;
    element('paused').hidden = true;
    element('travelling').hidden = false;
    element('travel-status').textContent = `Heading to ${AREAS[id].name}...`;
    element('toast').classList.remove('visible');
    // Let the loading card paint before generating terrain and the physics mesh.
    await new Promise<void>(resolve => window.setTimeout(resolve, 40));
    if (hasFailed()) return;
    const next = createArea(AREAS[id]);
    scene.remove(ambient, sun, sun.target);
    terrainEffects.dispose();
    world.free();
    disposeScene(scene);
    ({ scene, world, vehicle, follow, terrainEffects } = next);
    terrainEffects.setReduced(graphicsReduced);
    area = AREAS[id];
    presentArea();
    renderer.renderLists.dispose();
    playingTime = 0;
    slowFrames = 0;
    lastTime = performance.now();
    mode = 'ready';
    document.body.classList.remove('playing');
    element('travelling').hidden = true;
    element('welcome').hidden = false;
    element<HTMLButtonElement>('start').disabled = false;
    areaSelect.disabled = false;
    follow.update(1 / 60, true);
    const url = new URL(window.location.href);
    url.searchParams.set('area', id);
    window.history.replaceState(null, '', url);
    element('start').focus();
  }
  areaSelect.addEventListener('change', () => {
    const id = areaSelect.value;
    if (!isAreaId(id)) {
      showError(new Error('That exploration area is not available.'));
      return;
    }
    void travel(id).catch(showError);
  });
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    clock.reset();
    lastTime = performance.now();
  });
  window.addEventListener('pagehide', pause);

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  resize();

  follow.update(1 / 60, true);
  mode = 'ready';
  element<HTMLButtonElement>('start').disabled = false;
  element('start-label').textContent = 'Let’s take a drive';
  areaSelect.disabled = false;

  // Development-only instrumentation for real-browser behavioral tests.
  if (import.meta.env.DEV) {
    const cameraProbe = new RAPIER.Ball(0.25);
    Object.assign(window, {
      __ROAMER__: {
        snapshot: () => ({
          area: area.id, bounds: area.half, spawn: area.spawn,
          surface: vehicle.currentSurface.id,
          wheelSurfaces: vehicle.wheelSurfaces,
          terrainFeedback: vehicle.terrainFeedback,
          terrainParticles: terrainEffects.count,
          terrainParticleCapacity: terrainEffects.capacity,
          terrainEffectUsesInstanceColors: terrainEffects.usesInstanceColors,
          reducedMotion: reducedMotion.matches,
          cameraFeedbackApplied: reducedMotion.matches ? 0 : vehicle.terrainFeedback,
          waterHeight: area.waterHeight(vehicle.position.x, vehicle.position.z),
          mode, position: { ...vehicle.body.translation() }, rotation: { ...vehicle.body.rotation() },
          velocity: { ...vehicle.body.linvel() }, speed: vehicle.speed,
          contacts: vehicle.contactCount(), input: controls?.state.value,
          camera: camera.position.toArray(), targetDistance: camera.position.distanceTo(vehicle.model.position),
          wheelSteering: vehicle.controller.wheelSteering(0),
          suspension: [0, 1, 2, 3].map(i => vehicle.controller.wheelSuspensionLength(i)),
          drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
          pixelRatio: renderer.getPixelRatio(), graphicsReduced,
          geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
          cameraObstructed: world.intersectionWithShape(camera.position, camera.quaternion,
            cameraProbe, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC) !== null,
        }),
        get ramps() { return area.id === 'valley' ? RAMPS : []; },
        fords: FORDS, volcanoes: VOLCANOES, glacier: GLACIER,
        ascents: [GLACIER_ASCENT, VOLCANO_ASCENT],
        placeVehicle: (x: number, z: number, heading: number) => {
          controls?.clear();
          vehicle.reset();
          terrainEffects.clear();
          vehicle.body.setTranslation({ x, y: area.surfaceHeight(x, z) + 1.2, z }, true);
          vehicle.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading), true);
          vehicle.capture();
          vehicle.previousPosition.copy(vehicle.position);
          vehicle.previousRotation.copy(vehicle.rotation);
          vehicle.syncVisuals(1);
          clock.reset();
          follow.reset();
        },
        get vehicle() { return vehicle; },
        get world() { return world; },
        get follow() { return follow; },
        camera, pause, reset,
      },
    });
  }

  const sunOffset = new THREE.Vector3(-25, 45, 20);
  function frame(now: number) {
    if (mode === 'error') return;
    requestAnimationFrame(frame);
    const elapsed = Math.max(0, (now - lastTime) / 1000);
    lastTime = now;
    if (document.hidden || mode === 'paused' || mode === 'loading') return;
    if (mode === 'playing') {
      const alpha = clock.advance(elapsed, dt => {
        vehicle.beforeStep(controls!.state.value, dt);
        world.step();
        vehicle.capture();
      });
      vehicle.syncVisuals(alpha);
      terrainEffects.update(Math.min(elapsed, 0.05), vehicle);
      const surface = vehicle.currentSurface;
      const surfaceHud = element('surface');
      if (surfaceHud.dataset.surface !== surface.id) {
        surfaceHud.dataset.surface = surface.id;
        element('surface-label').textContent = surface.label;
        element('surface-trait').textContent = surface.trait;
        surfaceHud.classList.remove('changed');
        if (!reducedMotion.matches && performance.now() - lastSurfaceCue > 1200) {
          lastSurfaceCue = performance.now();
          requestAnimationFrame(() => surfaceHud.classList.add('changed'));
          window.clearTimeout(surfaceCueTimer);
          surfaceCueTimer = window.setTimeout(() => surfaceHud.classList.remove('changed'), 750);
        }
      }
      playingTime += Math.min(elapsed, 0.1);
      if (vehicle.position.y < -12) reset();
      element('hint').style.opacity = playingTime > 12 ? '0' : '1';
      // A sustained slow frame rate reduces fill cost and shadow work on tablets.
      if (!graphicsReduced) {
        slowFrames = elapsed > 0.038 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
        if (slowFrames > 100) {
          graphicsReduced = true;
          terrainEffects.setReduced(true);
          renderer.setPixelRatio(1);
          renderer.shadowMap.enabled = false;
          scene.traverse(object => {
            if (object instanceof THREE.Mesh) {
              for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.needsUpdate = true;
            }
          });
          resize();
        }
      }
    }
    follow.update(Math.min(elapsed, 0.05), mode === 'ready',
      reducedMotion.matches ? 0 : vehicle.terrainFeedback);
    sun.target.position.copy(vehicle.model.position);
    sun.position.copy(vehicle.model.position).add(sunOffset);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

void boot().catch(showError);
