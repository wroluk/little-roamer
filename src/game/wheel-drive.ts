export const WHEEL_INERTIA = 0.7;

export function tyreImpulse(
  forward: number, side: number, normalImpulse: number, friction: number,
  lateralFriction = friction,
) {
  const capacity = Math.max(0, normalImpulse * friction);
  const sideCapacity = Math.max(0, normalImpulse * lateralFriction);
  if (capacity === 0 || sideCapacity === 0) return { forward: 0, side: 0 };
  const demand = Math.hypot(forward * 0.5, side);
  const scale = demand > capacity ? capacity / demand : 1;
  const boundedForward = forward * scale, boundedSide = side * scale;
  if (lateralFriction >= friction) return { forward: boundedForward, side: boundedSide };
  const remaining = sideCapacity * Math.sqrt(Math.max(0, 1 - (boundedForward * 0.5 / capacity) ** 2));
  return { forward: boundedForward, side: Math.max(-remaining, Math.min(remaining, boundedSide)) };
}

export class WheelDrive {
  angularSpeed = 0;
  private freeSpeed = 0;
  private brakeImpulse = 0;

  prepare(
    motorForce: number, rollingSpeed: number, radius: number, effectiveMass: number,
    capacity: number, grounded: boolean, dt: number, brakeImpulse = 0,
  ) {
    this.freeSpeed = this.angularSpeed + motorForce * radius * dt / WHEEL_INERTIA;
    this.brakeImpulse = brakeImpulse;
    if (!grounded) return 0;
    const stopImpulse = -rollingSpeed * effectiveMass;
    // Locking must absorb the shaft momentum and the chassis' stopping reaction.
    const stopMomentum = this.freeSpeed * WHEEL_INERTIA - stopImpulse * radius;
    const impulse = Math.abs(stopMomentum) <= brakeImpulse ? stopImpulse
      : ((this.freeSpeed - Math.sign(stopMomentum) * brakeImpulse / WHEEL_INERTIA) * radius - rollingSpeed)
      / (radius * radius / WHEEL_INERTIA + 1 / effectiveMass);
    return Math.max(-capacity, Math.min(capacity, impulse));
  }

  finish(contactImpulse: number, radius: number) {
    this.angularSpeed = this.freeSpeed - contactImpulse * radius / WHEEL_INERTIA;
    this.brake(this.brakeImpulse);
  }

  brake(angularImpulse: number) {
    this.angularSpeed -= Math.sign(this.angularSpeed)
      * Math.min(Math.abs(this.angularSpeed), angularImpulse / WHEEL_INERTIA);
  }

  reset() {
    this.angularSpeed = 0;
    this.freeSpeed = 0;
    this.brakeImpulse = 0;
  }
}
