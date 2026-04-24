import test from 'node:test';
import assert from 'node:assert/strict';

import { collectLockMappingPayloadIssues, collectLockMappingRowIssues } from '../src/features/config-editor/utils/lockEditorValidation';

test('lock editor validation: row with only model surfaces required supplier and vendor name issues', () => {
  const issues = collectLockMappingRowIssues([
    {
      id: 'row-1',
      model: 'F02-A副锁',
      supplier: '',
      vendorName: '',
    },
  ]);

  assert.ok(issues.some((item) => item.path === 'rows[0].supplier' && item.code === 'required'));
  assert.ok(issues.some((item) => item.path === 'rows[0].vendorName' && item.code === 'required'));
});

test('lock editor validation: normalized duplicates are still detected locally', () => {
  const issues = collectLockMappingRowIssues([
    {
      id: 'row-1',
      model: 'SD-9030（6607大锁）',
      supplier: '汇成',
      vendorName: '6607大锁',
    },
    {
      id: 'row-2',
      model: 'SD-9030 ( 6607大锁 )',
      supplier: '汇成',
      vendorName: '重复锁具',
    },
  ]);

  assert.ok(issues.some((item) => item.path === 'rows[1].model' && item.code === 'duplicate'));
});

test('lock editor validation: raw JSON payload with model-only mapping surfaces required supplier and vendorName issues', () => {
  const issues = collectLockMappingPayloadIssues({
    mappings: {
      'F02-A副锁': {},
    },
  });

  assert.ok(issues.some((item) => item.path === 'mappings["F02-A副锁"].supplier' && item.code === 'required'));
  assert.ok(issues.some((item) => item.path === 'mappings["F02-A副锁"].vendorName' && item.code === 'required'));
});
