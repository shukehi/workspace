import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCylinderMappingFilteredRows,
  getCylinderMappingRowsForValidation,
  getCylinderValueRows,
  isMeaningfulCylinderMappingRow,
  isMeaningfulCylinderValueRow,
  shouldReuseEmptyCylinderMappingDraft,
  shouldReuseEmptyCylinderValueDraft,
} from '../src/features/config-editor/utils/cylinderEditorState';

test('cylinder editor state: hidden mapping placeholder row does not enter validation when not drafting', () => {
  const rows = [{ id: 'placeholder', name: '', supplier: '', template: '' }];

  const validationRows = getCylinderMappingRowsForValidation(rows, false);
  const filteredRows = getCylinderMappingFilteredRows(rows, false, '');

  assert.deepEqual(validationRows, []);
  assert.deepEqual(filteredRows, []);
});

test('cylinder editor state: first mapping add from empty state reuses the existing placeholder row', () => {
  const rows = [{ id: 'placeholder', name: '', supplier: '', template: '' }];

  assert.equal(shouldReuseEmptyCylinderMappingDraft(rows), true);
});

test('cylinder editor state: meaningful mapping rows stay visible without exposing hidden placeholder rows', () => {
  const rows = [
    { id: 'placeholder', name: '', supplier: '', template: '' },
    { id: 'real', name: '锁芯A', supplier: '忠恒', template: '标准模板' },
  ];

  const filteredRows = getCylinderMappingFilteredRows(rows, false, '');

  assert.equal(filteredRows.length, 1);
  assert.equal(filteredRows[0].id, 'real');
  assert.equal(isMeaningfulCylinderMappingRow(filteredRows[0]), true);
});

test('cylinder editor state: hidden value placeholder row does not appear until drafting is explicit', () => {
  const rows = [{ id: 'placeholder', value: '' }];

  const visibleRows = getCylinderValueRows(rows, false);

  assert.deepEqual(visibleRows, []);
  assert.equal(shouldReuseEmptyCylinderValueDraft(rows), true);
});

test('cylinder editor state: meaningful value rows remain visible', () => {
  const rows = [
    { id: 'placeholder', value: '' },
    { id: 'real', value: '指纹锁配套锁芯' },
  ];

  const visibleRows = getCylinderValueRows(rows, false);

  assert.equal(visibleRows.length, 1);
  assert.equal(visibleRows[0].id, 'real');
  assert.equal(isMeaningfulCylinderValueRow(visibleRows[0]), true);
});
