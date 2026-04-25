import { initDB, InventoryReceipt, Order, OrderItem, sequelize } from '../models';
import orderService from '../services/orders/order.service';
import { sortProcurementItems } from '../../src/features/procurement/itemSort';

type ScriptOptions = {
  orderNo: string;
  apply: boolean;
  allowArrivedWithoutReceipts: boolean;
};

type PlainItem = Record<string, any>;

type PlainOrder = {
  id: number;
  order_no: string;
  category?: string | null;
  status?: string | null;
  supplier?: string | null;
  remark?: string | null;
  delivery_date?: string | null;
  arrived_at?: string | null;
  arrived_by?: string | null;
  arrived_remark?: string | null;
  stocked_in_at?: string | null;
  stocked_in_by?: string | null;
  stocked_in_remark?: string | null;
  items?: PlainItem[];
};

function readText(value: unknown) {
  return value == null ? '' : String(value).trim();
}

function readOptions(argv: string[]): ScriptOptions {
  const options: ScriptOptions = {
    orderNo: '',
    apply: false,
    allowArrivedWithoutReceipts: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      options.apply = true;
      continue;
    }
    if (token === '--allow-arrived-without-receipts') {
      options.allowArrivedWithoutReceipts = true;
      continue;
    }
    if (token === '--order' && argv[index + 1]) {
      options.orderNo = readText(argv[index + 1]);
      index += 1;
      continue;
    }
    if (token.startsWith('--order=')) {
      options.orderNo = readText(token.slice('--order='.length));
      continue;
    }
    if (!options.orderNo && !token.startsWith('--')) {
      options.orderNo = readText(token);
    }
  }

  return options;
}

function toPlain<T>(value: T): T {
  if (value && typeof (value as any).get === 'function') {
    return (value as any).get({ plain: true });
  }
  return value;
}

function summarize(items: PlainItem[]) {
  return items.map((item, index) => ({
    row: index + 1,
    type: readText(item.type || item.name),
    remark: readText(item.remark),
    spec: readText(item.spec || item.model),
    quantity: Number(item.quantity || 0),
  }));
}

function isEditableStatus(status: string) {
  return status === 'draft' || status === 'submitted' || status === 'processing';
}

async function canRepairLockedArrivedOrder(order: PlainOrder, options: ScriptOptions) {
  const status = readText(order.status).toLowerCase();
  if (status !== 'arrived' || !options.allowArrivedWithoutReceipts) return false;
  if (readText(order.stocked_in_at)) {
    throw new Error(`Order ${order.order_no} already has stocked_in_at and cannot use arrived-without-receipts repair`);
  }

  const receiptCount = await InventoryReceipt.count({ where: { order_id: order.id } });
  if (receiptCount > 0) {
    throw new Error(`Order ${order.order_no} has ${receiptCount} inventory receipts and cannot use arrived-without-receipts repair`);
  }

  return true;
}

async function applyRepair(order: PlainOrder, sorted: PlainItem[], options: ScriptOptions) {
  const status = readText(order.status).toLowerCase();
  if (isEditableStatus(status)) {
    await orderService.updateOrder(order.id, { items: sorted });
    return 'editable';
  }

  const allowLockedRepair = await canRepairLockedArrivedOrder(order, options);
  if (!allowLockedRepair) {
    throw new Error(`Order ${order.order_no} is not editable (status=${status || 'empty'})`);
  }

  await orderService.updateOrder(order.id, { status: 'cancelled' });
  await orderService.updateOrder(order.id, { items: sorted });
  await orderService.updateOrder(order.id, {
    status: 'arrived',
    remark: order.remark || '',
    delivery_date: order.delivery_date || null,
    arrived_at: order.arrived_at || null,
    arrived_by: order.arrived_by || null,
    arrived_remark: order.arrived_remark || '',
    stocked_in_at: order.stocked_in_at || null,
    stocked_in_by: order.stocked_in_by || null,
    stocked_in_remark: order.stocked_in_remark || '',
  });
  return 'arrived_without_receipts';
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  if (!options.orderNo) {
    throw new Error('Usage: tsx server/scripts/reorder_lock_fork_order.ts --order <PO-...> [--apply] [--allow-arrived-without-receipts]');
  }

  await initDB();

  try {
    const orderRecord = await Order.findOne({
      where: { order_no: options.orderNo },
      include: [{ model: OrderItem, as: 'items' }],
    });

    if (!orderRecord) {
      throw new Error(`Order not found: ${options.orderNo}`);
    }

    const order = toPlain(orderRecord) as unknown as PlainOrder;
    const category = readText(order.category);
    const status = readText(order.status).toLowerCase();
    const items = Array.isArray(order.items) ? order.items.map((item) => ({ ...item })) : [];

    if (!category.includes('锁叉') && category.toLowerCase() !== 'lock') {
      throw new Error(`Order ${options.orderNo} is not a lock-fork procurement order (category=${category || 'empty'})`);
    }

    const sorted = sortProcurementItems(category, items);
    const before = summarize(items);
    const after = summarize(sorted);
    const changed = JSON.stringify(before) !== JSON.stringify(after);

    console.log(JSON.stringify({
      orderNo: order.order_no,
      orderId: order.id,
      category,
      supplier: readText(order.supplier),
      status,
      changed,
      before,
      after,
      applyMode: isEditableStatus(status)
        ? 'editable'
        : options.allowArrivedWithoutReceipts && status === 'arrived'
          ? 'arrived_without_receipts_if_safe'
          : 'blocked',
      applied: false,
    }, null, 2));

    if (!options.apply || !changed) {
      return;
    }

    const repairMode = await applyRepair(order, sorted, options);
    const updated = await orderService.getOrderById(order.id);
    const updatedItems = Array.isArray(updated?.items) ? updated.items : [];
    const updatedSummary = summarize(updatedItems);

    console.log(JSON.stringify({
      orderNo: order.order_no,
      orderId: order.id,
      applied: true,
      repairMode,
      statusAfter: readText(updated?.status).toLowerCase(),
      afterPersisted: updatedSummary,
    }, null, 2));
  } finally {
    await sequelize.close();
  }
}

void main().catch((error) => {
  console.error('[reorder_lock_fork_order] failed:', error);
  void sequelize.close().catch(() => undefined).finally(() => {
    process.exitCode = 1;
  });
});
