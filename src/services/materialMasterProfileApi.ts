import { api } from '@/lib/api';

export interface WorkflowRevisionMeta {
  revision: number;
  state: string;
  changeNote: string;
  createdBy: string;
  createdAt: string | null;
}

export interface MaterialMasterItem {
  id: number;
  code: string;
  name: string;
  model: string;
  supplier: string;
  supplier_master_id?: number | null;
  supplierMaster?: {
    id: number;
    supplier_name: string;
    normalized_name: string;
    status: string;
  } | null;
  unit: string;
  price: number;
  category: string;
}

export interface MaterialMasterProfileDetail {
  latestRevision?: WorkflowRevisionMeta | null;
  draftRevision?: WorkflowRevisionMeta | null;
  publishedRevision?: WorkflowRevisionMeta | null;
  draftPayload?: Record<string, unknown>[] | null;
  publishedPayload?: Record<string, unknown>[] | null;
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
    previewItems: MaterialMasterItem[];
  };
}

export interface MaterialMasterReferenceCheck {
  profileCode: string;
  supplierRefs: string[];
  materialCodeRefs: string[];
  supplierRefItems?: Array<{ path: string; value: string; missingInSupplierMaster?: boolean }>;
  materialCodeRefItems?: Array<{ path: string; value: string; missingInMaterialMaster?: boolean }>;
  missingMaterialCodes: string[];
  suppliersMissingInMaterialMaster: string[];
  suppliersMissingInSupplierMaster: string[];
  unlinkedMaterialCount?: number;
  unlinkedMaterialItems?: Array<{ path: string; code: string; supplier: string; supplier_master_id: number | null }>;
  hasIssues: boolean;
}

export const materialMasterProfileApi = {
  async detail(): Promise<MaterialMasterProfileDetail> {
    const res = await api.get<{ success: boolean; detail: MaterialMasterProfileDetail }>('/config/profiles/material_master/detail');
    return res.detail;
  },
  async list(query?: string): Promise<MaterialMasterItem[]> {
    const res = await api.get<{ success: boolean; items: MaterialMasterItem[] }>('/config/profiles/material_master/items', {
      params: { q: query || undefined },
    });
    return Array.isArray(res.items) ? res.items : [];
  },
  async referenceCheck(): Promise<MaterialMasterReferenceCheck | null> {
    const res = await api.get<{ success: boolean; check?: MaterialMasterReferenceCheck }>('/config/profiles/material_master/reference-check');
    return res.check || null;
  },
  async auditLogs() {
    const res = await api.get<{ success: boolean; items: Array<{ id: number; action: string; operator: string; createdAt: string; meta: Record<string, unknown> }> }>('/config/profiles/material_master/audit-logs');
    return Array.isArray(res.items) ? res.items : [];
  },
  async create(payload: Partial<MaterialMasterItem>): Promise<MaterialMasterItem> {
    const res = await api.post<{ success: boolean; item: MaterialMasterItem }>('/config/profiles/material_master/items', payload);
    return res.item;
  },
  async update(id: number, payload: Partial<MaterialMasterItem>): Promise<MaterialMasterItem> {
    const res = await api.put<{ success: boolean; item: MaterialMasterItem }>(`/config/profiles/material_master/items/${id}`, payload);
    return res.item;
  },
  async revisions() {
    const res = await api.get<{ success: boolean; items: WorkflowRevisionMeta[] }>('/config/profiles/material_master/revisions');
    return Array.isArray(res.items) ? res.items : [];
  },
  async publish(fromRevision: number, changeNote?: string) {
    const res = await api.post<{ success: boolean; revision: WorkflowRevisionMeta }>('/config/profiles/material_master/publish', { fromRevision, changeNote });
    return res.revision;
  },
  async rollback(targetRevision: number, reason?: string) {
    const res = await api.post<{ success: boolean; revision: WorkflowRevisionMeta; activeRevision?: number | null }>('/config/profiles/material_master/rollback', { targetRevision, reason });
    return res;
  },
};
