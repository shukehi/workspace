export interface DashboardOrderSummary {
  status?: string | null;
}

export interface DashboardInventorySummary {
  code?: string | null;
  name?: string | null;
  stock_quantity?: number | string | null;
  min_stock?: number | string | null;
  price?: number | string | null;
}

export interface DashboardStat {
  label: string;
  value: string;
  desc: string;
  tone: string;
}

export interface DashboardActivityItem {
  title: string;
  desc: string;
}

const DEFAULT_CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 2,
});

function toFiniteNumber(value: unknown): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function calculateInventoryValue(inventory: DashboardInventorySummary[]): number {
  return inventory.reduce((total, item) => {
    const quantity = toFiniteNumber(item.stock_quantity);
    const unitPrice = toFiniteNumber(item.price);
    return total + quantity * unitPrice;
  }, 0);
}

export function countActiveOrders(orders: DashboardOrderSummary[]): number {
  return orders.filter((order) => order.status !== 'completed' && order.status !== 'cancelled').length;
}

export function buildDashboardStats(params: {
  orders: DashboardOrderSummary[];
  inventory: DashboardInventorySummary[];
  formulasCount: number;
  currencyFormatter?: Intl.NumberFormat;
}): DashboardStat[] {
  const currencyFormatter = params.currencyFormatter || DEFAULT_CURRENCY_FORMATTER;
  const activeOrders = countActiveOrders(params.orders);
  const inventoryValue = calculateInventoryValue(params.inventory);

  return [
    {
      label: '待处理订单',
      value: activeOrders.toString(),
      desc: '等待处理',
      tone: 'bg-accent',
    },
    {
      label: '库存总值',
      value: currencyFormatter.format(inventoryValue),
      desc: '基于物料单价和当前库存的真实估值',
      tone: 'bg-secondary',
    },
    {
      label: '活跃配方',
      value: params.formulasCount.toString(),
      desc: '可用颜色配方数',
      tone: 'bg-muted',
    },
  ];
}

export function buildDashboardActivityItems(params: {
  orders: DashboardOrderSummary[];
  inventory: DashboardInventorySummary[];
  formulasCount: number;
}): DashboardActivityItem[] {
  const lowStockItems = params.inventory
    .filter((item) => {
      const minStock = toFiniteNumber(item.min_stock);
      return minStock > 0 && toFiniteNumber(item.stock_quantity) <= minStock;
    })
    .slice(0, 2);

  const items: DashboardActivityItem[] = lowStockItems.map((item) => ({
    title: `低库存：${item.code || item.name || '未命名物料'}`,
    desc: `当前库存 ${toFiniteNumber(item.stock_quantity)}，低于或等于安全库存 ${toFiniteNumber(item.min_stock)}。`,
  }));

  const activeOrders = countActiveOrders(params.orders);
  if (activeOrders > 0) {
    items.push({
      title: `待处理订单：${activeOrders}`,
      desc: '仍有订单处于非完成/非取消状态，请在采购工作台跟进。',
    });
  }

  items.push({
    title: `可用配方：${params.formulasCount}`,
    desc: '配方数量来自当前配置中心数据。',
  });

  // Activity feed intentionally shows the top three actionable items; formulas
  // can be truncated when low-stock and active-order alerts already fill the feed.
  return items.slice(0, 3);
}
