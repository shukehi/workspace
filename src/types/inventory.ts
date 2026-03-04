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
