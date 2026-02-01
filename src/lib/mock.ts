import AxiosMockAdapter from 'axios-mock-adapter';
import { axiosInstance } from '@/lib/api';
import type { Order } from '@/types/order';

// Only enable mock in development and if VITE_USE_MOCK is 'true'
if (import.meta.env.DEV) {
    console.log('[Mock] Initializing Mock Server...');

    const mock = new AxiosMockAdapter(axiosInstance, { delayResponse: 500 });

    const mockOrders: Order[] = [
        {
            id: 'ord_001',
            order_no: 'PO-20260201-001',
            supplier: 'Alpha Steel Co.',
            items: [
                { id: 'item_1', material_id: 'm_1', name: 'Steel Plate', model: 'SP-202', quantity: 50, unit: 'pcs', total: 5000 }
            ],
            total_amount: 5000,
            status: 'submitted',
            created_at: new Date().toISOString()
        },
        {
            id: 'ord_002',
            order_no: 'PO-20260201-002',
            supplier: 'Beta Bolts',
            items: [],
            total_amount: 0,
            status: 'draft',
            created_at: new Date().toISOString()
        }
    ];

    // Mock Endpoints
    mock.onGet('/orders').reply(200, mockOrders);

    // Example: Inventory Mock
    mock.onGet('/inventory').reply(200, [
        { id: 'inv_1', category: 'Raw Material', name: 'Steel Sheet 2mm', stock_quantity: 1200, unit: 'kg', supplier: 'Alpha' }
    ]);

    console.log('[Mock] Ready.');
}
