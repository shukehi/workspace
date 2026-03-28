import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  adaptCylinderMapping,
  adaptHandleMapping,
  adaptLockMapping,
  adaptLockForkMapping,
  validateLockMapping,
  adaptPackagingMapping,
  validateCylinderMapping,
  validateHandleMapping,
  validateLockForkMapping,
  validatePackagingMapping,
} from '../src/services/mappings';

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('mapping adapter baseline: current packaging mapping adapts and validates cleanly', () => {
  const payload = adaptPackagingMapping(readJson('data/config/packaging-mapping.json'));

  assert.equal(validatePackagingMapping(payload).length, 0);
  assert.ok(Object.keys(payload.mappings).length > 0);
});

test('mapping adapter baseline: current cylinder mapping adapts and validates cleanly', () => {
  const payload = adaptCylinderMapping(readJson('data/config/cylinder-mapping.json'));

  assert.equal(validateCylinderMapping(payload).length, 0);
  assert.ok(Object.keys(payload.dimensions).length > 0);
  assert.ok(Object.keys(payload.mappings).length > 0);
  assert.equal(payload.mappings['锌合金高低齿']?.supplier, '兴泰锁芯');
  assert.ok(payload.customLogos.includes('ZSF'));
});

test('mapping adapter baseline: current lock-fork mapping adapts and validates cleanly', () => {
  const payload = adaptLockForkMapping(readJson('data/config/lock-fork-mapping.json'));

  assert.equal(validateLockForkMapping(payload).length, 0);
  assert.ok(Object.keys(payload.baseDimensions).length > 0);
  assert.ok(Object.keys(payload.highHeightRules).length > 0);
  assert.equal(payload.highHeightRules['7']?.minHeight, 2200);
  assert.equal(payload.highHeightRules['9']?.heightReference, 2210);
  assert.equal(payload.suppliers.default, '应志友');
});

test('mapping adapter baseline: current handle mapping adapts and validates cleanly', () => {
  const payload = adaptHandleMapping(readJson('data/config/handle-mapping.json'));

  assert.equal(validateHandleMapping(payload).length, 0);
  assert.equal(payload.thicknessAccessoryPacks['10'], '10公分配件包');
});

test('mapping adapter baseline: current lock mapping adapts and validates cleanly', () => {
  const raw = readJson('data/config/lock-mapping.json');
  const payload = adaptLockMapping(raw);

  assert.equal(validateLockMapping(payload).length, 0);
  assert.equal(payload.defaultUnit, raw.defaultUnit);
  assert.equal(payload.mappings['SD-9030（6607大锁）']?.vendorName, '6607大锁');
});
