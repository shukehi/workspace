import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScope } from 'vue';
import { useMaterialManagementPageState } from '../src/features/materials/composables/useMaterialManagementPageState';

test('material management page state loads list, opens dialogs, and saves updates', async () => {
  const calls: string[] = [];
  const scope = effectScope();

  try {
    const state = scope.run(() => useMaterialManagementPageState({
      api: {
        async get(_url: string, options?: any): Promise<any> {
          calls.push(`get:${options?.params?.q ?? ''}`);
          return [
            {
              id: 1,
              code: 'M-001',
              name: 'Steel',
              model: 'S1',
              supplier: 'ACME',
              supplier_master_id: 12,
              supplierMaster: {
                id: 12,
                supplier_name: 'ACME',
                normalized_name: 'acme',
                status: 'inactive',
              },
              unit: 'kg',
              price: 12,
              category: 'raw',
            },
            {
              id: 2,
              code: 'M-002',
              name: 'Bracket',
              model: 'B2',
              supplier: 'ACME',
              supplier_master_id: null,
              supplierMaster: null,
              unit: 'pcs',
              price: 6,
              category: 'hardware',
            },
          ];
        },
        async listSupplierMasters() {
          calls.push('supplier-masters');
          return [{ id: 12, supplierName: 'ACME' }];
        },
        async auditLogs() {
          calls.push('audit-logs');
          return [{ id: 1, action: 'update', operator: 'tester', createdAt: '2026-04-21T00:00:00.000Z', meta: {} }];
        },
        async revisions() {
          calls.push('revisions');
          return [
            { revision: 3, state: 'draft', changeNote: 'draft', createdBy: 'tester', createdAt: '2026-04-21T00:02:00.000Z' },
            { revision: 2, state: 'published', changeNote: 'published', createdBy: 'tester', createdAt: '2026-04-21T00:01:00.000Z' },
          ];
        },
        async publish(fromRevision: number) {
          calls.push(`publish:${fromRevision}`);
          return { revision: fromRevision + 1, state: 'published', changeNote: 'publish', createdBy: 'tester', createdAt: '2026-04-21T00:03:00.000Z' } as any;
        },
        async rollback(targetRevision: number) {
          calls.push(`rollback:${targetRevision}`);
          return { revision: { revision: targetRevision + 10 }, activeRevision: targetRevision + 10 } as any;
        },
        async post(_url: string, payload: any) {
          calls.push(`post:${payload.code}`);
          return payload;
        },
        async listMaterialMappings(materialId: number) {
          calls.push(`mappings:${materialId}`);
          return {
            supplierMappings: [{
              id: 11,
              material_id: materialId,
              supplier_master_id: 12,
              supplier_code: 'SUP-001',
              normalized_supplier_code: 'sup-001',
              purchase_unit: 'BOX',
              stock_unit: 'PCS',
              conversion_factor: 10,
              is_default: true,
              is_active: true,
            }],
            codeMappings: [],
            uomConversions: [],
          };
        },
        async createSupplierMapping(materialId: number, payload: any) {
          calls.push(`create-supplier-mapping:${materialId}:${payload.supplier_code}`);
        },
        async updateSupplierMapping(materialId: number, mappingId: number, payload: any) {
          calls.push(`update-supplier-mapping:${materialId}:${mappingId}:${payload.is_active}`);
        },
        async createCodeMapping(materialId: number, payload: any) {
          calls.push(`create-code-mapping:${materialId}:${payload.external_code}`);
        },
        async updateCodeMapping(materialId: number, mappingId: number, payload: any) {
          calls.push(`update-code-mapping:${materialId}:${mappingId}:${payload.is_active}`);
        },
        async createUomConversion(materialId: number, payload: any) {
          calls.push(`create-uom-conversion:${materialId}:${payload.from_unit}:${payload.factor}`);
        },
        async updateUomConversion(materialId: number, conversionId: number, payload: any) {
          calls.push(`update-uom-conversion:${materialId}:${conversionId}:${payload.is_active}`);
        },
        async put(url: string, payload: any) {
          calls.push(`put:${url}:${payload.code ?? ''}:${payload.supplier_master_id ?? 'unset'}`);
          return payload;
        },
      },
    }));

    if (!state) throw new Error('state not created');

    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(state.materials.value.length, 2);
    assert.deepEqual(calls, ['audit-logs', 'revisions', 'supplier-masters', 'get:']);
    assert.equal(state.relationshipHealth.value.linkedMaterialCount, 1);
    assert.equal(state.relationshipHealth.value.inactiveSupplierLinkedMaterialCount, 1);
    assert.equal(state.actionableRelationshipGroups.value.autoFixCandidates.length, 1);
    assert.equal(state.actionableRelationshipGroups.value.manualReviewCandidates.length, 1);

    await state.fetchMaterialMappings(1);
    assert.equal(state.materialMappingsMaterialId.value, 1);
    assert.equal(state.materialMappings.value?.supplierMappings[0]?.supplier_code, 'SUP-001');
    await state.createSupplierMapping(1, { supplier_master_id: 12, supplier_code: 'SUP-002', conversion_factor: 2 });
    await state.updateSupplierMapping(1, 11, { is_active: false });
    await state.createCodeMapping(1, { mapping_type: 'alias', external_code: 'ALIAS-001' });
    await state.updateCodeMapping(1, 21, { is_active: false });
    await state.createUomConversion(1, { from_unit: 'BOX', to_unit: 'PCS', factor: 10 });
    await state.updateUomConversion(1, 31, { is_active: false });
    assert.equal(calls.includes('create-supplier-mapping:1:SUP-002'), true);
    assert.equal(calls.includes('update-supplier-mapping:1:11:false'), true);
    assert.equal(calls.includes('create-code-mapping:1:ALIAS-001'), true);
    assert.equal(calls.includes('update-code-mapping:1:21:false'), true);
    assert.equal(calls.includes('create-uom-conversion:1:BOX:10'), true);
    assert.equal(calls.includes('update-uom-conversion:1:31:false'), true);

    state.searchQuery.value = ' lock ';
    await state.fetchMaterials();
    assert.equal(calls.at(-1), 'get:lock');

    assert.equal(state.revisions.value.length, 2);
    state.profileDetail.value = { ...(state.profileDetail.value || {}), draftRevision: { revision: 3 } };
    await state.publishDraft();
    assert.equal(calls.includes('publish:3'), true);
    await state.rollbackRevision(2);
    assert.equal(calls.includes('rollback:2'), true);

    await state.autoRelinkMaterial(state.materials.value[1]);
    assert.equal(calls.includes('put:/materials/2::unset'), true);

    state.openCreateDialog();
    assert.equal(state.isEditDialogOpen.value, true);
    assert.equal(state.dialogTitle.value, '新增物料');
    state.editingMaterial.value.code = 'M-NEW';
    await state.saveMaterial();
    assert.equal(calls.includes('post:M-NEW'), true);

    state.openEditDialog({
      id: 7,
      code: 'M-007',
      name: 'Panel',
      model: 'P7',
      supplier: 'Beta',
      supplier_master_id: 8,
      supplierMaster: {
        id: 8,
        supplier_name: 'Beta',
        normalized_name: 'beta',
        status: 'active',
      },
      unit: 'pcs',
      price: 8,
      category: 'packaging',
    });
    assert.equal(state.dialogTitle.value, '编辑物料');
    await state.saveMaterial();
    assert.equal(calls.includes('put:/materials/7:M-007:8'), true);
  } finally {
    scope.stop();
  }
});

