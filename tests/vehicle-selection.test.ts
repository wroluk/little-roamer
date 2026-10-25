import assert from 'node:assert/strict';
import { test } from 'node:test';
import { earthVehicle, explorationVehicle, vehicleAvailable } from '../src/game/vehicle-selection';
import { isVehicleModelId, VEHICLE_MODELS } from '../src/game/vehicle';
import { AREAS } from '../src/game/areas';
import { HABITAT_PAD, HABITAT_START, MARS_STARTS } from '../src/game/mars-terrain';

test('all three exploration rovers are available on Mars and Moon but not Earth', () => {
  for (const area of Object.keys(AREAS)) for (const model of [...VEHICLE_MODELS, 'invalid']) {
    assert.equal(vehicleAvailable(area, model), area === 'mars' || area === 'moon'
      ? ['mars-scout', 'lunar-rover', 'lunar-nomad'].includes(model) : ['modern', 'classic'].includes(model));
  }
  assert.equal(isVehicleModelId('lunar-rover'), true);
  assert.equal(isVehicleModelId('lunar-nomad'), true);
  for (const area of ['mars', 'moon'] as const) {
    for (const rover of ['mars-scout', 'lunar-rover', 'lunar-nomad']) assert.equal(explorationVehicle(area, rover), rover);
    for (const invalid of [null, 'classic', 'modern', 'invalid'])
      assert.equal(explorationVehicle(area, invalid), area === 'moon' ? 'lunar-rover' : 'mars-scout');
  }
  assert.equal(earthVehicle('classic', 'modern'), 'classic');
  assert.equal(earthVehicle('mars-scout', 'classic'), 'classic');
  assert.equal(earthVehicle('lunar-rover', 'classic'), 'classic');
  assert.equal(earthVehicle('lunar-nomad', 'classic'), 'classic');
  assert.equal(earthVehicle(null, 'mars-scout'), 'modern');
  assert.equal(earthVehicle(null, 'lunar-rover'), 'modern');
  assert.equal(earthVehicle(null, 'lunar-nomad'), 'modern');
  assert.equal(earthVehicle('invalid', 'invalid'), 'modern');
});

test('Mars arrival and habitat reset use pad without moving road anchors', () => {
  assert.equal(AREAS.mars.spawn.z, 40);
  assert.deepEqual(MARS_STARTS[0].position, HABITAT_PAD);
  assert.equal(HABITAT_START.z, 8);
});
