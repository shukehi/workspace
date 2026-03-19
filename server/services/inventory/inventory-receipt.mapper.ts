type ReceiptLike = Record<string, any>;

interface ReceiptError extends Error {
  code?: string;
}

export function normalizeReceiptDate(value: unknown): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    const error: ReceiptError = new Error('INVALID_RECEIPT_DATE');
    error.code = 'INVALID_RECEIPT_DATE';
    throw error;
  }
  return parsed.toISOString();
}

export function normalizeReceiptQuantity(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    const error: ReceiptError = new Error('INVALID_RECEIPT_QUANTITY');
    error.code = 'INVALID_RECEIPT_QUANTITY';
    throw error;
  }
  return quantity;
}

export function normalizeReverseQuantity(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  return normalizeReceiptQuantity(value);
}

export function resolveOrderedQuantity(rawOrderedQuantity: unknown, rawQuantity: unknown): number {
  const orderedQuantity = Number(rawOrderedQuantity);
  if (Number.isFinite(orderedQuantity) && orderedQuantity > 0) {
    return orderedQuantity;
  }
  const quantity = Number(rawQuantity);
  if (Number.isFinite(quantity) && quantity > 0) {
    return quantity;
  }
  return 0;
}

export function resolveMaterialLookupCandidates(rawMaterialId: unknown): { code: string; numericId: number | null } {
  const normalized = String(rawMaterialId || '').trim();
  if (!normalized) return { code: '', numericId: null };
  const numericId = Number(normalized);
  return {
    code: normalized,
    numericId: Number.isInteger(numericId) && numericId > 0 ? numericId : null,
  };
}

export function toPlainReceipt(receipt: any): ReceiptLike {
  const plain: ReceiptLike = typeof receipt.get === 'function' ? receipt.get({ plain: true }) : { ...receipt };
  return {
    ...plain,
    quantity: Number(plain.quantity || 0),
    receipt_date: plain.receipt_date ? new Date(plain.receipt_date).toISOString() : null,
    created_at: plain.created_at ? new Date(plain.created_at).toISOString() : null,
    updated_at: plain.updated_at ? new Date(plain.updated_at).toISOString() : null,
  };
}

export function computeReversalStats(receipt: ReceiptLike, reversalReceipts: ReceiptLike[]) {
  const originalQuantity = Math.max(Number(receipt.quantity || 0), 0);
  const reversedQuantity = reversalReceipts.reduce(
    (sum, reversal) => sum + Math.abs(Number(reversal.quantity || 0)),
    0,
  );
  return {
    originalQuantity,
    reversedQuantity,
    reversibleQuantity: Math.max(originalQuantity - reversedQuantity, 0),
  };
}

