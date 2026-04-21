import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScope } from 'vue';
import { useSupplierMaster } from '../src/features/master-data/composables/useSupplierMaster';

test('supplier master page state loads entries and supports create/edit/archive flows', async () => {
  const calls: string[] = [];
  const scope = effectScope();

  try {
    const state = scope.run(() => useSupplierMaster({
      api: {
        async detail() {
          calls.push('detail');
          return {
            profile: { code: 'supplier_master', workflowKind: 'collection' },
            collection: {
              total: 1,
              page: 1,
              pageSize: 1,
              previewItems: [{ id: 1, supplierName: '供应商A', normalizedName: '供应商a', status: 'inactive', sourceNote: '', sources: ['material-master'], materialCount: 1, linkedMaterialCount: 1, linkedMaterialCodes: ['M001'], hasLinkedMaterialsWhileInactive: true, persisted: true }],
            },
          } as any;
        },
        async list() {
          calls.push('list');
          return [] as any;
        },
        async create(payload: any) {
          calls.push(`create:${payload.supplierName}`);
          return { id: 2, ...payload, normalizedName: String(payload.supplierName).toLowerCase(), sources: ['manual'], materialCount: 0, linkedMaterialCount: 0, linkedMaterialCodes: [], persisted: true } as any;
        },
        async auditLogs() {
          calls.push('audit-logs');
          return [
            { id: 1, action: 'create', operator: 'tester', createdAt: '2026-04-21T00:00:00.000Z', meta: {} },
            { id: 2, action: 'archive', operator: 'tester', createdAt: '2026-04-21T00:01:00.000Z', meta: {} },
          ];
        },
        async linkedMaterials(id: number) {
          calls.push(`linked-materials:${id}`);
          return [{ id: 11, code: 'M001', name: '材料A', category: 'Raw', supplier: '供应商A', supplierMasterId: id, updatedAt: null }];
        },
        async update(id: number, payload: any) {
          calls.push(`update:${id}:${payload.supplierName}`);
          return { id, ...payload, normalizedName: String(payload.supplierName).toLowerCase(), sources: ['manual'], materialCount: 0, linkedMaterialCount: 0, linkedMaterialCodes: [], persisted: true } as any;
        },
        async archive(id: number) {
          calls.push(`archive:${id}`);
          return { id, supplierName: '供应商A', status: 'inactive' } as any;
        },
      }
    } as any));

    if (!state) throw new Error('state not created');
    await state.load();
    assert.equal(state.items.value.length, 1);
    assert.equal(state.profileDetail.value?.profile.code, 'supplier_master');
    assert.equal(state.relationshipHealth.value.totalLinkedMaterials, 1);
    assert.equal(state.relationshipHealth.value.inactiveLinkedSupplierCount, 1);
    assert.equal(state.actionableRelationshipGroups.value.inactiveLinkedSuppliers.length, 1);
    assert.equal(state.auditTrendSummary.value.createCount, 1);
    assert.equal(state.auditTrendSummary.value.archiveCount, 1);

    state.openCreateDialog();
    state.editingItem.value.supplierName = '供应商B';
    await state.saveItem();
    assert.equal(calls.includes('create:供应商B'), true);

    state.openEditDialog(state.items.value[0]);
    state.editingItem.value.supplierName = '供应商A-更新';
    await state.saveItem();
    assert.equal(calls.includes('update:1:供应商A-更新'), true);

    await state.archiveItem(state.items.value[0]);
    assert.equal(calls.includes('archive:1'), true);

    await state.loadLinkedMaterials(1, state.items.value[0] as any);
    assert.equal(state.linkedMaterials.value.length, 1);
    assert.equal(calls.includes('linked-materials:1'), true);
  } finally {
    scope.stop();
  }
});
