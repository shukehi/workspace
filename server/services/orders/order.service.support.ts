import type { Transaction } from 'sequelize';
import { Op } from 'sequelize';
import * as orderRepository from './order.repository';
import type { PlainRecord } from '../../shared/types';
import type { OrderByIdBinding, OrderDuplicateAutoBinding, OrderIdempotencyMutationBindings, OrderIdempotencyReserveBinding } from './order.service.contracts';
import {
  buildAutoOrderNo,
  buildManualOrderNo,
  formatManualOrderDateToken,
  parseAutoOrderSequence,
} from './order.service.helpers';
import {
  buildOrderDedupeKey,
  normalizeDedupeText,
  resolveSourceContractCode,
} from './order.dedupe';
import { serializeOrder } from './order.mapper';
import { DuplicateOrderError } from './order.errors';


export function buildOrderLifecycleBindings(service: OrderByIdBinding & {
  assertUniqueOrderNo: (orderNo: unknown, excludeId?: number | string, transaction?: any) => Promise<void>;
} & OrderDuplicateAutoBinding & OrderIdempotencyReserveBinding & OrderIdempotencyMutationBindings & {
  allocateNextManualOrderNo: (createdAt: unknown, transaction?: any) => Promise<string>;
  allocateNextAutoOrderNo: (sourceContractCode: string, transaction?: any) => Promise<string>;
}) {
  return {
    getOrderById: service.getOrderById,
    allocateNextManualOrderNo: service.allocateNextManualOrderNo,
    allocateNextAutoOrderNo: service.allocateNextAutoOrderNo,
    assertUniqueOrderNo: service.assertUniqueOrderNo,
    findDuplicateAutoOrder: service.findDuplicateAutoOrder,
    reserveIdempotencyKey: (args: { sourceContractCode?: string; dedupeKey?: string; orderId?: number }, transaction: unknown) => service.reserveIdempotencyKey(args, transaction),
    releaseIdempotencyKeys: service.releaseIdempotencyKeys,
    syncActiveIdempotencyKey: (args: { sourceContractCode?: string; dedupeKey?: string; orderId?: number }, transaction?: Transaction) => service.syncActiveIdempotencyKey(args, transaction),
  };
}

export async function allocateNextManualOrderNo(createdAt: unknown, transaction?: Transaction) {
  const dateToken = formatManualOrderDateToken(createdAt);
  const prefix = `PM-${dateToken}-`;
  const latestSequence = await orderRepository.findMaxOrderNoSequenceByPrefix(prefix, transaction);
  const nextSequence = Number.isInteger(latestSequence) && latestSequence >= 1001
    ? latestSequence + 1
    : 1001;
  return buildManualOrderNo(dateToken, nextSequence);
}

export async function allocateNextAutoOrderNo(sourceContractCode: string, transaction?: Transaction) {
  const normalizedSourceContractCode = String(sourceContractCode || '').trim();
  if (!normalizedSourceContractCode) return '';

  const existingOrderNos = await orderRepository.findOrderNosBySourceContractCode(normalizedSourceContractCode, transaction);
  const usedSequences = new Set(
    existingOrderNos
      .map((orderNo) => parseAutoOrderSequence(orderNo, normalizedSourceContractCode))
      .filter((sequence) => Number.isInteger(sequence) && sequence > 0),
  );

  let nextSequence = 1;
  while (usedSequences.has(nextSequence)) {
    nextSequence += 1;
  }

  return buildAutoOrderNo(normalizedSourceContractCode, nextSequence);
}

export async function assertUniqueOrderNo(orderNo: unknown, excludeId?: number | string, transaction?: Transaction) {
  const normalizedOrderNo = String(orderNo || '').trim();
  if (!normalizedOrderNo) return;

  const existing = await orderRepository.findOrderByOrderNo(normalizedOrderNo, transaction);
  if (!existing) return;

  const existingId = Number(existing.id);
  const normalizedExcludeId = Number(excludeId);
  if (Number.isInteger(existingId) && Number.isInteger(normalizedExcludeId) && existingId === normalizedExcludeId) {
    return;
  }

  throw new DuplicateOrderError(existing);
}

