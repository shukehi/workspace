import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

test('lock config exposes reusable rule explain playground', () => {
  const view = read('src/views/LockConfig.vue');

  assert.match(view, /RuleExplainPlayground/);
  assert.match(view, /useRuleExplainPreview/);
  assert.match(view, /adaptLockMappingsToRuleSet/);
  assert.match(view, /CardTitle>规则试跑</);
  assert.match(view, /title="主锁规则试跑"/);
  assert.match(view, /title="副锁规则试跑"/);
  assert.match(view, /showRulePlayground/);
  assert.match(view, /lockExplainFields/);
  assert.match(view, /meta\.normalizedModel/);
  assert.match(view, /normalizeLockMappingKey/);
});
