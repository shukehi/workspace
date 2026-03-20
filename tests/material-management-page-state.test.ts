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
              unit: 'kg',
              price: 12,
              category: 'raw',
            },
          ];
        },
        async post(_url: string, payload: any) {
          calls.push(`post:${payload.code}`);
          return payload;
        },
        async put(url: string, payload: any) {
          calls.push(`put:${url}:${payload.code}`);
          return payload;
        },
      },
    }));

    if (!state) throw new Error('state not created');

    await Promise.resolve();
    await Promise.resolve();

    assert.equal(state.materials.value.length, 1);
    assert.deepEqual(calls, ['get:']);

    state.searchQuery.value = ' lock ';
    await state.fetchMaterials();
    assert.equal(calls.at(-1), 'get:lock');

    state.openCreateDialog();
    assert.equal(state.isEditDialogOpen.value, true);
    assert.equal(state.dialogTitle.value, '新增物料');
    state.editingMaterial.value.code = 'M-NEW';
    await state.saveMaterial();
    assert.equal(calls.at(-2), 'post:M-NEW');

    state.openEditDialog({
      id: 7,
      code: 'M-007',
      name: 'Panel',
      model: 'P7',
      supplier: 'Beta',
      unit: 'pcs',
      price: 8,
      category: 'packaging',
    });
    assert.equal(state.dialogTitle.value, '编辑物料');
    await state.saveMaterial();
    assert.equal(calls.at(-2), 'put:/materials/7:M-007');
  } finally {
    scope.stop();
  }
});
