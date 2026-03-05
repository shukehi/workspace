import type { Order } from '@/types/order';

type PrintMode = 'signature' | 'compact';

function toPrintDate(value?: string) {
  if (!value) return '';
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

export function cloneOrderDraft(order: Order): Order {
  return JSON.parse(JSON.stringify(order)) as Order;
}

export function normalizeOrderDraft(order: Order): Order {
  const draft = cloneOrderDraft(order);
  if (!draft.metadata) draft.metadata = {};

  draft.items = (draft.items || []).map((item) => ({
    ...item,
    spec: item.spec || item.model || '-',
    mb: item.mb || item.orientation || '-'
  }));

  return draft;
}

export function buildPrintPayloadFromOrder(order: Order) {
  return {
    customerName: order.metadata?.customer_name || order.supplier,
    code: order.order_no,
    orderDate: toPrintDate(order.created_at),
    deliveryDate: toPrintDate(order.delivery_date),
    printColumnWidths: order.metadata?.printColumnWidths,
    list: order.items || []
  };
}

export function buildPdfRequestPayload(order: Order, printMode: PrintMode) {
  return {
    poNumber: order.order_no,
    category: order.category || '',
    printMode,
    order: buildPrintPayloadFromOrder(order)
  };
}

