
const { computed } = Vue;

export const OrdersTab = {
    template: '#orders-tab-template',
    props: {
        orders: {
            type: Array,
            default: () => []
        }
    },
    setup(props, { emit }) {

        const formatDate = (ts) => {
            if (!ts) return '-';
            return new Date(ts).toLocaleString();
        };

        const viewPO = (po) => {
            // Legacy Logic: Save to localStorage and open preview window
            // We need to adhere to the format expected by order-preview.html
            // po object structure: { items, poNumber, ... } 

            // Construct the order object expected by preview
            // (Assuming po.items contains the list)
            const orderForPrint = {
                customerName: po.supplier, // Tentative mapping
                code: po.sourceOrders,     // Tentative mapping
                list: po.items
            };

            localStorage.setItem('_order_preview_data', JSON.stringify(orderForPrint));
            localStorage.setItem('_order_preview_po_number', po.poNumber);
            localStorage.setItem('_order_preview_category', po.category);

            window.open(
                '/order-preview.html',
                '_blank',
                'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no'
            );
        };

        const printPO = (po) => {
            localStorage.setItem('_order_preview_auto_print', 'true');
            viewPO(po);
        };

        const deletePO = (id) => {
            if (confirm('确定要删除此采购单吗？')) {
                emit('delete-po', id);
            }
        };

        const clearAll = () => {
            if (confirm('确定要清空所有生成的采购单吗？此操作不可逆。')) {
                emit('clear-all');
            }
        };

        const exportAll = () => {
            // Bridge to legacy export or implement new
            alert('导出功能待实现/整合');
        };

        const handleImport = (event) => {
            const file = event.target.files[0];
            if (file) {
                // Implement import logic
                alert('导入功能正在迁移中...');
            }
        };

        return {
            formatDate,
            viewPO,
            printPO,
            deletePO,
            clearAll,
            exportAll,
            handleImport
        };
    }
};
