import * as THREE from 'three';
import type { Vehicle } from './vehicle';

type Droplet = { position: THREE.Vector3; velocity: THREE.Vector3; remaining: number };

export class WaterEffects {
  private readonly drops: Droplet[] = Array.from({ length: 40 }, () => ({
    position: new THREE.Vector3(), velocity: new THREE.Vector3(), remaining: 0,
  }));
  private readonly mesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.075, 0),
    new THREE.MeshBasicMaterial({ color: '#c4eff0' }),
    this.drops.length,
  );
  private readonly dummy = new THREE.Object3D();
  private readonly wheel = new THREE.Vector3();
  private next = 0;
  private time = 0;

  constructor(scene: THREE.Scene, private readonly waterHeight: (x: number, z: number) => number | null) {
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
  }

  clear() {
    for (const drop of this.drops) drop.remaining = 0;
    this.mesh.visible = false;
    this.time = 0;
  }

  update(dt: number, vehicle: Vehicle) {
    this.time += dt;
    if (Math.abs(vehicle.speed) > 0.7 && this.time > 0.065) {
      this.time = 0;
      vehicle.model.updateMatrixWorld(true);
      for (let i = 0; i < vehicle.wheels.length; i++) {
        vehicle.wheels[i].getWorldPosition(this.wheel);
        const waterY = this.waterHeight(this.wheel.x, this.wheel.z);
        if (waterY === null || this.wheel.y - 0.48 > waterY) continue;
        const drop = this.drops[this.next++ % this.drops.length];
        drop.position.set(this.wheel.x, waterY + 0.04, this.wheel.z);
        drop.velocity.set(i % 2 ? 1.6 : -1.6, 1.3 + Math.min(1.1, Math.abs(vehicle.speed) * 0.09),
          Math.sign(vehicle.speed) * 1.2).applyQuaternion(vehicle.model.quaternion);
        drop.remaining = 0.45;
      }
    }
    let active = false;
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      drop.remaining = Math.max(0, drop.remaining - dt);
      if (drop.remaining > 0) {
        active = true;
        drop.velocity.y -= 7 * dt;
        drop.position.addScaledVector(drop.velocity, dt);
        this.dummy.position.copy(drop.position);
        this.dummy.scale.setScalar(Math.min(1, drop.remaining * 5));
      } else this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = active;
  }
}
