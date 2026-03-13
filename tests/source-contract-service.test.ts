import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeErpContractResponse } from '../src/features/source-analysis/services/sourceContractService';

test('source contract service normalizes ERP rows payload', () => {
  const normalized = normalizeErpContractResponse({
    rows: [{ code: 'C-001', list: [] }],
  });

  assert.deepEqual(normalized, { code: 'C-001', list: [] });
});

test('source contract service normalizes ERP array payload', () => {
  const normalized = normalizeErpContractResponse([
    { code: 'C-002', list: [] },
  ]);

  assert.deepEqual(normalized, { code: 'C-002', list: [] });
});
