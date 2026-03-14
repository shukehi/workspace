export type InventoryReceiptDirection = 'in' | 'reversal';

export interface MaterialAttributes {
    id: number;
    code: string;
    name: string;
    model?: string | null;
    supplier?: string | null;
    unit: string;
    price: number;
    category?: string | null;
    package_spec?: string | null;
    stock_quantity: number;
    min_stock: number;
    aliases: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface MaterialCreationAttributes {
    id?: number;
    code: string;
    name: string;
    model?: string | null;
    supplier?: string | null;
    unit?: string;
    price?: number;
    category?: string | null;
    package_spec?: string | null;
    stock_quantity?: number;
    min_stock?: number;
    aliases?: string[];
}

export interface OrderMetadata {
    customer_name?: string;
    internal_name?: string;
    external_name?: string;
    order_source?: 'auto' | 'manual';
    source_contract_code?: string;
    [key: string]: unknown;
}

export interface OrderAttributes {
    id: number;
    order_no: string;
    supplier?: string | null;
    source_contract_code?: string | null;
    dedupe_key?: string | null;
    category?: string | null;
    status: string;
    remark: string;
    metadata: OrderMetadata;
    created_at: Date;
    updated_at?: Date;
    delivery_date?: Date | null;
    arrived_at?: Date | null;
    arrived_by?: string | null;
    arrived_remark: string;
    stocked_in_at?: Date | null;
    stocked_in_by?: string | null;
    stocked_in_remark: string;
}

export interface OrderCreationAttributes {
    id?: number;
    order_no: string;
    supplier?: string | null;
    source_contract_code?: string | null;
    dedupe_key?: string | null;
    category?: string | null;
    status?: string;
    remark?: string;
    metadata?: OrderMetadata;
    created_at?: Date | string;
    delivery_date?: Date | string | null;
    arrived_at?: Date | string | null;
    arrived_by?: string | null;
    arrived_remark?: string;
    stocked_in_at?: Date | string | null;
    stocked_in_by?: string | null;
    stocked_in_remark?: string;
}

export interface OrderItemAttributes {
    id: number;
    order_id: number;
    material_id?: string | null;
    name: string;
    supplier?: string | null;
    internal_name?: string | null;
    external_name?: string | null;
    type?: string | null;
    spec?: string | null;
    mb?: string | null;
    eccentricity?: string | null;
    model?: string | null;
    quantity: number;
    ordered_quantity: number;
    received_quantity: number;
    quantity_left?: number | null;
    quantity_right?: number | null;
    unit?: string | null;
    price: number;
    remark?: string | null;
}

export interface OrderItemCreationAttributes {
    id?: number;
    order_id: number;
    material_id?: string | null;
    name: string;
    supplier?: string | null;
    internal_name?: string | null;
    external_name?: string | null;
    type?: string | null;
    spec?: string | null;
    mb?: string | null;
    eccentricity?: string | null;
    model?: string | null;
    quantity?: number;
    ordered_quantity?: number;
    received_quantity?: number;
    quantity_left?: number | null;
    quantity_right?: number | null;
    unit?: string | null;
    price?: number;
    remark?: string | null;
}

export interface InventoryReceiptAttributes {
    id: number;
    order_id: number;
    order_no: string;
    order_item_id?: number | null;
    direction: InventoryReceiptDirection;
    source_receipt_id?: number | null;
    reverse_reason?: string | null;
    material_id: string;
    item_name: string;
    supplier?: string | null;
    quantity: number;
    unit?: string | null;
    receipt_date: Date;
    operator?: string | null;
    remark: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface InventoryReceiptCreationAttributes {
    id?: number;
    order_id: number;
    order_no: string;
    order_item_id?: number | null;
    direction?: InventoryReceiptDirection;
    source_receipt_id?: number | null;
    reverse_reason?: string | null;
    material_id: string;
    item_name: string;
    supplier?: string | null;
    quantity?: number;
    unit?: string | null;
    receipt_date: Date | string;
    operator?: string | null;
    remark?: string;
}

export interface OrderIdempotencyKeyAttributes {
    id: number;
    scope: string;
    source_contract_code: string;
    dedupe_key: string;
    order_id: number;
    active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface OrderIdempotencyKeyCreationAttributes {
    id?: number;
    scope?: string;
    source_contract_code: string;
    dedupe_key: string;
    order_id: number;
    active?: boolean;
}

export interface OrderWithItemsAttributes extends OrderAttributes {
    items?: OrderItemAttributes[];
}

export interface InventoryReceiptWithOrderAttributes extends InventoryReceiptAttributes {
    order?: OrderAttributes;
}
