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
        async post(_url: string, payload: any) {
          calls.push(`post:${payload.code}`);
          return payload;
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
    assert.deepEqual(calls, ['audit-logs', 'supplier-masters', 'get:']);
    assert.equal(state.relationshipHealth.value.linkedMaterialCount, 1);
    assert.equal(state.relationshipHealth.value.inactiveSupplierLinkedMaterialCount, 1);
    assert.equal(state.actionableRelationshipGroups.value.autoFixCandidates.length, 1);
    assert.equal(state.actionableRelationshipGroups.value.manualReviewCandidates.length, 1);

    state.searchQuery.value = ' lock ';
    await state.fetchMaterials();
    assert.equal(calls.at(-1), 'get:lock');

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
