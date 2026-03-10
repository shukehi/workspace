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
}

export const mappingConfigApi = {
  load<T>(endpoint: string) {
    return api.get<T>(endpoint);
  },
  save<T>(endpoint: string, payload: T) {
    return api.put<MappingSaveResponse<T>>(endpoint, payload);
  },
  async loadWorkflow<T>(profileCode: string): Promise<MappingWorkflowDetail<T>> {
    const res = await api.get<{
      success: boolean;
      mapping: {
        latestRevision: { revision: number } | null;
        draftRevision: { revision: number } | null;
        publishedRevision: { revision: number } | null;
        draftPayload: T | null;
        publishedPayload: T | null;
      };
    }>(`/config/mappings/${profileCode}/detail`);

    const mapping = res.mapping;
    const payload = (mapping.draftPayload || mapping.publishedPayload || {}) as T;
    return {
      payload,
      latestRevision: mapping.latestRevision?.revision ?? 0,
      draftRevision: mapping.draftRevision?.revision ?? null,
      publishedRevision: mapping.publishedRevision?.revision ?? null,
    };
  },
  async saveWorkflow<T>(profileCode: string, payload: T, latestRevision: number): Promise<MappingSaveResponse<T>> {
    const draftRes = await api.put<{
      success: boolean;
      revision: { revision: number };
    }>(`/config/mappings/${profileCode}/draft`, {
      revision: latestRevision,
      payload,
      changeNote: 'workflow config editor save',
    });

    const publishRes = await api.post<{
      success: boolean;
      revision: { revision: number };
    }>(`/config/mappings/${profileCode}/publish`, {
      fromRevision: draftRes.revision.revision,
      changeNote: 'workflow config editor publish',
    });

    return {
      ok: true,
      data: payload,
      latestRevision: publishRes.revision.revision
    };
  }
};
