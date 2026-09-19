import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LAKE_LEVEL, LAKE_ISLAND, inletCenterX, inletLevel, inletDistance, inletWidth, lakeShorePoint, INLET_FORDS } from '../src/game/northern-watershed';
import { sampledHeightAt, waterHeightAt, generateNorthernChunk } from '../src/game/northern-terrain';

test('lake sits in a low basin with a dry island, shallow shelves and deep open water', () => {
  assert.equal(waterHeightAt(0,180), LAKE_LEVEL);
  assert.ok(LAKE_LEVEL - sampledHeightAt(0,180) > 3);
  assert.equal(waterHeightAt(LAKE_ISLAND.x, LAKE_ISLAND.z), null);
  for (const angle of [-0.4,0,0.4,0.8,1.2,1.6,2,2.4]) {
    const shelf = lakeShorePoint(angle,-8), bank = lakeShorePoint(angle,12);
    assert.equal(waterHeightAt(shelf.x,shelf.z), LAKE_LEVEL);
    assert.ok(LAKE_LEVEL-sampledHeightAt(shelf.x,shelf.z)<0.6);
    assert.equal(waterHeightAt(bank.x,bank.z),null);
    assert.ok(sampledHeightAt(bank.x,bank.z)<LAKE_LEVEL+4);
  }
});

test('inlet remains connected and descends through its meanders into the lake', () => {
  let previous = Infinity;
  for(let z=-580;z<=100;z+=2) {
    const x=inletCenterX(z), level=waterHeightAt(x,z);
    assert.notEqual(level,null,`disconnected river at ${x},${z}`);
    assert.ok(level!<=previous+0.001,`uphill flow at ${z}`);
    assert.ok(Math.abs(level!-inletLevel(z))<0.01);
    previous=level!;
  }
  for(const f of INLET_FORDS) {
    for(const dz of [-2.5,0,2.5]) for(let dx=-34;dx<=34;dx++) {
      const x=f.x+dx,z=f.z+dz,h=sampledHeightAt(x,z),level=waterHeightAt(x,z);
      assert.ok(Math.abs(sampledHeightAt(x+0.5,z)-h)/0.5<0.5,`steep ford at ${x},${z}`);
      if(level!==null) assert.ok(level-h<0.4,`deep ford at ${x},${z}`);
    }
  }
  // Water cannot reappear on the outer slope after the bank blends into a hillside.
  for(let z=-580;z<-280;z+=10) for(let dx=-85;dx<=85;dx+=2) {
    const x=inletCenterX(z)+dx;
    if(inletDistance(x,z)>inletWidth(z)+12) assert.equal(waterHeightAt(x,z),null,`outer-bank spill at ${x},${z}`);
  }
});

test('new shore water meets physical banks and rendered triangles stay wet', () => {
  for(const [cx,cz] of [[-1,2],[0,1],[1,1],[1,-1],[2,-3],[3,-5],[4,-6]]) {
    const vertices=generateNorthernChunk(cx,cz).waterVertices;
    assert.ok(vertices,`water expected in ${cx},${cz}`);
    for(let i=0;i<vertices.length;i+=9) {
      const x=(vertices[i]+vertices[i+3]+vertices[i+6])/3,z=(vertices[i+2]+vertices[i+5]+vertices[i+8])/3;
      const level=waterHeightAt(x,z);
      assert.notEqual(level,null,`dry water triangle at ${x},${z}`);
      assert.ok(Math.abs((vertices[i+1]+vertices[i+4]+vertices[i+7])/3-0.015-level!)<0.08,`water level mismatch at ${x},${z}`);
    }
  }
  // At each lowland transect the last wet sample must become genuinely shallow;
  // a feature-mask cutoff while the ground is still deep would leave a visible gap.
  for(const z of [-580,-540,-460,-400,-360,-260,-170,-110,-30]) for(const side of [-1,1]) {
    let lastDepth=Infinity;
    for(let d=0;d<70;d+=0.1) {
      const x=inletCenterX(z)+side*d,level=waterHeightAt(x,z);
      if(level===null) break;
      lastDepth=level-sampledHeightAt(x,z);
    }
    assert.ok(lastDepth<0.04,`river bank gap at ${z}: ${lastDepth}`);
  }
});
