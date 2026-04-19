import { ref } from 'vue';
import { refDebounced } from '@vueuse/core';

type ReceiptRouteQuery = {
  keyword?: unknown;
  orderNo?: unknown;
  direction?: unknown;
  reverseReason?: unknown;
  page?: unknown;
  pageSize?: unknown;
};

export type ReceiptDirectionFilter = 'ALL' | 'in' | 'reversal';

function readQueryValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

function clampReceiptPage(value: unknown): number {
  return Math.max(1, Number(value) || 1);
}

function clampReceiptPageSize(value: unknown, fallback: number): number {
  return Math.min(200, Math.max(10, Number(value) || fallback));
}

export function useInventoryReceiptQueryState(options: {
  query: ReceiptRouteQuery;
  defaultPageSize?: number;
}) {
  const fallbackPageSize = clampReceiptPageSize(options.defaultPageSize, 50);
  const receiptSearchQuery = ref(readQueryValue(options.query.keyword));
  const receiptOrderFilter = ref(readQueryValue(options.query.orderNo));
  const receiptDirectionFilter = ref<ReceiptDirectionFilter>(
    (readQueryValue(options.query.direction) || 'ALL') as ReceiptDirectionFilter,
  );
  const reverseReasonFilter = ref(readQueryValue(options.query.reverseReason) || 'ALL');
  const receiptPage = ref(clampReceiptPage(options.query.page));
  const receiptPageSize = ref(clampReceiptPageSize(options.query.pageSize, fallbackPageSize));
  const debouncedReceiptOrderFilter = refDebounced(receiptOrderFilter, 300);
  const debouncedReceiptSearchQuery = refDebounced(receiptSearchQuery, 300);

  function syncReceiptFiltersFromRoute(query: ReceiptRouteQuery) {
    receiptSearchQuery.value = readQueryValue(query.keyword);
    receiptOrderFilter.value = readQueryValue(query.orderNo);
    receiptDirectionFilter.value = (readQueryValue(query.direction) || 'ALL') as ReceiptDirectionFilter;
    reverseReasonFilter.value = readQueryValue(query.reverseReason) || 'ALL';
    receiptPage.value = clampReceiptPage(query.page);
    receiptPageSize.value = clampReceiptPageSize(query.pageSize, fallbackPageSize);
  }

  function resetReceiptFilters() {
    receiptSearchQuery.value = '';
    receiptOrderFilter.value = '';
    receiptDirectionFilter.value = 'ALL';
    reverseReasonFilter.value = 'ALL';
    receiptPage.value = 1;
    receiptPageSize.value = 50;
  }

  function buildReceiptFetchParams(orderNo = '') {
    return {
      ...(orderNo ? { orderNo } : {}),
      ...(receiptSearchQuery.value.trim() ? { keyword: receiptSearchQuery.value.trim() } : {}),
      ...(receiptDirectionFilter.value !== 'ALL' ? { direction: receiptDirectionFilter.value } : {}),
      ...(reverseReasonFilter.value !== 'ALL' ? { reverseReason: reverseReasonFilter.value } : {}),
      page: receiptPage.value,
      pageSize: receiptPageSize.value,
    };
  }

  return {
    receiptSearchQuery,
    receiptOrderFilter,
    receiptDirectionFilter,
    reverseReasonFilter,
    receiptPage,
    receiptPageSize,
    debouncedReceiptOrderFilter,
    debouncedReceiptSearchQuery,
    syncReceiptFiltersFromRoute,
    resetReceiptFilters,
    buildReceiptFetchParams,
  };
}
