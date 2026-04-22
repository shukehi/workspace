import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScope } from 'vue';
import { useMasterDataDiagnostics } from '../src/features/master-data/composables/useMasterDataDiagnostics';

test('master data diagnostics state aggregates material/supplier issues and relinks candidates', async () => {
  const calls: string[] = [];
  const scope = effectScope();

  try {
    const state = scope.run(() => useMasterDataDiagnostics({
      api: {
        async listMaterials() {
          calls.push('materials');
          return [
            {
              id: 1,
              code: 'M001',
              name: '物料A',
              model: 'A',
              supplier: '供应商A',
              supplier_master_id: null,
              supplierMaster: null,
              unit: 'pcs',
              price: 1,
              category: 'raw',
            },
            {
              id: 2,
              code: 'M002',
              name: '物料B',
              model: 'B',
              supplier: '供应商B',
              supplier_master_id: 9,
              supplierMaster: {
                id: 9,
                supplier_name: '供应商B',
                normalized_name: '供应商b',
                status: 'inactive',
              },
              unit: 'pcs',
              price: 2,
              category: 'hardware',
            },
          ] as any;
        },
        async referenceCheck() {
          calls.push('reference-check');
          return {
            profileCode: 'material_master',
            supplierRefs: ['供应商A', '供应商B'],
            materialCodeRefs: ['M001', 'M002'],
            missingMaterialCodes: [],
            suppliersMissingInMaterialMaster: [],
            suppliersMissingInSupplierMaster: ['供应商C'],
            unlinkedMaterialCount: 1,
            unlinkedMaterialItems: [
              { path: 'items[0]', code: 'M001', supplier: '供应商A', supplier_master_id: null },
            ],
            hasIssues: true,
          } as any;
        },
        async listSuppliers() {
          calls.push('suppliers');
          return [
            {
              id: 3,
              supplierName: '供应商A',
              normalizedName: '供应商a',
              status: 'active',
              sourceNote: '',
              sources: ['manual'],
              materialCount: 1,
              linkedMaterialCount: 0,
              linkedMaterialCodes: [],
              hasLinkedMaterialsWhileInactive: false,
              persisted: true,
            },
            {
              id: 9,
              supplierName: '供应商B',
              normalizedName: '供应商b',
              status: 'inactive',
              sourceNote: '',
              sources: ['manual'],
              materialCount: 1,
              linkedMaterialCount: 1,
              linkedMaterialCodes: ['M002'],
              hasLinkedMaterialsWhileInactive: true,
              persisted: true,
            },
          ] as any;
        },
        async detailMaterialProfile() {
          calls.push('material-detail');
          return {
            latestRevision: { revision: 5, state: 'draft', changeNote: 'draft', createdBy: 'tester', createdAt: null },
            draftRevision: { revision: 5, state: 'draft', changeNote: 'draft', createdBy: 'tester', createdAt: null },
            publishedRevision: { revision: 4, state: 'published', changeNote: 'published', createdBy: 'tester', createdAt: null },
            profile: { code: 'material_master', workflowKind: 'collection', activeRevision: 4, capabilities: {} },
            collection: { total: 2, page: 1, pageSize: 2, previewItems: [] },
          } as any;
        },
        async detailSupplierProfile() {
          calls.push('supplier-detail');
          return {
            latestRevision: { revision: 3, state: 'published', changeNote: 'published', createdBy: 'tester', createdAt: null },
            draftRevision: null,
            publishedRevision: { revision: 3, state: 'published', changeNote: 'published', createdBy: 'tester', createdAt: null },
            profile: { code: 'supplier_master', workflowKind: 'collection', activeRevision: 3, capabilities: {} },
            collection: { total: 2, page: 1, pageSize: 2, previewItems: [] },
          } as any;
        },
        async updateMaterial(id: number, payload: any) {
          calls.push(`update:${id}:${payload.supplier_master_id}`);
          return payload;
        },
      },
    }));

    if (!state) throw new Error('state not created');

    await state.load();

    assert.deepEqual(calls.slice(0, 5), ['materials', 'reference-check', 'suppliers', 'material-detail', 'supplier-detail']);
    assert.equal(state.summary.value.totalIssueCount, 5);
    assert.equal(state.summary.value.pendingPublishCount, 1);
    assert.equal(state.lifecycleIssues.value.items.length, 1);
    assert.equal(state.summary.value.autoFixCount, 1);
    assert.equal(state.materialIssues.value.autoFixCandidates.length, 1);
    assert.equal(state.materialIssues.value.manualReviewCandidates.length, 1);
    assert.equal(state.supplierIssues.value.inactiveLinkedSuppliers.length, 1);
    assert.equal(state.supplierIssues.value.suppliersWithUnlinkedMaterials.length, 1);

    await state.autoRelinkMaterial(state.materialIssues.value.autoFixCandidates[0] as any);
    assert.equal(calls.includes('update:1:null'), true);
    assert.equal(state.lastBatchRelinkResult.value, null);
  } finally {
    scope.stop();
  }
});

