import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

test('lock fork config exposes lock type rule playground', () => {
  const view = read('src/views/LockForkConfig.vue');

  assert.match(view, /RuleExplainPlayground/);
  assert.match(view, /useRuleExplainPreview/);
  assert.match(view, /adaptLockForkTypeRulesToRuleSet/);
  assert.match(view, /title="锁具类型规则试跑"/);
  assert.match(view, /lockForkTypeExplainFields/);
  assert.match(view, /主锁文本 \(sj\)/);
  assert.match(view, /副锁文本 \(fssj\)/);
});
