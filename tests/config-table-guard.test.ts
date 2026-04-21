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
  const profileHost = read('src/features/config-editor/components/ProfileEditorHost.vue');
  const centerShell = read('src/features/config-editor/components/ConfigCenterShell.vue');
  const formulaHost = read('src/features/formulas/components/FormulaProfileHost.vue');
  const packagingConfig = read('src/views/PackagingConfig.vue');
  const lockConfig = read('src/views/LockConfig.vue');
  const cylinderConfig = read('src/views/CylinderConfig.vue');
  const handleConfig = read('src/views/HandleConfig.vue');
  const lockForkConfig = read('src/views/LockForkConfig.vue');
  const colorFormula = read('src/views/ColorFormula.vue');

  assert.match(profileHost, /workflowMetaVariant\?: 'cards' \| 'inline'/);
  assert.match(profileHost, /actionsPosition\?: 'bottom' \| 'header'/);
  assert.match(profileHost, /v-if="\$slots\['header-right'\] \|\| actionsPosition === 'header'"/);
  assert.match(profileHost, /当前版本/);
  assert.match(profileHost, /已发布版本/);
  assert.match(profileHost, /配置差异/);
  assert.match(profileHost, /影响摘要/);
  assert.match(profileHost, /样本回放/);
  assert.match(profileHost, /主数据引用检查/);
  assert.match(profileHost, /Material Ref Paths/);
  assert.match(profileHost, /Supplier Ref Paths/);
  assert.match(profileHost, /v-if="actionsPosition === 'bottom'"/);
  assert.doesNotMatch(profileHost, /Button :disabled="editor\.isLoading\.value \|\| editor\.isSaving\.value \|\| clientIssues\.length > 0"/);
  assert.match(centerShell, /<slot name="header-right"><\/slot>/);
  assert.match(centerShell, /<slot name="footer"><\/slot>/);

  assert.match(packagingConfig, /workflow-meta-variant="inline"/);
  assert.match(packagingConfig, /actions-position="header"/);
  assert.match(packagingConfig, /<ProfileEditorHost/);
  assert.match(packagingConfig, /scroll-mode="page"/);
  assert.match(packagingConfig, /<CardTitle>基础配置<\/CardTitle>/);
  assert.match(packagingConfig, /<CardTitle>映射列表<\/CardTitle>/);

  assert.match(lockConfig, /workflow-meta-variant="inline"/);
  assert.match(lockConfig, /actions-position="header"/);
  assert.match(lockConfig, /<ProfileEditorHost/);
  assert.match(lockConfig, /scroll-mode="page"/);
  assert.match(lockConfig, /RuleExplainPlayground/);
  assert.match(lockConfig, /useRuleExplainPreview/);
  assert.match(lockConfig, /:fields="lockExplainFields"/);
  assert.doesNotMatch(lockConfig, /v-model="\(m as any\)\.val"/);
  assert.match(lockConfig, /showRulePlayground = !showRulePlayground/);
  assert.match(lockConfig, /默认收起，避免挤占首屏/);

  const mappingIndex = lockConfig.indexOf('型号映射');
  const testerIndex = lockConfig.indexOf('规则试跑');
  assert.ok(mappingIndex > -1);
  assert.ok(testerIndex > -1);
  assert.ok(mappingIndex < testerIndex);

  assert.match(cylinderConfig, /workflow-meta-variant="inline"/);
  assert.match(cylinderConfig, /actions-position="header"/);
  assert.match(cylinderConfig, /<ProfileEditorHost/);
  assert.match(cylinderConfig, /未保存/);
  assert.match(cylinderConfig, /scroll-mode="page"/);

  assert.match(handleConfig, /workflow-meta-variant="inline"/);
  assert.match(handleConfig, /actions-position="header"/);
  assert.match(handleConfig, /<ProfileEditorHost/);
  assert.match(handleConfig, /scroll-mode="page"/);

  assert.match(lockForkConfig, /workflow-meta-variant="inline"/);
  assert.match(lockForkConfig, /actions-position="header"/);
  assert.match(lockForkConfig, /<ProfileEditorHost/);
  assert.match(lockForkConfig, /未保存/);

  assert.match(formulaHost, /<ConfigCenterShell/);
  assert.match(formulaHost, /profile: formulas/);
  assert.match(formulaHost, /Collection Diff/);
  assert.match(formulaHost, /Collection Impact/);
  assert.match(formulaHost, /Collection Replay/);
  assert.match(formulaHost, /Collection Reference Check/);
  assert.match(formulaHost, /<FormulaListPanel/);
  assert.match(formulaHost, /<FormulaEditorHeader/);
  assert.match(colorFormula, /<FormulaProfileHost :manager="manager" \/>/);
  assert.doesNotMatch(colorFormula, /<FormulaListPanel/);
});

