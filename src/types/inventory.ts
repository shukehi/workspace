export interface InventoryItem {
    id: number;
    category: string;
    model: string;
    name: string;
    stock_quantity: number;
    unit: string;
    supplier: string;
    last_updated: string;
    min_stock?: number; // Pre-warning level
}

export interface InventoryReceipt {
    id: number;
    order_id: number;
    order_no: string;
    order_item_id?: number | null;
    direction?: 'in' | 'reversal';
    source_receipt_id?: number | null;
    reverse_reason?: string | null;
    reversed_quantity?: number | null;
    reversible_quantity?: number | null;
    material_id: string;
    item_name: string;
    supplier?: string | null;
    quantity: number;
    unit?: string | null;
    receipt_date: string | null;
    operator?: string | null;
    remark?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}
