import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { configCenterNavGroups, flatMainNav, mainNavGroups } from '../src/config/nav';

const ROOT = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

function countOccurrences(source: string, needle: string): number {
  return source.split(needle).length - 1;
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

  assert.match(packagingConfig, /<ConfigTable[\s\S]*@add="addMappingRow"/);
  assert.match(handleConfig, /<ConfigTable[\s\S]*@add="addMappingRow"/);
  assert.match(lockConfig, /<ConfigTable[\s\S]*@add="addMappingRow"/);
  assert.match(cylinderConfig, /<ConfigTable[\s\S]*@add="addMappingRow"/);
  assert.match(lockForkConfig, /<ConfigTable[\s\S]*@add="lockTypes\.add\(\)"/);
});

test('config layout guard: rule-exception pages keep first-screen operator guide', () => {
  const pages = [
    'src/views/PackagingConfig.vue',
    'src/views/LockConfig.vue',
    'src/views/HandleConfig.vue',
    'src/views/CylinderConfig.vue',
    'src/views/LockForkConfig.vue',
  ];

  for (const page of pages) {
    const source = read(page);
    assert.equal(countOccurrences(source, '<CardTitle>首屏操作指南</CardTitle>'), 1, `${page} should render one shared first-screen guide`);
    assert.doesNotMatch(source, /data-operator-guide="true"/, `${page} should not render the legacy duplicate guide`);
    assert.doesNotMatch(source, /首屏维护顺序/, `${page} should not render the legacy duplicate guide title`);
    assert.match(source, /默认策略/, `${page} guide should mention default strategy first`);
    assert.match(source, /规则试跑/, `${page} guide should mention rule test before exception rows`);
    assert.match(source, /例外行/, `${page} guide should mention exception rows`);
    assert.match(source, /先确认默认策略，再用规则试跑验证命中；只有规则无法覆盖时，才维护例外行。/, `${page} should keep the shared operator guide copy`);
  }
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
  assert.match(profileHost, /class="review-panel[^"]*"/);
  assert.match(profileHost, /review-panel-summary/);
  assert.match(profileHost, /<details[^>]*class="review-panel/);
  assert.match(profileHost, /<summary class="review-panel-summary/);
  assert.doesNotMatch(profileHost, /<details[^>]*open/);
  assert.match(profileHost, /<Card data-issue-anchor="true" class="border-destructive\/40 bg-destructive\/5">[\s\S]*校验结果/);
  assert.doesNotMatch(profileHost, /<details[^>]*>[\s\S]*?data-issue-anchor="true"[\s\S]*?<\/details>/);
  const validationAnchor = profileHost.indexOf('data-issue-anchor="true"');
  const firstSecondaryPanelOpen = profileHost.indexOf('<details');
  assert.ok(validationAnchor > -1);
  assert.ok(firstSecondaryPanelOpen > -1);
  assert.ok(validationAnchor < firstSecondaryPanelOpen, 'validation panel should stay above secondary review panels');
  assert.match(profileHost, /v-if="actionsPosition === 'bottom'"/);
  assert.doesNotMatch(profileHost, /Button :disabled="editor\.isLoading\.value \|\| editor\.isSaving\.value \|\| clientIssues\.length > 0"/);
  assert.match(centerShell, /<slot name="header-right"><\/slot>/);
  assert.match(centerShell, /<slot name="footer"><\/slot>/);

  assert.match(packagingConfig, /workflow-meta-variant="inline"/);
  assert.match(packagingConfig, /actions-position="header"/);
  assert.match(packagingConfig, /<ProfileEditorHost/);
  assert.match(packagingConfig, /scroll-mode="page"/);
  for (const page of [packagingConfig, lockConfig, handleConfig, cylinderConfig, lockForkConfig]) {
    assert.equal(countOccurrences(page, '<CardTitle>首屏操作指南</CardTitle>'), 1);
    assert.doesNotMatch(page, /data-operator-guide="true"/);
    assert.doesNotMatch(page, /首屏维护顺序/);
    assert.match(page, /默认策略/);
    assert.match(page, /规则试跑/);
    assert.match(page, /例外行/);
  }

  assert.match(packagingConfig, /<CardTitle>基础配置<\/CardTitle>/);
  assert.match(packagingConfig, /<CardTitle>映射列表<\/CardTitle>/);
  assert.match(packagingConfig, /当前没有需要人工维护的包装例外项/);
  assert.match(packagingConfig, /新增例外映射/);

  assert.match(lockConfig, /workflow-meta-variant="inline"/);
  assert.match(lockConfig, /actions-position="header"/);
  assert.match(lockConfig, /<ProfileEditorHost/);
  assert.match(lockConfig, /scroll-mode="page"/);
  assert.match(lockConfig, /当前没有需要人工维护的锁具例外项/);
  assert.match(lockConfig, /新增例外映射/);
  assert.match(lockConfig, /RuleExplainPlayground/);
  assert.match(lockConfig, /useRuleExplainPreview/);
  assert.match(lockConfig, /:fields="lockExplainFields"/);
  assert.doesNotMatch(lockConfig, /v-model="\(m as any\)\.val"/);
  assert.match(lockConfig, /showRulePlayground = !showRulePlayground/);
  assert.match(lockConfig, /默认收起，避免挤占首屏/);

  const mappingIndex = lockConfig.indexOf('型号映射');
  const testerIndex = lockConfig.indexOf('<CardTitle>规则试跑</CardTitle>');
  assert.ok(mappingIndex > -1);
  assert.ok(testerIndex > -1);
  assert.ok(mappingIndex < testerIndex);

  assert.match(cylinderConfig, /workflow-meta-variant="inline"/);
  assert.match(cylinderConfig, /actions-position="header"/);
  assert.match(cylinderConfig, /<ProfileEditorHost/);
  assert.match(cylinderConfig, /未保存/);
  assert.match(cylinderConfig, /scroll-mode="page"/);
  assert.match(cylinderConfig, /当前没有需要人工维护的锁芯型号例外项/);
  assert.match(cylinderConfig, /新增例外映射/);

  assert.match(handleConfig, /workflow-meta-variant="inline"/);
  assert.match(handleConfig, /actions-position="header"/);
  assert.match(handleConfig, /<ProfileEditorHost/);
  assert.match(handleConfig, /scroll-mode="page"/);
  assert.match(handleConfig, /当前没有需要人工维护的拉手例外项/);
  assert.match(handleConfig, /新增例外映射/);

  assert.match(lockForkConfig, /workflow-meta-variant="inline"/);
  assert.match(lockForkConfig, /actions-position="header"/);
  assert.match(lockForkConfig, /<ProfileEditorHost/);
  assert.match(lockForkConfig, /未保存/);
  assert.match(lockForkConfig, /当前 lock-fork 配置契约仅消费 `suppliers\.default`/);
  assert.match(lockForkConfig, /键名/);
  assert.match(lockForkConfig, /model-value=\"default\"/);

  assert.match(formulaHost, /<ConfigCenterShell/);
  assert.match(formulaHost, /profile: formulas/);
  assert.match(formulaHost, /Collection Diff/);
  assert.match(formulaHost, /Collection Impact/);
  assert.match(formulaHost, /Collection Replay/);
  assert.match(formulaHost, /Collection Reference Check/);
  assert.match(formulaHost, /存在主数据治理问题/);
  assert.match(formulaHost, /suppliersMissingInSupplierMaster/);
  assert.match(formulaHost, /suppliersMissingInMaterialMaster/);
  assert.match(formulaHost, /missingMaterialCodes/);
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
  const diagnosticsView = read('src/views/MasterDataDiagnostics.vue');
  const governanceView = read('src/views/MasterDataGovernance.vue');
  const diagnosticsSummary = read('src/features/master-data/components/MasterDataDiagnosticsSummaryCards.vue');
  const lifecyclePanel = read('src/features/master-data/components/MasterDataLifecyclePanel.vue');
  const supplierDetail = read('src/features/master-data/components/SupplierDetailPanel.vue');
  const supplierEditDialog = read('src/features/master-data/components/SupplierEditDialog.vue');
  const supplierList = read('src/features/master-data/components/SupplierListPanel.vue');
  const supplierLinkedMaterials = read('src/features/master-data/components/SupplierLinkedMaterialsPanel.vue');
  const supplierSummary = read('src/features/master-data/components/SupplierSummaryCards.vue');
  const supplierAudit = read('src/features/master-data/components/SupplierAuditPanel.vue');
  const supplierDiagnostics = read('src/features/master-data/components/SupplierDiagnosticsPanel.vue');
  const materialMaster = read('src/views/MaterialManagement.vue');
  const materialAudit = read('src/features/master-data/components/MaterialAuditPanel.vue');
  const materialDetail = read('src/features/master-data/components/MaterialDetailPanel.vue');
  const materialDiagnostics = read('src/features/master-data/components/MaterialDiagnosticsPanel.vue');
  const materialEditDialog = read('src/features/master-data/components/MaterialEditDialog.vue');
  const materialList = read('src/features/master-data/components/MaterialListPanel.vue');
  const materialRelationship = read('src/features/master-data/components/MaterialRelationshipSection.vue');
  const materialSummary = read('src/features/master-data/components/MaterialSummaryCards.vue');

  assert.match(nav, /supplier-master/);
  assert.match(nav, /master-data-diagnostics/);
  assert.match(nav, /master-data-governance/);
  assert.match(nav, /\/config\/master-data-governance/);
  assert.match(nav, /\/config\/master-data-diagnostics/);
  assert.match(nav, /\/config\/suppliers/);
  assert.match(router, /path: '\/config\/suppliers'/);
  assert.match(router, /path: '\/config\/master-data-diagnostics'/);
  assert.match(router, /path: '\/config\/master-data-governance'/);
  assert.match(router, /name: 'config-master-data-governance'/);
  assert.match(router, /name: 'config-master-data-diagnostics'/);
  assert.match(router, /name: 'config-suppliers'/);
  assert.match(sidebar, /'supplier-master': ClipboardList/);
  assert.match(sidebar, /'master-data-diagnostics': ClipboardList/);
  assert.match(sidebar, /'master-data-governance': BarChart3/);
  assert.match(supplierMaster, /供应商主数据/);
  assert.match(supplierMaster, /profile: \{\{ profileDetail\.profile\.code \}\}/);
  assert.match(supplierMaster, /workflow: \{\{ profileDetail\.profile\.workflowKind \}\}/);
  assert.match(supplierMaster, /useRoute/);
  assert.match(supplierMaster, /useRouter/);
  assert.match(supplierMaster, /supplierId/);
  assert.match(supplierMaster, /tab/);
  assert.match(supplierMaster, /name: 'material-master'/);
  assert.match(supplierMaster, /<SupplierSummaryCards/);
  assert.match(supplierMaster, /<MasterDataLifecyclePanel/);
  assert.match(supplierMaster, /<SupplierDiagnosticsPanel/);
  assert.match(supplierMaster, /<SupplierDetailPanel/);
  assert.match(supplierMaster, /<SupplierEditDialog/);
  assert.match(supplierMaster, /<SupplierListPanel/);
  assert.match(supplierSummary, /关联健康总览/);
  assert.match(supplierSummary, /关联物料总数/);
  assert.match(supplierSummary, /异常供应商数/);
  assert.match(supplierAudit, /最近 5 条变更/);
  assert.match(supplierAudit, /最近审计记录/);
  assert.match(supplierDiagnostics, /inactive 但仍有关联物料/);
  assert.match(supplierDiagnostics, /需补充正式链接/);
  assert.match(supplierDiagnostics, /查看关联物料/);
  assert.match(supplierDiagnostics, /打开编辑/);
  assert.match(supplierEditDialog, /维护供应商主数据条目/);
  assert.match(supplierEditDialog, /状态/);
  assert.match(supplierEditDialog, /备注/);
  assert.match(supplierList, /供应商列表/);
  assert.match(supplierList, /已链接物料/);
  assert.match(governanceView, /主数据治理看板/);
  assert.match(governanceView, /治理状态总览/);
  assert.match(governanceView, /近期活动/);
  assert.match(governanceView, /治理焦点/);
  assert.match(governanceView, /打开统一诊断/);
  assert.match(diagnosticsView, /主数据统一诊断/);
  assert.match(diagnosticsView, /物料异常/);
  assert.match(diagnosticsView, /供应商异常/);
  assert.match(diagnosticsView, /Lifecycle 待处理/);
  assert.match(diagnosticsView, /人工处理任务流/);
  assert.match(diagnosticsView, /批量自动重连/);
  assert.match(diagnosticsView, /处理当前对象/);
  assert.match(diagnosticsView, /查看物料详情/);
  assert.match(diagnosticsView, /查看供应商详情/);
  assert.match(diagnosticsSummary, /总异常数/);
  assert.match(diagnosticsSummary, /可自动修复/);
  assert.match(diagnosticsSummary, /待发布主数据/);
  assert.match(lifecyclePanel, /发布当前 draft/);
  assert.match(lifecyclePanel, /修订历史/);
  assert.match(lifecyclePanel, /回滚到此版本/);
  assert.match(supplierLinkedMaterials, /关联物料明细/);
  assert.match(supplierLinkedMaterials, /当前 supplier master 暂无已关联物料/);
  assert.match(supplierLinkedMaterials, /查看物料详情/);
  assert.match(supplierDetail, /供应商详情工作台/);
  assert.match(supplierDetail, /关联物料/);
  assert.match(supplierDetail, /当前未发现供应商关系异常/);
  assert.match(supplierDetail, /update:activeTab/);
  assert.match(materialMaster, /useRoute/);
  assert.match(materialMaster, /useRouter/);
  assert.match(materialMaster, /materialId/);
  assert.match(materialMaster, /tab/);
  assert.match(materialMaster, /name: 'config-suppliers'/);
  assert.match(materialMaster, /<ConfigCenterShell/);
  assert.match(materialMaster, /<MasterDataLifecyclePanel/);
  assert.match(materialMaster, /profile: \{\{ profileDetail\.profile\.code \}\}/);
  assert.match(materialMaster, /workflow: \{\{ profileDetail\.profile\.workflowKind \}\}/);
  assert.match(materialMaster, /supplierRefs: \{\{ referenceCheck\.supplierRefs\.length \}\}/);
  assert.match(materialMaster, /<MaterialDetailPanel/);
  assert.match(materialMaster, /<MaterialEditDialog/);
  assert.match(materialMaster, /<MaterialListPanel/);
  assert.match(materialMaster, /<MaterialSummaryCards/);
  assert.match(materialMaster, /<MaterialDiagnosticsPanel/);
  assert.match(materialAudit, /最近审计记录/);
  assert.match(materialEditDialog, /保存后按供应商名称自动尝试关联/);
  assert.match(materialEditDialog, /手动关联/);
  assert.match(materialEditDialog, /自动匹配 \/ 不指定/);
  assert.match(materialSummary, /物料总数/);
  assert.match(materialSummary, /已正式链接/);
  assert.match(materialSummary, /关系异常数/);
  assert.match(materialList, /供应商主数据/);
  assert.match(materialList, /已关联 #/);
  assert.match(materialDetail, /物料详情工作台/);
  assert.match(materialDetail, /基础信息/);
  assert.match(materialDetail, /当前链接状态/);
  assert.match(materialDetail, /查看供应商详情/);
  assert.match(materialRelationship, /当前 Supplier Master/);
  assert.match(materialRelationship, /可用主数据候选/);
  assert.match(materialRelationship, /查看供应商详情/);
  assert.match(materialDiagnostics, /主数据引用检查/);
  assert.match(materialDiagnostics, /引用路径样例/);
  assert.match(materialDiagnostics, /关系异常分组/);
  assert.match(materialDiagnostics, /未关联 Supplier Master 的物料/);
  assert.match(materialDiagnostics, /链接到 inactive Supplier Master/);
  assert.match(materialDiagnostics, /可自动修复/);
  assert.match(materialDiagnostics, /需人工处理/);
  assert.match(materialDiagnostics, /自动重连/);
});

test('config navigation guard: every Config Center route is grouped once by operator intent', () => {
  const sidebar = read('src/layout/Sidebar.vue');
  const materialCatalogConfig = read('src/views/MaterialCatalogConfig.vue');
  const packagingConfig = read('src/views/PackagingConfig.vue');
  const lockConfig = read('src/views/LockConfig.vue');
  const handleConfig = read('src/views/HandleConfig.vue');
  const cylinderConfig = read('src/views/CylinderConfig.vue');
  const lockForkConfig = read('src/views/LockForkConfig.vue');
  const expectedConfigCenterRoutes = [
    '/material-master',
    '/config/suppliers',
    '/config/master-data-diagnostics',
    '/config/master-data-governance',
    '/config/material-catalog',
    '/formula',
    '/config/packaging',
    '/config/cylinder',
    '/config/lock',
    '/config/handle',
    '/config/lock-fork'
  ];
  const configGroup = mainNavGroups.find((group) => group.id === 'config');

  assert.ok(configGroup);

  const flatConfigCenterRoutes = configGroup.items.map((item) => item.href);
  const groupedConfigCenterItems = configCenterNavGroups.flatMap((group) => group.items);
  const groupedConfigCenterRoutes = groupedConfigCenterItems.map((item) => item.href);
  const groupedRouteCounts = groupedConfigCenterRoutes.reduce((counts, href) => {
    counts.set(href, (counts.get(href) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const duplicateGroupedRoutes = [...groupedRouteCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([href]) => href);

  assert.deepEqual(flatConfigCenterRoutes, expectedConfigCenterRoutes);
  assert.deepEqual(flatMainNav.filter((item) => expectedConfigCenterRoutes.includes(item.href)).map((item) => item.href), expectedConfigCenterRoutes);
  assert.deepEqual([...groupedRouteCounts.keys()].sort(), [...expectedConfigCenterRoutes].sort());
  assert.deepEqual(duplicateGroupedRoutes, []);
  assert.equal(groupedConfigCenterRoutes.length, expectedConfigCenterRoutes.length);

  for (const group of configCenterNavGroups) {
    assert.ok(group.title);
    assert.ok(group.operatorIntentLabel);
    assert.ok(group.description);

    for (const item of group.items) {
      assert.ok(item.title);
      assert.ok(item.operatorIntentLabel);
      assert.ok(item.operatorIntentDescription);
    }
  }

  const materialCatalogJsonFallback = groupedConfigCenterItems.find((item) => item.href === '/config/material-catalog');
  const ruleExceptionRoutes = configCenterNavGroups
    .find((group) => group.id === 'rule-exceptions')
    ?.items.map((item) => item.href) ?? [];
  const governanceAdminFallbackRoutes = configCenterNavGroups
    .find((group) => group.id === 'governance-admin-fallback')
    ?.items.map((item) => item.href) ?? [];
  const expectedRuleExceptionRoutes = [
    '/config/packaging',
    '/config/lock',
    '/config/handle',
    '/config/cylinder',
    '/config/lock-fork'
  ];
  const nonRuleExceptionRoutes = [
    '/formula',
    '/material-master',
    '/config/suppliers',
    '/config/master-data-diagnostics',
    '/config/master-data-governance',
    '/config/material-catalog'
  ];

  assert.ok(materialCatalogJsonFallback);
  assert.deepEqual(ruleExceptionRoutes, expectedRuleExceptionRoutes);
  for (const route of nonRuleExceptionRoutes) {
    assert.equal(ruleExceptionRoutes.includes(route), false);
  }
  assert.match(materialCatalogJsonFallback.title, /JSON/);
  assert.match(materialCatalogJsonFallback.operatorIntentLabel, /高级管理员 JSON 兜底/);
  assert.match(materialCatalogJsonFallback.operatorIntentDescription, /高级管理员兜底/);
  assert.equal(ruleExceptionRoutes.includes('/config/material-catalog'), false);
  assert.equal(governanceAdminFallbackRoutes.includes('/config/material-catalog'), true);
  assert.match(materialCatalogConfig, /title="物料目录 JSON 兜底"/);
  assert.match(materialCatalogConfig, /高级管理员入口/);
  assert.match(materialCatalogConfig, /日常物料维护请使用物料数据/);
  assert.match(materialCatalogConfig, /高级管理员 JSON 兜底/);
  assert.match(materialCatalogConfig, /常规新增、编辑、供应商归属和关系修复应优先在「物料数据」中完成/);
  assert.match(materialCatalogConfig, /请仅在管理员兜底场景使用/);
  assert.match(packagingConfig, /规则例外维护/);
  assert.match(lockConfig, /规则例外维护/);
  assert.match(handleConfig, /规则例外维护/);
  assert.match(cylinderConfig, /规则例外维护/);
  assert.match(lockForkConfig, /规则例外维护/);
  assert.match(sidebar, /configCenterNavGroups/);
  assert.match(sidebar, /group\.id === 'config'/);
  assert.match(sidebar, /v-for="intentGroup in configCenterNavGroups"/);
  assert.match(sidebar, /\{\{ intentGroup\.title \}\}/);
  assert.match(sidebar, /v-for="item in intentGroup\.items"/);
  assert.match(sidebar, /intentGroup\.operatorIntentLabel/);
  assert.match(sidebar, /:title="item\.operatorIntentDescription"/);
  assert.match(sidebar, /item\.operatorIntentDescription/);
  assert.doesNotMatch(sidebar, /规则例外维护/);
});
