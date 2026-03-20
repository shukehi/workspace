import type { OrderStatus } from '@/shared/constants/order';
import type { PaginatedResponse, PaginationQuery } from '@/shared/types/pagination';

export interface OrderItem {
    id: number;
    item_key?: string;
    material_id: string | number;
    supplier?: string;
    // Unified semantic fields used by print/preview pipeline
    internal_name?: string;
    external_name?: string;
    type?: string;
    spec?: string;
    mb?: string;
    eccentricity?: string;
    name: string;
    model: string;
    quantity: number;
    ordered_quantity?: number;
    received_quantity?: number;
    quantity_left?: number;
    quantity_right?: number;
    orientation?: string;
    unit: string;
    price?: number;
    total?: number;
    remark?: string;
}

export interface StockInOrderItemInput {
    order_item_id: number;
    item_key: string;
    quantity: number;
}

export interface StockInPayload {
    stocked_in_at?: string;
    operator?: string;
    remark?: string;
    warehouse_id?: number;
    location_id?: number;
    items?: StockInOrderItemInput[];
}

export interface Order {
    id: number;
    order_no: string;
    supplier: string;
    source_contract_code?: string;
    dedupe_key?: string;
    items: OrderItem[];
    total_amount: number;
    created_at: string;
    delivery_date?: string;
    arrived_at?: string;
    arrived_by?: string;
    arrived_remark?: string;
    stocked_in_at?: string;
    stocked_in_by?: string;
    stocked_in_remark?: string;
    category?: string;
    status: OrderStatus;
    remark?: string;
    metadata?: {
        customer_name?: string;
        internal_name?: string;
        external_name?: string;
        order_source?: 'auto' | 'manual';
        source_contract_code?: string;
        [key: string]: any;
    };
}

export interface ProcurementOrderSummary {
    totalAmount: number;
    pendingCount: number;
    completedCount: number;
    todayCount: number;
}

export interface ProcurementOrderFacetCounts {
    statusCounts: Record<string, number>;
    categoryCounts: Record<string, number>;
    riskCounts: Record<string, number>;
}

export interface ProcurementOrderListResponse extends PaginatedResponse<Order> {
    summary: ProcurementOrderSummary;
    facets: ProcurementOrderFacetCounts;
}

export interface ProcurementBulkArriveResponse {
    total: number;
    successCount: number;
    failureCount: number;
    succeededIds: number[];
    failed: Array<{
        id: number;
        code: string;
        message: string;
    }>;
}

export interface ProcurementOrderQuery extends PaginationQuery {
    status?: 'ALL' | 'PENDING' | OrderStatus;
    category?: string;
    risk?: 'ALL' | 'RISK' | 'MANUAL';
    createdDate?: string;
    keyword?: string;
    orderNo?: string;
}
