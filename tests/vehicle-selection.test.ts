import assert from 'node:assert/strict';
import { test } from 'node:test';
import { earthVehicle, vehicleAvailable } from '../src/game/vehicle-selection';
import { AREAS } from '../src/game/areas';
import { HABITAT_PAD, HABITAT_START, MARS_STARTS } from '../src/game/mars-terrain';

test('Mars exclusively uses Scout; Earth rejects legacy Scout preferences and links', () => {
  for (const area of Object.keys(AREAS)) for (const model of ['modern', 'classic', 'mars-scout', 'invalid']) {
    assert.equal(vehicleAvailable(area, model), area === 'mars' ? model === 'mars-scout' : ['modern', 'classic'].includes(model));
  }
  assert.equal(earthVehicle('classic', 'modern'), 'classic');
  assert.equal(earthVehicle('mars-scout', 'classic'), 'classic');
  assert.equal(earthVehicle(null, 'mars-scout'), 'modern');
  assert.equal(earthVehicle('invalid', 'invalid'), 'modern');
});

test('Mars arrival and habitat reset use pad without moving road anchors', () => {
  assert.equal(AREAS.mars.spawn.z, 40);
  assert.deepEqual(MARS_STARTS[0].position, HABITAT_PAD);
  assert.equal(HABITAT_START.z, 8);
});