export async function findDuplicateAutoOrder(
  data: PlainRecord,
  transaction: Transaction | undefined,
  options: PlainRecord = {},
) {
  const sourceContractCode = resolveSourceContractCode(data);
  const dedupeKey = normalizeDedupeText(data?.dedupe_key) || buildOrderDedupeKey(data);
  const excludeId = Number(options.excludeId);

  if (!sourceContractCode || !dedupeKey) return null;

  const where: PlainRecord = {
    source_contract_code: sourceContractCode,
    status: { [Op.ne]: 'cancelled' }
  };
  if (Number.isInteger(excludeId) && excludeId > 0) {
    where.id = { [Op.ne]: excludeId };
  }

  const candidates = await orderRepository.findAllOrdersWithItems(where, transaction);

  const matched = candidates.find((candidate: PlainRecord) => {
    const persisted = serializeOrder(candidate);
    const candidateKey = normalizeDedupeText(candidate.dedupe_key) || buildOrderDedupeKey(persisted);
    return candidateKey === dedupeKey;
  });

  return matched ? serializeOrder(matched) : null;
}

export async function reserveIdempotencyKey(
  args: { sourceContractCode?: string; dedupeKey?: string; orderId?: number },
  deps: {
    getOrderById: OrderByIdBinding['getOrderById'];
    findDuplicateAutoOrder: (data: PlainRecord, transaction?: Transaction, options?: PlainRecord) => Promise<PlainRecord | null>;
  },
  transaction: Transaction | undefined,
) {
  const { sourceContractCode, dedupeKey, orderId } = args;
  if (!sourceContractCode || !dedupeKey || !orderId) return null;
  try {
    return await orderRepository.createIdempotencyKey({
      scope: 'auto_po',
      source_contract_code: sourceContractCode,
      dedupe_key: dedupeKey,
      order_id: orderId,
      active: true,
    }, transaction);
  } catch (error: any) {
    const message = String(error?.message || '');
    const isUnique = error?.name === 'SequelizeUniqueConstraintError'
      || message.includes('UNIQUE constraint failed')
      || message.includes('idx_order_idempotency_active');
    if (!isUnique) throw error;

    const existingKey = await orderRepository.findActiveIdempotencyKey('auto_po', dedupeKey, transaction);
    const existingOrder = existingKey
      ? await deps.getOrderById(existingKey.order_id)
      : await deps.findDuplicateAutoOrder({ source_contract_code: sourceContractCode, dedupe_key: dedupeKey }, transaction);
    if (!existingOrder) throw error;
    throw new DuplicateOrderError(existingOrder as any);
  }
}

export async function releaseIdempotencyKeys(orderId: number, transaction: Transaction | undefined) {
  await orderRepository.updateActiveIdempotencyKeysByOrderId(
    orderId,
    { active: false },
    transaction,
  );
}

export async function syncActiveIdempotencyKey(
  args: { sourceContractCode?: string; dedupeKey?: string; orderId?: number },
  deps: {
    reserveIdempotencyKey: (args: { sourceContractCode?: string; dedupeKey?: string; orderId?: number }, transaction: Transaction | undefined) => Promise<unknown>;
  },
  transaction: Transaction | undefined,
) {
  const { sourceContractCode, dedupeKey, orderId } = args;
  if (!sourceContractCode || !dedupeKey || !orderId) return 0;
  const [updated] = await orderRepository.updateScopedIdempotencyKeysByOrderId(
    orderId,
    'auto_po',
    {
      source_contract_code: sourceContractCode,
      dedupe_key: dedupeKey,
      active: true
    },
    transaction,
  );

  if (updated > 0) return updated;

  await deps.reserveIdempotencyKey({ sourceContractCode, dedupeKey, orderId }, transaction);
  return 1;
}
