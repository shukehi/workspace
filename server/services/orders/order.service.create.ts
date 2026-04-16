import type { OrderAttributes, OrderCreateInput } from '../../models/types';
import AppError from '../../app/errors/AppError';
import ERROR_CODES from '../../app/errors/errorCodes';
import { buildOrderDedupeKey, normalizeMetadata, resolveSourceContractCode } from './order.dedupe';
import { normalizeStatus } from './order.policy';
import { normalizeOrderItemForPersistence, serializeOrder } from './order.mapper';
import { sanitizeManualCreateItems, validateManualCreateOrder } from './order-create.validation';
import { normalizeOrderRemark } from './order.service.helpers';
import type { PlainRecord } from '../../shared/types';

export type CreateOrderContext = {
  normalizedCategory: OrderAttributes['category'];
  metadata: Record<string, any>;
  normalizedStatus: string;
  sourceContractCode: string;
  dedupeKey: string;
  sanitizedItems: any[] | undefined;
  normalizedData: PlainRecord;
};

export function resolveCreateOrderContext(createInput: OrderCreateInput): CreateOrderContext {
  const normalizedCategory = createInput.category || undefined;
  const sourceContractCode = resolveSourceContractCode(createInput);
  const metadata = normalizeMetadata(createInput.metadata, {}, normalizedCategory);
  const normalizedStatus = normalizeStatus(createInput.status, 'draft');
  const sanitizedItems = metadata.order_source === 'manual'
    ? sanitizeManualCreateItems(
        createInput.items as any[] | undefined,
        createInput.category,
        metadata.template_type,
      )
    : (createInput.items as any[] | undefined);
  const normalizedData: PlainRecord = {
    ...createInput,
    category: normalizedCategory,
    source_contract_code: sourceContractCode,
    metadata,
    status: normalizedStatus,
    items: sanitizedItems,
  };
  const dedupeKey = buildOrderDedupeKey(normalizedData);

  return {
    normalizedCategory,
    metadata,
    normalizedStatus,
    sourceContractCode,
    dedupeKey,
    sanitizedItems,
    normalizedData,
  };
}

export function assertCreateOrderInputValid(createInput: OrderCreateInput): void {
  const createIssues = validateManualCreateOrder(createInput);
  if (createIssues.length > 0) {
    throw new AppError({
      code: ERROR_CODES.VALIDATION_ERROR,
      status: 400,
      details: {
        issues: createIssues.map((issue) => ({
          target: 'body',
          field: issue.field,
          message: issue.message,
        })),
      },
    });
  }
}

export function buildCreateOrderValues(context: CreateOrderContext): PlainRecord {
  const { normalizedData, sourceContractCode, dedupeKey, normalizedStatus, metadata } = context;
  return {
    order_no: normalizedData.order_no,
    supplier: normalizedData.supplier,
    source_contract_code: sourceContractCode || null,
    dedupe_key: dedupeKey || null,
    category: normalizedData.category || null,
    status: normalizedStatus,
    remark: normalizeOrderRemark(normalizedData.remark),
    metadata,
    created_at: normalizedData.created_at || new Date().toISOString(),
    delivery_date: normalizedData.delivery_date,
    arrived_at: normalizedData.arrived_at || null,
    arrived_by: normalizedData.arrived_by || null,
    arrived_remark: normalizeOrderRemark(normalizedData.arrived_remark),
    stocked_in_at: normalizedData.stocked_in_at || null,
    stocked_in_by: normalizedData.stocked_in_by || null,
    stocked_in_remark: normalizeOrderRemark(normalizedData.stocked_in_remark),
  };
}

export function buildCreateOrderItems(normalizedData: PlainRecord, orderId: number) {
  if (!normalizedData.items || normalizedData.items.length === 0) return [];
  return normalizedData.items.map((item: PlainRecord) => ({
    ...normalizeOrderItemForPersistence(item),
    id: undefined,
    order_id: orderId,
  }));
}

export function buildCreateOrderFallback(order: { get: (options: { plain: true }) => PlainRecord }, normalizedData: PlainRecord) {
  return serializeOrder({
    ...order.get({ plain: true }),
    items: Array.isArray(normalizedData.items) ? normalizedData.items : [],
  });
}
