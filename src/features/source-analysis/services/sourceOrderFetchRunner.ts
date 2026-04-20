export async function runSourceContractFetch(options: {
  contractId: string;
  beginRequest: () => void;
  finishRequest: () => void;
  fetchErpContract: (contractId: string) => Promise<any>;
  applyContractData: (orderData: any, options?: { persistCache?: boolean }) => Promise<void>;
  failSourceOrderFetch: (error: unknown) => void;
}) {
  const normalizedContractId = String(options.contractId || '').trim();
  if (!normalizedContractId) return null;

  options.beginRequest();
  try {
    const orderData = await options.fetchErpContract(normalizedContractId);
    await options.applyContractData(orderData, { persistCache: true });
    return orderData;
  } catch (error) {
    options.failSourceOrderFetch(error);
    return null;
  } finally {
    options.finishRequest();
  }
}

export async function runSourceHistoryContractLoad(options: {
  code: string;
  beginRequest: () => void;
  finishRequest: () => void;
  fetchHistoryContractByCode: (contractCode: string) => Promise<any>;
  applyContractData: (orderData: any, options?: { persistCache?: boolean }) => Promise<void>;
  failSourceOrderHistoryLoad: (error: unknown) => string;
}) {
  const contractCode = String(options.code || '').trim();
  if (!contractCode) {
    throw new Error('合同号不能为空');
  }

  options.beginRequest();
  try {
    const rawOrder = await options.fetchHistoryContractByCode(contractCode);
    if (!rawOrder || !Array.isArray(rawOrder.list)) {
      throw new Error('历史合同数据不完整，无法加载');
    }

    await options.applyContractData(rawOrder, { persistCache: false });
    return rawOrder;
  } catch (error) {
    const message = options.failSourceOrderHistoryLoad(error);
    throw new Error(message);
  } finally {
    options.finishRequest();
  }
}
