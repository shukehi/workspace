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

export const mappingConfigApi = {
  load<T>(endpoint: string) {
    return api.get<T>(endpoint);
  },
  save<T>(endpoint: string, payload: T) {
    return api.put<MappingSaveResponse<T>>(endpoint, payload);
  },
  async loadWorkflow<T>(profileCode: string, basePath = '/config/mappings'): Promise<MappingWorkflowDetail<T>> {
    const [res, logsRes] = await Promise.all([
      api.get<{
        success: boolean;
        mapping?: any;
        catalog?: any;
      }>(`${basePath}/${profileCode}/detail`),
      api.get<{
        success: boolean;
        items: any[];
      }>(`${basePath}/${profileCode}/audit-logs`)
    ]);

    // 处理不同后端返回字段不一致的情况 (mapping vs catalog)
    const data = res.mapping || res.catalog;
    const payload = (data.draftPayload || data.publishedPayload || {}) as T;
    return {
      payload,
      latestRevision: data.latestRevision?.revision ?? 0,
      draftRevision: data.draftRevision?.revision ?? null,
      publishedRevision: data.publishedRevision?.revision ?? null,
      auditLogs: Array.isArray(logsRes.items) ? logsRes.items : [],
    };
  },
  async saveWorkflow<T>(profileCode: string, payload: T, latestRevision: number, basePath = '/config/mappings'): Promise<MappingSaveResponse<T>> {
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
  }
};
