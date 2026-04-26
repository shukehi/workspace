export type InventoryReceiptDirection = 'in' | 'reversal';
export type WarehouseStatus = 'active' | 'inactive';
export type InventoryOutboundDirection = 'out' | 'reversal';
export type InventoryDocumentStatus = 'posted' | 'reversed';
export type InventoryMovementSourceType = 'manual_adjustment' | 'receipt_in' | 'receipt_reversal' | 'outbound' | 'outbound_reversal' | 'baseline_repair';
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
    supplier_master_id?: number | null;
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
    supplier_master_id?: number | null;
    unit?: string;
    price?: number;
    category?: string | null;
    package_spec?: string | null;
    stock_quantity?: number;
    min_stock?: number;
    aliases?: string[];
}


export type MaterialCodeMappingType = 'alias' | 'barcode' | 'legacy_code' | 'supplier_code' | 'internal_code';
export type MaterialMappingPartyType = 'supplier' | 'customer' | 'internal';

export interface MaterialSupplierMappingAttributes {
    id: number;
    material_id: number;
    supplier_master_id?: number | null;
    supplier_code: string;
    normalized_supplier_code: string;
    supplier_name_snapshot?: string | null;
    supplier_model?: string | null;
    purchase_unit?: string | null;
    stock_unit?: string | null;
    conversion_factor: number;
    price?: number | null;
    currency?: string | null;
    is_default: boolean;
    is_active: boolean;
    remark?: string | null;
    created_at?: Date;
    updated_at?: Date;
}

export interface MaterialSupplierMappingCreationAttributes {
    id?: number;
    material_id: number;
    supplier_master_id?: number | null;
    supplier_code: string;
    normalized_supplier_code: string;
    supplier_name_snapshot?: string | null;
    supplier_model?: string | null;
    purchase_unit?: string | null;
    stock_unit?: string | null;
    conversion_factor?: number;
    price?: number | null;
    currency?: string | null;
    is_default?: boolean;
    is_active?: boolean;
    remark?: string | null;
}

