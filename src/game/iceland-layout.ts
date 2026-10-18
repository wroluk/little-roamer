/** Shared terrain/water anchors. The brink sits on an actual terrain mesh row. */
export const FALL = { x: -535, lipZ: 468.08, terrainLipZ: 468, top: 47.5, bottom: 5.84, halfWidth: 9 };
export const SKOGA_BRIDGE = { x: -531, z: 530, y: 6.3, length: 64, width: 12 };
export function onSkogaBridge(x: number, z: number) {
  return Math.abs(x - SKOGA_BRIDGE.x) <= SKOGA_BRIDGE.length / 2 && Math.abs(z - SKOGA_BRIDGE.z) <= SKOGA_BRIDGE.width / 2;
}
