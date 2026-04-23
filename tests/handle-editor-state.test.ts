import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getHandleFilteredRows,
  getHandleRowsForValidation,
  isMeaningfulHandleRow,
  shouldReuseEmptyHandleDraft,
} from '../src/features/config-editor/utils/handleEditorState';

test('handle editor state: hidden placeholder row does not enter validation when not drafting', () => {
  const rows = [{
    id: 'placeholder',
    model: '',
    supplier: '',
    vendorName: '',
    materialCode: '',
  }];

  const validationRows = getHandleRowsForValidation(rows, false);
  const filteredRows = getHandleFilteredRows(rows, false, '');

  assert.deepEqual(validationRows, []);
  assert.deepEqual(filteredRows, []);
});

test('handle editor state: first add from empty state reuses the existing placeholder row', () => {
  const rows = [{
    id: 'placeholder',
    model: '',
    supplier: '',
    vendorName: '',
    materialCode: '',
  }];

  assert.equal(shouldReuseEmptyHandleDraft(rows), true);
});

test('handle editor state: meaningful rows stay visible without exposing hidden placeholder rows', () => {
  const rows = [
    {
      id: 'placeholder',
      model: '',
      supplier: '',
      vendorName: '',
      materialCode: '',
    },
    {
      id: 'real',
      model: 'Dj-6847双活',
      supplier: '拉手供应商',
      vendorName: '6847双活拉手',
      materialCode: 'LH-001',
    },
  ];

  const filteredRows = getHandleFilteredRows(rows, false, '');

  assert.equal(filteredRows.length, 1);
  assert.equal(filteredRows[0].id, 'real');
  assert.equal(isMeaningfulHandleRow(filteredRows[0]), true);
});

test('handle editor state: active search can hide a blank draft row before the UI clears the query', () => {
  const rows = [{
    id: 'placeholder',
    model: '',
    supplier: '',
    vendorName: '',
    materialCode: '',
  }];

  const filteredRows = getHandleFilteredRows(rows, true, '双活');

  assert.deepEqual(filteredRows, []);
});
