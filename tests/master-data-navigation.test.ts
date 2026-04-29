import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMaterialMasterRoute,
  buildSupplierMasterRoute,
  normalizeMaterialDetailTab,
  normalizeSupplierDetailTab,
} from '../src/features/master-data/masterDataNavigation';

test('master data navigation helpers build diagnostics/workbench routes for issue and related-object hops', () => {
  assert.deepEqual(buildMaterialMasterRoute(17, 'diagnostics'), {
    name: 'material-master',
    query: {
      materialId: '17',
      tab: 'diagnostics',
    },
  });

  assert.deepEqual(buildSupplierMasterRoute(9, 'materials'), {
    name: 'config-suppliers',
    query: {
      supplierId: '9',
      tab: 'materials',
    },
  });

  assert.deepEqual(buildMaterialMasterRoute(42, 'relationship'), {
    name: 'material-master',
    query: {
      materialId: '42',
      tab: 'relationship',
    },
  });

  assert.deepEqual(buildSupplierMasterRoute(8, 'audit'), {
    name: 'config-suppliers',
    query: {
      supplierId: '8',
      tab: 'audit',
    },
  });

  assert.deepEqual(buildMaterialMasterRoute(null, 'audit'), {
    name: 'material-master',
    query: {
      tab: 'audit',
    },
  });

  assert.deepEqual(buildSupplierMasterRoute(undefined, 'audit'), {
    name: 'config-suppliers',
    query: {
      tab: 'audit',
    },
  });
});

test('master data navigation helpers normalize invalid tabs back to basic', () => {
  assert.equal(normalizeMaterialDetailTab('basic'), 'basic');
  assert.equal(normalizeMaterialDetailTab('diagnostics'), 'diagnostics');
  assert.equal(normalizeMaterialDetailTab('not-a-tab'), 'basic');

  assert.equal(normalizeSupplierDetailTab('materials'), 'materials');
  assert.equal(normalizeSupplierDetailTab('audit'), 'audit');
  assert.equal(normalizeSupplierDetailTab('not-a-tab'), 'basic');
});
