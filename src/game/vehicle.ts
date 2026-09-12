import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { driveForces, MAX_FORWARD_SPEED, MAX_REVERSE_SPEED, type DriveInput } from './driving';
import { START } from './terrain';
import { SURFACES, type Surface, type SurfaceId } from './surfaces';

const WHEEL_RADIUS = 0.48;
const REST_LENGTH = 0.38;
const CONNECTIONS = [
  { x: -0.91, y: 0, z: -1.02 }, { x: 0.91, y: 0, z: -1.02 },
  { x: -0.91, y: 0, z: 1.0 }, { x: 0.91, y: 0, z: 1.0 },
];
const FORWARD = new THREE.Vector3(0, 0, -1);
const SURFACE_BLEND_SECONDS = 0.26;

export type WheelTerrainState = {
  readonly position: THREE.Vector3;
  surface: Surface;
  grounded: boolean;
  intensity: number;
};

export class Vehicle {
  readonly body: RAPIER.RigidBody;
  readonly controller: RAPIER.DynamicRayCastVehicleController;
  readonly model = new THREE.Group();
  readonly wheels: THREE.Group[] = [];
  readonly tires: THREE.Group[] = [];
  readonly previousPosition = new THREE.Vector3();
  readonly previousRotation = new THREE.Quaternion();
  readonly position = new THREE.Vector3();
  readonly rotation = new THREE.Quaternion();
  readonly forward = new THREE.Vector3();
  readonly terrainWheels: WheelTerrainState[] = CONNECTIONS.map(() => ({
    position: new THREE.Vector3(), surface: SURFACES.dirt, grounded: false, intensity: 0,
  }));
  private steering = 0;
  private readonly oldSuspension = [REST_LENGTH, REST_LENGTH, REST_LENGTH, REST_LENGTH];
  private readonly suspension = [REST_LENGTH, REST_LENGTH, REST_LENGTH, REST_LENGTH];
  private readonly oldWheelAngles = [0, 0, 0, 0];
  private readonly wheelAngles = [0, 0, 0, 0];
  private readonly velocity = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly wheelOffset = new THREE.Vector3();
  private readonly wheelWaterDepth = [0, 0, 0, 0];
  private readonly surfaceCounts: Record<SurfaceId, number> = {
    dirt: 0, grass: 0, ash: 0, lava: 0, moss: 0, ice: 0, water: 0,
    snow: 0, mud: 0, rock: 0, sand: 0,
  };
  private surface: Surface = SURFACES.dirt;
  private candidateSurface: SurfaceId = 'dirt';
  private candidateTime = 0;
  private blended = { power: 1, drag: 0, speed: 1, steering: 1, feedback: 0 };
  private terrainIntensity = 0;
  private maximumWaterDepth = 0;
  private terrainTime = 0;

