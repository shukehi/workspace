import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getLockFilteredRows,
  getLockRowsForValidation,
  isMeaningfulLockRow,
  shouldReuseEmptyLockDraft,
} from '../src/features/config-editor/utils/lockEditorState';

test('lock editor state: hidden placeholder row does not enter validation when not drafting', () => {
  const rows = [{
    id: 'placeholder',
    model: '',
    supplier: '',
    vendorName: '',
    primarySpec: '',
    secondarySpec: '',
    remark: '',
  }];

  const validationRows = getLockRowsForValidation(rows, false);
  const filteredRows = getLockFilteredRows(rows, false, '');

  assert.deepEqual(validationRows, []);
  assert.deepEqual(filteredRows, []);
});

test('lock editor state: first add from empty state reuses the existing placeholder row', () => {
  const rows = [{
    id: 'placeholder',
    model: '',
    supplier: '',
    vendorName: '',
    primarySpec: '',
    secondarySpec: '',
    remark: '',
  }];

  assert.equal(shouldReuseEmptyLockDraft(rows), true);
});

test('lock editor state: meaningful rows stay visible without exposing hidden placeholder rows', () => {
  const rows = [
    {
      id: 'placeholder',
      model: '',
      supplier: '',
      vendorName: '',
      primarySpec: '',
      secondarySpec: '',
      remark: '',
    },
    {
      id: 'real',
      model: 'F02-A副锁',
      supplier: '汇成',
      vendorName: '6607大锁',
      primarySpec: '主锁规格',
      secondarySpec: '',
      remark: '',
    },
  ];

  const filteredRows = getLockFilteredRows(rows, false, '');

  assert.equal(filteredRows.length, 1);
  assert.equal(filteredRows[0].id, 'real');
  assert.equal(isMeaningfulLockRow(filteredRows[0]), true);
});

test('lock editor state: active search can hide a blank draft row before the UI clears the query', () => {
  const rows = [{
    id: 'placeholder',
    model: '',
    supplier: '',
    vendorName: '',
    primarySpec: '',
    secondarySpec: '',
    remark: '',
  }];

  const filteredRows = getLockFilteredRows(rows, true, '副锁');

  assert.deepEqual(filteredRows, []);
});
