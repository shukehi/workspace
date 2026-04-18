import type { PlainRecord } from '../../shared/types';

export function buildMarkArrivedPayload(data: PlainRecord = {}): PlainRecord {
  return {
    ...data,
    status: 'arrived',
    arrived_at: data.arrived_at || new Date().toISOString(),
  };
}

type BulkArriveResult = {
  total: number;
  successCount: number;
  failureCount: number;
  succeededIds: number[];
  failed: Array<{ id: number; code: string; message: string }>;
};

export async function bulkMarkArrivedWithResult(
  idsInput: unknown,
  data: PlainRecord,
  deps: {
    normalizeBulkOrderIds: (idsInput: unknown) => number[];
    serializeBulkArriveError: (error: unknown) => { code: string; message: string };
    markArrived: (id: number, payload: PlainRecord) => Promise<unknown>;
  },
): Promise<BulkArriveResult> {
  const ids = deps.normalizeBulkOrderIds(idsInput);
  const payload = {
    arrived_at: data.arrived_at,
    arrived_by: data.arrived_by,
    arrived_remark: data.arrived_remark,
  };
  const succeededIds: number[] = [];
  const failed: Array<{ id: number; code: string; message: string }> = [];

  for (const id of ids) {
    try {
      await deps.markArrived(id, payload);
      succeededIds.push(id);
    } catch (error) {
      failed.push({
        id,
        ...deps.serializeBulkArriveError(error),
      });
    }
  }

  return {
    total: ids.length,
    successCount: succeededIds.length,
    failureCount: failed.length,
    succeededIds,
    failed,
  };
}


export async function markArrivedResult(
  id: number | string,
  data: PlainRecord = {},
  deps: {
    updateOrder: (id: number | string, payload: PlainRecord) => Promise<unknown>;
  },
) {
  return await deps.updateOrder(id, buildMarkArrivedPayload(data));
}

export async function bulkMarkArrivedResult(
  idsInput: unknown,
  data: PlainRecord = {},
  deps: {
    normalizeBulkOrderIds: (idsInput: unknown) => number[];
    serializeBulkArriveError: (error: unknown) => { code: string; message: string };
    markArrivedResult: (id: number, payload: PlainRecord) => Promise<unknown>;
  },
): Promise<BulkArriveResult> {
  return await bulkMarkArrivedWithResult(idsInput, data, {
    normalizeBulkOrderIds: deps.normalizeBulkOrderIds,
    serializeBulkArriveError: deps.serializeBulkArriveError,
    markArrived: (id, payload) => deps.markArrivedResult(id, payload),
  });
}
