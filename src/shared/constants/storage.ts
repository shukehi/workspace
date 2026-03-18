/**
 * 存储键名与通信信号常量
 */

export const STORAGE_KEYS = {
  // 采购单编辑时的列宽持久化
  COLUMN_WIDTHS: 'po_edit_column_widths_by_category_v1',
} as const;

export const SIGNALS = {
  // 采购单数据刷新的 Storage Event 信号
  PROCUREMENT_REFRESH: 'procurement-orders-refresh-signal',
} as const;
