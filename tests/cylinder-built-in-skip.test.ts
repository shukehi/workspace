import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCylinderData } from '../src/lib/erp-engine/dataExtractors';

test('extractCylinderData skips built-in fingerprint lock cylinder', () => {
  const rows = [
    {
      spec: '单开/7/内开',
      qty: '2+2',
      sx: ' 指纹锁 配套 锁芯 ',
      sxhz: '',
      fssx: '',
      fshz: ''
    },
    {
      spec: '单开/7/内开',
      qty: '1+1',
      sx: '90P35锌合金锁芯扣封',
      sxhz: '',
      fssx: '',
      fshz: ''
    }
  ];

  const mapping = {
    dimensions: {
      '7': { code: '90', eccentricity: '34.5*55.5/中心孔偏心' }
    },
    specialRules: [],
    secondaryDimensions: {},
    secondarySpecialRules: [],
    mappings: {
      '90P35锌合金锁芯扣封': {
        supplier: '忠恒',
        template: '{code}锌合金锁芯'
      },
      '指纹锁配套锁芯': {
        supplier: '不应出现',
        template: '{code}内置锁芯'
      }
    },
    customLogos: [],
    excludedCylinders: [' 指纹锁配套锁芯 ']
  };

  const extracted = extractCylinderData(rows, { customerName: '一部客户', remark: '' }, mapping);

  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].supplier, '忠恒');
  assert.ok(!extracted.some((row) => row.type.includes('内置锁芯')));
});

test('extractCylinderData allows built-in cylinder when excluded list is explicitly empty', () => {
  const rows = [
    {
      spec: '单开/7/内开',
      qty: '2+2',
      sx: '指纹锁配套锁芯',
      sxhz: '',
      fssx: '',
      fshz: ''
    }
  ];

  const mapping = {
    dimensions: {
      '7': { code: '90', eccentricity: '34.5*55.5/中心孔偏心' }
    },
    specialRules: [],
    secondaryDimensions: {},
    secondarySpecialRules: [],
    mappings: {
      '指纹锁配套锁芯': {
        supplier: '忠恒',
        template: '{code}内置锁芯'
      }
    },
    customLogos: [],
    excludedCylinders: []
  };

  const extracted = extractCylinderData(rows, { customerName: '一部客户', remark: '' }, mapping);

  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].supplier, '忠恒');
  assert.ok(extracted[0].type.includes('内置锁芯'));
});

test('extractCylinderData preserves explicit zero on right quantity', () => {
  const rows = [
    {
      spec: '单开/7/外开',
      qty: '36/0',
      sx: '90P35锌合金锁芯扣封',
      sxhz: '',
      fssx: '',
      fshz: ''
    }
  ];

  const mapping = {
    dimensions: {
      '7': { code: '90', eccentricity: '34.5*55.5/中心孔偏心' }
    },
    specialRules: [],
    secondaryDimensions: {},
    secondarySpecialRules: [],
    mappings: {
      '90P35锌合金锁芯扣封': {
        supplier: '忠恒',
        template: '{code}锌合金锁芯'
      }
    },
    customLogos: [],
    excludedCylinders: []
  };

  const extracted = extractCylinderData(rows, { customerName: '一部客户', remark: '' }, mapping);

  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].quantity, 36);
});
