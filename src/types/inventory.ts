export interface InventoryLocationSummary {
    warehouseId: number;
    warehouseName: string;
    locationId: number;
    locationCode: string;
    locationName: string;
    quantity: number;
}

export interface InventoryItem {
    id: number;
    code: string;
    category: string;
    model: string;
    name: string;
    stock_quantity: number;
    price?: number;
    unit: string;
    supplier: string;
    last_updated: string;
    min_stock?: number;
    locations: InventoryLocationSummary[];
}

export interface Warehouse {
    id: number;
    code: string;
    name: string;
    status: 'active' | 'inactive';
    remark?: string;
}

export interface InventoryLocation {
    id: number;
    code: string;
    name: string;
    warehouse_id: number;
    warehouse_code: string;
    warehouse_name: string;
    status: 'active' | 'inactive';
    remark?: string;
    sort_order: number;
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
    warehouse_id: number;
    warehouse_name?: string | null;
    location_id: number;
    location_code?: string | null;
    location_name?: string | null;
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

export interface InventoryOutboundItem {
    id: number;
    outbound_id: number;
    material_id: number;
    material_code: string;
    item_name: string;
    unit?: string | null;
    quantity: number;
}

export interface InventoryOutbound {
    id: number;
    outbound_no: string;
    direction: 'out' | 'reversal';
    source_outbound_id?: number | null;
    warehouse_id: number;
    warehouse_name: string;
    location_id: number;
    location_code: string;
    location_name: string;
    operator?: string | null;
    reason: string;
    remark?: string | null;
    status: 'posted' | 'reversed';
    outbound_date: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    can_reverse?: boolean;
    items: InventoryOutboundItem[];
}

export interface InventoryLocationListResponse {
    warehouses: Warehouse[];
    locations: InventoryLocation[];
}

export interface InventoryOutboundListResponse {
    rows: InventoryOutbound[];
    total: number;
    page: number;
    pageSize: number;
}

export interface InventoryAdjustment {
    id: number;
    source_type: 'manual_adjustment';
    source_id: string;
    source_line_key: string;
    material_id: number;
    material_code: string;
    material_name: string;
    warehouse_id: number;
    warehouse_name: string;
    location_id: number;
    location_code: string;
    location_name: string;
    delta_quantity: number;
    balance_after: number;
    stock_after: number;
    reason: string;
    operator?: string | null;
    remark?: string | null;
    occurred_at: string | null;
}

export interface InventoryAdjustmentPayload {
    material_id: number;
    warehouse_id: number;
    location_id: number;
    operation_key: string;
    delta_quantity: number;
    reason: string;
    operator?: string;
    remark?: string;
    occurred_at?: string;
}

export interface InventoryAdjustmentResponse {
    movement: InventoryAdjustment;
    item: InventoryItem;
}

export interface InventoryMovement {
    id: number;
    source_type: 'manual_adjustment' | 'receipt_in' | 'receipt_reversal' | 'outbound' | 'outbound_reversal' | string;
    source_id: string;
    source_line_key: string;
    material_id: number;
    material_code: string;
    material_name: string;
    warehouse_id: number;
    warehouse_name: string;
    location_id: number;
    location_code: string;
    location_name: string;
    delta_quantity: number;
    balance_after: number;
    stock_after: number;
    reason: string;
    operator?: string | null;
    remark?: string | null;
    occurred_at: string | null;
    created_at?: string | null;
}

export interface InventoryMovementListResponse {
    rows: InventoryMovement[];
    total: number;
    page: number;
    pageSize: number;
}
