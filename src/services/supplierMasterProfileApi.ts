import { api } from '@/lib/api';
import type { SupplierMasterEntry } from '@/services/mappingConfigApi';

export interface SupplierLinkedMaterialItem {
  id: number;
  code: string;
  name: string;
  category: string;
  supplier: string;
  supplierMasterId: number | null;
  updatedAt: string | null;
}

export interface SupplierMasterProfileDetail {
  profile: {
    code: string;
    displayName: string;
    domain: string;
    workflowKind: string;
    status: string;
    activeRevision: number | null;
    capabilities: Record<string, boolean>;
  };
  collection: {
    total: number;
    page: number;
    pageSize: number;
    previewItems: SupplierMasterEntry[];
  };
}

export const supplierMasterProfileApi = {
  async detail(): Promise<SupplierMasterProfileDetail> {
    const res = await api.get<{ success: boolean; detail: SupplierMasterProfileDetail }>('/config/profiles/supplier_master/detail');
    return res.detail;
  },
  async list() {
    const res = await api.get<{ success: boolean; items: SupplierMasterEntry[] }>('/config/profiles/supplier_master/items');
    return Array.isArray(res.items) ? res.items : [];
  },
  async create(payload: { supplierName: string; sourceNote?: string; status?: 'active' | 'inactive' }) {
    const res = await api.post<{ success: boolean; item: SupplierMasterEntry & { id: number } }>('/config/profiles/supplier_master/items', payload);
    return res.item;
  },
  async update(id: number, payload: { supplierName?: string; sourceNote?: string; status?: 'active' | 'inactive' }) {
    const res = await api.put<{ success: boolean; item: SupplierMasterEntry & { id: number } }>(`/config/profiles/supplier_master/items/${id}`, payload);
    return res.item;
  },
  async archive(id: number) {
    const res = await api.post<{ success: boolean; item: SupplierMasterEntry & { id: number } }>(`/config/profiles/supplier_master/items/${id}/archive`, {});
    return res.item;
  },
  async auditLogs() {
    const res = await api.get<{ success: boolean; items: Array<{ id: number; action: string; operator: string; createdAt: string; meta: Record<string, unknown> }> }>('/config/profiles/supplier_master/audit-logs');
    return Array.isArray(res.items) ? res.items : [];
  },
  async linkedMaterials(id: number): Promise<SupplierLinkedMaterialItem[]> {
    const res = await api.get<{ success: boolean; items: SupplierLinkedMaterialItem[] }>(`/config/profiles/supplier_master/items/${id}/materials`);
    return Array.isArray(res.items) ? res.items : [];
  },
};
