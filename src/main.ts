import './styles.css';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicle } from './game/vehicle';
import { FollowCamera } from './game/camera';
import { FixedClock } from './game/driving';
import { sampledHeightAt } from './game/northern-terrain';
import { COAST_START } from './game/northern-coast';
import { PASS_START } from './game/northern-pass';
import { EMBER_START } from './game/northern-ember';
import { RAMPS } from './game/terrain';
import { FORDS, VOLCANOES, GLACIER, GLACIER_ASCENT, VOLCANO_ASCENT } from './game/highlands';
import { AREAS, isAreaId, type Area, type AreaId, type AreaRuntime } from './game/areas';
import { disposeScene } from './game/dispose';
import { TerrainEffects } from './game/terrain-effects';
import { Controls, element } from './ui/controls';
import { registerOfflinePlay } from './pwa';
import { navigationReading } from './game/navigation';

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
  async function createArea(area: Area) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(area.sky);
    scene.fog = new THREE.Fog(area.sky, area.fogNear, area.fogFar);
    const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    world.timestep = 1 / 60;
    let runtime: AreaRuntime | void = undefined;
    try {
      runtime = area.build(scene, world, showError);
      await runtime?.ensureReady(area.spawn.x, area.spawn.z);
      // Newly streamed fixed colliders enter Rapier's scene-query broad phase on a world step.
      world.step();
      const vehicle = new Vehicle(
        scene,
        world,
        area.spawn,
        area.climbingPower,
        area.surfaceAt,
        area.waterHeight,
        (x, z) => runtime?.shrubBumpAt(x, z) ?? 0,
      );
      const follow = new FollowCamera(camera, world, vehicle, area.surfaceHeight);
      // Populate scene queries and settle all four wheels before handing over control.
      for (let i = 0; i < 90; i++) {
        vehicle.beforeStep({ steer: 0, forward: false, reverse: false }, 1 / 60);
        world.step();
        vehicle.capture();
      }
      vehicle.syncVisuals(1);
      const terrainEffects = new TerrainEffects(scene, area.waterHeight);
      return { scene, world, vehicle, follow, terrainEffects, runtime };
    } catch (error) {
      runtime?.dispose();
      world.free();
      disposeScene(scene);
      throw error;
    }
  }
  const requestedArea = new URLSearchParams(window.location.search).get('area');
  let area = AREAS[isAreaId(requestedArea) ? requestedArea : 'valley'];
  if (area.id === 'northern-reach' && new URLSearchParams(window.location.search).get('start') === 'river-valley') {
    area = { ...area, spawn: { x: -240, z: 232, y: sampledHeightAt(-240, 232) + 1.25 },
      welcomeTitle: 'Follow the river.',
      description: 'Two shallow fords, sheltered banks and a winding ridge loop. Follow amber posts through the water, or stone cairns into the hills.',
      readyMessage: 'River Valley. The amber posts mark the shallow crossings.' };
  }
  if (area.id === 'northern-reach' && new URLSearchParams(window.location.search).get('start') === 'fjord-coast') {
    area = { ...area, spawn: { ...COAST_START, y: sampledHeightAt(COAST_START.x, COAST_START.z) + 1.25 },
      welcomeTitle: 'Explore the coast.',
      description: 'Follow the clifftop trail, descend to sheltered pebble coves and circle the sea stacks along the beach.',
      readyMessage: 'Fjord Coast. Follow the beach loop down to the shallows.' };
  }
  if (area.id === 'northern-reach' && new URLSearchParams(window.location.search).get('start') === 'high-pass') {
    area = { ...area, spawn: { ...PASS_START, y: sampledHeightAt(PASS_START.x, PASS_START.z) + 1.25 },
      welcomeTitle: 'Above the clouds.',
      description: 'Wind between twin peaks, climb to the north lookout and descend into the frozen Blue Hollow. Stone cairns guide the mountain circuit.',
      readyMessage: 'High Pass. Follow the cairns; Blue Hollow is slippery.' };
  }
  if (area.id === 'northern-reach' && new URLSearchParams(window.location.search).get('start') === 'ember-basin') {
    area = { ...area, spawn: { ...EMBER_START, y: sampledHeightAt(EMBER_START.x, EMBER_START.z) + 1.25 },
      welcomeTitle: 'Around the old crater.',
      description: 'Circle the caldera rim, descend into soft ash and weave past basalt columns on the way to the northern overlook.',
      readyMessage: 'Ember Basin. Follow the ochre trail; loose ash slows the crater descent.' };
  }
  document.body.dataset.area = area.id;
  element('loading-status').textContent = area.id === 'northern-reach'
    ? 'Preparing the road ahead...'
    : 'Waking up four little wheels';
  const initial = await createArea(area);
  if (hasFailed()) {
    initial.runtime?.dispose();
    initial.terrainEffects.dispose();
    initial.world.free();
    disposeScene(initial.scene);
    return;
  }
  let { scene, world, vehicle, follow, terrainEffects, runtime } = initial;
  const areaSelect = element<HTMLSelectElement>('area-select');
  function presentArea() {
    scene.add(ambient, sun, sun.target);
    ambient.color.set(area.ambientLight);
    ambient.groundColor.set(area.groundLight);
    sun.color.set(area.sunlight);
    camera.fov = 48;
    camera.updateProjectionMatrix();
    document.body.dataset.area = area.id;
    areaSelect.value = area.id;
    element('area-label').textContent = area.label;
    element('area-tagline').textContent = area.tagline;
    element('welcome-description').textContent = area.description;
    element('welcome-eyebrow').textContent = area.welcomeEyebrow;
    element('welcome-title').textContent = area.welcomeTitle;
    element('hint').textContent = area.hint;
    element('surface-label').textContent = area.id === 'samurai-village' && vehicle.currentSurface.id === 'water' ? 'Shallow lake' : vehicle.currentSurface.label;
    element('surface-trait').textContent = vehicle.currentSurface.trait;
    element('loading-status').textContent = area.readyMessage;
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
  let resetInProgress = false;
  let pauseAfterReset = false;
  const navigationForward = new THREE.Vector3(0, 0, -1);
  let displayedDirection = '';
  let displayedDegrees = -1;
  let displayedElevation = Number.NaN;

  function updateNavigation() {
    navigationForward.set(0, 0, -1).applyQuaternion(vehicle.rotation);
    const reading = navigationReading(
      navigationForward.x,
      navigationForward.z,
      area.surfaceHeight(vehicle.position.x, vehicle.position.z),
    );
    const degrees = Math.round(reading.heading) % 360;
    if (reading.direction !== displayedDirection) {
      displayedDirection = reading.direction;
      element('compass-direction').textContent = reading.direction;
    }
    if (degrees !== displayedDegrees) {
      displayedDegrees = degrees;
      element('compass-degrees').textContent = `${degrees.toString().padStart(3, '0')}°`;
      element('navigation').style.setProperty('--heading', `${reading.heading.toFixed(1)}deg`);
    }
    if (reading.elevation !== displayedElevation) {
      displayedElevation = reading.elevation;
      element('altitude').textContent = `${reading.elevation} m`;
    }
    element('navigation').setAttribute(
      'aria-label',
      `Heading ${reading.direction}, ${degrees} degrees; terrain elevation ${reading.elevation} metres`,
    );
    return reading;
  }
  updateNavigation();

  const toast = (message: string) => {
    element('toast').textContent = message;
    element('toast').classList.add('visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => element('toast').classList.remove('visible'), 2500);
  };
  let cameraPointer: number | null = null;
  let cameraPointerX = 0;
  let cameraPointerY = 0;
  const clearCameraDrag = () => {
    if (cameraPointer === null) return;
    const pointer = cameraPointer;
    cameraPointer = null;
    canvas.classList.remove('camera-dragging');
    if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
  };
  const pause = () => {
    if (mode === 'loading' && resetInProgress) {
      pauseAfterReset = true;
      return;
    }
    if (mode !== 'playing') return;
    mode = 'paused';
    clearCameraDrag();
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
  const reset = async () => {
    if (mode !== 'playing') return;
    controls?.clear();
    if (runtime) {
      mode = 'loading';
      resetInProgress = true;
      pauseAfterReset = false;
      controls?.setEnabled(false);
      areaSelect.disabled = true;
      element<HTMLButtonElement>('pause').disabled = true;
      element<HTMLButtonElement>('reset').disabled = true;
      vehicle.model.visible = false;
      element('travelling').hidden = false;
      element('travel-status').textContent = 'Preparing terrain around the starting point...';
      await runtime.ensureReady(area.spawn.x, area.spawn.z);
      if (hasFailed()) {
        resetInProgress = false;
        return;
      }
      world.step();
    }
    vehicle.reset();
    for (let i = 0; i < 30; i++) {
      vehicle.beforeStep({ steer: 0, forward: false, reverse: false }, 1 / 60);
      world.step();
      vehicle.capture();
    }
    vehicle.syncVisuals(1);
    terrainEffects.clear();
    clock.reset();
    follow.reset();
    vehicle.model.visible = true;
    if (runtime) {
      mode = 'playing';
      resetInProgress = false;
      element('travelling').hidden = true;
      areaSelect.disabled = false;
      element<HTMLButtonElement>('pause').disabled = false;
      element<HTMLButtonElement>('reset').disabled = false;
      controls?.setEnabled(true);
      if (pauseAfterReset || document.hidden) {
        pauseAfterReset = false;
        pause();
      }
    }
    toast('Back on your wheels. Off you go.');
  };
  controls = new Controls(pause, () => { void reset().catch(showError); });
  canvas.addEventListener('pointerdown', event => {
    if (mode !== 'playing' || event.button !== 0 || cameraPointer !== null) return;
    event.preventDefault();
    cameraPointer = event.pointerId;
    cameraPointerX = event.clientX;
    cameraPointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('camera-dragging');
  });
  canvas.addEventListener('pointermove', event => {
    if (cameraPointer !== event.pointerId) return;
    event.preventDefault();
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    follow.orbit(
      (event.clientX - cameraPointerX) / width * Math.PI * 2,
      (event.clientY - cameraPointerY) / height * Math.PI,
    );
    cameraPointerX = event.clientX;
    cameraPointerY = event.clientY;
  });
  canvas.addEventListener('pointerup', event => {
    if (cameraPointer === event.pointerId) clearCameraDrag();
  });
  canvas.addEventListener('pointercancel', clearCameraDrag);
  canvas.addEventListener('lostpointercapture', clearCameraDrag);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  element('start').addEventListener('click', resume);
  element('resume').addEventListener('click', resume);
  element('pause').addEventListener('click', pause);
  element('reset').addEventListener('click', () => { void reset().catch(showError); });
  areaSelect.addEventListener('focus', () => controls?.clear());
  async function travel(id: AreaId) {
    if (mode === 'loading' || mode === 'error' || id === area.id) {
      areaSelect.value = area.id;
      return;
    }
    mode = 'loading';
    clearCameraDrag();
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
    const next = await createArea(AREAS[id]);
    if (hasFailed()) {
      next.runtime?.dispose();
      next.terrainEffects.dispose();
      next.world.free();
      disposeScene(next.scene);
      return;
    }
    scene.remove(ambient, sun, sun.target);
    runtime?.dispose();
    terrainEffects.dispose();
    world.free();
    disposeScene(scene);
    ({ scene, world, vehicle, follow, terrainEffects, runtime } = next);
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
    url.searchParams.delete('start');
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
          waterDepth: vehicle.waterDepth,
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
          streaming: runtime?.stats ?? null,
          navigation: updateNavigation(),
        }),
        get ramps() { return area.id === 'valley' ? RAMPS : []; },
        fords: FORDS, volcanoes: VOLCANOES, glacier: GLACIER,
        ascents: [GLACIER_ASCENT, VOLCANO_ASCENT],
        placeVehicle: async (x: number, z: number, heading: number) => {
          const previousMode = mode;
          mode = 'loading';
          controls?.clear();
          controls?.setEnabled(false);
          vehicle.model.visible = false;
          await runtime?.ensureReady(x, z);
          if (hasFailed()) return;
          world.step();
          vehicle.reset();
          terrainEffects.clear();
          vehicle.body.setTranslation({ x, y: area.surfaceHeight(x, z) + 1.2, z }, true);
          vehicle.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading), true);
          vehicle.capture();
          vehicle.previousPosition.copy(vehicle.position);
          vehicle.previousRotation.copy(vehicle.rotation);
          vehicle.syncVisuals(1);
          vehicle.model.visible = true;
          clock.reset();
          follow.reset();
          mode = previousMode;
          if (previousMode === 'playing') controls?.setEnabled(true);
        },
        waitForStreamingIdle: () => runtime?.waitForIdle() ?? Promise.resolve(),
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
      runtime?.update(vehicle.position.x, vehicle.position.z);
      const alpha = clock.advance(elapsed, dt => {
        vehicle.beforeStep(controls!.state.value, dt);
        world.step();
        vehicle.capture();
      });
      vehicle.syncVisuals(alpha);
      updateNavigation();
      terrainEffects.update(Math.min(elapsed, 0.05), vehicle);
      const surface = vehicle.currentSurface;
      const surfaceHud = element('surface');
      if (surface.id === 'water') {
        element('surface-trait').textContent = vehicle.waterDepth >= 0.85
          ? 'Too deep · reset'
          : surface.trait;
      }
      if (surfaceHud.dataset.surface !== surface.id) {
        surfaceHud.dataset.surface = surface.id;
        element('surface-label').textContent = area.id === 'samurai-village' && surface.id === 'water' ? 'Shallow lake' : surface.label;
        element('surface-trait').textContent = surface.id === 'water' && vehicle.waterDepth >= 0.85
          ? 'Too deep · reset'
          : surface.trait;
        surfaceHud.classList.remove('changed');
        if (!reducedMotion.matches && performance.now() - lastSurfaceCue > 1200) {
          lastSurfaceCue = performance.now();
          requestAnimationFrame(() => surfaceHud.classList.add('changed'));
          window.clearTimeout(surfaceCueTimer);
          surfaceCueTimer = window.setTimeout(() => surfaceHud.classList.remove('changed'), 750);
        }
      }
      playingTime += Math.min(elapsed, 0.1);
      const fallFloor = Math.min(-12, area.surfaceHeight(vehicle.position.x, vehicle.position.z) - 15);
      if (vehicle.position.y < fallFloor) void reset().catch(showError);
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
