import * as THREE from 'three';

import { FALL } from './iceland-layout';
export { FALL } from './iceland-layout';
const noise = `
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise21(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);
}
`;

/** Vertical falling water and a fixed-budget impact plume. */
export function buildSkogafossWater(group: THREE.Scene) {
  const time = { value: 0 }, vertices: number[] = [], uvs: number[] = [], indices: number[] = [];
  const columns = 40, rows = 64;
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
    const u = i / columns, t = j / rows;
    // A falling sheet spreads a little; a repeated wave in its silhouette
    // reads as a corrugated fabric edge from the road.
    const width = FALL.halfWidth + t * t * 0.55;
    // A short rounded overflow connects the level river to the vertical drop.
    // The brink row stays fixed on terrain; below the first four rows the
    // water resumes a nearly vertical fall.
    const crest = Math.min(1, j / 4);
    const tail = Math.max(0, (j - 4) / (rows - 4));
    const y = j <= 4 ? FALL.top - 0.95 * crest ** 2.4
      : FALL.top - 0.95 - (FALL.top - 0.95 - FALL.bottom) * tail;
    const z = j <= 4 ? FALL.lipZ + 0.65 * (1 - (1 - crest) ** 2)
      : FALL.lipZ + 0.65 + (0.08 + Math.sin(u * 71 + t * 9) * 0.06) * tail;
    vertices.push(FALL.x + (u * 2 - 1) * width,
      y, z);
    uvs.push(u, t);
    if (j < rows && i < columns) { const a = j * (columns + 1) + i; indices.push(a, a + columns + 1, a + 1, a + 1, a + columns + 1, a + columns + 2); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: '#e8f2ef', roughness: 0.55, metalness: 0.02,
    emissive: '#829a9c', emissiveIntensity: 0.2, side: THREE.DoubleSide, transparent: true, depthWrite: false });
  material.onBeforeCompile = shader => {
    shader.uniforms.fallTime = time;
    shader.vertexShader = 'uniform float fallTime; varying vec2 fallUv;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        fallUv=uv; float interior=1.0-smoothstep(0.7,0.98,abs(uv.x*2.0-1.0));
        transformed.z += sin(uv.x*83.0+uv.y*22.0-fallTime*9.0)*0.08*uv.y*interior;`);
    shader.fragmentShader = 'uniform float fallTime; varying vec2 fallUv;\n' + noise + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 p=fallUv;
        float flow=noise21(vec2(p.x*34.0,p.y*9.0-fallTime*2.3));
        float fine=noise21(vec2(p.x*86.0,p.y*48.0-fallTime*8.0));
        float ribs=noise21(vec2(p.x*27.0,p.y*2.0-fallTime*0.7));
        diffuseColor.rgb *= 0.66+0.24*flow+0.2*fine+0.12*ribs;
        float lipBlend=smoothstep(0.0,0.065,p.y);
        diffuseColor.rgb *= mix(vec3(0.86,0.89,0.88),vec3(1.0),lipBlend);
        float edge=smoothstep(0.0,0.045,min(p.x,1.0-p.x));
        diffuseColor.a= edge*mix(0.92,0.98+0.02*fine,lipBlend);`);
  };
  const curtain = new THREE.Mesh(geometry, material); curtain.name = 'Skógafoss · vertical falling water'; curtain.renderOrder = 2; group.add(curtain);


  const count = 56, puffGeometry = new THREE.PlaneGeometry(1, 1);
  const opacity = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  puffGeometry.setAttribute('puffOpacity', opacity);
  const mistMaterial = new THREE.MeshBasicMaterial({ color: '#e3efec', transparent: true, depthWrite: false, side: THREE.DoubleSide });
  mistMaterial.onBeforeCompile = shader => {
    shader.vertexShader = 'attribute float puffOpacity; varying float puffAlpha; varying vec2 puffUv;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\npuffAlpha=puffOpacity; puffUv=uv;')
      .replace('#include <project_vertex>', `
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0,0.0,0.0,1.0);
        mvPosition.xy += position.xy * vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
        gl_Position = projectionMatrix * mvPosition;`);
    shader.fragmentShader = 'varying float puffAlpha; varying vec2 puffUv;\n' + noise + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 p=puffUv*2.0-1.0;
        float r=length(p);
        float billow=noise21(puffUv*5.0);
        diffuseColor.a *= puffAlpha*pow(max(0.0,1.0-r),1.5)*(0.65+billow*0.35);`);
  };
  const mist = new THREE.InstancedMesh(puffGeometry, mistMaterial, count);
  mist.name = 'Skógafoss · spray'; mist.frustumCulled = false; mist.renderOrder = 3; group.add(mist);
  const dropGeometry = new THREE.SphereGeometry(1, 4, 3);
  const drops = new THREE.InstancedMesh(dropGeometry, new THREE.MeshBasicMaterial({ color: '#d4e8e6', transparent: true, opacity: 0.43, depthWrite: false }), 80);
  drops.name = 'Skógafoss · falling droplets'; drops.frustumCulled = false; drops.renderOrder = 3; group.add(drops);
  const dummy = new THREE.Object3D();
  function update() {
    for (let i = 0; i < count; i++) {
      const seed = (i * 0.61803398875) % 1, age = (time.value / (2.4 + seed * 2) + seed) % 1;
      const angle = i * 2.39996;
      dummy.position.set(FALL.x + Math.sin(angle) * (5 + age * 9) + age * 2,
        FALL.bottom + 0.25 + Math.sin(age * Math.PI * 0.8) * (i % 3 === 0 ? 0.5 : 1.4 + seed * 1.5),
        FALL.lipZ + 1 + age * (7 + seed * 11));
      const size = 3.5 + age * (7 + seed * 4);
      dummy.scale.set(size * 1.3, size, 1); dummy.updateMatrix(); mist.setMatrixAt(i, dummy.matrix);
      opacity.setX(i, Math.sin(age * Math.PI) * (0.42 + seed * 0.25));
    }
    for (let i = 0; i < drops.count; i++) {
      const seed = (i * 0.754877666) % 1, age = (time.value * (0.5 + seed * 0.3) + seed) % 1;
      dummy.position.set(FALL.x + Math.sin(i * 3.7) * (9.1 + age), FALL.top - age * age * (FALL.top - FALL.bottom), FALL.lipZ + 0.5 + seed * 1.2);
      dummy.scale.set(0.035 + seed * 0.06, 0.25 + age * 0.65, 0.045); dummy.updateMatrix(); drops.setMatrixAt(i, dummy.matrix);
    }
    opacity.needsUpdate = true; mist.instanceMatrix.needsUpdate = true; drops.instanceMatrix.needsUpdate = true;
  }
  update();
  return { animate(dt: number, reducedMotion: boolean) { if (!reducedMotion) { time.value += Math.min(dt, 0.05); update(); } } };
}
