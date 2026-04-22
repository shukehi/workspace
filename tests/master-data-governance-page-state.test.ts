import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScope } from 'vue';
import { useMasterDataGovernance } from '../src/features/master-data/composables/useMasterDataGovernance';

test('master data governance state aggregates profile status, activity, and governance focus', async () => {
  const scope = effectScope();
  const calls: string[] = [];

  try {
    const state = scope.run(() => useMasterDataGovernance({
      api: {
        async detailMaterialProfile() {
          calls.push('material-detail');
          return {
            latestRevision: { revision: 5, state: 'draft', changeNote: 'draft', createdBy: 'tester', createdAt: '2026-04-22T08:00:00.000Z' },
            draftRevision: { revision: 5, state: 'draft', changeNote: 'draft', createdBy: 'tester', createdAt: '2026-04-22T08:00:00.000Z' },
            publishedRevision: { revision: 4, state: 'published', changeNote: 'published', createdBy: 'tester', createdAt: '2026-04-22T07:00:00.000Z' },
            profile: { code: 'material_master', activeRevision: 4, capabilities: {}, workflowKind: 'collection' },
            collection: { total: 2, page: 1, pageSize: 2, previewItems: [] },
          } as any;
        },
        async detailSupplierProfile() {
          calls.push('supplier-detail');
          return {
            latestRevision: { revision: 3, state: 'published', changeNote: 'published', createdBy: 'tester', createdAt: '2026-04-22T06:00:00.000Z' },
            draftRevision: null,
            publishedRevision: { revision: 3, state: 'published', changeNote: 'published', createdBy: 'tester', createdAt: '2026-04-22T06:00:00.000Z' },
            profile: { code: 'supplier_master', activeRevision: 3, capabilities: {}, workflowKind: 'collection' },
            collection: { total: 1, page: 1, pageSize: 1, previewItems: [] },
          } as any;
        },
        async listMaterials() {
          calls.push('materials');
          return [
            { id: 1, code: 'M001', name: '物料A', model: 'A', supplier: '供应商A', supplier_master_id: null, supplierMaster: null, unit: 'pcs', price: 1, category: 'raw' },
            { id: 2, code: 'M002', name: '物料B', model: 'B', supplier: '供应商B', supplier_master_id: 9, supplierMaster: { id: 9, supplier_name: '供应商B', normalized_name: '供应商b', status: 'inactive' }, unit: 'pcs', price: 2, category: 'hardware' },
          ] as any;
        },
        async listSuppliers() {
          calls.push('suppliers');
          return [
            { id: 3, supplierName: '供应商A', normalizedName: '供应商a', status: 'active', sourceNote: '', sources: ['manual'], materialCount: 1, linkedMaterialCount: 0, linkedMaterialCodes: [], hasLinkedMaterialsWhileInactive: false, persisted: true },
            { id: 9, supplierName: '供应商B', normalizedName: '供应商b', status: 'inactive', sourceNote: '', sources: ['manual'], materialCount: 1, linkedMaterialCount: 1, linkedMaterialCodes: ['M002'], hasLinkedMaterialsWhileInactive: true, persisted: true },
          ] as any;
        },
        async materialReferenceCheck() {
          calls.push('reference-check');
          return {
            unlinkedMaterialCount: 1,
          } as any;
        },
        async materialAuditLogs() {
          calls.push('material-logs');
          return [
            { id: 2, action: 'publish', operator: 'alice', createdAt: '2026-04-22T09:00:00.000Z', meta: {} },
          ];
        },
        async supplierAuditLogs() {
          calls.push('supplier-logs');
          return [
            { id: 1, action: 'archive', operator: 'bob', createdAt: '2026-04-22T10:00:00.000Z', meta: {} },
          ];
        },
      },
    }));

    if (!state) throw new Error('state not created');
    await state.load();

    assert.deepEqual(calls, ['material-detail', 'supplier-detail', 'materials', 'suppliers', 'reference-check', 'material-logs', 'supplier-logs']);
    assert.equal(state.issueSummary.value.pendingPublishCount, 1);
    assert.equal(state.issueSummary.value.totalIssueCount, 5);
    assert.equal(state.profileGovernance.value[0].hasPendingDraft, true);
    assert.equal(state.profileGovernance.value[1].hasPendingDraft, false);
    assert.equal(state.recentActivity.value[0].source, 'supplier_master');
    assert.equal(state.recentActivity.value[0].action, 'archive');
    assert.equal(state.governanceFocus.value[0].key, 'pending-publish');
  } finally {
    scope.stop();
  }
});
