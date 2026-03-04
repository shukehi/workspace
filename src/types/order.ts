export interface OrderItem {
    id: number;
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
    quantity_left?: number;
    quantity_right?: number;
    orientation?: string;
    unit: string;
    price?: number;
    total?: number;
    remark?: string;
}

export interface Order {
    id: number;
    order_no: string;
    supplier: string;
    items: OrderItem[];
    total_amount: number;
    created_at: string;
    delivery_date?: string;
    category?: string;
    status: 'draft' | 'submitted' | 'processing' | 'completed' | 'cancelled';
    remark?: string;
    metadata?: {
        customer_name?: string;
        internal_name?: string;
        external_name?: string;
        [key: string]: any;
    };
}
