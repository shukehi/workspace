import { watch, type Ref } from 'vue';
import type {
  LocationQueryRaw,
  Router,
  RouteLocationNormalizedLoaded,
  RouteLocationRaw,
} from 'vue-router';
import { useInventoryReceiptQueryState } from '@/features/inventory/composables/useInventoryReceiptQueryState';

type RouteLike = Pick<RouteLocationNormalizedLoaded, 'query'>;
type RouterLike = Pick<Router, 'replace'>;

type InventoryReceiptRouteStateOptions = {
  activeTab: Ref<string>;
  defaultPageSize?: number;
  loadReceipts: (orderNo?: string) => Promise<void> | void;
};

function readQueryValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

export function useInventoryReceiptRouteState(
  route: RouteLike,
  router: RouterLike,
  options: InventoryReceiptRouteStateOptions,
) {
  const queryState = useInventoryReceiptQueryState({
    query: route.query,
    defaultPageSize: options.defaultPageSize,
  });
  const {
    receiptSearchQuery,
    receiptOrderFilter,
    receiptDirectionFilter,
    reverseReasonFilter,
    receiptPage,
    receiptPageSize,
    debouncedReceiptOrderFilter,
    debouncedReceiptSearchQuery,
    syncReceiptFiltersFromRoute: syncReceiptQueryStateFromRoute,
    resetReceiptFilters,
    buildReceiptFetchParams,
  } = queryState;

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

    router.replace({ query: nextQuery } as RouteLocationRaw).catch(() => undefined);
  }

  function syncReceiptFiltersFromRoute() {
    syncReceiptQueryStateFromRoute(route.query);
  }

  function clearReceiptRouteFilters() {
    resetReceiptFilters();
    updateInventoryReceiptRouteQuery('', '', 'ALL', 'ALL', 1, 50);
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
      syncReceiptQueryStateFromRoute(route.query);
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
      if (tab === 'inventory' || tab === 'receipts' || tab === 'outbounds' || tab === 'locations') {
        options.activeTab.value = String(tab);
      }
    },
  );

  return {
    ...queryState,
    syncReceiptFiltersFromRoute,
    updateInventoryReceiptRouteQuery,
    clearReceiptRouteFilters,
  };
}
