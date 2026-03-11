import { computed, ref } from 'vue';
import type { Order } from '@/types/order';
import {
  PROCUREMENT_CATEGORY_ORDER,
  resolveProcurementCategoryFilterLabel,
  normalizePrintCategory,
  type PrintCategory
} from '@/features/procurement/docModel';
import { matchesOrderRiskFilter, resolveOrderRisk, type OrderRiskFilter } from '@/features/procurement/orderRisk';

type ProcurementStoreLike = {
  loading: boolean;
  purchaseOrders: Order[];
  sortedOrders: Order[];
};

type StatusFilter = 'ALL' | Order['status'];

const STATUS_OPTIONS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'ALL', label: '全部订单' },
  { id: 'draft', label: '草稿' },
  { id: 'submitted', label: '已提交' },
  { id: 'processing', label: '处理中' },
  { id: 'completed', label: '已完成' },
  { id: 'cancelled', label: '已取消' },
];

export function useProcurementPageState(store: ProcurementStoreLike) {
  const activeStatus = ref<StatusFilter>('ALL');
  const activeCategory = ref<'ALL' | PrintCategory>('ALL');
  const activeRiskFilter = ref<OrderRiskFilter>('ALL');
  const searchQuery = ref('');
  const selectedRows = ref<Order[]>([]);

  const summaryStats = computed(() => {
    const totalAmount = store.purchaseOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const pendingCount = store.purchaseOrders.filter((order) => ['draft', 'submitted', 'processing'].includes(order.status)).length;
    const completedCount = store.purchaseOrders.filter((order) => order.status === 'completed').length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = store.purchaseOrders.filter((order) => order.created_at.startsWith(today)).length;

    return { totalAmount, pendingCount, completedCount, todayCount };
  });

  const statusOptions = computed(() => {
    return STATUS_OPTIONS.map((status) => ({
      ...status,
      count: status.id === 'ALL'
        ? store.sortedOrders.length
        : store.sortedOrders.filter((order) => order.status === status.id).length
    }));
  });

  const categoryOptions = computed(() => {
    return [
      {
        id: 'ALL' as const,
        label: '全部类别',
        count: store.sortedOrders.length
      },
      ...PROCUREMENT_CATEGORY_ORDER.map((category) => ({
        id: category,
        label: resolveProcurementCategoryFilterLabel(category),
        count: store.sortedOrders.filter((order) => normalizePrintCategory(order.category) === category).length
      }))
    ].map((category) => {
      const count = category.id === 'ALL'
        ? store.sortedOrders.length
        : store.sortedOrders.filter((order) => normalizePrintCategory(order.category) === category.id).length;

      return {
        ...category,
        count
      };
    });
  });

  const riskOptions = computed(() => {
    const allOrders = store.sortedOrders;
    const riskOrders = allOrders.filter((order) => resolveOrderRisk(order).level !== null);
    const manualOrders = allOrders.filter((order) => resolveOrderRisk(order).level === 'high');

    return [
      { id: 'ALL' as const, label: '全部', count: allOrders.length },
      { id: 'RISK' as const, label: '风险订单', count: riskOrders.length },
      { id: 'MANUAL' as const, label: '待人工处理', count: manualOrders.length },
    ];
  });

  const filteredOrders = computed(() => {
    let list = store.sortedOrders;
    if (activeStatus.value !== 'ALL') {
      list = list.filter((order) => order.status === activeStatus.value);
    }
    if (activeCategory.value !== 'ALL') {
      list = list.filter((order) => normalizePrintCategory(order.category) === activeCategory.value);
    }
    if (activeRiskFilter.value !== 'ALL') {
      list = list.filter((order) => matchesOrderRiskFilter(order, activeRiskFilter.value));
    }
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      list = list.filter((order) =>
        order.order_no.toLowerCase().includes(query)
        || order.supplier.toLowerCase().includes(query)
        || order.items.some((item) => (item.name + item.model).toLowerCase().includes(query))
      );
    }
    return list;
  });

  const visibleOrderCount = computed(() => filteredOrders.value.length);

  const tableEmptyText = computed(() => {
    if (store.loading) return '加载中...';
    if (searchQuery.value.trim()) return '没有匹配到订单';
    return '暂无采购订单数据';
  });

  const hasActiveFilters = computed(() => {
    return activeStatus.value !== 'ALL'
      || activeCategory.value !== 'ALL'
      || activeRiskFilter.value !== 'ALL'
      || searchQuery.value.trim().length > 0;
  });

  function resetFilters() {
    activeStatus.value = 'ALL';
    activeCategory.value = 'ALL';
    activeRiskFilter.value = 'ALL';
    searchQuery.value = '';
  }

  function onSelectionChange(rows: Order[]) {
    selectedRows.value = rows;
  }

  function clearSelection() {
    selectedRows.value = [];
  }

  return {
    activeStatus,
    activeCategory,
    activeRiskFilter,
    searchQuery,
    selectedRows,
    summaryStats,
    statusOptions,
    categoryOptions,
    riskOptions,
    filteredOrders,
    visibleOrderCount,
    tableEmptyText,
    hasActiveFilters,
    resetFilters,
    onSelectionChange,
    clearSelection,
  };
}
