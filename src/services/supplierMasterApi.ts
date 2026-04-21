import { api } from '@/lib/api';
import type { SupplierMasterEntry } from '@/services/mappingConfigApi';

export const supplierMasterApi = {
  async list(): Promise<SupplierMasterEntry[]> {
    const res = await api.get<{ success: boolean; items: SupplierMasterEntry[] }>('/config/masters/suppliers');
    return Array.isArray(res.items) ? res.items : [];
  }
};
