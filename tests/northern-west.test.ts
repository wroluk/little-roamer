import assert from 'node:assert/strict';
import {before,test} from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {coastShoreX} from '../src/game/northern-coast';
import {sampledHeightAt,waterHeightAt,generateNorthernChunk,northernSurfaceAt} from '../src/game/northern-terrain';
import {NorthernStreamingRuntime,InProcessChunkTransport} from '../src/game/northern-streaming';
import {WEST_PROPS,WEST_REGIONS,WEST_ROUTE_LOGS} from '../src/game/northern-west';
import {Vehicle} from '../src/game/vehicle';
import {disposeScene} from '../src/game/dispose';

before(async()=>{await RAPIER.init();});

test('coastal log collider stays exposed at both ends of a sloping beach',async()=>{
  const log=WEST_PROPS.find(prop=>prop.kind==='coastLog' && prop.z===-470)!;
  const scene=new THREE.Scene(),world=new RAPIER.World({x:0,y:-18,z:0});
  const runtime=new NorthernStreamingRuntime(scene,world,new InProcessChunkTransport());
  try {
    await runtime.ensureReady(log.x,log.z);world.step();
    const exposures=[-0.5,0.5].map(fraction=>{
      const x=log.x+Math.cos(log.angle!)*1.9*log.size*fraction;
      const z=log.z-Math.sin(log.angle!)*1.9*log.size*fraction;
      const ground=sampledHeightAt(x,z);
      const ray=new RAPIER.Ray({x,y:ground+3,z},{x:0,y:-1,z:0});
      const hit=world.castRay(ray,5,true);
      assert.ok(hit,`no collider at log ${fraction}`);
      return 3-hit.timeOfImpact;
    });
    assert.ok(exposures.every(value=>value>0.25),`log buried on one side: ${exposures}`);
    assert.ok(Math.abs(exposures[0]-exposures[1])<0.18,`unevenly exposed log: ${exposures}`);
  } finally {runtime.dispose();world.free();disposeScene(scene);}
});

test('the real vehicle feels scattered River Mouth driftwood',async()=>{
  const chunk=generateNorthernChunk(-6,1);
  const index=Array.from(chunk.props.type).findIndex((type,i)=>type===4 && Math.abs(chunk.props.z[i]-144.9)<1);
  assert.ok(index>=0,'River Mouth driftwood exists');
  const x=chunk.props.x[index],z=chunk.props.z[index],angle=chunk.props.rotationY[index];
  const dx=-Math.sin(angle),dz=-Math.cos(angle);
  const start={x:x-dx*8,z:z-dz*8};
  const scene=new THREE.Scene(),world=new RAPIER.World({x:0,y:-18,z:0});
  const runtime=new NorthernStreamingRuntime(scene,world,new InProcessChunkTransport());
  try {
    await runtime.ensureReady(start.x,start.z);world.step();
    const car=new Vehicle(scene,world,{...start,y:sampledHeightAt(start.x,start.z)+1.25},1.45,northernSurfaceAt,waterHeightAt);
    car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(-dx,-dz)),true);
    let lift=0,progress=0;
    for(let tick=0;tick<2400 && progress<6;tick++) {
      car.beforeStep({steer:0,forward:tick>90,reverse:false},1/60);world.step();car.capture();
      progress=(car.position.x-x)*dx+(car.position.z-z)*dz;
      if(Math.abs(progress)>=2)continue;
      for(let wheel=0;wheel<4;wheel++) {
        const point=car.controller.wheelContactPoint(wheel);
        if(car.controller.wheelIsInContact(wheel)&&point)
          lift=Math.max(lift,point.y-sampledHeightAt(point.x,point.z));
      }
    }
    assert.ok(progress>=6,`car stopped at River Mouth driftwood: ${progress}`);
    assert.ok(lift>0.04,`River Mouth driftwood wheel lift=${lift}`);
  } finally {runtime.dispose();world.free();disposeScene(scene);}
});

