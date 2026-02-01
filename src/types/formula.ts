export interface FormulaMaterial {
    material_id: string;
    name: string;
    quantity: number;
    unit: string;
}

export interface ColorFormula {
    id: string;
    formula_name: string;
    product_code: string;
    version: string;
    materials: FormulaMaterial[];
    created_at: string;
    status: 'active' | 'archived';
}