test('material management page state ignores stale mapping responses', async () => {
  const scope = effectScope();
  try {
    let releaseFirst!: () => void;
    const firstResponse = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const state = scope.run(() => useMaterialManagementPageState({
      api: {
        async get(): Promise<any> { return []; },
        async listSupplierMasters() { return []; },
        async auditLogs() { return []; },
        async listMaterialMappings(materialId: number) {
          if (materialId === 1) await firstResponse;
          return {
            supplierMappings: [{
              id: materialId,
              material_id: materialId,
              supplier_master_id: null,
              supplier_code: `SUP-${materialId}`,
              normalized_supplier_code: `sup-${materialId}`,
              conversion_factor: 1,
              is_default: false,
              is_active: true,
            }],
            codeMappings: [],
            uomConversions: [],
          };
        },
      },
    }));

    if (!state) throw new Error('state not created');
    await new Promise((resolve) => setTimeout(resolve, 0));

    const first = state.fetchMaterialMappings(1);
    const second = state.fetchMaterialMappings(2);
    releaseFirst();
    await Promise.all([first, second]);

    assert.equal(state.materialMappingsMaterialId.value, 2);
    assert.equal(state.materialMappings.value?.supplierMappings[0]?.supplier_code, 'SUP-2');
  } finally {
    scope.stop();
  }
});
