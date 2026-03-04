
export interface FormulaUsage {
    single: number;
    double: number;
    paired: number;
}

export interface FormulaBOMItem {
    materialId: string;
    position: string;
    materialCategory: '转印纸' | '油漆' | '塑粉' | '';
    supplier: string;
    usage: FormulaUsage;
}

export interface LegacyFormula {
    displayName: string;
    category?: string;
    bom: FormulaBOMItem[];
}

export type FormulaStatus = 'draft' | 'published' | 'archived';

export interface FormulaSummary {
    id: number;
    formulaKey: string;
    displayName: string;
    status: FormulaStatus;
    activeRevision: number | null;
    updatedAt: string;
}

export interface FormulaRevisionMeta {
    id: number;
    revision: number;
    state: FormulaStatus;
    changeNote?: string;
    createdBy: string;
    createdAt: string;
}

export interface FormulaDetail {
    id: number;
    formulaKey: string;
    displayName: string;
    status: FormulaStatus;
    activeRevision: number | null;
    bom: FormulaBOMItem[];
    updatedAt: string;
}

export interface FormulaListResponse {
    items: FormulaSummary[];
    total: number;
    page: number;
    pageSize: number;
}
