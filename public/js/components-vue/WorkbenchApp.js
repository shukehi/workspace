
const { ref, shallowRef, computed, onMounted } = Vue;

import { ConfigPanel } from './ConfigPanel.js';
import { SourceTab } from './SourceTab.js';
import { StatsTab } from './StatsTab.js';
import { MaterialsTab } from './MaterialsTab.js';
import { OrdersTab } from './OrdersTab.js';
import { SmartSidebar } from './SmartSidebar.js';
import { TheSidebar } from './TheSidebar.js';
import { TheFooter } from './TheFooter.js';
import { useOrderStore } from '../store/orderStore.js';


export const WorkbenchApp = {
    template: '#workbench-app-template',
    components: {
        SourceTab,
        StatsTab,
        MaterialsTab,
        ConfigPanel,
        OrdersTab,
        SmartSidebar,
        TheSidebar,
        TheFooter
    },
    setup() {
        // --- Store ---
        const store = useOrderStore();

        // --- State ---
        // --- State ---
        const currentTab = ref('source');

        // --- Tabs Config ---
        const tabs = [
            { id: 'source', label: 'SOURCE', desc: '订单明细' },
            { id: 'stats', label: 'STATS', desc: '配件颜色统计' },
            { id: 'materials', label: 'MATERIALS', desc: '原材料清单' },
            { id: 'config', label: 'CONFIG', desc: '配方管理' },
            { id: 'orders', label: 'ORDERS', desc: '采购单管理' }
        ];

        // --- Computed ---
        const purchaseOrders = computed(() => store.state.purchaseOrders); // Read from store

        const currentTabComponent = computed(() => {
            switch (currentTab.value) {
                case 'source': return 'SourceTab';
                case 'stats': return 'StatsTab';
                case 'materials': return 'MaterialsTab';
                case 'config': return 'ConfigPanel';
                case 'orders': return 'OrdersTab';
                default: return 'SourceTab';
            }
        });

        // --- Actions ---

        // 2. Generate Orders
        const generateOrders = () => {
            // Use mergedItems from store
            const selectedItems = store.mergedItems.value.filter(i => i.merge || i.includeStats);

            if (selectedItems.length === 0) {
                alert('请至少选择一项进行生成');
                return;
            }

            const newPO = {
                id: Date.now(),
                poNumber: `PO-${new Date().getFullYear()}-${purchaseOrders.value.length + 1}`,
                status: 'pending',
                supplier: '自动分配',
                category: '常规',
                sourceOrders: [...new Set(selectedItems.map(i => i.sourceOrder))].join(', '),
                generatedAt: Date.now(),
                items: selectedItems
            };

            store.addPO(newPO);
            currentTab.value = 'orders';
        };

        const deletePO = (id) => {
            store.deletePO(id);
        };

        const clearAllPOs = () => {
            store.clearPOs();
        };

        // --- Lifecycle ---
        onMounted(() => {
            // Load persistent data
            store.loadFromStorage();
        });

        return {
            currentTab,
            tabs,
            currentTabComponent,
            purchaseOrders,
            generateOrders,
            deletePO,
            clearAllPOs
        };
    }
};
