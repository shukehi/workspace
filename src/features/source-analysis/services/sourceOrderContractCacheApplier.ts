export async function applySourceOrderContractCache(options: {
  orderData: any;
  persistCache?: boolean;
  cacheErpContractSnapshot: (orderData: any) => Promise<unknown>;
  warn?: (message: string, error: unknown) => void;
}) {
  const {
    orderData,
    persistCache = true,
    cacheErpContractSnapshot,
    warn = (message, error) => console.warn(message, error),
  } = options;

  if (!persistCache) return;

  try {
    await cacheErpContractSnapshot(orderData);
  } catch (cacheError) {
    warn('[SourceStore] failed to cache ERP contract snapshot:', cacheError);
  }
}
