import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = process.cwd();
function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

test('contracts history view guard: source-store load path is owned by a dedicated bridge', () => {
  const view = read('src/views/ContractsHistory.vue');
  const helper = read('src/features/source-analysis/composables/useContractsHistorySourceLoadState.ts');

  assert.match(view, /useContractsHistorySourceLoadState/);
  assert.match(helper, /loadingContractId/);
  assert.match(helper, /loadContract/);
  assert.doesNotMatch(view, /sourceStore\.loadHistoryContractByCode/);
});
