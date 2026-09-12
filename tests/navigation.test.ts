import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  compassDirection,
  compassHeading,
  navigationReading,
} from '../src/game/navigation';

test('compass heading follows the car across cardinal directions', () => {
  assert.equal(compassHeading(0, -1), 0);
  assert.equal(compassHeading(1, 0), 90);
  assert.equal(compassHeading(0, 1), 180);
  assert.equal(compassHeading(-1, 0), 270);
});

test('compass labels wrap and include intercardinal directions', () => {
  assert.equal(compassDirection(0), 'N');
  assert.equal(compassDirection(44), 'NE');
  assert.equal(compassDirection(225), 'SW');
  assert.equal(compassDirection(359), 'N');
  assert.equal(compassDirection(-90), 'W');
});

test('navigation reading rounds terrain elevation without changing heading precision', () => {
  assert.deepEqual(navigationReading(1, -1, 15.6), {
    heading: 45,
    direction: 'NE',
    elevation: 16,
  });
});
