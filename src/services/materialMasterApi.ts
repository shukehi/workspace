import { api } from '@/lib/api';
import type { MaterialMasterItem } from '@/services/materialMasterProfileApi';

export interface MaterialMasterDetail {
  profile: {
    code: string;
    displayName: string;
    domain: string;
    workflowKind: string;
    status: string;
    activeRevision: number | null;
  };
  total: number;
  items: MaterialMasterItem[];
}

export const materialMasterApi = {
  async list(query?: string): Promise<MaterialMasterItem[]> {
    const res = await api.get<{ success: boolean; items: MaterialMasterItem[] }>('/config/masters/materials', {
      params: { q: query || undefined },
    });
    return Array.isArray(res.items) ? res.items : [];
  },
  async detail(): Promise<MaterialMasterDetail> {
    const res = await api.get<{ success: boolean; detail: MaterialMasterDetail }>('/config/masters/materials/detail');
    return res.detail;
  },
  async create(payload: Partial<MaterialMasterItem>): Promise<MaterialMasterItem> {
    const res = await api.post<{ success: boolean; item: MaterialMasterItem }>('/config/masters/materials', payload);
    return res.item;
  },
  async update(id: number, payload: Partial<MaterialMasterItem>): Promise<MaterialMasterItem> {
    const res = await api.put<{ success: boolean; item: MaterialMasterItem }>(`/config/masters/materials/${id}`, payload);
    return res.item;
  },
};
