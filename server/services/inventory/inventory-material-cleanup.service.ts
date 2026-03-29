export type ZeroStockCleanupInput = {
    id: number;
    code?: string | null;
    name?: string | null;
    model?: string | null;
    stock_quantity?: number | null;
    blockers: {
        location_balances: number;
        inventory_movements: number;
        inventory_outbound_items: number;
        inventory_receipts: number;
        order_items: number;
    };
};

export type ZeroStockCleanupCandidate = {
    id: number;
    code: string;
    name: string;
    model: string;
    stock_quantity: number;
    reason: string;
};

export function buildZeroStockCleanupPlan(inputs: ZeroStockCleanupInput[]) {
    const candidates: ZeroStockCleanupCandidate[] = [];
    const blocked: Array<ZeroStockCleanupCandidate & { blockers: ZeroStockCleanupInput['blockers'] }> = [];

    for (const item of inputs) {
        const row: ZeroStockCleanupCandidate = {
            id: Number(item.id || 0),
            code: String(item.code || ''),
            name: String(item.name || ''),
            model: String(item.model || ''),
            stock_quantity: Number(item.stock_quantity || 0),
            reason: 'zero_stock_and_unreferenced',
        };

        if (Object.values(item.blockers).every((value) => Number(value || 0) === 0)) {
            candidates.push(row);
        } else {
            blocked.push({ ...row, blockers: item.blockers });
        }
    }

    return {
        scanned: inputs.length,
        candidates,
        blocked,
    };
}
