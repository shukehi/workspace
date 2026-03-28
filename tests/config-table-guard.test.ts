import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

test('config table guard: add toolbar is not gated by title/header presence', () => {
  const table = read('src/features/config-editor/components/ConfigTable.vue');

  assert.match(table, /<div class="flex items-center justify-between gap-3">/);
  assert.doesNotMatch(table, /v-if="title \|\| \$slots\.header"/);
  assert.match(table, /添加行/);
});

test('config table guard: mapping pages rely on ConfigTable add button for config rows', () => {
  const handleConfig = read('src/views/HandleConfig.vue');
  const lockConfig = read('src/views/LockConfig.vue');
  const cylinderConfig = read('src/views/CylinderConfig.vue');
  const lockForkConfig = read('src/views/LockForkConfig.vue');

  assert.match(handleConfig, /<ConfigTable[\s\S]*@add="mappings\.add\(\)"/);
  assert.match(lockConfig, /<ConfigTable[\s\S]*@add="mappings\.add\(\)"/);
  assert.match(cylinderConfig, /<ConfigTable[\s\S]*@add="mappings\.add\(\)"/);
  assert.match(lockForkConfig, /<ConfigTable[\s\S]*@add="lockTypes\.add\(\)"/);
});
