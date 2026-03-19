import type { PlainRecord } from '../../shared/types';

type StockInDeps = {
    inventoryReceiptService: {
        createFromOrder: (order: PlainRecord, data: PlainRecord, transaction: unknown) => Promise<{ receiptItems?: PlainRecord[] }>;
    };
    MissingMaterialError: new (materialId?: string) => Error;
    resolveOrderedQuantity: (rawOrderedQuantity: unknown, rawQuantity: unknown) => number;
    ReceivedQuantityExceededError: new (itemId: number, orderedQuantity: number, nextReceived: number) => Error;
};

export function assertOrderReadyForStockIn(
    order: PlainRecord | null | undefined,
    normalizeStatus: (status: unknown, fallback?: string) => string,
    InvalidStatusTransitionError: new (fromStatus: string, toStatus: string) => Error,
): void {
    const currentStatus = normalizeStatus(order?.status);
    if (currentStatus !== 'arrived') {
        throw new InvalidStatusTransitionError(currentStatus, 'completed');
    }
}

export async function createReceiptItemsFromOrder(
    order: PlainRecord,
    data: PlainRecord,
    transaction: unknown,
    deps: Pick<StockInDeps, 'inventoryReceiptService' | 'MissingMaterialError'>,
): Promise<PlainRecord[]> {
    const { inventoryReceiptService, MissingMaterialError } = deps;

    try {
        const created = await inventoryReceiptService.createFromOrder(order, data, transaction);
        return Array.isArray(created?.receiptItems) ? created.receiptItems : [];
    } catch (error: any) {
        if (error?.code === 'MATERIAL_NOT_FOUND') {
            throw new MissingMaterialError(error.materialId);
        }
        throw error;
    }
}

export async function syncStockInReceiptItems(
    order: PlainRecord,
    receiptItems: PlainRecord[],
    transaction: unknown,
    deps: Pick<StockInDeps, 'resolveOrderedQuantity' | 'ReceivedQuantityExceededError'>,
): Promise<Map<number, PlainRecord>> {
    const { resolveOrderedQuantity, ReceivedQuantityExceededError } = deps;
    const updatesByOrderItemId = new Map<number, PlainRecord>();

    for (const receiptItem of receiptItems) {
        const item = receiptItem.orderItem;
        const nextReceived = Number(item.received_quantity || 0) + Number(receiptItem.quantity || 0);
        const nextOrdered = resolveOrderedQuantity(item.ordered_quantity, item.quantity);
        if (nextReceived > nextOrdered) {
            throw new ReceivedQuantityExceededError(item.id, nextOrdered, nextReceived);
        }
        const updatedItem = await item.update({
            ordered_quantity: nextOrdered,
            received_quantity: nextReceived
        }, { transaction });
        updatesByOrderItemId.set(Number(item.id), updatedItem);
    }

    return updatesByOrderItemId;
}

export function areAllOrderItemsReceived(
    orderItems: PlainRecord[] | null | undefined,
    updatesByOrderItemId: Map<number, PlainRecord>,
    resolveOrderedQuantity: (rawOrderedQuantity: unknown, rawQuantity: unknown) => number,
): boolean {
    return (orderItems || []).every((item) => {
        const candidate = updatesByOrderItemId.get(Number(item.id)) || item;
        const orderedQuantity = resolveOrderedQuantity(candidate.ordered_quantity, candidate.quantity);
        const receivedQuantity = Number(candidate.received_quantity || 0);
        return orderedQuantity > 0 && receivedQuantity >= orderedQuantity;
    });
}

export function buildStockInOrderUpdate(
    order: PlainRecord,
    data: PlainRecord,
    allReceived: boolean,
    normalizeOrderRemark: (remark: unknown) => string,
): PlainRecord {
    const nextStockedInAt = data.stocked_in_at || new Date().toISOString();

    return {
        status: allReceived ? 'completed' : 'arrived',
        stocked_in_at: allReceived ? nextStockedInAt : order.stocked_in_at,
        stocked_in_by: allReceived
            ? (data.operator === undefined ? order.stocked_in_by : data.operator)
            : order.stocked_in_by,
        stocked_in_remark: allReceived
            ? (data.remark === undefined ? order.stocked_in_remark : normalizeOrderRemark(data.remark))
            : order.stocked_in_remark,
    };
}

