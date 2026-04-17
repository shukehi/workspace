import type { PlainRecord } from '../../shared/types';

export type OrderSerializationBindings = {
  serializeOrder: (order: unknown) => PlainRecord | null;
};

export type OrderTransactionFactoryBinding<T = any> = {
  transactionFactory: () => Promise<T>;
};

export type OrderSummaryFacetBindings = {
  buildOrderSummary: (orders: PlainRecord[]) => PlainRecord;
  buildOrderFacets: (orders: PlainRecord[]) => PlainRecord;
};

export type OrderByIdBinding = {
  getOrderById: (id: number | string) => Promise<PlainRecord | null>;
};


export type OrderAllocationBindings = {
  allocateNextManualOrderNo: (createdAt: unknown, transaction?: any) => Promise<string>;
  allocateNextAutoOrderNo: (sourceContractCode: string, transaction?: any) => Promise<string>;
};
export type OrderByIdWithItemsBinding = {
  findOrderByIdWithItems: (id: number | string, transaction?: any) => Promise<PlainRecord | null>;
};

export type OrderItemPersistenceBindings = {
  normalizeOrderItemForPersistence: (item: Record<string, unknown>) => Record<string, unknown>;
};

export type OrderUniqueOrderNoBinding = {
  assertUniqueOrderNo: (orderNo: unknown, excludeId?: number | string, transaction?: any) => Promise<void>;
};

export type OrderDuplicateAutoBinding = {
  findDuplicateAutoOrder: (data: PlainRecord, transaction?: any, options?: PlainRecord) => Promise<PlainRecord | null>;
};

export type OrderIdempotencyReserveBinding = {
  reserveIdempotencyKey: (args: { sourceContractCode?: string; dedupeKey?: string; orderId?: number }, transaction: unknown) => Promise<unknown>;
};

export type OrderIdempotencyMutationBindings = {
  releaseIdempotencyKeys: (orderId: number, transaction?: any) => Promise<unknown>;
  syncActiveIdempotencyKey: (args: { sourceContractCode?: string; dedupeKey?: string; orderId?: number }, transaction?: any) => Promise<unknown>;
};

export type OrderCoreLifecycleBindings =
  OrderByIdBinding
  & OrderUniqueOrderNoBinding
  & OrderDuplicateAutoBinding
  & OrderIdempotencyReserveBinding;

export type OrderLifecycleDepsCore =
  OrderTransactionFactoryBinding
  & OrderByIdBinding;

export type OrderLifecycleDepsPersistence =
  OrderItemPersistenceBindings
  & OrderSerializationBindings;

export type OrderReadSurfaceBindings = OrderSerializationBindings & OrderByIdWithItemsBinding;

export type OrderQuerySurfaceBindings = OrderSerializationBindings & OrderSummaryFacetBindings;

export type OrderLifecycleMutableBindings = OrderCoreLifecycleBindings & OrderIdempotencyMutationBindings;

export type OrderLifecycleCreateBindings =
  OrderCoreLifecycleBindings
  & OrderAllocationBindings;



export type OrderReadListDeps = Pick<OrderReadSurfaceBindings, 'serializeOrder'> & {
  findAllOrdersWithItems: (where: PlainRecord) => Promise<PlainRecord[]>;
  normalizeOrderForLog: (order: PlainRecord) => PlainRecord;
};

export type OrderReadBindings = OrderReadListDeps & OrderReadSurfaceBindings;


export type OrderStatusNormalizerBinding = {
  normalizeStatus: (status: unknown, fallback?: string) => string;
};

export type OrderStatusTransitionErrorBinding = {
  InvalidStatusTransitionError: new (fromStatus: string, toStatus: string) => Error;
};

export type OrderStockInHelperDeps =
  OrderTransactionFactoryBinding
  & OrderByIdBinding
  & OrderByIdWithItemsBinding
  & OrderStatusNormalizerBinding
  & OrderStatusTransitionErrorBinding;

export type OrderStatusGuardBindings =
  OrderStatusNormalizerBinding
  & OrderStatusTransitionErrorBinding;

export type OrderStockInServiceDeps = {
  inventoryReceiptService: {
    createFromOrder: (order: PlainRecord, data: PlainRecord, transaction?: any) => Promise<{ receiptItems?: Array<{ orderItem: PlainRecord; quantity: number; itemKey: string }> }>;
  };
  MissingMaterialError: new (materialId?: string) => Error;
  resolveOrderedQuantity: (rawOrderedQuantity: unknown, rawQuantity: unknown) => number;
  ReceivedQuantityExceededError: new (itemId: number, orderedQuantity: number, nextReceived: number) => Error;
  normalizeOrderRemark: (remark: unknown) => string;
};
