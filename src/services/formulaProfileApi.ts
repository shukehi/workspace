import { api } from '@/lib/api';
import type {
  FormulaBOMItem,
  FormulaDetail,
  FormulaListResponse,
  FormulaRevisionMeta,
  FormulaSummary,
} from '@/types/formula';
import type { MappingWorkflowDiff, MappingWorkflowImpact, MappingWorkflowReplay, MappingWorkflowReferenceCheck, SupplierMasterEntry } from '@/services/mappingConfigApi';
import type {
  FormulaBomRecommendation as SharedFormulaBomRecommendation,
  FormulaBomRecommendationResponse,
  FormulaBomRecommendationWarning,
} from '@/shared/types/formulaRecommendation';
import type { FormulaBomMetadata, FormulaBomMetadataResponse } from '@/shared/types/formulaBom';

export type MutationError = {
  field: string;
  message: string;
};

export type MutationResponse = {
  success: boolean;
  errors?: MutationError[];
  latestRevision?: number | null;
};

export interface FormulaCollectionProfileDetail {
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
    previewItems: FormulaSummary[];
  };
  publishedPayload: Record<string, unknown>;
}

export type { FormulaBomRecommendationWarning };
export type FormulaBomRecommendation = SharedFormulaBomRecommendation<FormulaBOMItem>;
export type { FormulaBomMetadata };

export const formulaProfileApi = {
  async profileDetail(): Promise<FormulaCollectionProfileDetail> {
    const response = await api.get<{
      success: boolean;
      detail: FormulaCollectionProfileDetail;
    }>('/config/profiles/formulas/detail');
    return response.detail;
  },

  async profileDiff(): Promise<MappingWorkflowDiff | null> {
    const res = await api.get<{ success: boolean; diff?: MappingWorkflowDiff }>('/config/profiles/formulas/diff');
    return res.diff || null;
  },

  async profileImpact(): Promise<MappingWorkflowImpact | null> {
    const res = await api.get<{ success: boolean; impact?: MappingWorkflowImpact }>('/config/profiles/formulas/impact');
    return res.impact || null;
  },

  async profileReplay(): Promise<MappingWorkflowReplay | null> {
    const res = await api.get<{ success: boolean; replay?: MappingWorkflowReplay }>('/config/profiles/formulas/replay');
    return res.replay || null;
  },

  async profileReferenceCheck(): Promise<MappingWorkflowReferenceCheck | null> {
    const res = await api.get<{ success: boolean; check?: MappingWorkflowReferenceCheck }>('/config/profiles/formulas/reference-check');
    return res.check || null;
  },

  async supplierMaster(): Promise<SupplierMasterEntry[]> {
    const res = await api.get<{ success: boolean; items: SupplierMasterEntry[] }>('/config/masters/suppliers');
    return Array.isArray(res.items) ? res.items : [];
  },

  list(params: { keyword?: string; status?: string; page?: number; pageSize?: number }): Promise<FormulaListResponse> {
    return api.get<FormulaListResponse>('/config/profiles/formulas/items', { params });
  },

  async metadata(): Promise<FormulaBomMetadata> {
    const res = await api.get<FormulaBomMetadataResponse>('/config/profiles/formulas/metadata');
    return res.metadata;
  },

  async bomRecommendation(params: { sourceFormulaKey?: string } = {}): Promise<FormulaBomRecommendation> {
    const res = await api.get<FormulaBomRecommendationResponse<FormulaBOMItem>>(
      '/config/profiles/formulas/bom-recommendations',
      { params }
    );
    return res.recommendation;
  },

  detail(formulaKey: string): Promise<{
    formula: FormulaDetail;
    draftRevision: FormulaRevisionMeta | null;
    publishedRevision: FormulaRevisionMeta | null;
  }> {
    return api.get<{ success: boolean; formula: FormulaDetail; draftRevision: FormulaRevisionMeta | null; publishedRevision: FormulaRevisionMeta | null }>(
      `/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}`
    );
  },

  create(payload: {
    formulaKey: string;
    displayName: string;
    bom: FormulaBOMItem[];
    changeNote?: string;
  }): Promise<{ success: boolean; formula: FormulaSummary; revision: FormulaRevisionMeta }> {
    return api.post<{ success: boolean; formula: FormulaSummary; revision: FormulaRevisionMeta }>(
      '/config/profiles/formulas/items',
      payload
    );
  },

  updateDraft(formulaKey: string, payload: {
    revision: number;
    formulaKey: string;
    displayName: string;
    bom: FormulaBOMItem[];
    changeNote?: string;
  }): Promise<{ success: boolean; revision: FormulaRevisionMeta } & MutationResponse> {
    return api.put<{ success: boolean; revision: FormulaRevisionMeta } & MutationResponse>(
      `/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}/draft`,
      payload
    );
  },

  publish(formulaKey: string, payload: { fromRevision: number; changeNote?: string }): Promise<{ success: boolean; revision: FormulaRevisionMeta } & MutationResponse> {
    return api.post<{ success: boolean; revision: FormulaRevisionMeta } & MutationResponse>(
      `/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}/publish`,
      payload
    );
  },

  archive(formulaKey: string, payload: { reason?: string }): Promise<{ success: boolean } & MutationResponse> {
    return api.post<{ success: boolean } & MutationResponse>(
      `/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}/archive`,
      payload
    );
  },

  rollback(formulaKey: string, payload: { targetRevision: number; reason?: string }): Promise<{ success: boolean; revision: number } & MutationResponse> {
    return api.post<{ success: boolean; revision: number } & MutationResponse>(
      `/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}/rollback`,
      payload
    );
  },

  remove(formulaKey: string, payload: { reason?: string }): Promise<{ success: boolean } & MutationResponse> {
    return api.delete<{ success: boolean } & MutationResponse>(
      `/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}`,
      { data: payload }
    );
  },

  revisions(formulaKey: string): Promise<{ success: boolean; items: FormulaRevisionMeta[] }> {
    return api.get<{ success: boolean; items: FormulaRevisionMeta[] }>(
      `/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}/revisions`
    );
  },
};