export interface MaterialCodeMappingAttributes {
    id: number;
    material_id: number;
    mapping_type: MaterialCodeMappingType;
    party_type?: MaterialMappingPartyType | null;
    party_id?: number | null;
    external_code: string;
    normalized_code: string;
    is_active: boolean;
    priority: number;
    metadata_json: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface MaterialCodeMappingCreationAttributes {
    id?: number;
    material_id: number;
    mapping_type: MaterialCodeMappingType;
    party_type?: MaterialMappingPartyType | null;
    party_id?: number | null;
    external_code: string;
    normalized_code: string;
    is_active?: boolean;
    priority?: number;
    metadata_json?: string;
}

export interface MaterialUomConversionAttributes {
    id: number;
    material_id: number;
    from_unit: string;
    to_unit: string;
    factor: number;
    is_purchase_default: boolean;
    is_sales_default: boolean;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface MaterialUomConversionCreationAttributes {
    id?: number;
    material_id: number;
    from_unit: string;
    to_unit: string;
    factor?: number;
    is_purchase_default?: boolean;
    is_sales_default?: boolean;
    is_active?: boolean;
}

export interface OrderMetadata {
    customer_name?: string;
    internal_name?: string;
    external_name?: string;
    order_source?: 'auto' | 'manual';
    template_type?: 'packaging' | 'cylinder' | 'double-door-accessory' | 'general-accessory';
    source_contract_code?: string;
    aggregateSideQuantities?: boolean;
    riskWarningDismissed?: boolean;
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
    /** 物料编码，关联 materials 表 */
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
    /**
     * 计划采购数量（含左右开合计）。
     * 读取时优先使用 ordered_quantity，不存在时回退到 quantity（见 resolveOrderedQuantity）。
     */
    quantity: number;
    /**
     * 实际下单数量，由前端或 BOM 计算后写入。
     * 与 quantity 区别：quantity 为初始请求数，ordered_quantity 为最终确认的下单数。
     * 若两者相同可只维护 quantity，ordered_quantity 可为 0（由 resolveOrderedQuantity 回退处理）。
     */
    ordered_quantity: number;
    /** 已入库（收货）数量，由入库操作累加写入 */
    received_quantity: number;
    /**
     * 左开门锁数量（仅锁具类订单使用）。
     * 锁具按开门方向拆分为左开和右开，对应采购单打印列 qtyLeft。
     * 非锁具类订单此字段为 null。
     */
    quantity_left?: number | null;
    /**
     * 右开门锁数量（仅锁具类订单使用）。
     * 对应采购单打印列 qtyRight。非锁具类订单此字段为 null。
     */
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
    reverse_version: number;
    warehouse_id: number;
    location_id: number;
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
    reverse_version?: number;
    warehouse_id: number;
    location_id: number;
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

/**
 * 订单列表查询参数（GET /api/orders query string）
 */
export interface OrderListQuery {
    page?: string | number;
    pageSize?: string | number;
    status?: string;
    category?: string;
    supplier?: string;
    orderNo?: string;
    createdDate?: string;
    startDate?: string;
    endDate?: string;
    /** 关键字搜索（匹配订单号、品目名称等） */
    keyword?: string;
    /** 风险等级筛选 */
    risk?: string;
}

/**
 * 创建订单的输入参数（POST /api/orders body）
 */
export interface OrderCreateInput {
    order_no: string;
    supplier?: string | null;
    source_contract_code?: string | null;
    category?: string | null;
    status?: string;
    remark?: string;
    metadata?: OrderMetadata;
    created_at?: string | Date;
    delivery_date?: string | Date | null;
    arrived_at?: string | Date | null;
    arrived_by?: string | null;
    arrived_remark?: string;
    stocked_in_at?: string | Date | null;
    stocked_in_by?: string | null;
    stocked_in_remark?: string;
    /** 订单品目列表 */
    items?: Record<string, unknown>[];
}

/**
 * 更新订单的输入参数（PUT /api/orders/:id body）
 */
export interface OrderUpdateInput {
    order_no?: string;
    supplier?: string | null;
    source_contract_code?: string | null;
    category?: string | null;
    status?: string;
    remark?: string;
    metadata?: OrderMetadata | Record<string, unknown>;
    created_at?: string | Date;
    delivery_date?: string | Date | null;
    arrived_at?: string | Date | null;
    arrived_by?: string | null;
    arrived_remark?: string;
    stocked_in_at?: string | Date | null;
    stocked_in_by?: string | null;
    stocked_in_remark?: string;
    /** 更新品目列表（传入则整体替换） */
    items?: Record<string, unknown>[];
}

export interface InventoryReceiptWithOrderAttributes extends InventoryReceiptAttributes {
    order?: OrderAttributes;
}

export interface WarehouseAttributes {
    id: number;
    code: string;
    name: string;
    status: WarehouseStatus;
    remark: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface WarehouseCreationAttributes {
    id?: number;
    code: string;
    name: string;
    status?: WarehouseStatus;
    remark?: string;
}

export interface InventoryLocationAttributes {
    id: number;
    code: string;
    name: string;
    warehouse_id: number;
    status: WarehouseStatus;
    remark: string;
    sort_order: number;
    created_at?: Date;
    updated_at?: Date;
}

export interface InventoryLocationCreationAttributes {
    id?: number;
    code: string;
    name: string;
    warehouse_id: number;
    status?: WarehouseStatus;
    remark?: string;
    sort_order?: number;
}

export interface InventoryLocationBalanceAttributes {
    id: number;
    material_id: number;
    warehouse_id: number;
    location_id: number;
    quantity: number;
    created_at?: Date;
    updated_at?: Date;
}

export interface InventoryLocationBalanceCreationAttributes {
    id?: number;
    material_id: number;
    warehouse_id: number;
    location_id: number;
    quantity?: number;
}

export interface InventoryOutboundAttributes {
    id: number;
    outbound_no: string;
    direction: InventoryOutboundDirection;
    source_outbound_id?: number | null;
    warehouse_id: number;
    location_id: number;
    operator?: string | null;
    reason: string;
    remark: string;
    status: InventoryDocumentStatus;
    outbound_date: Date;
    created_at?: Date;
    updated_at?: Date;
}

export interface InventoryOutboundCreationAttributes {
    id?: number;
    outbound_no: string;
    direction?: InventoryOutboundDirection;
    source_outbound_id?: number | null;
    warehouse_id: number;
    location_id: number;
    operator?: string | null;
    reason: string;
    remark?: string;
    status?: InventoryDocumentStatus;
    outbound_date: Date | string;
}

export interface InventoryOutboundItemAttributes {
    id: number;
    outbound_id: number;
    material_id: number;
    item_name: string;
    unit?: string | null;
    quantity: number;
    created_at?: Date;
    updated_at?: Date;
}

export interface InventoryOutboundItemCreationAttributes {
    id?: number;
    outbound_id: number;
    material_id: number;
    item_name: string;
    unit?: string | null;
    quantity: number;
}

export interface InventoryOutboundWithItemsAttributes extends InventoryOutboundAttributes {
    items?: InventoryOutboundItemAttributes[];
}

export interface InventoryMovementAttributes {
    id: number;
    material_id: number;
    warehouse_id: number;
    location_id: number;
    source_type: InventoryMovementSourceType;
    source_id: string;
    source_line_key: string;
    delta_quantity: number;
    balance_after: number;
    stock_after: number;
    reason: string;
    operator?: string | null;
    remark: string;
    occurred_at: Date;
    metadata_json: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface InventoryMovementCreationAttributes {
    id?: number;
    material_id: number;
    warehouse_id: number;
    location_id: number;
    source_type: InventoryMovementSourceType;
    source_id: string;
    source_line_key: string;
    delta_quantity: number;
    balance_after: number;
    stock_after: number;
    reason: string;
    operator?: string | null;
    remark?: string;
    occurred_at: Date | string;
    metadata_json?: string;
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
