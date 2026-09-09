export type DriveInput = { steer: number; forward: boolean; reverse: boolean };
export const MAX_FORWARD_SPEED = 15;
export const MAX_REVERSE_SPEED = 7;

export function driveForces(input: DriveInput, speed: number) {
  if (input.forward && input.reverse) return { engine: 0, brake: 22 };
  const direction = Number(input.forward) - Number(input.reverse);
  if (direction !== 0 && speed * direction < -0.65) return { engine: 0, brake: 18 };
  if (direction === 0) return { engine: 0, brake: 0.65 };
  const limit = direction > 0 ? MAX_FORWARD_SPEED : MAX_REVERSE_SPEED;
  const fade = Math.max(0, Math.min(1, (limit - Math.abs(speed)) / 2.5));
  return { engine: direction * 190 * fade, brake: Math.abs(speed) > limit ? 2 : 0 };
}

export function steeringValue(clientX: number, left: number, width: number): number {
  const raw = Math.max(-1, Math.min(1, (clientX - left - width / 2) / (width * 0.35)));
  const deadzone = 0.09;
  return Math.abs(raw) < deadzone ? 0 : Math.sign(raw) * (Math.abs(raw) - deadzone) / (1 - deadzone);
}

export class FixedClock {
  readonly step = 1 / 60;
  readonly maxSteps = 5;
  accumulator = 0;

  advance(elapsed: number, tick: (dt: number) => void) {
    this.accumulator += Math.min(Math.max(elapsed, 0), this.step * this.maxSteps);
    let steps = 0;
    while (this.accumulator + 1e-10 >= this.step && steps < this.maxSteps) {
      tick(this.step);
      this.accumulator -= this.step;
      steps++;
    }
    this.accumulator = Math.max(0, this.accumulator);
    return this.accumulator / this.step;
  }

  reset() { this.accumulator = 0; }
}
