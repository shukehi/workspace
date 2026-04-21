import { api } from '@/lib/api';
import type { MappingValidationIssue } from '@/types/mapping';

export interface MappingSaveResponse<T> {
  ok: boolean;
  data?: T;
  errors?: MappingValidationIssue[];
  latestRevision?: number | null;
}

export interface MappingWorkflowDetail<T> {
  payload: T;
  latestRevision: number;
  draftRevision: number | null;
  publishedRevision: number | null;
  auditLogs: Array<{
    id: number;
    action: string;
    fromRevision: number | null;
    toRevision: number | null;
    operator: string;
    meta: Record<string, any>;
    createdAt: string;
  }>;
}

export interface MappingWorkflowDiff {
  profileCode: string;
  supported: boolean;
  draftRevision: number | null;
  publishedRevision: number | null;
  hasChanges: boolean;
  items: Array<{
    path: string;
    kind: 'added' | 'removed' | 'changed';
    before?: unknown;
    after?: unknown;
  }>;
}

export interface MappingWorkflowImpact {
  profileCode: string;
  supported: boolean;
  draftRevision: number | null;
  publishedRevision: number | null;
  hasChanges: boolean;
  totalChanges: number;
  counts: {
    added: number;
    removed: number;
    changed: number;
  };
  topPaths: Array<{
    path: string;
    kind: 'added' | 'removed' | 'changed';
  }>;
}

export interface MappingWorkflowReplay {
  profileCode: string;
  supported: boolean;
  sampleSource: string;
  sampleCount: number;
  changedSampleCount: number;
  items: Array<{
    id: string;
    label: string;
    changed: boolean;
    before: {
      counts: Record<string, number>;
      changedSections: string[];
    };
    after: {
      counts: Record<string, number>;
      changedSections: string[];
    };
  }>;
}

export interface MappingWorkflowReferenceCheck {
  profileCode: string;
  supplierRefs: string[];
  materialCodeRefs: string[];
  missingMaterialCodes: string[];
  suppliersMissingInMaterialMaster: string[];
  suppliersMissingInSupplierMaster: string[];
  unlinkedMaterialCount?: number;
  unlinkedMaterialItems?: Array<{ path: string; code: string; supplier: string; supplier_master_id: number | null }>;
  inactiveLinkedSupplierCount?: number;
  inactiveLinkedSuppliers?: Array<{ path: string; supplierName: string; linkedMaterialCount: number; status: string }>;
  hasIssues: boolean;
}

export interface SupplierMasterEntry {
  id?: number | null;
  supplierName: string;
  normalizedName: string;
  status?: string;
  sourceNote?: string;
  sources: string[];
  materialCount: number;
  linkedMaterialCount: number;
  linkedMaterialCodes: string[];
  hasLinkedMaterialsWhileInactive: boolean;
  persisted: boolean;
}

export const mappingConfigApi = {
  load<T>(endpoint: string) {
    return api.get<T>(endpoint);
  },
  save<T>(endpoint: string, payload: T) {
    return api.put<MappingSaveResponse<T>>(endpoint, payload);
  },
  async loadWorkflow<T>(profileCode: string, basePath = '/config/profiles'): Promise<MappingWorkflowDetail<T>> {
    const [res, logsRes] = await Promise.all([
      api.get<{
        success: boolean;
        mapping?: any;
        catalog?: any;
        detail?: any;
      }>(`${basePath}/${profileCode}/detail`),
      api.get<{
        success: boolean;
        items: any[];
      }>(`${basePath}/${profileCode}/audit-logs`)
    ]);

    // 处理不同后端返回字段不一致的情况 (mapping vs catalog vs unified detail)
    const data = res.detail || res.mapping || res.catalog;
    const payload = (data.draftPayload || data.publishedPayload || {}) as T;
    return {
      payload,
      latestRevision: data.latestRevision?.revision ?? 0,
      draftRevision: data.draftRevision?.revision ?? null,
      publishedRevision: data.publishedRevision?.revision ?? null,
      auditLogs: Array.isArray(logsRes.items) ? logsRes.items : [],
    };
  },
  async saveWorkflow<T>(profileCode: string, payload: T, latestRevision: number, basePath = '/config/profiles'): Promise<MappingSaveResponse<T>> {
    const draftRes = await api.put<{
      success: boolean;
      revision: { revision: number };
    }>(`${basePath}/${profileCode}/draft`, {
      revision: latestRevision,
      payload,
      changeNote: (payload as any)._changeNote || 'workflow config editor save',
    });

    const publishRes = await api.post<{
      success: boolean;
      revision: { revision: number };
    }>(`${basePath}/${profileCode}/publish`, {
      fromRevision: draftRes.revision.revision,
      changeNote: (payload as any)._changeNote || 'workflow config editor publish',
    });

    return {
      ok: true,
      data: payload,
      latestRevision: publishRes.revision.revision
    };
  },
  async loadWorkflowDiff(profileCode: string, basePath = '/config/profiles'): Promise<MappingWorkflowDiff | null> {
    try {
      const res = await api.get<{
        success: boolean;
        diff?: MappingWorkflowDiff;
      }>(`${basePath}/${profileCode}/diff`);
      return res.diff || null;
    } catch (error: any) {
      if (error?.response?.status === 405 || error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
  async loadWorkflowImpact(profileCode: string, basePath = '/config/profiles'): Promise<MappingWorkflowImpact | null> {
    try {
      const res = await api.get<{
        success: boolean;
        impact?: MappingWorkflowImpact;
      }>(`${basePath}/${profileCode}/impact`);
      return res.impact || null;
    } catch (error: any) {
      if (error?.response?.status === 405 || error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
  async loadWorkflowReplay(profileCode: string, basePath = '/config/profiles'): Promise<MappingWorkflowReplay | null> {
    try {
      const res = await api.get<{
        success: boolean;
        replay?: MappingWorkflowReplay;
      }>(`${basePath}/${profileCode}/replay`);
      return res.replay || null;
    } catch (error: any) {
      if (error?.response?.status === 405 || error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
  async loadWorkflowReferenceCheck(profileCode: string, basePath = '/config/profiles'): Promise<MappingWorkflowReferenceCheck | null> {
    try {
      const res = await api.get<{
        success: boolean;
        check?: MappingWorkflowReferenceCheck;
      }>(`${basePath}/${profileCode}/reference-check`);
      return res.check || null;
    } catch (error: any) {
      if (error?.response?.status === 405 || error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
  async loadSupplierMaster(basePath = '/config/masters'): Promise<SupplierMasterEntry[]> {
    const res = await api.get<{
      success: boolean;
      items: SupplierMasterEntry[];
    }>(`${basePath}/suppliers`);
    return Array.isArray(res.items) ? res.items : [];
  }
};
