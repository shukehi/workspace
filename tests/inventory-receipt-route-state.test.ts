import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTick, reactive, ref } from 'vue';
import { useInventoryReceiptRouteState } from '../src/features/inventory/composables/useInventoryReceiptRouteState';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('useInventoryReceiptRouteState syncs route state and builds receipt fetch params', async () => {
  const route = reactive({
    query: {
      tab: 'inventory',
      orderNo: 'PO-888',
      keyword: '五金',
      direction: 'in',
      reverseReason: 'entry_error',
      page: '3',
      pageSize: '100',
    },
  });
  const replaceCalls: Array<{ query: Record<string, unknown> }> = [];
  const loadCalls: string[] = [];
  const activeTab = ref('inventory');
  const router = {
    replace: async (payload: { query: Record<string, unknown> }) => {
      replaceCalls.push(payload);
    },
  };

  const state = useInventoryReceiptRouteState(route, router, {
    activeTab,
    defaultPageSize: 50,
    loadReceipts: async (orderNo = '') => {
      loadCalls.push(orderNo);
    },
  });

  state.syncReceiptFiltersFromRoute();

  assert.equal(state.receiptSearchQuery.value, '五金');
  assert.equal(state.receiptOrderFilter.value, 'PO-888');
  assert.equal(state.receiptDirectionFilter.value, 'in');
  assert.equal(state.reverseReasonFilter.value, 'entry_error');
  assert.equal(state.receiptPage.value, 3);
  assert.equal(state.receiptPageSize.value, 100);
  assert.deepEqual(state.buildReceiptFetchParams('PO-888'), {
    orderNo: 'PO-888',
    keyword: '五金',
    direction: 'in',
    reverseReason: 'entry_error',
    page: 3,
    pageSize: 100,
  });

  route.query.orderNo = 'PO-999';
  route.query.page = '2';
  route.query.tab = 'receipts';
  await nextTick();

  assert.equal(activeTab.value, 'receipts');
  assert.equal(loadCalls.at(-1), 'PO-999');
  assert.equal(state.receiptOrderFilter.value, 'PO-999');
  assert.equal(state.receiptPage.value, 2);

  state.receiptSearchQuery.value = '新关键词';
  state.receiptDirectionFilter.value = 'reversal';
  await wait(350);

  assert.deepEqual(replaceCalls.at(-1), {
    query: {
      tab: 'receipts',
      orderNo: 'PO-999',
      keyword: '新关键词',
      direction: 'reversal',
      reverseReason: 'entry_error',
      pageSize: '100',
    },
  });

  state.clearReceiptRouteFilters();

  assert.equal(state.receiptSearchQuery.value, '');
  assert.equal(state.receiptOrderFilter.value, '');
  assert.equal(state.receiptDirectionFilter.value, 'ALL');
  assert.equal(state.reverseReasonFilter.value, 'ALL');
  assert.equal(state.receiptPage.value, 1);
  assert.equal(state.receiptPageSize.value, 50);
  assert.deepEqual(replaceCalls.at(-1), {
    query: {
      tab: 'receipts',
    },
  });
});
