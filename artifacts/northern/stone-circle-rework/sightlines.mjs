// Design measurements, independent of the test runner. Inspect terrain-only screening
// so concealment does not depend on fog, trees, or the prop's streaming distance.
import { sampledHeightAt, ROUTES } from '../../../src/game/northern-terrain.ts';
import { FOREST_TRAILS } from '../../../src/game/northern-forest.ts';
import { ADVENTURE_REGIONS } from '../../../src/game/northern-adventures.ts';
import { STONE_CIRCLE } from '../../../src/game/northern-discovery-layout.ts';
const {x: sx, z: sz, floor} = STONE_CIRCLE;
const routes = [...ROUTES.map(r => ({name:r.name,points:r.line})), ...FOREST_TRAILS,
  ...ADVENTURE_REGIONS.flatMap(r => r.trails)];
let rays = 0, views = 0, weakest = {margin:Infinity}, exposed = [];
// Bounding rectangle above every stone, with extra height and width allowance.
const targets = [-14,0,14].flatMap(u => [-14,0,14].map(v => ({x:sx+u,z:sz+v,y:floor+6.3})));
for(const route of routes) for(let i=1;i<route.points.length;i++) {
  const a=route.points[i-1], b=route.points[i], length=Math.hypot(b.x-a.x,b.z-a.z);
  const steps=Math.ceil(length/8);
  for(let j=0;j<=steps;j++) {
    const x=a.x+(b.x-a.x)*j/steps, z=a.z+(b.z-a.z)*j/steps;
    if(Math.hypot(x-sx,z-sz)>320) continue;
    // Conservative elevated camera, including all four sides of the track.
    for(const [dx,dz] of [[0,0],[-18,0],[18,0],[0,-18],[0,18]]) {
      const origin={x:x+dx,z:z+dz,y:Math.max(sampledHeightAt(x,z)+17,sampledHeightAt(x+dx,z+dz)+1)};
      views++;
      for(const target of targets) {
        const distance=Math.hypot(target.x-origin.x,target.z-origin.z);
        let margin=-Infinity;
        // Only the last 95 metres are needed to measure the enclosing ridge.
        for(let d=3;d<Math.min(95,distance-2);d+=2) {
          const t=d/distance;
          const px=target.x+(origin.x-target.x)*t, pz=target.z+(origin.z-target.z)*t;
          const y=target.y+(origin.y-target.y)*t;
          margin=Math.max(margin,sampledHeightAt(px,pz)-y);
        }
        rays++;
        if(margin<weakest.margin) weakest={margin,route:route.name,origin,target};
        if(margin<=0) exposed.push({route:route.name,origin,target});
      }
    }
  }
}
console.log(JSON.stringify({views,rays,exposed:exposed.length,weakest,examples:exposed.slice(0,3)},null,2));
