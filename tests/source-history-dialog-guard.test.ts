import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = process.cwd();
function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

test('source history dialog guard: component reads source-store surface through history-load owner', () => {
  const dialog = read('src/components/source/ContractHistoryDialog.vue');
  const helper = read('src/features/source-analysis/composables/useSourceHistoryLoadState.ts');

  assert.match(dialog, /useSourceHistoryLoadState/);
  assert.match(helper, /loadButtonLabel/);
  assert.match(helper, /resolveLoadError/);
  assert.doesNotMatch(dialog, /store\.hasOrder/);
  assert.doesNotMatch(dialog, /store\.loading/);
  assert.doesNotMatch(dialog, /store\.error/);
  assert.doesNotMatch(dialog, /store\.loadHistoryContractByCode/);
});
