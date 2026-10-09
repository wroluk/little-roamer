import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { GroundEffects, TRACK_CAPACITY } from '../src/game/ground-effects';
import { TerrainEffects } from '../src/game/terrain-effects';
import { SURFACES } from '../src/game/surfaces';
import type { Vehicle } from '../src/game/vehicle';

function vehicle() {
  return { speed: 3, rotation: new THREE.Quaternion(), forward: new THREE.Vector3(0,0,-1),
    body: {linvel:()=>({x:0,y:0,z:0})},
    terrainWheels: Array.from({length:4}, () => ({position:new THREE.Vector3(), grounded:true, surface:SURFACES.dirt, slip:0, intensity:0.5})) } as unknown as Vehicle;
}

test('area particle palette colours emitted rock fragments without changing other areas', () => {
  for (const override of [undefined, { rock: '#b76b49' }]) {
    const scene = new THREE.Scene(), effects = new TerrainEffects(scene, () => null, () => 0, override), car = vehicle();
    car.terrainWheels.forEach(wheel => { wheel.surface = SURFACES.rock; });
    for (let i = 0; i < 5; i++) effects.update(0.1, car);
    assert.ok(effects.count > 0);
    const mesh = scene.children.find(object => object instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
    const color = new THREE.Color(); mesh.getColorAt(0, color);
    assert.equal(color.getHexString(), override ? 'b76b49' : '7b8582');
    effects.dispose();
  }
});

test('ground marks require contact and movement, stay bounded, expire, and dispose', () => {
  const scene=new THREE.Scene(), marks=new GroundEffects(scene,()=>0,()=>0.2), car=vehicle();
  for(let i=0;i<600;i++) { car.terrainWheels.forEach(w=>{w.position.z+=0.4;}); marks.update(1/60,car); }
  assert.equal(marks.trackCount,TRACK_CAPACITY);
  marks.clear();
  car.terrainWheels.forEach(w=>{w.grounded=false;});
  marks.update(1,car); assert.equal(marks.trackCount,0);
  car.terrainWheels.forEach(w=>{w.grounded=true;w.surface=SURFACES.water;});
  marks.update(0.1,car);
  car.terrainWheels.forEach(w=>{w.position.z+=1.2;});
  marks.update(0.1,car); assert.equal(marks.rippleCount,2);
  car.terrainWheels.forEach(w=>{w.grounded=false;});
  marks.update(2,car); assert.equal(marks.rippleCount,0);
  car.terrainWheels.forEach(w=>{w.grounded=true;w.surface=SURFACES.mud;});
  marks.update(0.1,car);
  car.terrainWheels.forEach(w=>{w.position.x+=4;});marks.update(0.1,car);
  assert.equal(marks.trackCount,4);
  marks.update(31,car);assert.equal(marks.trackCount,0);
  marks.dispose();assert.equal(scene.children.length,0);
});

test('reduced terrain effects clear existing marks and leave sparser new ones', () => {
  const scene=new THREE.Scene(), effects=new TerrainEffects(scene,()=>null,()=>0), car=vehicle();
  effects.ground.update(0.1,car);
  car.terrainWheels.forEach(w=>{w.position.x+=4;});effects.ground.update(0.1,car);
  assert.ok(effects.ground.trackCount>0);
  effects.setReduced(true);assert.equal(effects.ground.trackCount,0);
  effects.update(0.1,car);assert.equal(effects.ground.trackCount,0);
  for(let i=0;i<20;i++) {
    car.terrainWheels.forEach(w=>{w.position.x+=0.4;});
    effects.update(0.1,car);
  }
  assert.ok(effects.ground.trackCount>0);
  effects.dispose();assert.equal(scene.children.length,0);
});

test('black sand marks respond to steering, braking, and acceleration', () => {
  const scene=new THREE.Scene(), marks=new GroundEffects(scene,()=>0,()=>null), car=vehicle();
  car.terrainWheels.forEach(w=>{w.surface=SURFACES.ash;});
  marks.update(0.1,car);
  car.terrainWheels.forEach(w=>{w.position.z+=1;});
  marks.update(0.1,car);
  assert.equal(marks.trackCount,0);
  car.terrainWheels.forEach(w=>{w.position.z+=1.4;});
  marks.update(0.1,car,{steer:1,forward:true,reverse:false});
  assert.equal(marks.trackCount,4);
  car.terrainWheels.forEach(w=>{w.position.z+=2.7;});
  marks.update(0.1,car,{steer:0,forward:false,reverse:true});
  assert.equal(marks.trackCount,8);
  car.terrainWheels.forEach(w=>{w.position.z+=2.7;});
  (car as unknown as {speed:number}).speed=5;
  marks.update(0.1,car,{steer:0,forward:true,reverse:false});
  assert.equal(marks.trackCount,12);
  marks.dispose();
});
