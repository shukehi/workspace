import { api } from '@/lib/api';

export function normalizeErpContractResponse(res: any) {
    if (res?.rows && Array.isArray(res.rows) && res.rows.length > 0) {
        return res.rows[0];
    }
    if (Array.isArray(res)) {
        return res[0];
    }
    return res;
}

export async function fetchErpContract(contractId: string) {
    // Fresh fetch path: this always depends on the upstream ERP endpoint.
    return normalizeErpContractResponse(
        await api.get<any>(`/getOutContractDetail?code=${contractId}`),
    );
}

export async function cacheErpContractSnapshot(orderData: any) {
    await api.post('/contracts/cache', orderData);
}

export async function fetchHistoryContractByCode(contractCode: string) {
    // Cached history path: this reads the local contract snapshot store instead of ERP.
    const cached = await api.get<any>(`/contracts/${encodeURIComponent(contractCode)}`);
    return cached?.raw_json;
}
