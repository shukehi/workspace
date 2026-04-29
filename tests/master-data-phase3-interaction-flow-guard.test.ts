import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

function assertContainsInOrder(source: string, needles: string[], message: string): void {
  let cursor = 0;
  for (const needle of needles) {
    const nextIndex = source.indexOf(needle, cursor);
    assert.notEqual(nextIndex, -1, `${message}: missing ${needle}`);
    cursor = nextIndex + needle.length;
  }
}

test('master data diagnostics routes issues through shared repair destinations', () => {
  const diagnosticsView = read('src/views/MasterDataDiagnostics.vue');

  assert.match(diagnosticsView, /import \{ useRouter \} from 'vue-router'/);
  assert.match(diagnosticsView, /buildMaterialMasterRoute/);
  assert.match(diagnosticsView, /buildSupplierMasterRoute/);
  assert.match(diagnosticsView, /const router = useRouter\(\)/);

  assertContainsInOrder(diagnosticsView, [
    "function openMaterial(item: { id: number }, tab: 'basic' | 'relationship' | 'diagnostics' | 'audit' = 'diagnostics')",
    'router.push(buildMaterialMasterRoute(item.id, tab))',
  ], 'material diagnostic issue route should preserve selected material and requested tab');

  assertContainsInOrder(diagnosticsView, [
    "function openSupplier(item: SupplierMasterEntry, tab: 'basic' | 'materials' | 'diagnostics' | 'audit' = 'diagnostics')",
    'if (!item.id) return;',
    'router.push(buildSupplierMasterRoute(item.id, tab))',
  ], 'supplier diagnostic issue route should preserve selected supplier and requested tab');

  assertContainsInOrder(diagnosticsView, [
    'function jumpToSuggestedSupplier',
    'const supplierId = Number(item.suggestedSupplierMaster?.id || 0);',
    "router.push(buildSupplierMasterRoute(supplierId, 'materials'))",
  ], 'auto-fix suggestions should jump from diagnostics to supplier linked-materials tab');

  assert.match(diagnosticsView, /open:\s*\(\) => openMaterial\(item, 'diagnostics'\)/);
  assert.match(diagnosticsView, /openRelated:\s*supplierMasterId\s*\?\s*\(\) => openSupplier\(\{ id: supplierMasterId \} as SupplierMasterEntry, 'diagnostics'\)/);
  assert.match(diagnosticsView, /open:\s*\(\) => openSupplier\(item, 'materials'\)/);
  assert.match(diagnosticsView, /open:\s*\(\) => openSupplier\(item, 'diagnostics'\)/);
  assert.match(diagnosticsView, /@click="openMaterial\(item, 'diagnostics'\)">查看物料详情/);
  assert.match(diagnosticsView, /@click="jumpToSuggestedSupplier\(item\)">查看供应商详情/);
  assert.match(diagnosticsView, /@click="openSupplier\(item, 'materials'\)">查看供应商详情/);
  assert.match(diagnosticsView, /@click="openSupplier\(item, 'diagnostics'\)">查看供应商详情/);
});

test('material workbench actions remain wired to edit, relink, and supplier material tabs', () => {
  const materialView = read('src/views/MaterialManagement.vue');
  const materialDetail = read('src/features/master-data/components/MaterialDetailPanel.vue');
  const materialRelationship = read('src/features/master-data/components/MaterialRelationshipSection.vue');
  const materialDiagnostics = read('src/features/master-data/components/MaterialDiagnosticsPanel.vue');

  assert.match(materialView, /normalizeMaterialDetailTab/);
  assert.match(materialView, /type MaterialDetailTab/);
  assert.match(materialView, /const activeDetailTab = ref<MaterialDetailTab>\(normalizeMaterialDetailTab\(route\.query\.tab\)\)/);
  assert.match(materialView, /const requestedId = Number\(queryMaterialId \|\| 0\)/);

  assertContainsInOrder(materialView, [
    'function syncRouteSelection(materialId: number | null, tab = activeDetailTab.value)',
    'const targetRoute = buildMaterialMasterRoute(materialId, tab);',
    '...route.query,',
    '...targetRoute.query,',
  ], 'material workbench should keep materialId, active tab, and existing query state in the route');

  assertContainsInOrder(materialView, [
    'function jumpToSupplierDetail(supplierMasterId: number)',
    "router.push(buildSupplierMasterRoute(supplierMasterId, 'materials'))",
  ], 'material supplier jumps should land on supplier linked-materials tab');

  assert.match(materialView, /<MaterialDetailPanel[\s\S]*:active-tab="activeDetailTab"[\s\S]*@open-edit="openEditDialog"[\s\S]*@auto-relink="autoRelinkMaterial"[\s\S]*@jump-to-supplier="jumpToSupplierDetail"[\s\S]*@update:active-tab="handleDetailTabChange"/);
  assert.match(materialView, /<MaterialDiagnosticsPanel[\s\S]*@auto-relink="autoRelinkMaterial"[\s\S]*@open-edit="openEditDialog"/);

  assert.match(materialDetail, /\(e: 'open-edit', item: MaterialRecord\): void/);
  assert.match(materialDetail, /\(e: 'auto-relink', item: MaterialRecord\): void/);
  assert.match(materialDetail, /\(e: 'jump-to-supplier', supplierMasterId: number\): void/);
  assert.match(materialDetail, /@click="emit\('open-edit', material\)">打开编辑/);
  assert.match(materialDetail, /@click="emit\('auto-relink', material\)">自动重连/);
  assert.match(materialDetail, /@click="emit\('jump-to-supplier', material\.supplierMaster\.id\)"[\s\S]*查看供应商详情/);
  assert.match(materialDetail, /<MaterialRelationshipSection[\s\S]*@auto-link="emit\('auto-relink', \$event\)"[\s\S]*@open-edit="emit\('open-edit', \$event\)"[\s\S]*@jump-to-supplier="emit\('jump-to-supplier', \$event\)"/);

  assert.match(materialRelationship, /\(e: 'auto-link', material: MaterialRecord\): void/);
  assert.match(materialRelationship, /\(e: 'open-edit', material: MaterialRecord\): void/);
  assert.match(materialRelationship, /\(e: 'jump-to-supplier', supplierMasterId: number\): void/);
  assert.match(materialRelationship, /@click="emit\('open-edit', material\)">打开编辑/);
  assert.match(materialRelationship, /@click="emit\('auto-link', material\)">自动重连/);
  assert.match(materialRelationship, /@click="emit\('jump-to-supplier', material\.supplierMaster\.id\)"[\s\S]*查看供应商详情/);

  assert.match(materialDiagnostics, /\(e: 'auto-relink', item: any\): void/);
  assert.match(materialDiagnostics, /\(e: 'open-edit', item: any\): void/);
  assert.match(materialDiagnostics, /@click="emit\('auto-relink', item\)"[\s\S]*自动重连/);
  assert.match(materialDiagnostics, /@click="emit\('open-edit', item\)"[\s\S]*打开编辑/);
});

