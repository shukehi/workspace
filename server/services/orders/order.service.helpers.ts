import type { PlainRecord } from '../../shared/types';

export function normalizeOrderRemark(remark: unknown): string {
  if (remark === undefined || remark === null) return '';
  return String(remark);
}

export function normalizeNullableDate(value: unknown, fallback: Date | null | undefined): Date | null | undefined {
  if (value === undefined) return fallback;
  if (value === null || value === '') return null;
  if (value instanceof Date) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function normalizeBulkOrderIds(idsInput: unknown): number[] {
  if (!Array.isArray(idsInput)) return [];

  const seen = new Set<number>();
  const ids: number[] = [];
  for (const value of idsInput) {
    const numeric = Number(String(value || '').trim());
    if (!Number.isInteger(numeric) || numeric <= 0 || seen.has(numeric)) continue;
    seen.add(numeric);
    ids.push(numeric);
  }

  return ids;
}

export function formatManualOrderDateToken(value: unknown): string {
  const parsed = value instanceof Date ? value : new Date(String(value || ''));
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

export function isGeneratedManualOrderNo(value: unknown): boolean {
  return /^PM-\d{6}-\d{4}$/.test(String(value || '').trim());
}

export function buildManualOrderNo(dateToken: string, sequence: number): string {
  return `PM-${dateToken}-${String(sequence).padStart(4, '0')}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildAutoOrderPrefix(sourceContractCode: string) {
  return `PO-${String(sourceContractCode || '').trim()}-`;
}

export function buildAutoOrderNo(sourceContractCode: string, sequence: number) {
  return `${buildAutoOrderPrefix(sourceContractCode)}${String(sequence).padStart(2, '0')}`;
}

export function isGeneratedAutoOrderNo(value: unknown, sourceContractCode: string): boolean {
  const normalizedValue = String(value || '').trim();
  const normalizedContractCode = String(sourceContractCode || '').trim();
  if (!normalizedValue || !normalizedContractCode) return false;

  const pattern = new RegExp(`^${escapeRegExp(buildAutoOrderPrefix(normalizedContractCode))}\\d+$`);
  return pattern.test(normalizedValue);
}

export function parseAutoOrderSequence(orderNo: string, sourceContractCode: string) {
  const normalizedOrderNo = String(orderNo || '').trim();
  const prefix = buildAutoOrderPrefix(sourceContractCode);
  if (!normalizedOrderNo.startsWith(prefix)) return 0;

  const sequence = Number(normalizedOrderNo.slice(prefix.length));
  return Number.isInteger(sequence) && sequence > 0 ? sequence : 0;
}

export function isUniqueOrderNoError(error: unknown): boolean {
  const record = (error || {}) as PlainRecord;
  const message = String(record.message || '');
  return record.name === 'SequelizeUniqueConstraintError'
    || message.includes('UNIQUE constraint failed: orders.order_no')
    || message.includes('UNIQUE constraint failed')
    || message.includes('idx_orders_order_no_unique');
}

export function serializeBulkArriveError(error: unknown): { code: string; message: string } {
  const record = (error || {}) as PlainRecord;
  const code = typeof record.code === 'string'
    ? record.code
    : (String(record.message || '').trim() === 'Order not found' ? 'ORDER_NOT_FOUND' : 'UNKNOWN_ERROR');

  return {
    code,
    message: typeof record.message === 'string' && record.message.trim()
      ? record.message
      : code,
  };
}