test('master data diagnostics state supports batch auto relink and reports results', async () => {
  const calls: string[] = [];
  const scope = effectScope();
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const state = scope.run(() => useMasterDataDiagnostics({
      api: {
        async listMaterials() {
          calls.push('materials');
          return [
            { id: 1, code: 'M001', name: '物料A', model: 'A', supplier: '供应商A', supplier_master_id: null, supplierMaster: null, unit: 'pcs', price: 1, category: 'raw' },
            { id: 2, code: 'M002', name: '物料B', model: 'B', supplier: '供应商A', supplier_master_id: null, supplierMaster: null, unit: 'pcs', price: 2, category: 'raw' },
          ] as any;
        },
        async referenceCheck() {
          calls.push('reference-check');
          return {
            profileCode: 'material_master',
            supplierRefs: ['供应商A'],
            materialCodeRefs: ['M001', 'M002'],
            missingMaterialCodes: [],
            suppliersMissingInMaterialMaster: [],
            suppliersMissingInSupplierMaster: [],
            unlinkedMaterialCount: 2,
            unlinkedMaterialItems: [],
            hasIssues: true,
          } as any;
        },
        async listSuppliers() {
          calls.push('suppliers');
          return [
            { id: 3, supplierName: '供应商A', normalizedName: '供应商a', status: 'active', sourceNote: '', sources: ['manual'], materialCount: 2, linkedMaterialCount: 0, linkedMaterialCodes: [], hasLinkedMaterialsWhileInactive: false, persisted: true },
          ] as any;
        },
        async detailMaterialProfile() {
          return { latestRevision: null, draftRevision: null, publishedRevision: null, profile: { code: 'material_master', workflowKind: 'collection', activeRevision: null, capabilities: {} }, collection: { total: 2, page: 1, pageSize: 2, previewItems: [] } } as any;
        },
        async detailSupplierProfile() {
          return { latestRevision: null, draftRevision: null, publishedRevision: null, profile: { code: 'supplier_master', workflowKind: 'collection', activeRevision: null, capabilities: {} }, collection: { total: 1, page: 1, pageSize: 1, previewItems: [] } } as any;
        },
        async updateMaterial(id: number, payload: any) {
          calls.push(`update:${id}:${payload.supplier_master_id}`);
          if (id === 2) throw new Error('boom');
          return payload;
        },
      },
    }));

    if (!state) throw new Error('state not created');
    await state.load();

    const result = await state.autoRelinkMaterials(state.materialIssues.value.autoFixCandidates as any);
    assert.deepEqual(result, {
      processed: 2,
      succeeded: 1,
      failed: 1,
      failedIds: [2],
    });
    assert.equal(state.lastBatchRelinkResult.value?.failed, 1);
    assert.equal(state.batchRelinking.value, false);
    assert.equal(state.relinkingMaterialIds.value.length, 0);
    assert.equal(calls.includes('update:1:null'), true);
    assert.equal(calls.includes('update:2:null'), true);
  } finally {
    console.error = originalConsoleError;
    scope.stop();
  }
});
