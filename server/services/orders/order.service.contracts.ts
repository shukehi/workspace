import type { PlainRecord } from '../../shared/types';

export type OrderSerializationBindings = {
  serializeOrder: (order: unknown) => PlainRecord | null;
};

export type OrderSummaryFacetBindings = {
  buildOrderSummary: (orders: PlainRecord[]) => PlainRecord;
  buildOrderFacets: (orders: PlainRecord[]) => PlainRecord;
};

export type OrderByIdBinding = {
  getOrderById: (id: number | string) => Promise<PlainRecord | null>;
};

export type OrderByIdWithItemsBinding = {
  findOrderByIdWithItems: (id: number | string, transaction?: any) => Promise<PlainRecord | null>;
};