test('supplier workbench actions remain wired to linked materials, edit, and material relationship tabs', () => {
  const supplierView = read('src/views/SupplierMaster.vue');
  const supplierDetail = read('src/features/master-data/components/SupplierDetailPanel.vue');
  const supplierDiagnostics = read('src/features/master-data/components/SupplierDiagnosticsPanel.vue');
  const supplierLinkedMaterials = read('src/features/master-data/components/SupplierLinkedMaterialsPanel.vue');

  assert.match(supplierView, /normalizeSupplierDetailTab/);
  assert.match(supplierView, /type SupplierDetailTab/);
  assert.match(supplierView, /const activeDetailTab = ref<SupplierDetailTab>\(normalizeSupplierDetailTab\(route\.query\.tab\)\)/);
  assert.match(supplierView, /const requestedId = Number\(route\.query\.supplierId \|\| 0\)/);

  assertContainsInOrder(supplierView, [
    'function syncRouteSelection(supplierId: number | null, tab = activeDetailTab.value)',
    'const targetRoute = buildSupplierMasterRoute(supplierId, tab);',
    '...route.query,',
    '...targetRoute.query,',
  ], 'supplier workbench should keep supplierId, active tab, and existing query state in the route');

  assertContainsInOrder(supplierView, [
    'function handleSupplierSelect(item: SupplierMasterEntry)',
    'void loadLinkedMaterials(Number(item.id), item)',
    'syncRouteSelection(Number(item.id))',
  ], 'view linked materials should load the selected supplier and route selection');

  assertContainsInOrder(supplierView, [
    'function jumpToMaterialDetail(item: { id: number })',
    "router.push(buildMaterialMasterRoute(item.id, 'relationship'))",
  ], 'supplier linked-material jumps should land on material relationship tab');

  assert.match(supplierView, /<SupplierDetailPanel[\s\S]*:active-tab="activeDetailTab"[\s\S]*@open-edit="openEditDialog"[\s\S]*@view-linked-materials="handleSupplierSelect"[\s\S]*@jump-to-material="jumpToMaterialDetail"[\s\S]*@update:active-tab="handleDetailTabChange"/);
  assert.match(supplierView, /<SupplierDiagnosticsPanel[\s\S]*@view-linked-materials="handleSupplierSelect"[\s\S]*@open-edit="openEditDialog"/);

  assert.match(supplierDetail, /\(e: 'open-edit', item: SupplierMasterEntry\): void/);
  assert.match(supplierDetail, /\(e: 'view-linked-materials', item: SupplierMasterEntry\): void/);
  assert.match(supplierDetail, /\(e: 'jump-to-material', item: \{ id: number; code: string; name: string \}\): void/);
  assert.match(supplierDetail, /@click="emit\('view-linked-materials', supplier\)">查看关联物料/);
  assert.match(supplierDetail, /@click="emit\('open-edit', supplier\)">编辑供应商/);
  assert.match(supplierDetail, /@click="emit\('open-edit', supplier\)">打开编辑/);
  assert.match(supplierDetail, /<SupplierLinkedMaterialsPanel[\s\S]*@jump-to-material="emit\('jump-to-material', \$event\)"/);

  assert.match(supplierDiagnostics, /\(e: 'view-linked-materials', item: any\): void/);
  assert.match(supplierDiagnostics, /\(e: 'open-edit', item: any\): void/);
  assert.match(supplierDiagnostics, /@click="emit\('view-linked-materials', item\)"[\s\S]*查看关联物料/);
  assert.match(supplierDiagnostics, /@click="emit\('open-edit', item\)"[\s\S]*打开编辑/);

  assert.match(supplierLinkedMaterials, /\(e: 'jump-to-material', item: \{ id: number; code: string; name: string \}\): void/);
  assert.match(supplierLinkedMaterials, /@click="emit\('jump-to-material', material\)"[\s\S]*查看物料详情/);
});
