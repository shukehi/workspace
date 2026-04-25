import { initDB, Order, OrderItem, sequelize } from '../models';
import {
  readLockForkAuditOptions,
  shouldMuteLockForkAuditBootstrapLogs,
  type LockForkAuditOptions,
} from '../services/orders/lock-fork-order-audit';
import { sortProcurementItems } from '../../src/features/procurement/itemSort';

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

async function initAuditDatabase(options: LockForkAuditOptions) {
  if (!shouldMuteLockForkAuditBootstrapLogs(options)) {
    await initDB();
    return;
  }

  const originalLog = console.log;
  console.log = () => undefined;
  try {
    await initDB();
  } finally {
    console.log = originalLog;
  }
}

async function main() {
  const options = readLockForkAuditOptions(process.argv.slice(2));
  await initAuditDatabase(options);

  try {
    const records = await Order.findAll({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('Order.category')), 'LIKE', '%锁叉%'),
      include: [{ model: OrderItem, as: 'items' }],
      order: [
        ['id', 'ASC'],
        [{ model: OrderItem, as: 'items' }, 'id', 'ASC'],
      ],
    });

    const orders = records.map((record) => toPlain(record) as unknown as PlainOrder);
    const audited = orders.map((order) => {
      const category = readText(order.category);
      const status = readText(order.status).toLowerCase();
      const items = Array.isArray(order.items) ? order.items.map((item) => ({ ...item })) : [];
      const sorted = sortProcurementItems(category, items);
      const before = summarize(items);
      const after = summarize(sorted);
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      return {
        orderNo: order.order_no,
        orderId: order.id,
        supplier: readText(order.supplier),
        category,
        status,
        editable: isEditableStatus(status),
        changed,
        before,
        after,
      };
    });

    const misordered = audited.filter((entry) => entry.changed);
    const aligned = audited.filter((entry) => !entry.changed);

    const summary = {
      totalOrders: audited.length,
      misorderedCount: misordered.length,
      alignedCount: aligned.length,
      editableMisorderedCount: misordered.filter((entry) => entry.editable).length,
      lockedMisorderedCount: misordered.filter((entry) => !entry.editable).length,
      misorderedByStatus: misordered.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.status] = (acc[entry.status] || 0) + 1;
        return acc;
      }, {}),
    };

    if (options.json) {
      console.log(JSON.stringify({
        summary,
        misordered,
        aligned: options.includeAligned ? aligned : undefined,
      }, null, 2));
      return;
    }

    console.log('Lock-fork order sequence audit');
    console.log(JSON.stringify(summary, null, 2));
    console.log('---');

    if (misordered.length === 0) {
      console.log('No misordered lock-fork orders found.');
      return;
    }

    misordered.forEach((entry) => {
      console.log(`${entry.orderNo} | status=${entry.status} | editable=${entry.editable ? 'yes' : 'no'} | supplier=${entry.supplier}`);
      console.log(`  before: ${entry.before.map((item) => `${item.type}|${item.remark}`).join(' -> ')}`);
      console.log(`  after : ${entry.after.map((item) => `${item.type}|${item.remark}`).join(' -> ')}`);
    });

    if (options.includeAligned) {
      console.log('--- aligned ---');
      aligned.forEach((entry) => {
        console.log(`${entry.orderNo} | status=${entry.status} | supplier=${entry.supplier}`);
      });
    }
  } finally {
    await sequelize.close();
  }
}

void main().catch((error) => {
  console.error('[audit_lock_fork_order_sequence] failed:', error);
  void sequelize.close().catch(() => undefined).finally(() => {
    process.exitCode = 1;
  });
});
