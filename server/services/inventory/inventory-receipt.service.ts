import type { Transaction } from 'sequelize';
import { sequelize } from '../../models';
import ERROR_CODES from '../../app/errors/errorCodes';
import * as repository from './inventory-receipt.repository';
import { resolveWarehouseAndLocation } from './inventory-location.service';
import { applyInventoryMovement } from './inventory-movement.service';
import {
  normalizeReceiptDate,
  normalizeReverseQuantity,
  resolveOrderedQuantity,
  toPlainReceipt,
  computeReversalStats,
} from './inventory-receipt.mapper';
import {
  createReceiptError,
  ReceiptReverseNotAllowedError,
  ReceiptAlreadyReversedError,
  ReceiptAlreadyFullyReversedError,
  ReverseQuantityExceededError,
} from './inventory-receipt.errors';
import { resolveReceiptOrderItems } from './inventory-receipt.policy';
import { buildInventoryReceiptListQuery } from './inventory-receipt.query-policy';
import type { PlainRecord } from '../../shared/types';

class InventoryReceiptService {
  ReceiptReverseNotAllowedError?: typeof ReceiptReverseNotAllowedError;
  ReceiptAlreadyReversedError?: typeof ReceiptAlreadyReversedError;
  ReceiptAlreadyFullyReversedError?: typeof ReceiptAlreadyFullyReversedError;
  ReverseQuantityExceededError?: typeof ReverseQuantityExceededError;

  async createFromOrder(order: PlainRecord, payload: PlainRecord = {}, transaction?: Transaction | null) {
    const receiptDate = normalizeReceiptDate(payload.stocked_in_at || payload.receipt_date);
    const operator = payload.operator ? String(payload.operator).trim() : '';
    const remark = payload.remark ? String(payload.remark) : '';
    const { warehouse, location } = await resolveWarehouseAndLocation(payload.warehouse_id, payload.location_id, transaction ?? null);
    const receiptItems = resolveReceiptOrderItems(order, payload);
    if (receiptItems.length === 0) {
      throw createReceiptError('ORDER_ITEMS_REQUIRED');
    }

    const created = [];
    for (const receiptItem of receiptItems) {
      const item = receiptItem!.orderItem;
      const material = await repository.findMaterialForItem(item, transaction);
      const quantity = receiptItem!.quantity;

      const receipt = await repository.createReceipt({
        order_id: order.id,
        order_no: order.order_no,
        order_item_id: item.id || null,
        direction: 'in',
        source_receipt_id: null,
        material_id: String(item.material_id || material.code || material.id),
        warehouse_id: warehouse.id,
        location_id: location.id,
        item_name: item.name || item.type || item.model || '-',
        supplier: item.supplier || order.supplier || '',
        quantity,
        unit: item.unit || material.unit || '',
        receipt_date: receiptDate,
        operator: operator || null,
        remark,
      }, transaction);

      await applyInventoryMovement({
        material,
        warehouseId: warehouse.id,
        locationId: location.id,
        sourceType: 'receipt_in',
        sourceId: String(receipt.id),
        sourceLineKey: String(item.id || material.id),
        deltaQuantity: quantity,
        reason: '采购入库',
        operator: operator || null,
        remark,
        occurredAt: receiptDate,
        metadata: {
          receipt_id: receipt.id,
          order_id: order.id,
          direction: 'in',
        },
        transaction: transaction!,
      });

      created.push(receipt);
    }

    return {
      receipts: created,
      receiptItems,
    };
  }

