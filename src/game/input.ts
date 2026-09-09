import type { DriveInput } from './driving';

export type Pedal = 'forward' | 'reverse';
const drivingKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class InputState {
  readonly keys = new Set<string>();
  readonly pedals = new Map<number, Pedal>();
  steeringPointer: number | null = null;
  touchSteer = 0;

  get value(): DriveInput {
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    return {
      steer: this.steeringPointer === null ? Number(right) - Number(left) : this.touchSteer,
      forward: this.keys.has('KeyW') || this.keys.has('ArrowUp') || [...this.pedals.values()].includes('forward'),
      reverse: this.keys.has('KeyS') || this.keys.has('ArrowDown') || [...this.pedals.values()].includes('reverse'),
    };
  }

  key(code: string, pressed: boolean) {
    if (!drivingKeys.has(code)) return false;
    if (pressed) this.keys.add(code);
    else this.keys.delete(code);
    return true;
  }

  steer(pointer: number, value: number) {
    if (this.steeringPointer !== null && this.steeringPointer !== pointer) return;
    this.steeringPointer = pointer;
    this.touchSteer = value;
  }

  release(pointer: number) {
    this.pedals.delete(pointer);
    if (this.steeringPointer === pointer) {
      this.steeringPointer = null;
      this.touchSteer = 0;
    }
  }

  reset() {
    this.keys.clear();
    this.pedals.clear();
    this.steeringPointer = null;
    this.touchSteer = 0;
  }
}
