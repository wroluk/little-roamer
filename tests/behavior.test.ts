import assert from 'node:assert/strict';
import { test } from 'node:test';
import { driveForces, FixedClock, steeringValue } from '../src/game/driving';
import { InputState } from '../src/game/input';
import { START, surfaceHeight, terrainHeight } from '../src/game/terrain';

test('opposite input brakes before changing direction; both pedals always brake', () => {
  assert.deepEqual(driveForces({ steer: 0, forward: false, reverse: true }, 5), { engine: 0, brake: 18 });
  assert.deepEqual(driveForces({ steer: 0, forward: true, reverse: false }, -5), { engine: 0, brake: 18 });
  assert.deepEqual(driveForces({ steer: 0, forward: true, reverse: true }, 5), { engine: 0, brake: 22 });
  assert.ok(driveForces({ steer: 0, forward: false, reverse: true }, 0).engine < 0);
  assert.equal(driveForces({ steer: 0, forward: true, reverse: false }, 16).engine, 0);
  assert.equal(Math.abs(driveForces({ steer: 0, forward: false, reverse: true }, -8).engine), 0);
  assert.ok(driveForces({ steer: 0, forward: false, reverse: false }, 7).brake > 0);
});

test('steering deadzone, full travel and clamping', () => {
  assert.equal(steeringValue(150, 0, 300), 0);
  assert.equal(steeringValue(154, 0, 300), 0);
  assert.equal(steeringValue(-200, 0, 300), -1);
  assert.equal(steeringValue(600, 0, 300), 1);
});

test('independent steering/pedal pointers and keyboard fallbacks', () => {
  const state = new InputState();
  state.steer(1, 0.75);
  state.pedals.set(2, 'forward');
  state.pedals.set(3, 'reverse');
  state.steer(4, -1);
  assert.deepEqual(state.value, { steer: 0.75, forward: true, reverse: true });
  state.release(2);
  assert.deepEqual(state.value, { steer: 0.75, forward: false, reverse: true });
  state.key('ArrowLeft', true);
  state.release(1);
  assert.equal(state.value.steer, -1);
  state.reset();
  assert.deepEqual(state.value, { steer: 0, forward: false, reverse: false });
  assert.equal(state.key('Space', true), false);
});

test('multiple fingers on one pedal keep it held until all release', () => {
  const state = new InputState();
  state.pedals.set(1, 'forward');
  state.pedals.set(2, 'forward');
  state.release(1);
  assert.equal(state.value.forward, true);
  state.release(2);
  assert.equal(state.value.forward, false);
});

test('fixed clock caps catch-up and clears time debt on resume', () => {
  const clock = new FixedClock();
  let ticks = 0;
  clock.advance(60, () => ticks++);
  assert.equal(ticks, 5);
  clock.reset();
  clock.advance(1 / 120, () => ticks++);
  assert.equal(ticks, 5);
  clock.advance(1 / 120, () => ticks++);
  assert.equal(ticks, 6);
});

test('starting clearing is flat and terrain samples are deterministic', () => {
  assert.equal(surfaceHeight(START.x, START.z), 0);
  assert.equal(terrainHeight(4, 25), 0);
  assert.equal(terrainHeight(-30, -28), terrainHeight(-30, -28));
  assert.ok(surfaceHeight(-25.5, -24) > 7.5);
});
