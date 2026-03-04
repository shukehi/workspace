import { api } from '@/lib/api';
import type {
  FormulaBOMItem,
  FormulaDetail,
  FormulaListResponse,
  FormulaRevisionMeta,
  FormulaSummary
} from '@/types/formula';

interface FormulaDetailResponse {
  formula: FormulaDetail;
  draftRevision: FormulaRevisionMeta | null;
  publishedRevision: FormulaRevisionMeta | null;
}

interface MutationError {
  field: string;
  message: string;
}

interface MutationResponse {
  success: boolean;
  errors?: MutationError[];
  latestRevision?: number | null;
}

export const formulaApi = {
  list(params: { keyword?: string; status?: string; page?: number; pageSize?: number }) {
    return api.get<FormulaListResponse>('/config/formulas', { params });
  },
  detail(formulaKey: string) {
    return api.get<FormulaDetailResponse>(`/config/formulas/${encodeURIComponent(formulaKey)}`);
  },
  create(payload: {
    formulaKey: string;
    displayName: string;
    bom: FormulaBOMItem[];
    changeNote?: string;
  }) {
    return api.post<{ success: boolean; formula: FormulaSummary; revision: FormulaRevisionMeta }>('/config/formulas', payload);
  },
  updateDraft(formulaKey: string, payload: {
    revision: number;
    formulaKey: string;
    displayName: string;
    bom: FormulaBOMItem[];
    changeNote?: string;
  }) {
    return api.put<{ success: boolean; revision: FormulaRevisionMeta } & MutationResponse>(
      `/config/formulas/${encodeURIComponent(formulaKey)}/draft`,
      payload
    );
  },
  publish(formulaKey: string, payload: { fromRevision: number; changeNote?: string }) {
    return api.post<{ success: boolean; revision: FormulaRevisionMeta } & MutationResponse>(
      `/config/formulas/${encodeURIComponent(formulaKey)}/publish`,
      payload
    );
  },
  archive(formulaKey: string, payload: { reason?: string }) {
    return api.post<{ success: boolean } & MutationResponse>(
      `/config/formulas/${encodeURIComponent(formulaKey)}/archive`,
      payload
    );
  },
  rollback(formulaKey: string, payload: { targetRevision: number; reason?: string }) {
    return api.post<{ success: boolean; revision: number } & MutationResponse>(
      `/config/formulas/${encodeURIComponent(formulaKey)}/rollback`,
      payload
    );
  },
  remove(formulaKey: string, payload: { reason?: string }) {
    return api.delete<{ success: boolean } & MutationResponse>(
      `/config/formulas/${encodeURIComponent(formulaKey)}`,
      { data: payload }
    );
  },
  revisions(formulaKey: string) {
    return api.get<{ success: boolean; items: FormulaRevisionMeta[] }>(
      `/config/formulas/${encodeURIComponent(formulaKey)}/revisions`
    );
  }
};

export type { FormulaDetailResponse, MutationError, MutationResponse };
