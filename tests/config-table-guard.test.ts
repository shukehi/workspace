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
  assert.match(table, /scrollMode\?: 'internal' \| 'page'/);
});

test('config table guard: mapping pages rely on ConfigTable add button for config rows', () => {
  const packagingConfig = read('src/views/PackagingConfig.vue');
  const handleConfig = read('src/views/HandleConfig.vue');
  const lockConfig = read('src/views/LockConfig.vue');
  const cylinderConfig = read('src/views/CylinderConfig.vue');
  const lockForkConfig = read('src/views/LockForkConfig.vue');

  assert.match(packagingConfig, /<ConfigTable[\s\S]*@add="mappings\.add\(\)"/);
  assert.match(handleConfig, /<ConfigTable[\s\S]*@add="mappings\.add\(\)"/);
  assert.match(lockConfig, /<ConfigTable[\s\S]*@add="mappings\.add\(\)"/);
  assert.match(cylinderConfig, /<ConfigTable[\s\S]*@add="mappings\.add\(\)"/);
  assert.match(lockForkConfig, /<ConfigTable[\s\S]*@add="lockTypes\.add\(\)"/);
});

test('config layout guard: supports header actions and inline workflow meta for focused pages', () => {
  const layout = read('src/features/config-editor/components/ConfigPageLayout.vue');
  const packagingConfig = read('src/views/PackagingConfig.vue');
  const lockConfig = read('src/views/LockConfig.vue');
  const cylinderConfig = read('src/views/CylinderConfig.vue');
  const handleConfig = read('src/views/HandleConfig.vue');
  const lockForkConfig = read('src/views/LockForkConfig.vue');

  assert.match(layout, /workflowMetaVariant\?: 'cards' \| 'inline'/);
  assert.match(layout, /actionsPosition\?: 'bottom' \| 'header'/);
  assert.match(layout, /v-if="\$slots\['header-right'\] \|\| actionsPosition === 'header'"/);
  assert.match(layout, /当前版本/);
  assert.match(layout, /已发布版本/);
  assert.match(layout, /v-if="actionsPosition === 'bottom'"/);

  assert.match(packagingConfig, /workflow-meta-variant="inline"/);
  assert.match(packagingConfig, /actions-position="header"/);
  assert.match(packagingConfig, /scroll-mode="page"/);
  assert.match(packagingConfig, /<CardTitle>基础配置<\/CardTitle>/);
  assert.match(packagingConfig, /<CardTitle>映射列表<\/CardTitle>/);

  assert.match(lockConfig, /workflow-meta-variant="inline"/);
  assert.match(lockConfig, /actions-position="header"/);
  assert.match(lockConfig, /scroll-mode="page"/);
  assert.match(lockConfig, /v-model="previewPrimaryInput"/);
  assert.match(lockConfig, /v-model="previewSecondaryInput"/);
  assert.doesNotMatch(lockConfig, /v-model="\(m as any\)\.val"/);
  assert.match(lockConfig, /showMatchTester = !showMatchTester/);
  assert.match(lockConfig, /默认收起，避免挤占首屏/);

  const mappingIndex = lockConfig.indexOf('型号映射');
  const testerIndex = lockConfig.indexOf('测试匹配');
  assert.ok(mappingIndex > -1);
  assert.ok(testerIndex > -1);
  assert.ok(mappingIndex < testerIndex);

  assert.match(cylinderConfig, /workflow-meta-variant="inline"/);
  assert.match(cylinderConfig, /actions-position="header"/);
  assert.match(cylinderConfig, /未保存/);
  assert.match(cylinderConfig, /scroll-mode="page"/);

  assert.match(handleConfig, /workflow-meta-variant="inline"/);
  assert.match(handleConfig, /actions-position="header"/);
  assert.match(handleConfig, /scroll-mode="page"/);

  assert.match(lockForkConfig, /workflow-meta-variant="inline"/);
  assert.match(lockForkConfig, /actions-position="header"/);
  assert.match(lockForkConfig, /未保存/);
});
