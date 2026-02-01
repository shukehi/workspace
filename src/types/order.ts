export interface OrderItem {
    id: string;
    material_id: string;
    name: string;
    model: string;
    quantity: number;
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
    status: 'draft' | 'submitted' | 'completed';
    remark?: string;
}
