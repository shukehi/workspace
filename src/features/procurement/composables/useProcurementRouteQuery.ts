import { ref, type Ref } from 'vue';
import type {
  LocationQueryRaw,
  RouteLocationNormalizedLoaded,
} from 'vue-router';
import type { ProcurementOrderQuery } from '@/types/order';

type RouteLike = Pick<RouteLocationNormalizedLoaded, 'query'>;
interface RouterLike {
  replace(to: { query: Record<string, unknown> }): Promise<unknown>;
}

type ProcurementRouteState<
  TStatus extends string,
  TCategory extends string,
  TRisk extends string,
> = {
  activeStatus: Ref<TStatus>;
  activeCategory: Ref<TCategory>;
  activeRiskFilter: Ref<TRisk>;
  activeCreatedDate: Ref<string>;
  searchQuery: Ref<string>;
};

function readQueryValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

function clampInt(value: unknown, fallback: number, min: number, max = Number.POSITIVE_INFINITY): number {
  return Math.min(max, Math.max(min, Number(value) || fallback));
}

export function useProcurementRouteQuery<
  TStatus extends string,
  TCategory extends string,
  TRisk extends string,
>(
  route: RouteLike,
  router: RouterLike,
  state: ProcurementRouteState<TStatus, TCategory, TRisk>,
) {
  const procurementPage = ref(clampInt(route.query.page, 1, 1));
  const procurementPageSize = ref(clampInt(route.query.pageSize, 20, 10, 200));

  function syncSearchQueryFromRoute() {
    const orderNo = readQueryValue(route.query.orderNo);
    if (!orderNo) return;
    if (state.searchQuery.value !== orderNo) {
      state.searchQuery.value = orderNo;
    }
  }

  function syncProcurementFiltersFromRoute() {
    state.activeStatus.value = (readQueryValue(route.query.status) || 'ALL') as TStatus;
    state.activeCategory.value = (readQueryValue(route.query.category) || 'ALL') as TCategory;
    state.activeRiskFilter.value = (readQueryValue(route.query.risk) || 'ALL') as TRisk;
    state.activeCreatedDate.value = readQueryValue(route.query.createdDate);
    state.searchQuery.value = readQueryValue(route.query.search) || readQueryValue(route.query.orderNo);
    procurementPage.value = clampInt(route.query.page, 1, 1);
    procurementPageSize.value = clampInt(route.query.pageSize, 20, 10, 200);
  }

  function updateProcurementRouteQuery() {
    const nextQuery: LocationQueryRaw = { ...route.query };
    const search = state.searchQuery.value.trim();

    if (state.activeStatus.value !== 'ALL') nextQuery.status = state.activeStatus.value;
    else delete nextQuery.status;

    if (state.activeCategory.value !== 'ALL') nextQuery.category = state.activeCategory.value;
    else delete nextQuery.category;

    if (state.activeRiskFilter.value !== 'ALL') nextQuery.risk = state.activeRiskFilter.value;
    else delete nextQuery.risk;

    if (state.activeCreatedDate.value) nextQuery.createdDate = state.activeCreatedDate.value;
    else delete nextQuery.createdDate;

    if (search) nextQuery.search = search;
    else delete nextQuery.search;

    if (procurementPage.value > 1) nextQuery.page = String(procurementPage.value);
    else delete nextQuery.page;

    if (procurementPageSize.value !== 20) nextQuery.pageSize = String(procurementPageSize.value);
    else delete nextQuery.pageSize;

    router.replace({ query: nextQuery }).catch(() => undefined);
  }

  function buildProcurementQuery(): ProcurementOrderQuery {
    const orderNo = readQueryValue(route.query.orderNo);

    return {
      page: procurementPage.value,
      pageSize: procurementPageSize.value,
      ...(state.activeStatus.value !== 'ALL' ? { status: state.activeStatus.value as ProcurementOrderQuery['status'] } : {}),
      ...(state.activeCategory.value !== 'ALL' ? { category: state.activeCategory.value } : {}),
      ...(state.activeRiskFilter.value !== 'ALL' ? { risk: state.activeRiskFilter.value as ProcurementOrderQuery['risk'] } : {}),
      ...(state.activeCreatedDate.value ? { createdDate: state.activeCreatedDate.value } : {}),
      ...(state.searchQuery.value.trim() ? { keyword: state.searchQuery.value.trim() } : {}),
      ...(orderNo ? { orderNo } : {}),
    };
  }

  return {
    procurementPage,
    procurementPageSize,
    syncSearchQueryFromRoute,
    syncProcurementFiltersFromRoute,
    updateProcurementRouteQuery,
    buildProcurementQuery,
  };
}
