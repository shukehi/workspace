import type { PlainRecord } from '../../shared/types';

export type OrderSerializationBindings = {
  serializeOrder: (order: unknown) => PlainRecord | null;
};

export type OrderTransactionFactoryBinding<T = any> = {
  transactionFactory: () => Promise<T>;
};


export type OrderByIdBinding = {
  getOrderById: (id: number | string) => Promise<PlainRecord | null>;
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






