import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { useProcurementRouteQuery } from '../src/features/procurement/composables/useProcurementRouteQuery';

test('useProcurementRouteQuery syncs route state and builds request query', () => {
  const route = {
    query: {
      orderNo: 'PO-123',
      status: 'processing',
      category: '锁叉',
      risk: 'RISK',
      createdDate: '2026-03-09',
      search: '方亮',
      page: '3',
      pageSize: '50',
    },
  };
  const replaceCalls: Array<{ query: Record<string, unknown> }> = [];
  const router = {
    replace: async (payload: { query: Record<string, unknown> }) => {
      replaceCalls.push(payload);
    },
  } as any;

  const activeStatus = ref('ALL');
  const activeCategory = ref('ALL');
  const activeRiskFilter = ref('ALL');
  const activeCreatedDate = ref('');
  const searchQuery = ref('');

  const state = useProcurementRouteQuery(route, router, {
    activeStatus,
    activeCategory,
    activeRiskFilter,
    activeCreatedDate,
    searchQuery,
  });

  state.syncProcurementFiltersFromRoute();
  state.syncSearchQueryFromRoute();

  assert.equal(activeStatus.value, 'processing');
  assert.equal(activeCategory.value, '锁叉');
  assert.equal(activeRiskFilter.value, 'RISK');
  assert.equal(activeCreatedDate.value, '2026-03-09');
  assert.equal(searchQuery.value, 'PO-123');
  assert.equal(state.procurementPage.value, 3);
  assert.equal(state.procurementPageSize.value, 50);

  assert.deepEqual(state.buildProcurementQuery(), {
    page: 3,
    pageSize: 50,
    status: 'processing',
    category: '锁叉',
    risk: 'RISK',
    createdDate: '2026-03-09',
    keyword: 'PO-123',
    orderNo: 'PO-123',
  });

  searchQuery.value = '新关键词';
  activeStatus.value = 'ALL';
  state.procurementPage.value = 1;
  state.procurementPageSize.value = 20;
  state.updateProcurementRouteQuery();

  assert.deepEqual(replaceCalls, [
    {
      query: {
        orderNo: 'PO-123',
        category: '锁叉',
        risk: 'RISK',
        createdDate: '2026-03-09',
        search: '新关键词',
      },
    },
  ]);
});
