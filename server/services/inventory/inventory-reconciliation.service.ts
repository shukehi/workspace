type ReconciliationBalance = {
    quantity?: number | null;
    warehouse?: {
        code?: string | null;
        name?: string | null;
    } | null;
    location?: {
        code?: string | null;
        name?: string | null;
    } | null;
};

type ReconciliationMaterial = {
    id: number;
    code?: string | null;
    name?: string | null;
    model?: string | null;
    unit?: string | null;
    stock_quantity?: number | null;
    locationBalances?: ReconciliationBalance[] | null;
};

export type InventoryReconciliationRow = {
    material_id: number;
    material_code: string;
    material_name: string;
    material_model: string;
    unit: string;
    stock_quantity: number;
    location_total: number;
    diff_quantity: number;
    suggested_delta: number;
    suggested_target: string;
};

export type InventoryReconciliationReport = {
    scannedMaterials: number;
    mismatchedMaterials: number;
    matchedMaterials: number;
    totalAbsoluteDiff: number;
    rows: InventoryReconciliationRow[];
};

function toNumber(value: unknown): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
}

function buildSuggestedTarget(material: ReconciliationMaterial): string {
    const firstPositiveBalance = (material.locationBalances || []).find((balance) => toNumber(balance.quantity) > 0);
    if (firstPositiveBalance) {
        return [
            firstPositiveBalance.warehouse?.name || firstPositiveBalance.warehouse?.code || 'DEFAULT',
            firstPositiveBalance.location?.name || firstPositiveBalance.location?.code || 'UNASSIGNED',
        ].join(' / ');
    }
    return 'DEFAULT / UNASSIGNED';
}

export function buildInventoryReconciliationReport(materials: ReconciliationMaterial[]): InventoryReconciliationReport {
    const rows = materials.map((material) => {
        const stockQuantity = toNumber(material.stock_quantity);
        const locationTotal = (material.locationBalances || []).reduce((sum, balance) => sum + toNumber(balance.quantity), 0);
        const diffQuantity = stockQuantity - locationTotal;

        return {
            material_id: Number(material.id || 0),
            material_code: String(material.code || ''),
            material_name: String(material.name || ''),
            material_model: String(material.model || ''),
            unit: String(material.unit || ''),
            stock_quantity: stockQuantity,
            location_total: locationTotal,
            diff_quantity: diffQuantity,
            suggested_delta: diffQuantity,
            suggested_target: buildSuggestedTarget(material),
        } satisfies InventoryReconciliationRow;
    });

    const mismatchedRows = rows.filter((row) => row.diff_quantity !== 0);

    return {
        scannedMaterials: rows.length,
        mismatchedMaterials: mismatchedRows.length,
        matchedMaterials: rows.length - mismatchedRows.length,
        totalAbsoluteDiff: mismatchedRows.reduce((sum, row) => sum + Math.abs(row.diff_quantity), 0),
        rows: mismatchedRows.sort((a, b) => Math.abs(b.diff_quantity) - Math.abs(a.diff_quantity) || a.material_id - b.material_id),
    };
}
