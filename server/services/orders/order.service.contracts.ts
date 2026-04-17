import type { PlainRecord } from '../../shared/types';

export type OrderSerializationBindings = {
  serializeOrder: (order: unknown) => PlainRecord | null;
};

export type OrderSummaryFacetBindings = {
  buildOrderSummary: (orders: PlainRecord[]) => PlainRecord;
  buildOrderFacets: (orders: PlainRecord[]) => PlainRecord;
};