test('the real vehicle climbs logs on each western beach route',async()=>{
  const segments=[
    WEST_REGIONS[0].trails[0].points.slice(4,6),
    WEST_REGIONS[1].trails[2].points.slice(2,4),
    WEST_REGIONS[2].trails[1].points.slice(0,2),
  ];
  for(const [index,log] of WEST_ROUTE_LOGS.entries()) {
    const [a,b]=segments[index];
    const length=Math.hypot(b.x-a.x,b.z-a.z),dx=(b.x-a.x)/length,dz=(b.z-a.z)/length;
    const start={x:log.x-dx*11,z:log.z-dz*11};
    const scene=new THREE.Scene(),world=new RAPIER.World({x:0,y:-18,z:0});
    const runtime=new NorthernStreamingRuntime(scene,world,new InProcessChunkTransport());
    try {
      await runtime.ensureReady(start.x,start.z);world.step();
      const car=new Vehicle(scene,world,{...start,y:sampledHeightAt(start.x,start.z)+1.25},1.45,northernSurfaceAt,waterHeightAt);
      car.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(-dx,-dz)),true);
      let lift=0,maxBody=-Infinity,minBody=Infinity,progress=0;
      for(let tick=0;tick<2400 && progress<9;tick++) {
        car.beforeStep({steer:0,forward:tick>90,reverse:false},1/60);world.step();car.capture();
        progress=(car.position.x-log.x)*dx+(car.position.z-log.z)*dz;
        if(Math.abs(progress)>=3)continue;
        const body=car.position.y-sampledHeightAt(car.position.x,car.position.z);
        maxBody=Math.max(maxBody,body);minBody=Math.min(minBody,body);
        for(let wheel=0;wheel<4;wheel++) {
          const point=car.controller.wheelContactPoint(wheel);
          if(car.controller.wheelIsInContact(wheel)&&point)
            lift=Math.max(lift,point.y-sampledHeightAt(point.x,point.z));
        }
      }
      assert.ok(progress>=9,`${WEST_REGIONS[index].name} car stuck at log: ${progress}, ${JSON.stringify({position:car.position,velocity:car.body.linvel(),contacts:car.contactCount()})}`);
      assert.ok(lift>0.2,`${WEST_REGIONS[index].name} wheel lift=${lift}`);
      assert.ok(maxBody-minBody>0.15,`${WEST_REGIONS[index].name} chassis motion=${maxBody-minBody}`);
    } finally {runtime.dispose();world.free();disposeScene(scene);}
  }
});

test('the real vehicle feels scattered logs on the western beaches',async()=>{
  const logs=WEST_PROPS.filter(prop=>prop.kind==='coastLog' &&
    !WEST_ROUTE_LOGS.some(route=>route.x===prop.x && route.z===prop.z));
  for(const log of logs) {
    const start={x:log.x,z:log.z+11};
    const scene=new THREE.Scene(),world=new RAPIER.World({x:0,y:-18,z:0});
    const runtime=new NorthernStreamingRuntime(scene,world,new InProcessChunkTransport());
    try {
      await runtime.ensureReady(start.x,start.z);world.step();
      const car=new Vehicle(scene,world,{...start,y:sampledHeightAt(start.x,start.z)+1.25},1.45,northernSurfaceAt,waterHeightAt);
      let lift=0,maxBody=-Infinity,minBody=Infinity;
      for(let tick=0;tick<2400 && car.position.z>log.z-9;tick++) {
        car.beforeStep({steer:0,forward:tick>90,reverse:false},1/60);world.step();car.capture();
        if(Math.abs(car.position.z-log.z)>=3)continue;
        const body=car.position.y-sampledHeightAt(car.position.x,car.position.z);
        maxBody=Math.max(maxBody,body);minBody=Math.min(minBody,body);
        for(let wheel=0;wheel<4;wheel++) {
          const point=car.controller.wheelContactPoint(wheel);
          if(car.controller.wheelIsInContact(wheel)&&point)
            lift=Math.max(lift,point.y-sampledHeightAt(point.x,point.z));
        }
      }
      assert.ok(car.position.z<log.z-9,`car stuck at scattered log ${log.z}: ${car.position.z}`);
      assert.ok(lift>0.2,`scattered log ${log.z} wheel lift=${lift}`);
      assert.ok(maxBody-minBody>0.15,`scattered log ${log.z} chassis motion=${maxBody-minBody}`);
    } finally {runtime.dispose();world.free();disposeScene(scene);}
  }
});

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


test('sea reaches the physical bank along the entire western coast', () => {
  const meshes = new Map<string, THREE.Mesh>();
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const ray = new THREE.Raycaster();
  try {
    for (let z = -768; z <= 768; z += 8) {
      for (let d = -10; d <= 44; d += 1) {
        const x = coastShoreX(z) + d;
        if (sampledHeightAt(x, z) >= -0.02) continue;
        assert.notEqual(waterHeightAt(x, z), null, `uncovered seabed at ${x},${z}`);
        const cx = Math.floor(x / 96), cz = Math.floor(z / 96), key = `${cx},${cz}`;
        let mesh = meshes.get(key);
        if (!mesh) {
          const chunk = generateNorthernChunk(cx, cz);
          assert.ok(chunk.waterVertices && chunk.waterIndices);
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(chunk.waterVertices, 3));
          geometry.setIndex(new THREE.BufferAttribute(chunk.waterIndices, 1));
          mesh = new THREE.Mesh(geometry, material);
          meshes.set(key, mesh);
        }
        ray.set(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));
        assert.ok(ray.intersectObject(mesh).length > 0, `water mesh gap at ${x},${z}`);
      }
    }
  } finally {
    for (const mesh of meshes.values()) mesh.geometry.dispose();
    material.dispose();
  }
});
