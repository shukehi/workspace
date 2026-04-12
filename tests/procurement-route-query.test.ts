import test from 'node:test';
import assert from 'node:assert/strict';
import { reactive, ref } from 'vue';
import { useProcurementRouteQuery } from '../src/features/procurement/composables/useProcurementRouteQuery';

test('useProcurementRouteQuery drops orderNo anchor when search is changed or cleared', async () => {
  const route = reactive({
    query: {
      status: 'arrived',
      orderNo: 'PO-100',
    },
  });

  const replaceCalls: Array<{ query: Record<string, unknown> }> = [];
  const router = {
    replace: async (payload: { query: Record<string, unknown> }) => {
      replaceCalls.push(payload);
      route.query = payload.query as any;
    },
  } as any;

  const state = {
    activeStatus: ref<'ALL' | 'arrived'>('ALL'),
    activeCategory: ref<'ALL' | 'packaging'>('ALL'),
    activeRiskFilter: ref<'ALL' | 'RISK'>('ALL'),
    activeCreatedDate: ref(''),
    searchQuery: ref(''),
  };

  const composable = useProcurementRouteQuery(route as any, router, state);

  composable.syncProcurementFiltersFromRoute();
  assert.equal(state.searchQuery.value, 'PO-100');
  assert.deepEqual(composable.buildProcurementQuery(), {
    page: 1,
    pageSize: 20,
    status: 'arrived',
    keyword: 'PO-100',
    orderNo: 'PO-100',
  });

  state.searchQuery.value = 'PO-100-NEW';
  composable.updateProcurementRouteQuery();
  await Promise.resolve();

  assert.equal(route.query.search, 'PO-100-NEW');
  assert.equal(route.query.orderNo, undefined);
  assert.equal('orderNo' in composable.buildProcurementQuery(), false);
  assert.equal(composable.buildProcurementQuery().keyword, 'PO-100-NEW');

  state.searchQuery.value = '';
  composable.updateProcurementRouteQuery();
  await Promise.resolve();

  assert.equal(route.query.search, undefined);
  assert.equal(route.query.orderNo, undefined);
  assert.deepEqual(composable.buildProcurementQuery(), {
    page: 1,
    pageSize: 20,
    status: 'arrived',
  });
  assert.equal(replaceCalls.length >= 2, true);
});