  constructor(
    scene: THREE.Scene,
    readonly world: RAPIER.World,
    readonly spawn = START,
    private readonly climbingPower = 1,
    private readonly surfaceAt: (x: number, z: number) => SurfaceId = () => 'dirt',
    private readonly waterHeight: (x: number, z: number) => number | null = () => null,
    private readonly softObstacleAt: (x: number, z: number) => number = () => 0,
  ) {
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawn.x, spawn.y, spawn.z)
      .setLinearDamping(0.14).setAngularDamping(1.9).setCcdEnabled(true).setCanSleep(false));
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.73, 0.26, 1.37)
      .setTranslation(0, 0.03, 0).setMass(90).setFriction(0.35).setRestitution(0), this.body);
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.63, 0.35, 0.61)
      .setTranslation(0, 0.61, 0.15).setMass(5).setFriction(0.35), this.body);
    this.controller = world.createVehicleController(this.body);
    this.controller.indexUpAxis = 1;
    this.controller.setIndexForwardAxis = 2;
    for (const point of CONNECTIONS) {
      const i = this.controller.numWheels();
      this.controller.addWheel(point, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, REST_LENGTH, WHEEL_RADIUS);
      this.controller.setWheelSuspensionStiffness(i, 30);
      this.controller.setWheelSuspensionCompression(i, 4.4);
      this.controller.setWheelSuspensionRelaxation(i, 5.2);
      this.controller.setWheelMaxSuspensionTravel(i, 0.28);
      this.controller.setWheelMaxSuspensionForce(i, 5000);
      this.controller.setWheelFrictionSlip(i, 2.4);
      this.controller.setWheelSideFrictionStiffness(i, 0.85);
    }
    this.createModel();
    scene.add(this.model);
    this.capture();
    this.previousPosition.copy(this.position);
    this.previousRotation.copy(this.rotation);
    this.syncVisuals(1);
  }

  private createModel() {
    const mat = (color: string, roughness = 0.7) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
    const paint = mat('#ed754b');
    const dark = mat('#293e3d');
    const roof = mat('#ffebc4');
    const glass = mat('#397b7d', 0.25);
    const tire = mat('#293638');
    const hub = mat('#efe2be');
    const lights = new THREE.MeshStandardMaterial({ color: '#fff3cc', emissive: '#ffe4a6', emissiveIntensity: 0.3 });
    const taillights = mat('#b54939');
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.model.add(mesh);
      return mesh;
    };
    box(1.53, 0.49, 2.78, 0, 0.11, 0, paint);
    box(1.42, 0.14, 0.93, 0, 0.42, -0.85, paint);
    box(1.3, 0.7, 1.27, 0, 0.67, 0.18, roof);
    box(1.15, 0.46, 0.035, 0, 0.69, -0.471, glass);
    box(1.15, 0.42, 0.035, 0, 0.69, 0.826, glass);
    for (const side of [-1, 1]) {
      box(0.027, 0.43, 0.91, side * 0.66, 0.69, 0.12, glass);
      box(0.04, 0.47, 0.06, side * 0.68, 0.69, 0.19, roof);
      box(0.045, 0.06, 0.22, side * 0.783, 0.24, 0.35, dark);
      box(0.13, 0.22, 0.28, side * 0.87, 0.53, -0.41, paint);
      box(0.31, 0.2, 0.05, side * 0.51, 0.18, -1.405, lights);
      box(0.21, 0.17, 0.05, side * 0.52, 0.18, 1.405, taillights);
      box(0.26, 0.17, 0.84, side * 0.78, 0.02, -1, paint);
      box(0.26, 0.17, 0.84, side * 0.78, 0.02, 1, paint);
      box(0.07, 0.12, 1.18, side * 0.51, 1.15, 0.15, dark);
    }
    box(1.48, 0.16, 1.44, 0, 1.07, 0.17, roof);
    box(1.7, 0.16, 0.18, 0, -0.12, -1.48, dark);
    box(1.7, 0.16, 0.18, 0, -0.12, 1.48, dark);
    box(0.53, 0.16, 0.06, 0, 0.13, -1.413, dark);
    box(0.6, 0.32, 0.69, 0.15, 1.32, 0.24, mat('#a7b886'));
    box(0.65, 0.035, 0.065, 0.15, 1.495, 0.24, roof);
    box(1.19, 0.08, 0.09, 0, 1.19, -0.28, dark);
    box(1.19, 0.08, 0.09, 0, 1.19, 0.65, dark);

    const tireGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.36, 12);
    const hubGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.375, 8);
    tireGeo.rotateZ(Math.PI / 2);
    hubGeo.rotateZ(Math.PI / 2);
    const treadGeo = new THREE.BoxGeometry(0.39, 0.065, 0.17);
    for (const connection of CONNECTIONS) {
      const wheel = new THREE.Group();
      const spinner = new THREE.Group();
      const rubber = new THREE.Mesh(tireGeo, tire);
      const rim = new THREE.Mesh(hubGeo, hub);
      rubber.castShadow = true;
      rim.castShadow = true;
      spinner.add(rubber, rim);
      for (let j = 0; j < 12; j++) {
        const angle = j * Math.PI / 6;
        const tread = new THREE.Mesh(treadGeo, dark);
        tread.position.set(0, Math.cos(angle) * 0.46, Math.sin(angle) * 0.46);
        tread.rotation.x = angle;
        spinner.add(tread);
      }
      wheel.add(spinner);
      wheel.position.set(connection.x, -REST_LENGTH, connection.z);
      this.model.add(wheel);
      this.wheels.push(wheel);
      this.tires.push(spinner);
    }
    const spare = new THREE.Mesh(tireGeo, tire);
    spare.rotation.y = Math.PI / 2;
    spare.position.set(0, 0.53, 1.51);
    spare.scale.setScalar(0.84);
    spare.castShadow = true;
    this.model.add(spare);
    const spareHub = new THREE.Mesh(hubGeo, hub);
    spareHub.rotation.copy(spare.rotation);
    spareHub.position.copy(spare.position);
    spareHub.scale.copy(spare.scale);
    this.model.add(spareHub);

    // Batch immutable parts by material; suspension/steering groups stay separate.
    const batch = (group: THREE.Group) => {
      const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
      for (const child of [...group.children]) {
        if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) continue;
        child.updateMatrix();
        const transformed = child.geometry.clone().applyMatrix4(child.matrix);
        const geometries = batches.get(child.material) ?? [];
        geometries.push(transformed);
        batches.set(child.material, geometries);
        group.remove(child);
      }
      for (const [material, geometries] of batches) {
        const geometry = mergeGeometries(geometries);
        if (!geometry) throw new Error('The toy car geometry could not be assembled.');
        for (const part of geometries) part.dispose();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
    };
    for (const spinner of this.tires) batch(spinner);
    batch(this.model);
  }

  get speed() {
    this.forward.copy(FORWARD).applyQuaternion(this.body.rotation());
    return this.velocity.copy(this.body.linvel()).dot(this.forward);
  }

  get currentSurface() { return this.surface; }
  get terrainFeedback() { return this.blended.feedback * this.terrainIntensity; }
  get terrainHandling() { return this.blended; }
  get wheelSurfaces() { return this.terrainWheels.map(wheel => wheel.surface.id); }
  get waterDepth() { return this.maximumWaterDepth; }

  beforeStep(input: DriveInput, dt: number) {
    this.previousPosition.copy(this.position);
    this.previousRotation.copy(this.rotation);
    const speed = this.speed;
    this.terrainTime += dt;
    const centerSurface = SURFACES[this.surfaceAt(this.position.x, this.position.z)];
    for (const id in this.surfaceCounts) this.surfaceCounts[id as SurfaceId] = 0;
    const bodyRotation = this.body.rotation();
    const bodyPosition = this.body.translation();
    let power = 0;
    let dragTotal = 0;
    let speedScale = 0;
    let steering = 0;
    let feedback = 0;
    let intensity = 0;
    this.maximumWaterDepth = 0;
    for (let i = 0; i < 4; i++) {
      const wheel = this.terrainWheels[i];
      this.wheelOffset.set(CONNECTIONS[i].x, 0, CONNECTIONS[i].z).applyQuaternion(bodyRotation);
      wheel.position.set(
        bodyPosition.x + this.wheelOffset.x,
        bodyPosition.y - (this.controller.wheelSuspensionLength(i) ?? REST_LENGTH) - WHEEL_RADIUS,
        bodyPosition.z + this.wheelOffset.z,
      );
      wheel.grounded = this.controller.wheelIsInContact(i);
      const contactPoint = wheel.grounded ? this.controller.wheelContactPoint(i) : null;
      if (contactPoint) wheel.position.set(contactPoint.x, contactPoint.y, contactPoint.z);
      wheel.surface = wheel.grounded
        ? SURFACES[this.surfaceAt(wheel.position.x, wheel.position.z)]
        : centerSurface;
      const waterDepth = wheel.surface.id === 'water'
        ? Math.max(0, (this.waterHeight(wheel.position.x, wheel.position.z) ?? wheel.position.y)
          - wheel.position.y)
        : 0;
      this.wheelWaterDepth[i] = waterDepth;
      this.maximumWaterDepth = Math.max(this.maximumWaterDepth, waterDepth);
      const fordDepth = Math.min(1, waterDepth / 0.45);
      const deepStall = smoothStep((waterDepth - 0.65) / 0.3);
      this.surfaceCounts[wheel.surface.id]++;
      const shallowPower = THREE.MathUtils.lerp(0.72, wheel.surface.power, fordDepth);
      power += wheel.surface.id === 'water' ? THREE.MathUtils.lerp(shallowPower, 0, deepStall) : wheel.surface.power;
      const shallowDrag = wheel.surface.drag * THREE.MathUtils.lerp(0.45, 1, fordDepth);
      dragTotal += wheel.surface.id === 'water' ? shallowDrag + deepStall * 18 : wheel.surface.drag;
      const shallowSpeed = THREE.MathUtils.lerp(0.68, wheel.surface.speed, fordDepth);
      speedScale += wheel.surface.id === 'water' ? THREE.MathUtils.lerp(shallowSpeed, 0.01, deepStall) : wheel.surface.speed;
      steering += wheel.surface.steering;
      feedback += wheel.surface.feedback;
      const softObstacle = this.softObstacleAt(wheel.position.x, wheel.position.z);
      feedback += softObstacle * 0.25;
      wheel.intensity = wheel.grounded
        ? Math.min(1, Math.max(0, (Math.abs(speed) - 0.5) / 8) * (input.forward || input.reverse ? 1 : 0.55))
        : 0;
      intensity += wheel.intensity;
    }
    let dominant = centerSurface.id;
    for (const wheel of this.terrainWheels) {
      if (this.surfaceCounts[wheel.surface.id] > this.surfaceCounts[dominant]) dominant = wheel.surface.id;
    }
    if (dominant === this.surface.id) {
      this.candidateSurface = dominant;
      this.candidateTime = 0;
    } else {
      if (dominant !== this.candidateSurface) {
        this.candidateSurface = dominant;
        this.candidateTime = 0;
      }
      this.candidateTime += dt;
      if (this.candidateTime >= 0.12) {
        this.surface = SURFACES[dominant];
        this.candidateTime = 0;
      }
    }
    const blend = 1 - Math.exp(-dt / SURFACE_BLEND_SECONDS);
    this.blended.power += (power / 4 - this.blended.power) * blend;
    this.blended.drag += (dragTotal / 4 - this.blended.drag) * blend;
    this.blended.speed += (speedScale / 4 - this.blended.speed) * blend;
    this.blended.steering += (steering / 4 - this.blended.steering) * blend;
    this.blended.feedback += (feedback / 4 - this.blended.feedback) * blend;
    this.terrainIntensity += (intensity / 4 - this.terrainIntensity) * blend;
    const forces = driveForces(input, speed);
    const steerLimit = THREE.MathUtils.lerp(0.51, 0.25, Math.min(1, Math.abs(speed) / 15))
      * this.blended.steering;
    this.steering = THREE.MathUtils.damp(this.steering, -input.steer * steerLimit, 9, dt);
    for (let i = 0; i < 4; i++) {
      this.oldSuspension[i] = this.suspension[i];
      this.oldWheelAngles[i] = this.wheelAngles[i];
      this.controller.setWheelSteering(i, i < 2 ? this.steering : 0);
      const wheelSurface = this.terrainWheels[i].surface;
      this.controller.setWheelEngineForce(i, -forces.engine * this.climbingPower * this.blended.power);
      this.controller.setWheelBrake(i, forces.brake * wheelSurface.brakeEffect + wheelSurface.rollingBrake);
      this.controller.setWheelFrictionSlip(i, 2.4 * wheelSurface.longitudinalGrip);
      this.controller.setWheelSideFrictionStiffness(i, 0.85 * wheelSurface.lateralGrip);
      this.controller.setWheelSuspensionStiffness(i, wheelSurface.suspensionStiffness);
      this.controller.setWheelSuspensionCompression(i, wheelSurface.suspensionCompression);
      this.controller.setWheelSuspensionRelaxation(i, wheelSurface.suspensionRelaxation);
      const wheel = this.terrainWheels[i];
      const phase = this.terrainTime * Math.PI * 2 * (5 + i * 0.9)
        + wheel.position.x * 0.37 + wheel.position.z * 0.29;
      const roughness = wheelSurface.id === 'water'
        ? wheelSurface.roughness * THREE.MathUtils.lerp(0.65, 1.1, Math.min(1, this.wheelWaterDepth[i] / 0.45))
        : wheelSurface.roughness;
      const softObstacle = this.softObstacleAt(wheel.position.x, wheel.position.z);
      this.controller.setWheelSuspensionRestLength(i,
        REST_LENGTH + Math.sin(phase) * (roughness + softObstacle * 0.24) * wheel.intensity);
    }

    function smoothStep(value: number) {
      const t = Math.max(0, Math.min(1, value));
      return t * t * (3 - 2 * t);
    }
    this.controller.updateVehicle(dt, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    const velocity = this.body.linvel();
    const drag = Math.exp(-this.blended.drag * dt);
    this.body.setLinvel({ x: velocity.x * drag, y: velocity.y, z: velocity.z * drag }, true);
    // Gentle pitch/roll assistance, only on grounded upright wheels; yaw remains free.
    const contacts = this.contactCount();
    this.up.set(0, 1, 0).applyQuaternion(this.body.rotation());
    if (contacts >= 2 && this.up.y > 0.35) {
      const omega = this.body.angvel();
      this.body.applyTorqueImpulse({
        x: (this.up.z * -75 - omega.x * 8) * dt,
        y: 0,
        z: (this.up.x * 75 - omega.z * 8) * dt,
      }, true);
    }
  }

  capture() {
    const velocity = this.body.linvel();
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    const limit = (this.speed < -0.65 ? MAX_REVERSE_SPEED : MAX_FORWARD_SPEED) * this.blended.speed;
    if (horizontalSpeed > limit) {
      const scale = limit / horizontalSpeed;
      this.body.setLinvel({ x: velocity.x * scale, y: velocity.y, z: velocity.z * scale }, true);
    }
    this.position.copy(this.body.translation());
    this.rotation.copy(this.body.rotation());
    for (let i = 0; i < 4; i++) {
      this.suspension[i] = this.controller.wheelSuspensionLength(i) ?? REST_LENGTH;
      this.wheelAngles[i] = this.controller.wheelRotation(i) ?? 0;
    }
  }

  contactCount() {
    let contacts = 0;
    for (let i = 0; i < 4; i++) contacts += Number(this.controller.wheelIsInContact(i));
    return contacts;
  }

  syncVisuals(alpha: number) {
    this.model.position.lerpVectors(this.previousPosition, this.position, alpha);
    this.model.quaternion.slerpQuaternions(this.previousRotation, this.rotation, alpha);
    for (let i = 0; i < 4; i++) {
      this.wheels[i].position.y = -THREE.MathUtils.lerp(this.oldSuspension[i], this.suspension[i], alpha);
      this.wheels[i].rotation.y = i < 2 ? this.steering : 0;
      this.tires[i].rotation.x = THREE.MathUtils.lerp(this.oldWheelAngles[i], this.wheelAngles[i], alpha);
    }
  }

  reset() {
    this.body.setTranslation(this.spawn, true);
    this.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.resetForces(true);
    this.body.resetTorques(true);
    this.steering = 0;
    this.surface = SURFACES[this.surfaceAt(this.spawn.x, this.spawn.z)];
    this.candidateSurface = this.surface.id;
    this.candidateTime = 0;
    this.blended = {
      power: this.surface.power, drag: this.surface.drag, speed: this.surface.speed,
      steering: this.surface.steering, feedback: this.surface.feedback,
    };
    this.terrainTime = 0;
    this.terrainIntensity = 0;
    for (let i = 0; i < 4; i++) {
      this.controller.setWheelEngineForce(i, 0);
      this.controller.setWheelBrake(i, 0);
      this.controller.setWheelSteering(i, 0);
    }
    this.capture();
    this.previousPosition.copy(this.position);
    this.previousRotation.copy(this.rotation);
    this.syncVisuals(1);
  }
}
