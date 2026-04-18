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












