import AxiosMockAdapter from 'axios-mock-adapter';
import { axiosInstance } from '@/lib/api';
import type { Order } from '@/types/order';

// Only enable mock in development and explicit opt-in.
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    console.log('[Mock] Initializing Mock Server...');

    const mock = new AxiosMockAdapter(axiosInstance, { delayResponse: 500 });


    // Order Mock (Generate 15 orders)
    const mockOrders: Order[] = Array.from({ length: 15 }).map((_, i) => ({
        id: i + 1,
        order_no: `PO-20260201-${String(i + 1).padStart(3, '0')}`,
        supplier: i % 2 === 0 ? 'Alpha Steel Co.' : 'Beta Bolts',
        metadata: {
            customer_name: `Mock Customer ${i + 1}`
        },
        items: [
            { id: (i * 1000) + 1, material_id: 'm_1', name: 'Steel Plate', model: 'SP-202', quantity: 50 + i, unit: 'pcs', total: (50 + i) * 100 }
        ],
        total_amount: (50 + i) * 100,
        status: i === 0 ? 'draft' : i === 1 ? 'submitted' : i % 3 === 0 ? 'completed' : 'processing',
        created_at: new Date(Date.now() - i * 86400000).toISOString()
    }));

    // Mock Endpoints
    mock.onGet('/orders').reply(200, mockOrders);
    mock.onPost('/orders').reply((config) => {
        const payload = config.data ? JSON.parse(config.data) : {};
        const nextId = mockOrders.reduce((max, o) => Math.max(max, Number(o.id) || 0), 0) + 1;
        const created: Order = {
            id: nextId,
            order_no: payload.order_no || `PO-MOCK-${Date.now()}`,
            supplier: payload.supplier || 'Mock Supplier',
            metadata: payload.metadata || {},
            items: Array.isArray(payload.items) ? payload.items : [],
            total_amount: Number(payload.total_amount || 0),
            status: payload.status || 'draft',
            created_at: payload.created_at || new Date().toISOString(),
            category: payload.category
        };
        mockOrders.unshift(created);
        return [200, created];
    });
    mock.onPut(/\/orders\/\d+$/).reply((config) => {
        const id = Number(config.url?.split('/').pop());
        const payload = config.data ? JSON.parse(config.data) : {};
        const index = mockOrders.findIndex((o) => o.id === id);
        if (index === -1) return [404, { error: 'Not found' }];

        const current = mockOrders[index];
        mockOrders[index] = {
            ...current,
            ...payload,
            id: current.id,
            order_no: payload.order_no || current.order_no,
            created_at: payload.created_at || current.created_at
        };
        return [200, mockOrders[index]];
    });
    mock.onDelete(/\/orders\/\d+$/).reply((config) => {
        const id = Number(config.url?.split('/').pop());
        const index = mockOrders.findIndex((o) => o.id === id);
        if (index !== -1) mockOrders.splice(index, 1);
        return [200, { success: true }];
    });

    // Example:    // Inventory Mock (20 sample items)
    const mockInventory = Array.from({ length: 20 }).map((_, i) => ({
        id: i + 1,
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

    // Color Formula Mock (compat /api/formulas mapping shape)
    const mockFormulas: Record<string, any> = {
        TEST_BLUE: {
            displayName: 'Classic Blue',
            category: 'Default',
            bom: [
                { materialId: 'm_1', position: 'main', usage: { single: 1, double: 2, paired: 2 } },
                { materialId: 'm_2', position: 'main', usage: { single: 0.4, double: 0.8, paired: 0.8 } }
            ]
        }
    };
    mock.onGet('/formulas').reply(200, mockFormulas);

    // IMPORTANT: Allow all other requests to pass through to the real server
    mock.onAny().passThrough();

    console.log('[Mock] Ready.');
}
