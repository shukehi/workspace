import test from 'node:test';
import assert from 'node:assert/strict';

import { previewReferenceIssues } from '../src/features/formulas/utils/referenceIssuePreview';

test('formula reference issue preview caps long governance lists', () => {
  const issues = Array.from({ length: 15 }, (_, index) => `MAT-${index + 1}`);

  assert.equal(
    previewReferenceIssues(issues),
    'MAT-1、MAT-2、MAT-3、MAT-4、MAT-5、MAT-6、MAT-7、MAT-8、MAT-9、MAT-10、MAT-11、MAT-12 等 3 项',
  );
});

test('formula reference issue preview renders full short lists', () => {
  assert.equal(previewReferenceIssues(['供应商A', '供应商B']), '供应商A、供应商B');
});

test('formula reference issue preview ignores non-array inputs', () => {
  assert.equal(previewReferenceIssues(null), '');
  assert.equal(previewReferenceIssues('供应商A'), '');
});
