import type * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { buildWorld } from './world';
import { START, surfaceHeight, valleySurfaceAt, WORLD_HALF } from './terrain';
import { buildHighlands, HIGHLANDS_HALF, HIGHLANDS_START, highlandsSurfaceAt, highlandsSurfaceHeight, highlandsWaterHeight } from './highlands';
import type { SurfaceId } from './surfaces';

export type AreaId = 'valley' | 'highlands';
export type Area = {
  id: AreaId;
  name: string;
  label: string;
  tagline: string;
  description: string;
  hint: string;
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
  build: (scene: THREE.Scene, world: RAPIER.World) => void;
};

export const AREAS: Record<AreaId, Area> = {
  valley: {
    id: 'valley', name: 'Sunshine Valley', label: '01 / THE GREAT OUTDOORS',
    tagline: 'Take the scenic route.',
    description: "Over the hills, along the dusty trails, or somewhere entirely your own. There's no wrong turn.",
    hint: 'No hurry. No finish line. Just a little room to roam.',
    spawn: START, half: WORLD_HALF, climbingPower: 1, sky: '#c5ddd5', fogNear: 65, fogFar: 180,
    groundLight: '#7f9f87', sunlight: '#fff0d1', surfaceHeight, waterHeight: () => null,
    surfaceAt: valleySurfaceAt, build: buildWorld,
  },
  highlands: {
    id: 'highlands', name: 'Iceland Highlands', label: '02 / THE LAND OF FIRE & ICE',
    tagline: 'A wilder kind of outside.',
    description: 'Black-sand deserts. Sleeping volcanoes. Blue rivers and ancient ice. Take your little wheels somewhere much bigger.',
    hint: 'Follow the amber posts for shallow river crossings. Take your time.',
    spawn: HIGHLANDS_START, half: HIGHLANDS_HALF, climbingPower: 1.6, sky: '#bdcfd6', fogNear: 210, fogFar: 680,
    groundLight: '#60747c', sunlight: '#fff2df',
    surfaceHeight: highlandsSurfaceHeight, waterHeight: highlandsWaterHeight,
    surfaceAt: highlandsSurfaceAt, build: buildHighlands,
  },
};

export function isAreaId(value: string | null): value is AreaId {
  return value === 'valley' || value === 'highlands';
}
