import { computed, ref } from 'vue';
import type { Order } from '@/types/order';

type ProcurementStoreLike = {
  loading: boolean;
  purchaseOrders: Order[];
  sortedOrders: Order[];
};

const categories = [
  { id: 'ALL', label: '全部订单' },
  { id: '颜色', label: '颜色配方' },
  { id: '锁芯', label: '锁芯' },
  { id: '锁叉', label: '锁叉' },
  { id: '包装', label: '包装材料' },
  { id: '配件', label: '其他配件' }
];

export function useProcurementPageState(store: ProcurementStoreLike) {
  const activeCategory = ref('ALL');
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

  const categoryOptions = computed(() => {
    return categories.map((category) => {
      const count = category.id === 'ALL'
        ? store.sortedOrders.length
        : store.sortedOrders.filter((order) => order.category === category.id).length;

      return {
        ...category,
        count
      };
    });
  });

  const filteredOrders = computed(() => {
    let list = store.sortedOrders;
    if (activeCategory.value !== 'ALL') {
      list = list.filter((order) => order.category === activeCategory.value);
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
    return activeCategory.value !== 'ALL' || searchQuery.value.trim().length > 0;
  });

  function resetFilters() {
    activeCategory.value = 'ALL';
    searchQuery.value = '';
  }

  function onSelectionChange(rows: Order[]) {
    selectedRows.value = rows;
  }

  function clearSelection() {
    selectedRows.value = [];
  }

  return {
    activeCategory,
    searchQuery,
    selectedRows,
    summaryStats,
    categoryOptions,
    filteredOrders,
    visibleOrderCount,
    tableEmptyText,
    hasActiveFilters,
    resetFilters,
    onSelectionChange,
    clearSelection,
  };
}
