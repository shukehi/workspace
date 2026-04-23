import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPackagingFilteredRows,
  getPackagingRowsForValidation,
  isMeaningfulPackagingRow,
  shouldReuseEmptyPackagingDraft,
} from '../src/features/config-editor/utils/packagingEditorState';

test('packaging editor state: hidden placeholder row does not enter validation when not drafting', () => {
  const rows = [{ id: 'placeholder', key: '', value: '' }];

  const validationRows = getPackagingRowsForValidation(rows, false);
  const filteredRows = getPackagingFilteredRows(rows, false, '');

  assert.deepEqual(validationRows, []);
  assert.deepEqual(filteredRows, []);
});

test('packaging editor state: first add from empty state reuses the existing placeholder row', () => {
  const rows = [{ id: 'placeholder', key: '', value: '' }];

  assert.equal(shouldReuseEmptyPackagingDraft(rows), true);
});

test('packaging editor state: meaningful rows stay visible without exposing hidden placeholder rows', () => {
  const rows = [
    { id: 'placeholder', key: '', value: '' },
    { id: 'real', key: '单瓦纸箱', value: '单瓦通用' },
  ];

  const filteredRows = getPackagingFilteredRows(rows, false, '');

  assert.equal(filteredRows.length, 1);
  assert.equal(filteredRows[0].id, 'real');
  assert.equal(isMeaningfulPackagingRow(filteredRows[0]), true);
});
