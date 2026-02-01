import AxiosMockAdapter from 'axios-mock-adapter';
import { axiosInstance } from '@/lib/api';
import type { Order } from '@/types/order';

// Only enable mock in development and if VITE_USE_MOCK is 'true'
if (import.meta.env.DEV) {
    console.log('[Mock] Initializing Mock Server...');

    const mock = new AxiosMockAdapter(axiosInstance, { delayResponse: 500 });


    // Order Mock (Generate 15 orders)
    const mockOrders: Order[] = Array.from({ length: 15 }).map((_, i) => ({
        id: `ord_${i + 1}`,
        order_no: `PO-20260201-${String(i + 1).padStart(3, '0')}`,
        supplier: i % 2 === 0 ? 'Alpha Steel Co.' : 'Beta Bolts',
        items: [
            { id: `item_${i}_1`, material_id: 'm_1', name: 'Steel Plate', model: 'SP-202', quantity: 50 + i, unit: 'pcs', total: (50 + i) * 100 }
        ],
        total_amount: (50 + i) * 100,
        status: i === 0 ? 'draft' : i === 1 ? 'submitted' : i % 3 === 0 ? 'completed' : 'processing',
        created_at: new Date(Date.now() - i * 86400000).toISOString()
    }));

    // Mock Endpoints
    mock.onGet('/orders').reply(200, mockOrders);

    // Example:    // Inventory Mock (20 sample items)
    const mockInventory = Array.from({ length: 20 }).map((_, i) => ({
        id: `inv_${i + 1}`,
        category: i % 3 === 0 ? 'Raw Material' : i % 3 === 1 ? 'Component' : 'Finished Goods',
        model: `MDL-${1000 + i}`,
        name: `Item Name ${i + 1}`,
        stock_quantity: i % 5 === 0 ? 0 : Math.floor(Math.random() * 5000), // Some 0 stock
        min_stock: 100,
        unit: 'pcs',
        supplier: `Supplier ${String.fromCharCode(65 + (i % 5))}`,
        last_updated: new Date().toISOString()
    }));
    mock.onGet('/inventory').reply(200, mockInventory);

    // Color Formula Mock
    const mockFormulas: any[] = [
        {
            id: 'fmt_001',
            formula_name: 'Classic Blue V1',
            product_code: 'P-BLU-001',
            version: '1.0',
            materials: [
                { material_id: 'm_1', name: 'Pigment Blue', quantity: 500, unit: 'g' },
                { material_id: 'm_2', name: 'Binder X', quantity: 1000, unit: 'ml' }
            ],
            status: 'active',
            created_at: '2026-01-15'
        },
        {
            id: 'fmt_002',
            formula_name: 'Matte Black',
            product_code: 'P-BLK-999',
            version: '2.0',
            materials: [
                { material_id: 'm_5', name: 'Carbon Black', quantity: 300, unit: 'g' }
            ],
            status: 'active',
            created_at: '2026-01-20'
        }
    ];
    mock.onGet('/formulas').reply(200, mockFormulas);

    console.log('[Mock] Ready.');
}
