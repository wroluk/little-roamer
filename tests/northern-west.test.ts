import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {sampledHeightAt,waterHeightAt,generateNorthernChunk} from '../src/game/northern-terrain';
import {NorthernStreamingRuntime,InProcessChunkTransport} from '../src/game/northern-streaming';

test('estuary retains an open river channel between its sandy spits',()=>{
  let previous=Infinity;
  for(let x=-420;x>=-650;x-=3) {
    const level=waterHeightAt(x,190);
    assert.notEqual(level,null,`blocked river mouth at ${x}`);
    assert.ok(level!<=previous+0.01);
    assert.ok(sampledHeightAt(x,190)<level!-0.15);
    previous=level!;
  }
});
test('western sea stays submerged to the apron and coastal water matches the terrain',()=>{
  for(let z=-600;z<=600;z+=30) for(const x of [-768,-800,-864]) {
    assert.equal(waterHeightAt(x,z),0);
    assert.ok(sampledHeightAt(x,z)<-1);
  }
  for(const [cx,cz] of [[-6,1],[-6,2],[-8,-4],[-8,-6],[-8,6],[-9,0]]) {
    const v=generateNorthernChunk(cx,cz).waterVertices;
    assert.ok(v);
    for(let i=0;i<v.length;i+=9) {
      const x=(v[i]+v[i+3]+v[i+6])/3,z=(v[i+2]+v[i+5]+v[i+8])/3,level=waterHeightAt(x,z);
      assert.notEqual(level,null,`dry water triangle at ${x},${z}`);
      assert.ok(Math.abs((v[i+1]+v[i+4]+v[i+7])/3-0.015-level!)<0.08);
    }
  }
});
test('ocean uses one fogged mesh and the offshore stop is removed on disposal',async()=>{
  await RAPIER.init();
  const scene=new THREE.Scene(),world=new RAPIER.World({x:0,y:-18,z:0});
  const runtime=new NorthernStreamingRuntime(scene,world,new InProcessChunkTransport());
  try {
    const ocean=scene.getObjectByName('Northern Reach · open western sea') as THREE.Mesh;
    assert.ok(ocean);
    assert.equal(ocean.geometry.index!.count,6);
    assert.equal((ocean.material as THREE.MeshStandardMaterial).fog,true);
    world.step();
    const hit=world.castRay(new RAPIER.Ray({x:-810,y:1,z:0},{x:-1,y:0,z:0}),50,true);
    assert.ok(hit&&hit.timeOfImpact>20&&hit.timeOfImpact<40);
    runtime.dispose();
    assert.equal(scene.children.length,0);
    assert.equal(world.colliders.len(),0);
  } finally {runtime.dispose();world.free();}
});
