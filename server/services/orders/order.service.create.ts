import type { OrderAttributes, OrderCreateInput, OrderCreationAttributes } from '../../models/types';
import AppError from '../../app/errors/AppError';
import ERROR_CODES from '../../app/errors/errorCodes';
import { buildOrderDedupeKey, normalizeMetadata, resolveSourceContractCode } from './order.dedupe';
import { normalizeStatus } from './order.policy';
import { normalizeOrderItemForPersistence, serializeOrder } from './order.mapper';
import { sanitizeManualCreateItems, validateManualCreateOrder } from './order-create.validation';
import { normalizeOrderRemark } from './order.service.helpers';
import { DuplicateOrderError } from './order.errors';
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

export function buildCreateOrderValues(context: CreateOrderContext): OrderCreationAttributes {
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


export async function createOrderLifecycle(
  data: OrderCreateInput,
  deps: {
    transactionFactory: () => Promise<any>;
    allocateNextManualOrderNo: (createdAt: unknown, transaction?: any) => Promise<string>;
    allocateNextAutoOrderNo: (sourceContractCode: string, transaction?: any) => Promise<string>;
    shouldAutoAssignManualOrderNo: boolean;
    shouldAutoAssignAutoOrderNo: boolean;
    requestedSourceContractCode: string;
    assertUniqueOrderNo: (orderNo: unknown, excludeId?: number | string, transaction?: any) => Promise<void>;
    findDuplicateAutoOrder: (data: PlainRecord, transaction: any) => Promise<PlainRecord | null>;
    createOrder: (values: OrderCreationAttributes, transaction?: any) => Promise<{ id: number; get: (options: { plain: true }) => PlainRecord }>;
    bulkCreateOrderItems: (items: PlainRecord[], transaction?: any) => Promise<unknown>;
    reserveIdempotencyKey: (args: { sourceContractCode?: string; dedupeKey?: string; orderId?: number }, transaction: any) => Promise<unknown>;
    getOrderById: (id: number | string) => Promise<PlainRecord | null>;
    isUniqueOrderNoError: (error: unknown) => boolean;
  },
): Promise<PlainRecord> {
  let lastAttemptedOrderNo = String(data.order_no || '').trim();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const transaction = await deps.transactionFactory();
    try {
      const createInput = deps.shouldAutoAssignManualOrderNo
        ? { ...data, order_no: await deps.allocateNextManualOrderNo(data.created_at, transaction) }
        : deps.shouldAutoAssignAutoOrderNo
          ? { ...data, order_no: await deps.allocateNextAutoOrderNo(deps.requestedSourceContractCode, transaction) }
          : data;
      lastAttemptedOrderNo = String(createInput.order_no || '').trim() || lastAttemptedOrderNo;
      assertCreateOrderInputValid(createInput);
      const context = resolveCreateOrderContext(createInput);
      const {
        sourceContractCode,
        normalizedData,
        dedupeKey,
      } = context;
      const duplicate = await deps.findDuplicateAutoOrder(normalizedData, transaction);
      if (duplicate) {
        throw new DuplicateOrderError(duplicate as any);
      }
      await deps.assertUniqueOrderNo(normalizedData.order_no, undefined, transaction);

      const order = await deps.createOrder(buildCreateOrderValues(context), transaction);
      const items = buildCreateOrderItems(normalizedData, order.id);
      if (items.length > 0) {
        await deps.bulkCreateOrderItems(items, transaction);
      }

      await deps.reserveIdempotencyKey({
        sourceContractCode,
        dedupeKey,
        orderId: order.id,
      }, transaction);

      await transaction.commit();
      const persisted = await deps.getOrderById(order.id);
      if (persisted) return persisted;

      console.warn('[OrderService] createOrder fallback: persisted order not found after commit', {
        id: order.id,
        order_no: createInput.order_no,
      });

      return buildCreateOrderFallback(order, normalizedData);
    } catch (error) {
      await transaction.rollback();
      if ((deps.shouldAutoAssignManualOrderNo || deps.shouldAutoAssignAutoOrderNo) && deps.isUniqueOrderNoError(error) && attempt < 4) {
        continue;
      }
      if (deps.isUniqueOrderNoError(error)) {
        await deps.assertUniqueOrderNo(lastAttemptedOrderNo || data.order_no);
      }
      throw error;
    }
  }

  throw new Error('Failed to allocate unique order number');
}
