import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DISH_SITE } from './mars-dish-layout';
import { addDishRidgeDecor } from './mars-dish-landmarks';
import { marsHabitatGeometry } from './mars-landmarks';
import { marsSurfaceHeight } from './mars-terrain';
import { disposeScene } from './dispose';

/** Visual silhouettes only; the detailed chunk owns collision and replaces each matching anchor. */
export function buildMarsHorizonLandmarks() {
  const group = new THREE.Group();
  const anchors: { cx: number; cz: number; group: THREE.Group }[] = [];
  const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true });
  const palette = { ivory: material('#e9dac2'), orange: material('#c76c3d'), dark: material('#39353e'), light: material('#e8e9c7') };
  const glass = material('#344d59');
  const ownedMaterials = new Set<THREE.Material>([...Object.values(palette), glass]);
  const anchor = (x: number, z: number, name: string, build: (add: (g: THREE.BufferGeometry, m: THREE.Material) => void) => void) => {
    const object = new THREE.Group(); object.name = name;
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    build((geometry, m) => {
      ownedMaterials.add(m);
      const non = geometry.index ? geometry.toNonIndexed() : geometry.clone(); geometry.dispose(); non.deleteAttribute('uv');
      const batch = batches.get(m) ?? []; batch.push(non); batches.set(m, batch);
    });
    for (const [m, geometries] of batches) {
      const geometry = mergeGeometries(geometries)!; geometries.forEach(g => g.dispose());
      object.add(new THREE.Mesh(geometry, m));
    }
    group.add(object); anchors.push({ cx: Math.floor(x / 96), cz: Math.floor(z / 96), group: object });
  };
  anchor(DISH_SITE.x, DISH_SITE.z, 'Mars · distant dish', add => addDishRidgeDecor(2, -3, add, palette, true));
  for (const [x, z, radius] of [[-28, 37, 10], [23, 37, 8], [6, 84, 11]]) anchor(x, z, 'Mars · distant habitat', add => {
    const y = marsSurfaceHeight(x, z), dome = marsHabitatGeometry(radius, 1);
    add(dome.opaque.translate(x, y + 1.2, z), palette.ivory);
    add(dome.glazed.translate(x, y + 1.2, z), glass); dome.frame.dispose();
    add(new THREE.CylinderGeometry(radius, radius, 1.2, 12).translate(x, y + 0.6, z), palette.dark);
    add(new THREE.BoxGeometry(3.8, 4, 3.2).translate(x, y + 2, z - radius + 0.1), palette.orange);
  });
  // The glow palette is unused by these distant silhouettes.
  for (const m of ownedMaterials) {
    let used = false; group.traverse(object => { if (object instanceof THREE.Mesh && object.material === m) used = true; });
    if (!used) m.dispose();
  }
  return { group, anchors, dispose: () => { const scene = new THREE.Scene(); scene.add(group); disposeScene(scene); } };
}
