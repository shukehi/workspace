export type InventoryReceiptDirection = 'in' | 'reversal';
export type FormulaStatus = 'draft' | 'published' | 'archived';
export type FormulaRevisionState = 'draft' | 'published' | 'archived';
export type MappingProfileCode = 'packaging' | 'cylinder' | 'lock' | 'lock_fork' | 'handle';
export type MappingProfileStatus = 'active' | 'inactive';
export type MappingRevisionState = 'draft' | 'published' | 'archived';
export type MappingUnmatchedEventStatus = 'open' | 'resolved' | 'ignored';
export type MaterialCatalogProfileCode = 'materials';
export type MaterialCatalogProfileStatus = 'active';
export type MaterialCatalogRevisionState = 'draft' | 'published' | 'archived';

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

export interface FormulaDefinitionAttributes {
    id: number;
    formula_key: string;
    display_name: string;
    category: string;
    status: FormulaStatus;
    active_revision?: number | null;
    created_at?: Date;
    updated_at?: Date;
}

export interface FormulaDefinitionCreationAttributes {
    id?: number;
    formula_key: string;
    display_name: string;
    category?: string;
    status?: FormulaStatus;
    active_revision?: number | null;
}

export interface FormulaRevisionAttributes {
    id: number;
    formula_id: number;
    revision: number;
    state: FormulaRevisionState;
    payload_json: string;
    change_note?: string | null;
    created_by: string;
    created_at?: Date;
}

export interface FormulaRevisionCreationAttributes {
    id?: number;
    formula_id: number;
    revision: number;
    state?: FormulaRevisionState;
    payload_json: string;
    change_note?: string | null;
    created_by?: string;
}

export interface FormulaAuditLogAttributes {
    id: number;
    formula_id: number;
    action: string;
    from_revision?: number | null;
    to_revision?: number | null;
    operator: string;
    meta_json?: string | null;
    created_at?: Date;
}

export interface FormulaAuditLogCreationAttributes {
    id?: number;
    formula_id: number;
    action: string;
    from_revision?: number | null;
    to_revision?: number | null;
    operator?: string;
    meta_json?: string | null;
}

export interface MappingProfileAttributes {
    id: number;
    profile_code: MappingProfileCode;
    display_name: string;
    status: MappingProfileStatus;
    active_revision?: number | null;
    created_at?: Date;
    updated_at?: Date;
}

export interface MappingProfileCreationAttributes {
    id?: number;
    profile_code: MappingProfileCode;
    display_name: string;
    status?: MappingProfileStatus;
    active_revision?: number | null;
}

export interface MappingRevisionAttributes {
    id: number;
    profile_id: number;
    revision: number;
    state: MappingRevisionState;
    schema_version: number;
    payload_json: string;
    change_note?: string | null;
    created_by: string;
    created_at?: Date;
}

export interface MappingRevisionCreationAttributes {
    id?: number;
    profile_id: number;
    revision: number;
    state?: MappingRevisionState;
    schema_version?: number;
    payload_json?: string;
    change_note?: string | null;
    created_by?: string;
}

export interface MappingAuditLogAttributes {
    id: number;
    profile_id: number;
    action: string;
    from_revision?: number | null;
    to_revision?: number | null;
    operator: string;
    meta_json?: string | null;
    created_at?: Date;
}

export interface MappingAuditLogCreationAttributes {
    id?: number;
    profile_id: number;
    action: string;
    from_revision?: number | null;
    to_revision?: number | null;
    operator?: string;
    meta_json?: string | null;
}

export interface MappingUnmatchedEventAttributes {
    id: number;
    profile_code: MappingProfileCode;
    raw_value: string;
    sample_json?: string | null;
    hit_count: number;
    first_seen_at: Date;
    last_seen_at: Date;
    status: MappingUnmatchedEventStatus;
}

export interface MappingUnmatchedEventCreationAttributes {
    id?: number;
    profile_code: MappingProfileCode;
    raw_value: string;
    sample_json?: string | null;
    hit_count?: number;
    first_seen_at?: Date | string;
    last_seen_at?: Date | string;
    status?: MappingUnmatchedEventStatus;
}

export interface MaterialCatalogProfileAttributes {
    id: number;
    profile_code: MaterialCatalogProfileCode;
    display_name: string;
    status: MaterialCatalogProfileStatus;
    active_revision?: number | null;
    created_at?: Date;
    updated_at?: Date;
}

export interface MaterialCatalogProfileCreationAttributes {
    id?: number;
    profile_code?: MaterialCatalogProfileCode;
    display_name?: string;
    status?: MaterialCatalogProfileStatus;
    active_revision?: number | null;
}

export interface MaterialCatalogRevisionAttributes {
    id: number;
    profile_id: number;
    revision: number;
    state: MaterialCatalogRevisionState;
    payload_json: string;
    change_note?: string | null;
    created_by: string;
    created_at?: Date;
}

export interface MaterialCatalogRevisionCreationAttributes {
    id?: number;
    profile_id: number;
    revision: number;
    state?: MaterialCatalogRevisionState;
    payload_json?: string;
    change_note?: string | null;
    created_by?: string;
}

export interface MaterialCatalogAuditLogAttributes {
    id: number;
    profile_id: number;
    action: string;
    from_revision?: number | null;
    to_revision?: number | null;
    operator: string;
    meta_json?: string | null;
    created_at?: Date;
}

export interface MaterialCatalogAuditLogCreationAttributes {
    id?: number;
    profile_id: number;
    action: string;
    from_revision?: number | null;
    to_revision?: number | null;
    operator?: string;
    meta_json?: string | null;
}
