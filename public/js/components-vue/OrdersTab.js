
const { computed, ref } = Vue;

import { PreviewModal } from './PreviewModal.js';

export const OrdersTab = {
    template: '#orders-tab-template',
    components: {
        PreviewModal
    },
    props: {
        orders: {
            type: Array,
            default: () => []
        }
    },
    setup(props, { emit }) {

        // View mode state: 'grid' or 'list'
        const viewMode = ref('grid');

        // Simplified modal state - single reactive object
        const modal = ref({
            show: false,
            url: ''
        });

        const formatDate = (ts) => {
            if (!ts) return '-';
            return new Date(ts).toLocaleString();
        };

        // Extracted common logic for preparing PO data
        const preparePOData = (po, autoPrint = false) => {
            const orderData = {
                customerName: po.supplier,
                code: po.sourceOrders,
                list: po.items
            };

            // Map order category to print category
            // "常规" and "非标" are packaging orders
            let printCategory = 'packaging';
            if (po.category === '常规' || po.category === '非标') {
                printCategory = 'packaging';
            } else if (po.category === '锁芯') {
                printCategory = 'cylinder';
            } else if (po.category === '五金') {
                printCategory = 'hardware';
            } else if (po.category === '锁叉') {
                printCategory = 'lock';
            }

            localStorage.setItem('_order_preview_data', JSON.stringify(orderData));
            localStorage.setItem('_order_preview_po_number', po.poNumber);
            localStorage.setItem('_order_preview_category', printCategory);

            if (autoPrint) {
                localStorage.setItem('_order_preview_auto_print', 'true');
            } else {
                localStorage.removeItem('_order_preview_auto_print');
            }
        };

        // Simplified: open modal with preview
        const viewPO = (po) => {
            preparePOData(po, false);
            modal.value = {
                show: true,
                url: `/order-preview.html?t=${Date.now()}`
            };
        };

        // Simplified: open modal with auto-print
        const printPO = (po) => {
            preparePOData(po, true);
            modal.value = {
                show: true,
                url: `/order-preview.html?t=${Date.now()}`
            };
        };

        // Simplified: close modal
        const closePreviewModal = () => {
            modal.value = { show: false, url: '' };
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
            alert('导出功能待实现/整合');
        };

        const handleImport = (event) => {
            const file = event.target.files[0];
            if (file) {
                alert('导入功能正在迁移中...');
            }
        };

        return {
            viewMode,
            modal,
            formatDate,
            viewPO,
            closePreviewModal,
            printPO,
            deletePO,
            clearAll,
            exportAll,
            handleImport
        };
    }
};
