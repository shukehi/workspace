import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = process.cwd();
function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

test('generate-po dialog guard: source-store consumer reads are owned by a dedicated bridge', () => {
  const dialog = read('src/components/source/GeneratePODialog.vue');
  const helper = read('src/features/source-analysis/composables/useGeneratePOSourceState.ts');

  assert.match(dialog, /useGeneratePOSourceState/);
  assert.match(helper, /currentOrderItems/);
  assert.match(helper, /currentContractCode/);
  assert.doesNotMatch(dialog, /sourceStore\.hasOrder/);
  assert.doesNotMatch(dialog, /sourceStore\.currentOrder/);
});