test('config navigation guard: supplier master is exposed in config routes and navigation', () => {
  const nav = read('src/config/nav.ts');
  const router = read('src/router/index.ts');
  const sidebar = read('src/layout/Sidebar.vue');
  const supplierMaster = read('src/views/SupplierMaster.vue');
  const supplierLinkedMaterials = read('src/features/master-data/components/SupplierLinkedMaterialsPanel.vue');
  const supplierSummary = read('src/features/master-data/components/SupplierSummaryCards.vue');
  const supplierAudit = read('src/features/master-data/components/SupplierAuditPanel.vue');
  const supplierDiagnostics = read('src/features/master-data/components/SupplierDiagnosticsPanel.vue');
  const materialMaster = read('src/views/MaterialManagement.vue');
  const materialAudit = read('src/features/master-data/components/MaterialAuditPanel.vue');
  const materialDiagnostics = read('src/features/master-data/components/MaterialDiagnosticsPanel.vue');
  const materialSummary = read('src/features/master-data/components/MaterialSummaryCards.vue');

  assert.match(nav, /supplier-master/);
  assert.match(nav, /\/config\/suppliers/);
  assert.match(router, /path: '\/config\/suppliers'/);
  assert.match(router, /name: 'config-suppliers'/);
  assert.match(sidebar, /'supplier-master': ClipboardList/);
  assert.match(supplierMaster, /供应商主数据/);
  assert.match(supplierMaster, /profile: \{\{ profileDetail\.profile\.code \}\}/);
  assert.match(supplierMaster, /workflow: \{\{ profileDetail\.profile\.workflowKind \}\}/);
  assert.match(supplierMaster, /<SupplierSummaryCards/);
  assert.match(supplierMaster, /<SupplierAuditPanel/);
  assert.match(supplierMaster, /<SupplierDiagnosticsPanel/);
  assert.match(supplierMaster, /<SupplierLinkedMaterialsPanel/);
  assert.match(supplierSummary, /关联健康总览/);
  assert.match(supplierSummary, /关联物料总数/);
  assert.match(supplierSummary, /异常供应商数/);
  assert.match(supplierAudit, /最近 5 条变更/);
  assert.match(supplierAudit, /最近审计记录/);
  assert.match(supplierDiagnostics, /inactive 但仍有关联物料/);
  assert.match(supplierDiagnostics, /需补充正式链接/);
  assert.match(supplierDiagnostics, /查看关联物料/);
  assert.match(supplierDiagnostics, /打开编辑/);
  assert.match(supplierLinkedMaterials, /关联物料明细/);
  assert.match(supplierLinkedMaterials, /当前 supplier master 暂无已关联物料/);
  assert.match(materialMaster, /<ConfigCenterShell/);
  assert.match(materialMaster, /profile: \{\{ profileDetail\.profile\.code \}\}/);
  assert.match(materialMaster, /workflow: \{\{ profileDetail\.profile\.workflowKind \}\}/);
  assert.match(materialMaster, /supplierRefs: \{\{ referenceCheck\.supplierRefs\.length \}\}/);
  assert.match(materialMaster, /<MaterialAuditPanel/);
  assert.match(materialMaster, /<MaterialSummaryCards/);
  assert.match(materialMaster, /<MaterialDiagnosticsPanel/);
  assert.match(materialMaster, /已关联 #/);
  assert.match(materialMaster, /保存后按供应商名称自动尝试关联/);
  assert.match(materialMaster, /手动关联/);
  assert.match(materialMaster, /自动匹配 \/ 不指定/);
  assert.match(materialAudit, /最近审计记录/);
  assert.match(materialSummary, /物料总数/);
  assert.match(materialSummary, /已正式链接/);
  assert.match(materialSummary, /关系异常数/);
  assert.match(materialDiagnostics, /主数据引用检查/);
  assert.match(materialDiagnostics, /引用路径样例/);
  assert.match(materialDiagnostics, /关系异常分组/);
  assert.match(materialDiagnostics, /未关联 Supplier Master 的物料/);
  assert.match(materialDiagnostics, /链接到 inactive Supplier Master/);
  assert.match(materialDiagnostics, /可自动修复/);
  assert.match(materialDiagnostics, /需人工处理/);
  assert.match(materialDiagnostics, /自动重连/);
});
