import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  adaptCylinderMapping,
  adaptLockForkMapping,
  adaptPackagingMapping,
  validateCylinderMapping,
  validateLockForkMapping,
  validatePackagingMapping,
} from '../src/services/mappings';

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('mapping adapter baseline: packaging sources normalize to the same DTO', () => {
  const dataPayload = adaptPackagingMapping(readJson('data/packaging-mapping.json'));
  const publicPayload = adaptPackagingMapping(readJson('public/data/packaging-mapping.json'));

  assert.deepEqual(dataPayload, publicPayload);
  assert.equal(validatePackagingMapping(publicPayload).length, 0);
  assert.ok(Object.keys(publicPayload.mappings).length > 0);
});

test('mapping adapter baseline: current cylinder mapping adapts and validates cleanly', () => {
  const payload = adaptCylinderMapping(readJson('public/data/cylinder-mapping.json'));

  assert.equal(validateCylinderMapping(payload).length, 0);
  assert.ok(Object.keys(payload.dimensions).length > 0);
  assert.ok(Object.keys(payload.mappings).length > 0);
});

test('mapping adapter baseline: current lock-fork mapping adapts and validates cleanly', () => {
  const payload = adaptLockForkMapping(readJson('public/data/lock-fork-mapping.json'));

  assert.equal(validateLockForkMapping(payload).length, 0);
  assert.ok(Object.keys(payload.baseDimensions).length > 0);
  assert.equal(payload.suppliers.default, '应志友');
});
