import { buildSamurai, SAMURAI_HALF, SAMURAI_START, samuraiSurfaceAt, samuraiSurfaceHeight, samuraiWaterHeight } from './samurai';
import type * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { buildWorld } from './world';
import { START, surfaceHeight, valleySurfaceAt, WORLD_HALF } from './terrain';
import { buildHighlands, HIGHLANDS_HALF, HIGHLANDS_START, highlandsSurfaceAt, highlandsSurfaceHeight, highlandsWaterHeight } from './highlands';
import {
  NORTHERN_HALF, NORTHERN_SPAWN, northernSurfaceAt, sampledHeightAt, waterHeightAt,
} from './northern-terrain';
import {
  BrowserChunkTransport, NorthernStreamingRuntime, type NorthernStreamingStats,
} from './northern-streaming';
import type { SurfaceId } from './surfaces';

export type AreaId = 'valley' | 'highlands' | 'northern-reach' | 'samurai-village';
export type AreaRuntime = {
  update: (x: number, z: number) => void;
  ensureReady: (x: number, z: number) => Promise<void>;
  isCollisionReadyAt: (x: number, z: number) => boolean;
  shrubBumpAt: (x: number, z: number) => number;
  waitForIdle: () => Promise<void>;
  readonly stats: NorthernStreamingStats;
  dispose: () => void;
};
export type Area = {
  id: AreaId;
  name: string;
  label: string;
  tagline: string;
  description: string;
  hint: string;
  welcomeEyebrow: string;
  welcomeTitle: string;
  readyMessage: string;
  ambientLight: string;
  spawn: { x: number; y: number; z: number };
  half: number;
  climbingPower: number;
  sky: string;
  fogNear: number;
  fogFar: number;
  groundLight: string;
  sunlight: string;
  surfaceHeight: (x: number, z: number) => number;
  waterHeight: (x: number, z: number) => number | null;
  surfaceAt: (x: number, z: number) => SurfaceId;
  build: (
    scene: THREE.Scene,
    world: RAPIER.World,
    onError: (error: Error) => void,
  ) => AreaRuntime | void;
};

export const AREAS: Record<AreaId, Area> = {
  'samurai-village': {
    id: 'samurai-village', name: 'Samurai Village', label: '04 / THE LANTERN VILLAGE',
    tagline: 'Follow the red lanterns.',
    description: 'Quiet lanes, timber houses and glowing red lanterns. Wander through bamboo to an old Japanese temple, or find the torii standing in a shallow lake.',
    hint: 'The bamboo path leads to the temple. The lake is shallow enough to explore.',
    welcomeEyebrow: 'SAMURAI VILLAGE / BAMBOO & LANTERNS', welcomeTitle: 'A timeless escape.',
    readyMessage: 'The lanterns are lit. Take a peaceful village drive.', ambientLight: '#fff0d8',
    spawn: SAMURAI_START, half: SAMURAI_HALF, climbingPower: 1.25,
    sky: '#d9d4c4', fogNear: 95, fogFar: 300, groundLight: '#70825d', sunlight: '#ffe2b5',
    surfaceHeight: samuraiSurfaceHeight, waterHeight: samuraiWaterHeight, surfaceAt: samuraiSurfaceAt,
    build: buildSamurai,
  },
  valley: {
    id: 'valley', name: 'Sunshine Valley', label: '01 / THE GREAT OUTDOORS',
    tagline: 'Take the scenic route.',
    description: "Over the hills, along the dusty trails, or somewhere entirely your own. There's no wrong turn.",
    hint: 'No hurry. No finish line. Just a little room to roam.',
    welcomeEyebrow: 'A LITTLE FOUR-WHEEL ESCAPE', welcomeTitle: 'Big outside.',
    readyMessage: 'All packed. The valley is yours.', ambientLight: '#fef3d6',
    spawn: START, half: WORLD_HALF, climbingPower: 1, sky: '#c5ddd5', fogNear: 65, fogFar: 180,
    groundLight: '#7f9f87', sunlight: '#fff0d1', surfaceHeight, waterHeight: () => null,
    surfaceAt: valleySurfaceAt, build: (scene, world) => { buildWorld(scene, world); },
  },
  highlands: {
    id: 'highlands', name: 'Iceland Highlands', label: '02 / THE LAND OF FIRE & ICE',
    tagline: 'A wilder kind of outside.',
    description: 'Black-sand deserts. Sleeping volcanoes. Blue rivers and ancient ice. Take your little wheels somewhere much bigger.',
    hint: 'Follow the amber posts for shallow river crossings. Take your time.',
    welcomeEyebrow: 'ICELAND HIGHLANDS / FIRE & ICE', welcomeTitle: 'Wilder outside.',
    readyMessage: 'A bigger escape. Find the amber river-crossing posts.', ambientLight: '#e9f5ff',
    spawn: HIGHLANDS_START, half: HIGHLANDS_HALF, climbingPower: 1.6, sky: '#bdcfd6', fogNear: 210, fogFar: 680,
    groundLight: '#60747c', sunlight: '#fff2df',
    surfaceHeight: highlandsSurfaceHeight, waterHeight: highlandsWaterHeight,
    surfaceAt: highlandsSurfaceAt, build: buildHighlands,
  },
  'northern-reach': {
    id: 'northern-reach', name: 'Northern Reach', label: '03 / BEYOND THE TREELINE',
    tagline: 'A whole horizon to wander.',
    description: 'Fjord coast. Pine country. Snow roads and volcanic ridges. A vast northern wilderness unfolds as you roam.',
    hint: 'Coast Road leads to River Valley and Fjord Coast. Follow Mountain Road to High Pass.',
    welcomeEyebrow: 'NORTHERN REACH / COAST TO SUMMIT', welcomeTitle: 'Farther outside.',
    readyMessage: 'The road ahead is ready. More wilderness unfolds as you drive.', ambientLight: '#e8f1e8',
    spawn: NORTHERN_SPAWN, half: NORTHERN_HALF, climbingPower: 1.45,
    sky: '#b9d3d4', fogNear: 78, fogFar: 188,
    groundLight: '#526f62', sunlight: '#fff0d4',
    surfaceHeight: sampledHeightAt, waterHeight: waterHeightAt,
    surfaceAt: northernSurfaceAt,
    build: (scene, world, onError) => new NorthernStreamingRuntime(
      scene,
      world,
      new BrowserChunkTransport(),
      { onChunkError: (cx, cz, message) => onError(new Error(`Northern Reach chunk (${cx}, ${cz}) failed: ${message}`)) },
    ),
  },
};

export function isAreaId(value: string | null): value is AreaId {
  return value === 'valley' || value === 'highlands' || value === 'northern-reach' || value === 'samurai-village';
}
