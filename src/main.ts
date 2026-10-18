import './styles.css';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  isVehicleModelId, Vehicle, type VehicleModelId,
} from './game/vehicle';
import { earthVehicle, vehicleAvailable } from './game/vehicle-selection';
import { FollowCamera, horizontalDragDirection } from './game/camera';
import { FixedClock } from './game/driving';
import { NORTHERN_STARTS, nearestNorthernStart, regionalSpawn } from './game/regional-starts';
import { MARS_STARTS, nearestMarsStart, marsSpawn } from './game/mars-terrain';
import { ICELAND_STARTS, nearestIcelandStart, icelandStartSpawn } from './game/iceland-starts';
import { SKOGA_WATER_START } from './game/iceland-terrain';
import { SKOGA_MOUTH_Z, SKOGA_WATER_MAX_X, SKOGA_WATER_MIN_X } from './game/iceland-river';
import { marshWeight } from './game/northern-marsh';
import { shoalsWaterRegion } from './game/northern-adventures';
import { lakeShoreDistance, inletDistance, inletWidth } from './game/northern-watershed';
import { RAMPS } from './game/terrain';
import { FORDS, VOLCANOES, GLACIER, GLACIER_ASCENT, VOLCANO_ASCENT } from './game/highlands';
import { AREAS, isAreaId, type Area, type AreaId, type AreaRuntime } from './game/areas';
import { disposeScene } from './game/dispose';
import { TerrainEffects } from './game/terrain-effects';
import { Controls, element } from './ui/controls';
import { registerOfflinePlay } from './pwa';
import { navigationReading } from './game/navigation';
import { POSTCARDS, POSTCARD_STORAGE_KEY, PostcardTracker, readPostcardRecords, type Postcard } from './game/postcards';

type Mode = 'loading' | 'ready' | 'playing' | 'paused' | 'error';
let mode: Mode = 'loading';
let controls: Controls | undefined;
const hasFailed = () => mode === 'error';

