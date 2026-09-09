import { InputState, type Pedal } from '../game/input';
import { steeringValue } from '../game/driving';

export function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`The game interface is missing ${id}.`);
  return node as T;
}

export class Controls {
  readonly state = new InputState();
  private enabled = false;
  private readonly steer = element('steer');
  private readonly knob = element('steer-knob');
  private readonly forward = element<HTMLButtonElement>('forward');
  private readonly reverse = element<HTMLButtonElement>('reverse');
  private readonly captures = new Map<number, HTMLElement>();

  constructor(onPause: () => void, onReset: () => void) {
    const capture = (event: PointerEvent, target: HTMLElement) => {
      event.preventDefault();
      target.setPointerCapture(event.pointerId);
      this.captures.set(event.pointerId, target);
    };
    const updateSteer = (event: PointerEvent) => {
      const rect = this.steer.getBoundingClientRect();
      this.state.steer(event.pointerId, steeringValue(event.clientX, rect.left, rect.width));
      this.paint();
    };
    this.steer.addEventListener('pointerdown', event => {
      if (!this.enabled || event.button !== 0 || this.state.steeringPointer !== null) return;
      capture(event, this.steer);
      updateSteer(event);
    });
    this.steer.addEventListener('pointermove', event => {
      if (this.state.steeringPointer !== event.pointerId) return;
      updateSteer(event);
    });
    const pedal = (button: HTMLElement, action: Pedal) => {
      button.addEventListener('pointerdown', event => {
        if (!this.enabled || event.button !== 0) return;
        capture(event, button);
        this.state.pedals.set(event.pointerId, action);
        this.paint();
      });
    };
    pedal(this.forward, 'forward');
    pedal(this.reverse, 'reverse');
    for (const target of [this.steer, this.forward, this.reverse]) {
      target.addEventListener('pointerup', event => {
        this.captures.delete(event.pointerId);
        this.state.release(event.pointerId);
        this.paint();
      });
      target.addEventListener('lostpointercapture', event => {
        this.captures.delete(event.pointerId);
        this.state.release(event.pointerId);
        this.paint();
      });
      target.addEventListener('pointercancel', () => this.clear());
      target.addEventListener('contextmenu', event => event.preventDefault());
    }
    window.addEventListener('keydown', event => {
      if (event.code === 'Escape' && !event.repeat) { onPause(); return; }
      if (!this.enabled || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLSelectElement) return;
      if (this.state.key(event.code, true)) event.preventDefault();
      if (event.code === 'KeyR' && !event.repeat) onReset();
      this.paint();
    });
    window.addEventListener('keyup', event => {
      this.state.key(event.code, false);
      this.paint();
    });
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => this.clear());
    window.addEventListener('resize', () => this.clear());
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    this.clear();
    element('controls').hidden = !value;
    this.forward.disabled = !value;
    this.reverse.disabled = !value;
  }

  clear() {
    this.state.reset();
    for (const [id, target] of this.captures) {
      if (target.hasPointerCapture(id)) target.releasePointerCapture(id);
    }
    this.captures.clear();
    this.paint();
  }

  private paint() {
    const value = this.state.value;
    const travel = (this.steer.clientWidth - this.knob.clientWidth) / 2 - 10;
    this.knob.style.transform = `translateX(${value.steer * travel}px)`;
    this.steer.setAttribute('aria-valuenow', String(Math.round(value.steer * 100)));
    this.forward.classList.toggle('pressed', value.forward);
    this.reverse.classList.toggle('pressed', value.reverse);
  }
}
