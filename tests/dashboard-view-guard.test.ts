import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path: string) {
  return fs.readFileSync(path, 'utf8');
}

test('dashboard view guard: visible workspace labels stay localized', () => {
  const dashboard = read('src/views/Dashboard.vue');

  assert.match(dashboard, /运营工作台/);
  assert.match(dashboard, /快捷入口/);
  assert.match(dashboard, /入口卡片/);
  assert.doesNotMatch(dashboard, /ERP Workspace/);
  assert.doesNotMatch(dashboard, /Shortcuts/);
  assert.doesNotMatch(dashboard, /ERPNext Workspace/);
  assert.doesNotMatch(dashboard, /Link Cards/);
});
