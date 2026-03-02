export interface OrderItem {
    id: string;
    material_id: string;
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
    id: string;
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
        internal_name?: string;
        external_name?: string;
        [key: string]: any;
    };
}
