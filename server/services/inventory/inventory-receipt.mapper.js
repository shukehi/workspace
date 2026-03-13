function normalizeReceiptDate(value) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error('INVALID_RECEIPT_DATE');
    error.code = 'INVALID_RECEIPT_DATE';
    throw error;
  }
  return parsed.toISOString();
}

function normalizeReceiptQuantity(value) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    const error = new Error('INVALID_RECEIPT_QUANTITY');
    error.code = 'INVALID_RECEIPT_QUANTITY';
    throw error;
  }
  return quantity;
}

function normalizeReverseQuantity(value) {
  if (value === undefined || value === null || value === '') return null;
  return normalizeReceiptQuantity(value);
}

function resolveOrderedQuantity(rawOrderedQuantity, rawQuantity) {
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

function resolveMaterialLookupCandidates(rawMaterialId) {
  const normalized = String(rawMaterialId || '').trim();
  if (!normalized) return { code: '', numericId: null };
  const numericId = Number(normalized);
  return {
    code: normalized,
    numericId: Number.isInteger(numericId) && numericId > 0 ? numericId : null,
  };
}

function toPlainReceipt(receipt) {
  const plain = typeof receipt.get === 'function' ? receipt.get({ plain: true }) : { ...receipt };
  return {
    ...plain,
    quantity: Number(plain.quantity || 0),
    receipt_date: plain.receipt_date ? new Date(plain.receipt_date).toISOString() : null,
    created_at: plain.created_at ? new Date(plain.created_at).toISOString() : null,
    updated_at: plain.updated_at ? new Date(plain.updated_at).toISOString() : null,
  };
}

function computeReversalStats(receipt, reversalReceipts) {
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

module.exports = {
  normalizeReceiptDate,
  normalizeReceiptQuantity,
  normalizeReverseQuantity,
  resolveOrderedQuantity,
  resolveMaterialLookupCandidates,
  toPlainReceipt,
  computeReversalStats,
};
