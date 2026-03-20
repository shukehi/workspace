export type BomUsage = {
    single: number;
    double: number;
    paired: number;
};

export type BomRow = {
    materialId: string;
    position: string;
    materialCategory: string;
    supplier: string;
    usage: BomUsage;
};

export type FormulaPayload = {
    formulaKey: string;
    displayName: string;
    bom: BomRow[];
};

export type ValidationError = {
    field: string;
    message: string;
};

export const VALID_BOM_CATEGORIES = new Set(['转印纸', '油漆', '塑粉']);

export function normalizeBom(input: unknown): BomRow[] {
    if (!Array.isArray(input)) return [];
    return input.map((item: any) => ({
        materialId: String(item?.materialId || '').trim(),
        position: String(item?.position || '').trim(),
        materialCategory: String(item?.materialCategory || '').trim(),
        supplier: String(item?.supplier || '').trim(),
        usage: {
            single: Number(item?.usage?.single ?? 0),
            double: Number(item?.usage?.double ?? 0),
            paired: Number(item?.usage?.paired ?? 0),
        }
    }));
}

export function filterMeaningfulBomRows(bom: unknown): BomRow[] {
    return normalizeBom(bom).filter((row) => {
        const hasUsage = Number(row?.usage?.single || 0) > 0
            || Number(row?.usage?.double || 0) > 0
            || Number(row?.usage?.paired || 0) > 0;
        return Boolean(row.materialId || row.position || row.materialCategory || row.supplier || hasUsage);
    });
}

export function parsePayload(payloadText: unknown): FormulaPayload {
    try {
        const parsed = JSON.parse(String(payloadText || '{}'));
        return {
            formulaKey: String(parsed.formulaKey || '').trim(),
            displayName: String(parsed.displayName || '').trim(),
            bom: normalizeBom(parsed.bom || [])
        };
    } catch {
        return { formulaKey: '', displayName: '', bom: [] };
    }
}

export function serializePayload({ formulaKey, displayName, bom }: Partial<FormulaPayload>): string {
    return JSON.stringify({
        formulaKey: String(formulaKey || '').trim(),
        displayName: String(displayName || '').trim(),
        bom: normalizeBom(bom)
    });
}

export function validateBaseFields({ formulaKey, displayName }: Partial<FormulaPayload>): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!String(formulaKey || '').trim()) {
        errors.push({ field: 'formulaKey', message: '配方编码不能为空' });
    }
    if (!String(displayName || '').trim()) {
        errors.push({ field: 'displayName', message: '配方名称不能为空' });
    }
    return errors;
}

export function validateBomRows({
    bom,
    allowEmptyBom = false,
    materialCodeSet = null
}: {
    bom: unknown;
    allowEmptyBom?: boolean;
    materialCodeSet?: Set<string> | null;
}): ValidationError[] {
    const rows = normalizeBom(bom);
    const errors: ValidationError[] = [];

    if (!Array.isArray(rows) || rows.length === 0) {
        if (!allowEmptyBom) {
            errors.push({ field: 'bom', message: 'BOM 不能为空' });
        }
        return errors;
    }

    const seen = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.materialId) {
            errors.push({ field: `bom[${i}].materialId`, message: '型号不能为空' });
        }
        if (!row.position) {
            errors.push({ field: `bom[${i}].position`, message: '位置不能为空' });
        }
        if (!row.materialCategory || !VALID_BOM_CATEGORIES.has(row.materialCategory)) {
            errors.push({ field: `bom[${i}].materialCategory`, message: '类别必须是: 转印纸/油漆/塑粉' });
        }
        if (!row.supplier) {
            errors.push({ field: `bom[${i}].supplier`, message: '供应商不能为空' });
        }

        (['single', 'double', 'paired'] as const).forEach((key) => {
            const val = Number(row?.usage?.[key]);
            if (Number.isNaN(val) || val < 0) {
                errors.push({ field: `bom[${i}].usage.${key}`, message: '用量必须为非负数' });
            }
        });

        const dupKey = `${row.materialId}::${row.position}`;
        if (seen.has(dupKey)) {
            errors.push({ field: `bom[${i}]`, message: '存在重复物料+位置组合' });
        }
        seen.add(dupKey);
    }

    if (materialCodeSet) {
        const materialIds = [...new Set(rows.map((item) => item.materialId).filter(Boolean))];
        for (const materialId of materialIds) {
            if (!materialCodeSet.has(materialId)) {
                errors.push({ field: 'bom', message: `物料不存在: ${materialId}` });
            }
        }
    }

    return errors;
}
