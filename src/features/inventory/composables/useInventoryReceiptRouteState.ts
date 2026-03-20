import { ref, watch, type Ref } from 'vue';
import { refDebounced } from '@vueuse/core';
import type {
  LocationQueryRaw,
  RouteLocationNormalizedLoaded,
} from 'vue-router';

type RouteLike = Pick<RouteLocationNormalizedLoaded, 'query'>;
interface RouterLike {
  replace(to: { query: Record<string, unknown> }): Promise<unknown>;
}
type ReceiptDirectionFilter = 'ALL' | 'in' | 'reversal';

type InventoryReceiptRouteStateOptions = {
  activeTab: Ref<string>;
  defaultPageSize?: number;
  loadReceipts: (orderNo?: string) => Promise<void> | void;
};

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

export function useInventoryReceiptRouteState(
  route: RouteLike,
  router: RouterLike,
  options: InventoryReceiptRouteStateOptions,
) {
  const fallbackPageSize = clampReceiptPageSize(options.defaultPageSize, 50);
  const receiptSearchQuery = ref(readQueryValue(route.query.keyword));
  const receiptOrderFilter = ref(readQueryValue(route.query.orderNo));
  const receiptDirectionFilter = ref<ReceiptDirectionFilter>(
    (readQueryValue(route.query.direction) || 'ALL') as ReceiptDirectionFilter,
  );
  const reverseReasonFilter = ref(readQueryValue(route.query.reverseReason) || 'ALL');
  const receiptPage = ref(clampReceiptPage(route.query.page));
  const receiptPageSize = ref(clampReceiptPageSize(route.query.pageSize, fallbackPageSize));
  const debouncedReceiptOrderFilter = refDebounced(receiptOrderFilter, 300);
  const debouncedReceiptSearchQuery = refDebounced(receiptSearchQuery, 300);

  function syncReceiptFiltersFromRoute() {
    receiptSearchQuery.value = readQueryValue(route.query.keyword);
    receiptOrderFilter.value = readQueryValue(route.query.orderNo);
    receiptDirectionFilter.value = (readQueryValue(route.query.direction) || 'ALL') as ReceiptDirectionFilter;
    reverseReasonFilter.value = readQueryValue(route.query.reverseReason) || 'ALL';
    receiptPage.value = clampReceiptPage(route.query.page);
    receiptPageSize.value = clampReceiptPageSize(route.query.pageSize, fallbackPageSize);
  }

  function updateInventoryReceiptRouteQuery(
    orderNo: string,
    keyword: string,
    direction: string,
    reverseReason: string,
    page: number,
    pageSize: number,
  ) {
    const nextQuery: LocationQueryRaw = { ...route.query };
    const trimmedOrderNo = orderNo.trim();
    const trimmedKeyword = keyword.trim();

    if (trimmedOrderNo) nextQuery.orderNo = trimmedOrderNo;
    else delete nextQuery.orderNo;

    if (trimmedKeyword) nextQuery.keyword = trimmedKeyword;
    else delete nextQuery.keyword;

    if (direction && direction !== 'ALL') nextQuery.direction = direction;
    else delete nextQuery.direction;

    if (reverseReason && reverseReason !== 'ALL') nextQuery.reverseReason = reverseReason;
    else delete nextQuery.reverseReason;

    if (page > 1) nextQuery.page = String(page);
    else delete nextQuery.page;

    if (pageSize !== 50) nextQuery.pageSize = String(pageSize);
    else delete nextQuery.pageSize;

    router.replace({ query: nextQuery }).catch(() => undefined);
  }

  function clearReceiptRouteFilters() {
    receiptSearchQuery.value = '';
    receiptOrderFilter.value = '';
    receiptDirectionFilter.value = 'ALL';
    reverseReasonFilter.value = 'ALL';
    receiptPage.value = 1;
    receiptPageSize.value = 50;
    updateInventoryReceiptRouteQuery('', '', 'ALL', 'ALL', 1, 50);
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

  watch(
    () => [
      route.query.orderNo,
      route.query.keyword,
      route.query.direction,
      route.query.reverseReason,
      route.query.page,
      route.query.pageSize,
    ],
    () => {
      syncReceiptFiltersFromRoute();
      void options.loadReceipts(readQueryValue(route.query.orderNo));
    },
  );

  watch(
    [
      debouncedReceiptOrderFilter,
      debouncedReceiptSearchQuery,
      receiptDirectionFilter,
      reverseReasonFilter,
    ],
    ([orderNo, keyword, direction, reverseReason]) => {
      receiptPage.value = 1;
      updateInventoryReceiptRouteQuery(orderNo, keyword, direction, reverseReason, 1, receiptPageSize.value);
    },
  );

  watch(receiptPage, (page) => {
    updateInventoryReceiptRouteQuery(
      receiptOrderFilter.value,
      receiptSearchQuery.value,
      receiptDirectionFilter.value,
      reverseReasonFilter.value,
      page,
      receiptPageSize.value,
    );
  });

  watch(receiptPageSize, (pageSize) => {
    receiptPage.value = 1;
    updateInventoryReceiptRouteQuery(
      receiptOrderFilter.value,
      receiptSearchQuery.value,
      receiptDirectionFilter.value,
      reverseReasonFilter.value,
      1,
      pageSize,
    );
  });

  watch(
    () => route.query.orderNo,
    (newOrderNo) => {
      if (newOrderNo) {
        options.activeTab.value = 'receipts';
      }
    },
  );

  watch(
    () => route.query.tab,
    (tab) => {
      if (tab === 'inventory' || tab === 'receipts') {
        options.activeTab.value = String(tab);
      }
    },
  );

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
    updateInventoryReceiptRouteQuery,
    clearReceiptRouteFilters,
    buildReceiptFetchParams,
  };
}
