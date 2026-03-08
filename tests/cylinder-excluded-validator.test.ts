import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCylinderMapping as validateFront } from '../src/services/mappings/mappingValidator';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { validateCylinderMapping: validateBack } = require('../server/services/mappings/mapping.validator');

test('validateCylinderMapping rejects normalized duplicate excludedCylinders', () => {
  const payload = {
    dimensions: {},
    specialRules: [],
    secondaryDimensions: {},
    secondarySpecialRules: [],
    mappings: {},
    customLogos: [],
    excludedCylinders: ['指纹锁配套锁芯', ' 指纹锁 配套 锁芯 ']
  };

  const front = validateFront(payload);
  const back = validateBack(payload);

  assert.ok(front.some((issue) => issue.path === 'excludedCylinders[1]' && issue.code === 'duplicate'));
  assert.ok(back.some((issue: any) => issue.path === 'excludedCylinders[1]' && issue.code === 'duplicate'));
});