  async reverseReceipt(receiptId: number | string, payload: PlainRecord = {}) {
    const transaction = await sequelize.transaction();
    try {
      const receipt = await repository.findReceiptById(Number(receiptId), transaction);
      if (!receipt) {
        throw createReceiptError('RECEIPT_NOT_FOUND');
      }
      if (receipt.direction !== 'in') {
        throw new ReceiptReverseNotAllowedError(receipt.id);
      }

      const reversalReceipts = await repository.listReversalReceipts(receipt.id, transaction);
      const { reversibleQuantity } = computeReversalStats(receipt, reversalReceipts);
      if (reversibleQuantity <= 0) {
        throw new ReceiptAlreadyFullyReversedError(receipt.id);
      }

      const order = await repository.findOrderWithItems(receipt.order_id, transaction);
      if (!order) {
        throw createReceiptError('ORDER_NOT_FOUND');
      }

      const orderItem = (order.items || []).find((item: PlainRecord) => Number(item.id) === Number(receipt.order_item_id));
      if (!orderItem) {
        throw createReceiptError('ORDER_ITEM_NOT_FOUND', { orderItemId: receipt.order_item_id });
      }

      const material = await repository.findMaterialForItem({ material_id: receipt.material_id }, transaction);
      const quantity = Number(receipt.quantity || 0);
      if (quantity <= 0) {
        throw createReceiptError('INVALID_RECEIPT_QUANTITY');
      }

      const reversalDate = normalizeReceiptDate(payload.reversed_at || payload.receipt_date);
      const reverseReason = payload.reverse_reason ? String(payload.reverse_reason).trim() : '';
      if (!reverseReason) {
        throw createReceiptError('REVERSE_REASON_REQUIRED');
      }

      const requestedQuantity = normalizeReverseQuantity(payload.quantity) ?? reversibleQuantity;
      if (requestedQuantity > reversibleQuantity) {
        throw new ReverseQuantityExceededError(receipt.id, reversibleQuantity, requestedQuantity);
      }

      const claimed = await repository.claimReceiptReverseLock(
        receipt.id,
        Number(receipt.reverse_version || 0),
        transaction,
      );
      if (claimed === 0) {
        const refreshedReceipt = await repository.findReceiptById(receipt.id, transaction);
        const latestReversals = await repository.listReversalReceipts(receipt.id, transaction);
        const { reversibleQuantity: latestReversibleQuantity } = computeReversalStats(refreshedReceipt || receipt, latestReversals);
        if (latestReversibleQuantity <= 0) {
          throw new ReceiptAlreadyFullyReversedError(receipt.id);
        }
        throw createReceiptError(ERROR_CODES.RECEIPT_REVERSE_CONFLICT, { receiptId: receipt.id });
      }

      const balance = await repository.findLocationBalance(material.id, Number(receipt.warehouse_id), Number(receipt.location_id), transaction);
      const availableBalance = Number(balance?.quantity || 0);
      const availableStock = Number(material.stock_quantity || 0);
      if (requestedQuantity > availableBalance || requestedQuantity > availableStock) {
        throw createReceiptError(ERROR_CODES.RECEIPT_INSUFFICIENT_BALANCE, {
          receiptId: receipt.id,
          materialId: material.id,
          warehouseId: Number(receipt.warehouse_id),
          locationId: Number(receipt.location_id),
          availableQuantity: Math.min(availableBalance, availableStock),
          requestedQuantity,
        });
      }

      const nextReceived = Number(orderItem.received_quantity || 0) - requestedQuantity;
      await orderItem.update({
        received_quantity: Math.max(nextReceived, 0),
      }, { transaction });

      const reversal = await repository.createReceipt({
        order_id: receipt.order_id,
        order_no: receipt.order_no,
        order_item_id: receipt.order_item_id,
        direction: 'reversal',
        source_receipt_id: receipt.id,
        reverse_reason: reverseReason,
        warehouse_id: Number(receipt.warehouse_id),
        location_id: Number(receipt.location_id),
        material_id: receipt.material_id,
        item_name: receipt.item_name,
        supplier: receipt.supplier || order.supplier || '',
        quantity: -requestedQuantity,
        unit: receipt.unit || material.unit || '',
        receipt_date: reversalDate,
        operator: payload.operator ? String(payload.operator).trim() : null,
        remark: payload.remark ? String(payload.remark) : '',
      }, transaction);

      await applyInventoryMovement({
        material,
        warehouseId: Number(receipt.warehouse_id),
        locationId: Number(receipt.location_id),
        sourceType: 'receipt_reversal',
        sourceId: String(reversal.id),
        sourceLineKey: String(receipt.order_item_id || material.id),
        deltaQuantity: -requestedQuantity,
        reason: reverseReason,
        operator: payload.operator ? String(payload.operator).trim() : null,
        remark: payload.remark ? String(payload.remark) : '',
        occurredAt: reversalDate,
        metadata: {
          receipt_id: reversal.id,
          source_receipt_id: receipt.id,
          order_id: receipt.order_id,
          direction: 'reversal',
        },
        insufficientBalanceCode: ERROR_CODES.RECEIPT_INSUFFICIENT_BALANCE,
        transaction,
      });

      const refreshedItems = order.items || [];
      const allReceived = refreshedItems.every((item: PlainRecord) => {
        const ordered = resolveOrderedQuantity(item.ordered_quantity, item.quantity);
        const received = Number(item.id === orderItem.id ? Math.max(nextReceived, 0) : item.received_quantity || 0);
        return ordered > 0 && received >= ordered;
      });

      await order.update({
        status: allReceived ? 'completed' : 'arrived',
        stocked_in_at: allReceived ? order.stocked_in_at : null,
        stocked_in_by: allReceived ? order.stocked_in_by : null,
        stocked_in_remark: allReceived ? order.stocked_in_remark : '',
      }, { transaction });

      await transaction.commit();
      return toPlainReceipt(reversal);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async list(query: PlainRecord = {}) {
    const { where, page, pageSize, offset } = buildInventoryReceiptListQuery(query);
    const result = await repository.findReceiptsAndCount({ where, offset, pageSize });

    const plainReceipts = result.rows.map(toPlainReceipt);
    const originalIds = plainReceipts
      .filter((receipt: PlainRecord) => receipt.direction !== 'reversal')
      .map((receipt: PlainRecord) => Number(receipt.id))
      .filter((id: number) => Number.isInteger(id) && id > 0);
    const reversalGroups = new Map<number, PlainRecord[]>();

    for (const reversal of (await repository.findRelatedReversals(originalIds)).map(toPlainReceipt)) {
      const key = Number(reversal.source_receipt_id);
      const current = reversalGroups.get(key) || [];
      current.push(reversal);
      reversalGroups.set(key, current);
    }

    const rows = plainReceipts.map((receipt: PlainRecord) => {
      if (receipt.direction === 'reversal') {
        return {
          ...receipt,
          reversed_quantity: null,
          reversible_quantity: null,
        };
      }
      const reversals = reversalGroups.get(Number(receipt.id)) || [];
      const { reversedQuantity, reversibleQuantity } = computeReversalStats(receipt, reversals);
      return {
        ...receipt,
        reversed_quantity: reversedQuantity,
        reversible_quantity: reversibleQuantity,
      };
    });

    return {
      rows,
      total: Number(result.count || 0),
      page,
      pageSize,
    };
  }

  async getById(id: number | string) {
    const receiptId = Number(id);
    if (!Number.isInteger(receiptId) || receiptId <= 0) {
      throw createReceiptError('RECEIPT_NOT_FOUND');
    }

    const receipt = await repository.findReceiptById(receiptId);
    if (!receipt) {
      throw createReceiptError('RECEIPT_NOT_FOUND');
    }

    const plainReceipt = toPlainReceipt(receipt);
    if (plainReceipt.direction === 'reversal') {
      return {
        ...plainReceipt,
        reversed_quantity: null,
        reversible_quantity: null,
      };
    }

    const reversals = await repository.listReversalReceipts(receiptId);
    const { reversedQuantity, reversibleQuantity } = computeReversalStats(
      plainReceipt,
      reversals.map(toPlainReceipt),
    );

    return {
      ...plainReceipt,
      reversed_quantity: reversedQuantity,
      reversible_quantity: reversibleQuantity,
    };
  }
}

const service = new InventoryReceiptService();
service.ReceiptReverseNotAllowedError = ReceiptReverseNotAllowedError;
service.ReceiptAlreadyReversedError = ReceiptAlreadyReversedError;
service.ReceiptAlreadyFullyReversedError = ReceiptAlreadyFullyReversedError;
service.ReverseQuantityExceededError = ReverseQuantityExceededError;

export default service;
