import type { Order } from '@/types/order';
import { resolveProcurementCategoryLabel } from '@/features/procurement/docModel';

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]+/g;
const SPACE_PATTERN = /\s+/g;

function cleanFilenamePart(value: unknown, fallback: string) {
  const normalized = String(value || '')
    .replace(INVALID_FILENAME_CHARS, ' ')
    .replace(SPACE_PATTERN, ' ')
    .trim();
  return normalized || fallback;
}

export function buildPurchaseOrderPdfFilename(order: Pick<Order, 'supplier' | 'category' | 'order_no'> | null | undefined) {
  const supplier = cleanFilenamePart(order?.supplier, '未知供应商');
  const category = cleanFilenamePart(resolveProcurementCategoryLabel(order?.category), '未分类');
  const orderNo = cleanFilenamePart(order?.order_no, 'order');
  return `${supplier} ${category} ${orderNo} 颐家采购订单.pdf`;
}
