
export interface FormulaUsage {
    single: number;
    double: number;
    paired: number;
}

export interface FormulaBOMItem {
    materialId: string;
    position: string;
    usage: FormulaUsage;
}

export interface LegacyFormula {
    displayName: string;
    category: string;
    bom: FormulaBOMItem[];
}

export interface ColorFormula {
    id: string; // The Key (e.g. "7233")
    product_code: string; // displayName
    formula_name: string; // displayName
    category: string;
    material_count: number;
    version: string;
    status: 'active' | 'archived';
}
