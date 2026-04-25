export type LockForkRepairPreviewMode = 'editable' | 'arrived_without_receipts_if_safe' | 'blocked';
export type LockForkRepairMode = 'editable' | 'arrived_without_receipts';

export function normalizeLockForkRepairStatus(status: unknown) {
  return status == null ? '' : String(status).trim().toLowerCase();
}

export function isEditableLockForkRepairStatus(status: unknown) {
  const normalized = normalizeLockForkRepairStatus(status);
  return normalized === 'draft' || normalized === 'submitted' || normalized === 'processing';
}

export function resolveLockForkRepairPreviewMode(options: {
  status: unknown;
  allowArrivedWithoutReceipts: boolean;
}): LockForkRepairPreviewMode {
  if (isEditableLockForkRepairStatus(options.status)) return 'editable';
  if (options.allowArrivedWithoutReceipts && normalizeLockForkRepairStatus(options.status) === 'arrived') {
    return 'arrived_without_receipts_if_safe';
  }
  return 'blocked';
}

export function assertCanRepairArrivedWithoutReceipts(options: {
  orderNo: string;
  status: unknown;
  stockedInAt?: unknown;
  receiptCount: number;
  allowArrivedWithoutReceipts: boolean;
}) {
  const status = normalizeLockForkRepairStatus(options.status);
  if (status !== 'arrived' || !options.allowArrivedWithoutReceipts) {
    throw new Error(`Order ${options.orderNo} is not eligible for arrived-without-receipts repair (status=${status || 'empty'})`);
  }

  const stockedInAt = options.stockedInAt == null ? '' : String(options.stockedInAt).trim();
  if (stockedInAt) {
    throw new Error(`Order ${options.orderNo} already has stocked_in_at and cannot use arrived-without-receipts repair`);
  }

  if (options.receiptCount > 0) {
    throw new Error(`Order ${options.orderNo} has ${options.receiptCount} inventory receipts and cannot use arrived-without-receipts repair`);
  }

  return true;
}
