import { initDB, Order, OrderItem, sequelize } from '../models';
import orderService from '../services/orders/order.service';
import { sortProcurementItems } from '../../src/features/procurement/itemSort';

type ScriptOptions = {
  orderNo: string;
  apply: boolean;
};

type PlainItem = Record<string, any>;

type PlainOrder = {
  id: number;
  order_no: string;
  category?: string | null;
  status?: string | null;
  supplier?: string | null;
  items?: PlainItem[];
};

function readText(value: unknown) {
  return value == null ? '' : String(value).trim();
}

function readOptions(argv: string[]): ScriptOptions {
  const options: ScriptOptions = {
    orderNo: '',
    apply: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      options.apply = true;
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

async function main() {
  const options = readOptions(process.argv.slice(2));
  if (!options.orderNo) {
    throw new Error('Usage: tsx server/scripts/reorder_lock_fork_order.ts --order <PO-...> [--apply]');
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

    if (!isEditableStatus(status)) {
      throw new Error(`Order ${options.orderNo} is not editable (status=${status || 'empty'})`);
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
      applied: false,
    }, null, 2));

    if (!options.apply || !changed) {
      return;
    }

    await orderService.updateOrder(order.id, {
      items: sorted,
    });

    const updated = await orderService.getOrderById(order.id);
    const updatedItems = Array.isArray(updated?.items) ? updated.items : [];
    const updatedSummary = summarize(updatedItems);

    console.log(JSON.stringify({
      orderNo: order.order_no,
      orderId: order.id,
      applied: true,
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