function showError(error: unknown) {
  mode = 'error';
  controls?.setEnabled(false);
  document.body.classList.remove('photo-mode', 'photo-clean');
  element('photo-panel').hidden = true;
  element('welcome').hidden = true;
  element('paused').hidden = true;
  element('travelling').hidden = true;
  element('error').hidden = false;
  element('error-message').textContent = error instanceof Error
    ? `${error.message} Try reloading in a current Safari, Chrome, or Firefox with WebGL enabled.`
    : 'Something interrupted the game. Please reload in a current browser with WebGL enabled.';
  element<HTMLButtonElement>('pause').disabled = true;
  element<HTMLButtonElement>('reset').disabled = true;
  element<HTMLFieldSetElement>('area-picker').disabled = true;
  element<HTMLFieldSetElement>('car-picker').disabled = true;
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
  const modelFromUrl = new URLSearchParams(window.location.search).get('car');
  const requestedArea = new URLSearchParams(window.location.search).get('area');
  let storedModel: string | null = null;
  try { storedModel = window.localStorage.getItem('little-roamer-car'); } catch { /* Storage is optional. */ }
  let selectedEarthModel = earthVehicle(requestedArea === 'mars' ? null : modelFromUrl, storedModel);
  let selectedModel: VehicleModelId = selectedEarthModel;
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
        selectedModel,
      );
      if (area.spawnHeading !== undefined) vehicle.body.setRotation(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), area.spawnHeading), true);
      const follow = new FollowCamera(camera, world, vehicle, area.surfaceHeight,
        { pitch: -0.2, yaw: 0 });
      // Populate scene queries and settle all four wheels before handing over control.
      for (let i = 0; i < 90; i++) {
        vehicle.beforeStep({ steer: 0, forward: false, reverse: false }, 1 / 60);
        world.step();
        vehicle.capture();
      }
      vehicle.syncVisuals(1);
      const terrainEffects = new TerrainEffects(scene, area.waterHeight, area.surfaceHeight, area.particleColors);
      return { scene, world, vehicle, follow, terrainEffects, runtime };
    } catch (error) {
      runtime?.dispose();
      world.free();
      disposeScene(scene);
      throw error;
    }
  }
  let area = AREAS[isAreaId(requestedArea) ? requestedArea : 'northern-reach'];
  if (area.id === 'mars') selectedModel = 'mars-scout';
  const syncCarUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('car', selectedModel);
    window.history.replaceState(null, '', url);
  };
  syncCarUrl();
  try { window.localStorage.setItem('little-roamer-car', selectedEarthModel); } catch { /* Storage is optional. */ }
  const requestedStart = NORTHERN_STARTS.find(start => start.id === new URLSearchParams(window.location.search).get('start'));
  if (area.id === 'northern-reach' && requestedStart) {
    area = { ...area, spawn: regionalSpawn(requestedStart),
      welcomeTitle: requestedStart.welcomeTitle, description: requestedStart.description,
      hint: requestedStart.hint ?? area.hint, readyMessage: requestedStart.readyMessage };
  }
  const marsStart = MARS_STARTS.find(start => start.id === new URLSearchParams(window.location.search).get('start'));
  if (area.id === 'mars' && marsStart) area = { ...area, spawn: marsSpawn(marsStart.position), readyMessage: `${marsStart.name}. Take your time and explore.`,
    ...(marsStart.id === 'dish-ridge' ? { welcomeTitle: 'Above the red basin.',
      hint: 'Follow the posts up the switchbacks. The eastern rock ledge loops back to the summit.' } : {}),
    ...(marsStart.id === 'iron-maze' ? { welcomeTitle: 'Between the iron blades.',
      hint: 'Follow the broad passage, take the western bypass, or weave through the rock slalom.' } : {}),
    ...(marsStart.id === 'keyhole-badlands' ? { welcomeTitle: 'Through the weathered stone.',
      hint: 'Follow the wash beneath the sandstone bridges, or climb from the western ledge onto the narrow main crest. The outer wash stays gentle.' } : {}),
    ...(marsStart.id === 'fossil-delta' ? { welcomeTitle: 'Where ancient water wandered.',
      hint: 'The two dry channels rejoin below the sediment fan. Climb the shelf for a view of their branches.' } : {}),
    ...(marsStart.id === 'rust-dunes' ? { welcomeTitle: 'Across the rust-colored sands.',
      hint: 'Stay on the firm perimeter, or climb the loose crescent above the dark bedrock island.' } : {}),
    ...(marsStart.id === 'lava-tubes' ? { welcomeTitle: 'Beneath the cooled lava.',
      hint: 'Two buried tubes meet beneath a collapsed roof. Follow the light through fallen basalt, or roam above. Something waits in the eastern alcove.' } : {}),
    ...(marsStart.id === 'glassfall-plain' ? { welcomeTitle: 'Where the ground turned to glass.',
      hint: 'Follow the firm loop around the pale fan, or leave the road to explore the dark glass flows.' } : {}) };
  const icelandStart = ICELAND_STARTS.find(start => start.id === new URLSearchParams(window.location.search).get('start'));
  if (area.id === 'iceland' && icelandStart) area = {
    ...area, spawn: icelandStartSpawn(icelandStart), spawnHeading: icelandStart.heading,
    welcomeEyebrow: `ICELAND / ${icelandStart.name.toLocaleUpperCase()}`,
    welcomeTitle: icelandStart.welcomeTitle, description: icelandStart.description,
    hint: icelandStart.hint, readyMessage: icelandStart.readyMessage,
  };
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
  let postcardRecords: ReturnType<typeof readPostcardRecords> = [];
  try { postcardRecords = readPostcardRecords(window.localStorage); } catch { /* Storage is optional. */ }
  const foundPostcards = new Set(postcardRecords.map(record => record.id));
  const postcardTracker = new PostcardTracker(foundPostcards, vehicle.position.x, vehicle.position.z);
  let postcardNoticeTimer = 0;
  let postcardNoticeHideTimer = 0;
  const areaPicker = element<HTMLFieldSetElement>('area-picker');
  const areaInputs = [...areaPicker.querySelectorAll<HTMLInputElement>('input[name="area"]')];
  const carPicker = element<HTMLFieldSetElement>('car-picker');
  const carInputs = [...carPicker.querySelectorAll<HTMLInputElement>('input[name="car"]')];
  const setHomeControlsEnabled = (enabled: boolean) => {
    areaPicker.disabled = !enabled;
    carPicker.disabled = !enabled;
    element<HTMLButtonElement>('open-journal').disabled = !enabled;
  };
  const syncCarPicker = () => {
    for (const input of carInputs) {
      const available = vehicleAvailable(area.id, input.value);
      input.checked = input.value === selectedModel;
      input.disabled = !available;
      input.closest('label')!.hidden = !available;
    }
  };
  const syncAreaPicker = () => {
    for (const input of areaInputs) input.checked = input.value === area.id;
  };
  syncAreaPicker();
  syncCarPicker();
  function surfaceLabel(): string {
    const surface = vehicle.currentSurface;
    if (area.id === 'mars' && surface.id === 'rock') return 'Martian rock';
    if (surface.id === 'water') {
      if (area.id === 'samurai-village') return 'Shallow lake';
      // The sea owns the water outside the river mesh's clipped corridor.
      // River level also reaches zero before the mouth, so height alone
      // cannot distinguish the two surfaces.
      if (area.id === 'iceland' && (vehicle.position.x < SKOGA_WATER_MIN_X
        || vehicle.position.x > SKOGA_WATER_MAX_X || vehicle.position.z < SKOGA_WATER_START
        || vehicle.position.z >= SKOGA_MOUTH_Z)) return 'Deep sea';
      if (area.id === 'northern-reach' && shoalsWaterRegion(vehicle.position.x, vehicle.position.z)) return 'Coastal shallows';
      if (area.id === 'northern-reach' && marshWeight(vehicle.position.x, vehicle.position.z) > 0.2) return 'Marsh water';
      if (area.id === 'northern-reach' && lakeShoreDistance(vehicle.position.x, vehicle.position.z) < 0) return 'Great Lake';
      if (area.id === 'northern-reach' && vehicle.position.z < 100
        && inletDistance(vehicle.position.x, vehicle.position.z) < inletWidth(vehicle.position.z) + 12) return 'Alder River';
    }
    return surface.label;
  }
  function presentArea() {
    scene.add(ambient, sun, sun.target);
    ambient.color.set(area.ambientLight);
    ambient.groundColor.set(area.groundLight);
    sun.color.set(area.sunlight);
    camera.fov = 48;
    camera.updateProjectionMatrix();
    document.body.dataset.area = area.id;
    const journalAvailable = area.id === 'northern-reach' || area.id === 'mars';
    element('open-journal').hidden = !journalAvailable;
    element('pause-journal').hidden = !journalAvailable;
    if (journalAvailable) for (const id of ['home-journal-preview', 'pause-journal-preview']) {
      element<HTMLImageElement>(id).src = `./locations/${area.id}.jpg`;
    }
    syncAreaPicker();
    element('welcome-description').textContent = area.description;
    element('welcome-eyebrow').textContent = area.welcomeEyebrow;
    element('welcome-title').textContent = area.welcomeTitle;
    element('hint').textContent = area.hint;
    element('surface-label').textContent = surfaceLabel();
    element('surface-trait').textContent = vehicle.currentSurface.trait;
    element('loading-status').textContent = area.readyMessage;
    element<HTMLButtonElement>('reset').title = area.id === 'northern-reach' || area.id === 'mars' || area.id === 'iceland'
      ? 'Return to the nearest regional start (R)' : `Return to the ${area.name} starting area (R)`;
  }
  presentArea();
  const journal = element('journal');
  const journalGrid = element('journal-grid');
  const postcardDetail = element('postcard-detail');
  let detailReturnFocus: HTMLButtonElement | null = null;
  let journalReturn: 'ready' | 'paused' | 'playing' = 'ready';
  let noticedPostcardId: string | null = null;
  const openPostcardDetail = (card: Postcard, record: { discoveredAt: string }, source: HTMLButtonElement) => {
    detailReturnFocus = source;
    postcardDetail.querySelector('.postcard-detail')!.classList.toggle('secret', !!card.secret);
    element<HTMLImageElement>('postcard-detail-image').src = card.image;
    element<HTMLImageElement>('postcard-detail-image').alt = `View of ${card.name}`;
    element('postcard-detail-title').textContent = card.name;
    element('postcard-detail-note').textContent = card.note;
    element('postcard-detail-date').textContent = `FIRST VISITED · ${new Date(record.discoveredAt).toLocaleDateString()}`;
    journal.hidden = true;
    postcardDetail.hidden = false;
    element('close-postcard-detail').focus();
  };
  const closePostcardDetail = () => {
    if (postcardDetail.hidden) return;
    postcardDetail.hidden = true;
    journal.hidden = false;
    detailReturnFocus?.focus();
  };
  const renderJournal = () => {
    const cards = POSTCARDS.filter(card => card.area === area.id);
    journalGrid.replaceChildren(...cards.map(card => {
      const record = postcardRecords.find(item => item.id === card.id);
      const article = document.createElement('article'); article.className = `journal-card${card.secret ? ' secret' : ''}${record ? '' : ' locked'}`;
      article.dataset.postcardId = card.id;
      const picture = document.createElement(record ? 'button' : 'div'); picture.className = `journal-picture${record ? ' journal-photo-button' : ''}`;
      if (record) {
        const button = picture as HTMLButtonElement; button.type = 'button';
        button.setAttribute('aria-label', `Enlarge ${card.name} postcard`);
        button.addEventListener('click', () => openPostcardDetail(card, record, button));
        const img = document.createElement('img'); img.src = card.image; img.alt = `View of ${card.name}`;
        img.loading = 'lazy'; picture.append(img);
      } else {
        const mark = document.createElement('span'); mark.textContent = card.secret ? '✦' : '?'; mark.setAttribute('aria-hidden', 'true'); picture.append(mark);
      }
      const heading = document.createElement('h3'); heading.textContent = record ? card.name : card.secret ? 'Secret discovery' : card.name;
      const note = document.createElement('p'); note.textContent = record ? card.note : card.secret ? 'Something hidden is waiting to be found.' : 'A place still waiting to be visited.';
      const date = document.createElement('small'); date.textContent = record
        ? `FIRST VISITED · ${new Date(record.discoveredAt).toLocaleDateString()}` : card.secret ? 'A LITTLE MYSTERY' : 'UNDISCOVERED';
      if (card.secret && record) {
        const badge = document.createElement('span'); badge.className = 'journal-secret-badge';
        badge.textContent = '✦ SECRET DISCOVERY'; article.append(badge);
      }
      article.append(picture, heading, note, date); return article;
    }));
    const collected = cards.filter(card => foundPostcards.has(card.id)).length;
    element('journal-title').textContent = `${area.name} · Postcards`;
    element('journal-count').textContent = `${collected} of ${cards.length} places visited`;
    element('home-journal-count').textContent = `${collected}/${cards.length}`;
    element('pause-journal-count').textContent = `${collected}/${cards.length}`;
  };
  const openJournal = (focusCardId?: string) => {
    if (area.id !== 'northern-reach' && area.id !== 'mars') return;
    const fromPlaying = mode === 'playing';
    if (fromPlaying) pause();
    if (mode !== 'ready' && mode !== 'paused') return;
    journalReturn = fromPlaying ? 'playing' : mode; renderJournal();
    element('welcome').hidden = true; element('paused').hidden = true; journal.hidden = false;
    const selected = [...journalGrid.children].find(child =>
      (child as HTMLElement).dataset.postcardId === focusCardId)?.querySelector<HTMLButtonElement>('button');
    if (selected) { selected.scrollIntoView({ block: 'nearest' }); selected.focus(); }
    else element('close-journal').focus();
  };
  const closeJournal = () => {
    if (journal.hidden) return;
    journal.hidden = true;
    if (journalReturn === 'playing') { resume(); return; }
    element(journalReturn === 'ready' ? 'welcome' : 'paused').hidden = false;
    element(journalReturn === 'ready' ? 'open-journal' : 'pause-journal').focus();
  };
  element('open-journal').addEventListener('click', () => openJournal());
  element('pause-journal').addEventListener('click', () => openJournal());
  element('close-journal').addEventListener('click', closeJournal);
  element('close-postcard-detail').addEventListener('click', closePostcardDetail);
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!postcardDetail.hidden) { event.preventDefault(); closePostcardDetail(); }
    else if (!journal.hidden) { event.preventDefault(); closeJournal(); }
  }, true);
  const rememberPostcard = (card: Postcard) => {
    postcardRecords.push({ id: card.id, discoveredAt: new Date().toISOString() });
    try { window.localStorage.setItem(POSTCARD_STORAGE_KEY, JSON.stringify(postcardRecords)); } catch { /* Storage is optional. */ }
    renderJournal();
    const notice = element('postcard-notice');
    noticedPostcardId = card.id;
    notice.classList.toggle('secret', !!card.secret);
    element('postcard-notice-kind').textContent = card.secret ? '✦ SECRET DISCOVERY' : 'NEW POSTCARD';
    element('postcard-notice-name').textContent = card.name;
    element<HTMLImageElement>('postcard-notice-image').src = card.image;
    window.clearTimeout(postcardNoticeTimer);
    window.clearTimeout(postcardNoticeHideTimer);
    notice.classList.remove('visible');
    notice.hidden = false;
    void notice.offsetWidth;
    notice.classList.add('visible');
    postcardNoticeTimer = window.setTimeout(() => {
      notice.classList.remove('visible');
      postcardNoticeHideTimer = window.setTimeout(() => { notice.hidden = true; }, 450);
    }, 5000);
  };
  element<HTMLButtonElement>('postcard-notice').addEventListener('click', () => {
    const notice = element('postcard-notice');
    if (notice.hidden || mode !== 'playing') return;
    window.clearTimeout(postcardNoticeTimer); window.clearTimeout(postcardNoticeHideTimer);
    notice.classList.remove('visible'); notice.hidden = true;
    openJournal(noticedPostcardId ?? undefined);
  });
  renderJournal();
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
  let cameraHorizontalDirection = 1;
  const cameraRayDirection = new THREE.Vector3();
  const clearCameraDrag = () => {
    if (cameraPointer === null) return;
    const pointer = cameraPointer;
    cameraPointer = null;
    canvas.classList.remove('camera-dragging');
    if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
  };
  type PhotoState = { target: THREE.Vector3; yaw: number; pitch: number; distance: number; carWasVisible: boolean };
  let photoState: PhotoState | null = null;
  const photoKeys = new Set<string>();
  const photoHoldCodes = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE',
    'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract', 'ShiftLeft', 'ShiftRight',
  ]);
  const enterPhotoMode = () => {
    if (mode !== 'playing' || photoState) return;
    clearCameraDrag();
    controls?.setEnabled(false);
    clock.reset();
    const target = vehicle.model.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const offset = camera.position.clone().sub(target);
    photoState = {
      target,
      yaw: Math.atan2(offset.x, offset.z),
      pitch: Math.atan2(offset.y, Math.hypot(offset.x, offset.z)),
      distance: offset.length(),
      carWasVisible: vehicle.model.visible,
    };
    photoKeys.clear();
    document.body.classList.add('photo-mode');
    element('photo-panel').hidden = false;
    element('photo-copy-status').textContent = '';
    element<HTMLButtonElement>('photo-car').textContent = 'Hide car';
    element<HTMLButtonElement>('photo-ui').textContent = 'Hide UI';
    element('photo-exit').focus();
  };
  const leavePhotoMode = (pauseAfter = false) => {
    if (!photoState) return;
    clearCameraDrag();
    vehicle.model.visible = photoState.carWasVisible;
    photoState = null;
    photoKeys.clear();
    document.body.classList.remove('photo-mode', 'photo-clean');
    element('photo-panel').hidden = true;
    clock.reset();
    follow.reset();
    if (!runtime) {
      controls?.setEnabled(mode === 'playing');
      if (pauseAfter || document.hidden) pause();
      else (document.activeElement as HTMLElement | null)?.blur();
      return;
    }
    mode = 'loading';
    element('travelling').hidden = false;
    element('travel-status').textContent = 'Returning to the car...';
    void runtime.ensureReady(vehicle.position.x, vehicle.position.z).then(() => {
      if (hasFailed()) return;
      world.step();
      mode = 'playing';
      element('travelling').hidden = true;
      controls?.setEnabled(true);
      clock.reset();
      lastTime = performance.now();
      follow.reset();
      if (pauseAfter || document.hidden) pause();
      else (document.activeElement as HTMLElement | null)?.blur();
    }).catch(showError);
  };
  const togglePhotoCar = () => {
    if (!photoState) return;
    vehicle.model.visible = !vehicle.model.visible;
    element<HTMLButtonElement>('photo-car').textContent = vehicle.model.visible ? 'Hide car' : 'Show car';
  };
  const togglePhotoUi = () => {
    if (!photoState) return;
    const hidden = document.body.classList.toggle('photo-clean');
    element<HTMLButtonElement>('photo-ui').textContent = hidden ? 'Show UI' : 'Hide UI';
  };
  const copyPhotoView = async () => {
    if (!photoState) return;
    const rounded = (value: number) => Number(value.toFixed(3));
    const point = (value: THREE.Vector3) => ({ x: rounded(value.x), y: rounded(value.y), z: rounded(value.z) });
    const view = JSON.stringify({
      area: area.id,
      car: { position: point(vehicle.model.position), rotation: vehicle.model.quaternion.toArray().map(rounded) },
      camera: { position: point(camera.position), target: point(photoState.target), fov: camera.fov },
    }, null, 2);
    try {
      await navigator.clipboard.writeText(view);
      element('photo-copy-status').textContent = 'View copied. Paste it with your screenshot.';
    } catch {
      element('photo-copy-status').textContent = 'Clipboard unavailable. Use the browser screenshot.';
    }
  };
  window.addEventListener('keydown', event => {
    if (!photoState && event.code === 'KeyP' && mode === 'playing') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) enterPhotoMode();
      return;
    }
    if (!photoState) return;
    if (event.code === 'KeyP' || event.code === 'Escape' || event.code === 'KeyH'
      || event.code === 'KeyU' || event.code === 'KeyC' || photoHoldCodes.has(event.code)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      if (event.code === 'KeyP' || event.code === 'Escape') leavePhotoMode();
      else if (event.code === 'KeyH') togglePhotoCar();
      else if (event.code === 'KeyU') togglePhotoUi();
      else if (event.code === 'KeyC') void copyPhotoView();
      else photoKeys.add(event.code);
    }
  }, true);
  window.addEventListener('keyup', event => {
    if (!photoState || !photoHoldCodes.has(event.code)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    photoKeys.delete(event.code);
  }, true);
  element('photo-exit').addEventListener('click', () => leavePhotoMode());
  element('photo-car').addEventListener('click', togglePhotoCar);
  element('photo-ui').addEventListener('click', togglePhotoUi);
  element('photo-copy').addEventListener('click', () => { void copyPhotoView(); });
  const updatePhotoCamera = (elapsed: number) => {
    if (!photoState) return;
    const pressed = (code: string) => Number(photoKeys.has(code));
    const turnSpeed = 1.2 * elapsed;
    photoState.yaw += (pressed('ArrowRight') - pressed('ArrowLeft')) * turnSpeed;
    photoState.pitch = THREE.MathUtils.clamp(photoState.pitch
      + (pressed('ArrowUp') - pressed('ArrowDown')) * turnSpeed, -0.65, 1.45);
    const zoom = pressed('Minus') + pressed('NumpadSubtract') - pressed('Equal') - pressed('NumpadAdd');
    photoState.distance = THREE.MathUtils.clamp(photoState.distance * Math.exp(zoom * 1.5 * elapsed), 2, 100);
    const move = (photoKeys.has('ShiftLeft') || photoKeys.has('ShiftRight') ? 36 : 12) * elapsed;
    const forward = (pressed('KeyW') - pressed('KeyS')) * move;
    const right = (pressed('KeyD') - pressed('KeyA')) * move;
    photoState.target.x += -Math.sin(photoState.yaw) * forward + Math.cos(photoState.yaw) * right;
    photoState.target.z += -Math.cos(photoState.yaw) * forward - Math.sin(photoState.yaw) * right;
    photoState.target.y += (pressed('KeyE') - pressed('KeyQ')) * move;
    const horizontal = photoState.distance * Math.cos(photoState.pitch);
    camera.position.set(
      photoState.target.x + horizontal * Math.sin(photoState.yaw),
      photoState.target.y + photoState.distance * Math.sin(photoState.pitch),
      photoState.target.z + horizontal * Math.cos(photoState.yaw),
    );
    camera.lookAt(photoState.target);
  };
  const pause = () => {
    if (mode === 'loading' && resetInProgress) {
      pauseAfterReset = true;
      return;
    }
    if (mode !== 'playing') return;
    if (photoState) { leavePhotoMode(true); return; }
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
    setHomeControlsEnabled(false);
    controls?.setEnabled(true);
    clock.reset();
    lastTime = performance.now();
    follow.reset();
    (document.activeElement as HTMLElement | null)?.blur();
  };
  const home = () => {
    if (mode !== 'paused') return;
    mode = 'ready';
    document.body.classList.remove('playing');
    element('paused').hidden = true;
    element('welcome').hidden = false;
    setHomeControlsEnabled(true);
    follow.reset();
    follow.update(1 / 60, true);
    areaInputs.find(input => input.checked)?.focus();
  };
  const reset = async () => {
    if (mode !== 'playing') return;
    controls?.clear();
    const start = area.id === 'northern-reach' ? nearestNorthernStart(vehicle.position.x, vehicle.position.z)
      : area.id === 'mars' ? nearestMarsStart(vehicle.position.x, vehicle.position.z) : null;
    const icelandResetStart = area.id === 'iceland' ? nearestIcelandStart(vehicle.position.x, vehicle.position.z) : null;
    const destination = icelandResetStart ? icelandStartSpawn(icelandResetStart)
      : start ? (area.id === 'mars' ? marsSpawn(start.position) : regionalSpawn(start)) : area.spawn;
    if (runtime) {
      mode = 'loading';
      resetInProgress = true;
      pauseAfterReset = false;
      controls?.setEnabled(false);
      setHomeControlsEnabled(false);
      element<HTMLButtonElement>('pause').disabled = true;
      element<HTMLButtonElement>('reset').disabled = true;
      vehicle.model.visible = false;
      element('travelling').hidden = false;
      element('travel-status').textContent = 'Preparing terrain around the starting point...';
      await runtime.ensureReady(destination.x, destination.z);
      if (hasFailed()) {
        resetInProgress = false;
        return;
      }
      world.step();
    }
    vehicle.reset(destination);
    const resetHeading = icelandResetStart?.heading ?? area.spawnHeading;
    if (resetHeading !== undefined) vehicle.body.setRotation(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), resetHeading), true);
    for (let i = 0; i < 30; i++) {
      vehicle.beforeStep({ steer: 0, forward: false, reverse: false }, 1 / 60);
      world.step();
      vehicle.capture();
    }
    vehicle.syncVisuals(1);
    postcardTracker.reset(vehicle.position.x, vehicle.position.z);
    terrainEffects.clear();
    clock.reset();
    follow.reset();
    vehicle.model.visible = true;
    if (runtime) {
      mode = 'playing';
      resetInProgress = false;
      element('travelling').hidden = true;
      setHomeControlsEnabled(false);
      element<HTMLButtonElement>('pause').disabled = false;
      element<HTMLButtonElement>('reset').disabled = false;
      controls?.setEnabled(true);
      if (pauseAfterReset || document.hidden) {
        pauseAfterReset = false;
        pause();
      }
    }
    toast(start ? `Back at ${start.name}` : 'Back on your wheels. Off you go.');
  };
  controls = new Controls(pause, () => { void reset().catch(showError); });
  canvas.addEventListener('pointerdown', event => {
    if (mode !== 'playing' || event.button !== 0 || cameraPointer !== null) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    cameraRayDirection.set(
      (event.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1,
      -(event.clientY - rect.top) / Math.max(1, rect.height) * 2 + 1,
      0.5,
    ).unproject(camera).sub(camera.position).normalize();
    const terrainHit = world.castRay(
      new RAPIER.Ray(camera.position, cameraRayDirection),
      camera.far,
      true,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
    );
    cameraHorizontalDirection = horizontalDragDirection(
      terrainHit?.timeOfImpact ?? null,
      camera.position.distanceTo(photoState?.target ?? vehicle.model.position),
    );
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
    const yaw = cameraHorizontalDirection * (event.clientX - cameraPointerX) / width * Math.PI * 2;
    const pitch = (event.clientY - cameraPointerY) / height * Math.PI;
    if (photoState) {
      photoState.yaw += yaw;
      photoState.pitch = THREE.MathUtils.clamp(photoState.pitch + pitch, -0.65, 1.45);
    } else follow.orbit(yaw, pitch);
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
  element('home').addEventListener('click', home);
  element('pause').addEventListener('click', pause);
  element('reset').addEventListener('click', () => { void reset().catch(showError); });
  areaPicker.addEventListener('focusin', () => controls?.clear());
  carPicker.addEventListener('focusin', () => controls?.clear());
  carPicker.addEventListener('change', event => {
    const input = event.target;
    if (mode !== 'ready' || !(input instanceof HTMLInputElement) || !isVehicleModelId(input.value)
      || !vehicleAvailable(area.id, input.value)) return;
    selectedModel = input.value;
    vehicle.setModel(selectedModel);
    follow.reset();
    follow.update(1 / 60, true);
    syncCarPicker();
    if (area.id !== 'mars') {
      selectedEarthModel = selectedModel;
      try { window.localStorage.setItem('little-roamer-car', selectedEarthModel); } catch { /* Storage is optional. */ }
    }
    syncCarUrl();
  });
  async function travel(id: AreaId) {
    if (mode === 'loading' || mode === 'error' || id === area.id) {
      syncAreaPicker();
      return;
    }
    mode = 'loading';
    clearCameraDrag();
    controls?.setEnabled(false);
    clock.reset();
    setHomeControlsEnabled(false);
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
    selectedModel = id === 'mars' ? 'mars-scout' : selectedEarthModel;
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
    postcardTracker.reset(vehicle.position.x, vehicle.position.z);
    terrainEffects.setReduced(graphicsReduced);
    area = AREAS[id];
    syncCarPicker();
    presentArea();
    renderJournal();
    renderer.renderLists.dispose();
    playingTime = 0;
    slowFrames = 0;
    lastTime = performance.now();
    mode = 'ready';
    document.body.classList.remove('playing');
    element('travelling').hidden = true;
    element('welcome').hidden = false;
    element<HTMLButtonElement>('start').disabled = false;
    setHomeControlsEnabled(true);
    follow.update(1 / 60, true);
    const url = new URL(window.location.href);
    url.searchParams.set('area', id);
    url.searchParams.set('car', selectedModel);
    url.searchParams.delete('start');
    window.history.replaceState(null, '', url);
    element('start').focus();
  }
  areaPicker.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.name !== 'area' || mode !== 'ready') return;
    const id = input.value;
    if (!isAreaId(id)) {
      showError(new Error('That exploration area is not available.'));
      return;
    }
    void travel(id).catch(showError);
  });
  const suspendForBackground = () => {
    if (photoState) {
      photoKeys.clear();
      clearCameraDrag();
      return;
    }
    pause();
  };
  window.addEventListener('blur', suspendForBackground);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspendForBackground();
    clock.reset();
    lastTime = performance.now();
  });
  window.addEventListener('pagehide', suspendForBackground);

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
  // Development-only instrumentation for real-browser behavioral tests.
  if (import.meta.env.DEV) {
    const cameraProbe = new RAPIER.Ball(0.25);
    Object.assign(window, {
      __ROAMER__: {
        snapshot: () => ({
          area: area.id, bounds: area.half, spawn: area.spawn,
          car: vehicle.currentModel,
          surface: vehicle.currentSurface.id,
          wheelSurfaces: vehicle.wheelSurfaces,
          terrainFeedback: vehicle.terrainFeedback,
          waterDepth: vehicle.waterDepth,
          terrainParticles: terrainEffects.count,
          terrainTracks: terrainEffects.ground.trackCount,
          terrainRipples: terrainEffects.ground.rippleCount,
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
          postcardTracker.reset(vehicle.position.x, vehicle.position.z);
          vehicle.model.visible = true;
          clock.reset();
          follow.reset();
          mode = previousMode;
          if (previousMode === 'playing') controls?.setEnabled(true);
        },
        waitForStreamingIdle: () => runtime?.waitForIdle() ?? Promise.resolve(),
        setPhotoView: async (view: { position: { x: number; y: number; z: number };
          target: { x: number; y: number; z: number }; fov: number }) => {
          if (mode !== 'playing') throw new Error('Start driving before setting a photo view.');
          enterPhotoMode();
          if (!photoState) throw new Error('Photo mode did not start.');
          photoState.target.set(view.target.x, view.target.y, view.target.z);
          const offset = new THREE.Vector3(view.position.x, view.position.y, view.position.z).sub(photoState.target);
          photoState.yaw = Math.atan2(offset.x, offset.z);
          photoState.pitch = Math.atan2(offset.y, Math.hypot(offset.x, offset.z));
          photoState.distance = offset.length();
          camera.fov = view.fov;
          camera.updateProjectionMatrix();
          vehicle.model.visible = false;
          updatePhotoCamera(0);
          await runtime?.ensureReady(view.target.x, view.target.z);
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
    if (photoState) {
      updatePhotoCamera(Math.min(elapsed, 0.05));
      runtime?.update(photoState.target.x, photoState.target.z);
      sun.target.position.copy(photoState.target);
      sun.position.copy(photoState.target).add(sunOffset);
      renderer.render(scene, camera);
      return;
    }
    if (mode === 'playing') {
      runtime?.update(vehicle.position.x, vehicle.position.z);
      runtime?.animate?.(Math.min(elapsed, 0.05), reducedMotion.matches);
      const alpha = clock.advance(elapsed, dt => {
        // Hold at an unready Mars/Iceland chunk until collision arrives, including the next
        // short movement interval. A delayed worker must not let the car fall through.
        if ((area.id === 'mars' || area.id === 'iceland') && runtime) {
          const v = vehicle.body.linvel();
          if (!runtime.isCollisionReadyAt(vehicle.position.x, vehicle.position.z)
            || !runtime.isCollisionReadyAt(vehicle.position.x + v.x * 0.15, vehicle.position.z + v.z * 0.15)) return;
        }
        vehicle.beforeStep(controls!.state.value, dt);
        world.step();
        vehicle.capture();
      });
      vehicle.syncVisuals(alpha);
      for (const card of postcardTracker.update(area.id, vehicle.position.x, vehicle.position.z)) rememberPostcard(card);
      updateNavigation();
      terrainEffects.update(Math.min(elapsed, 0.05), vehicle, controls!.state.value);
      const surface = vehicle.currentSurface;
      const surfaceHud = element('surface');
      if (surface.id === 'water') {
        element('surface-trait').textContent = vehicle.waterDepth >= 0.85
          ? 'Too deep · reset'
          : surface.trait;
      }
      if (surfaceHud.dataset.surface !== surface.id) {
        surfaceHud.dataset.surface = surface.id;
        element('surface-label').textContent = surfaceLabel();
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
      // Regional water names can change while the underlying handling surface
      // stays "water" (for example, Skógá flowing into the Iceland sea).
      const currentLabel = surfaceLabel();
      if (element('surface-label').textContent !== currentLabel) element('surface-label').textContent = currentLabel;
      playingTime += Math.min(elapsed, 0.1);
      const fallFloor = Math.min(-12, area.surfaceHeight(vehicle.position.x, vehicle.position.z) - 15);
      if (vehicle.position.y < fallFloor) void reset().catch(showError);
      element('hint').style.opacity = playingTime > 6 ? '0' : '1';
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
  mode = 'ready';
  element<HTMLButtonElement>('start').disabled = false;
  element('start-label').textContent = 'Let’s take a drive';
  setHomeControlsEnabled(true);
}

void boot().catch(showError);
