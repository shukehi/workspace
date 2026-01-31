
const { ref, computed } = Vue;
import { useOrderStore } from '../store/orderStore.js';
import { fetchOrderDetail } from '../services/api.js';
import { SmartSidebar } from './SmartSidebar.js';

export const TheSidebar = {
    template: '#the-sidebar-template',
    components: { SmartSidebar },
    setup() {
        const store = useOrderStore();

        // Input State
        const orderCode = ref('');
        const appendMode = ref(false);
        const isLoading = ref(false);
        const errorMsg = ref('');

        // Store State Wrappers
        const currentOrder = computed(() => store.state.currentOrder);
        const orders = computed(() => store.state.orders);
        const status = computed(() => isLoading.value ? 'FETCHING' : (currentOrder.value ? 'READY' : 'IDLE'));

        // Actions
        const handleFetch = async () => {
            const code = orderCode.value.trim();
            if (!code) {
                errorMsg.value = '请输入合同编号';
                return;
            }

            isLoading.value = true;
            errorMsg.value = '';

            try {
                // Determine fetch mode
                if (!appendMode.value) {
                    store.clearOrders();
                }

                // Call API
                const data = await fetchOrderDetail(code);

                // Adapter for Search Result vs Detail
                let orderData = data;
                if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
                    orderData = data.rows[0];
                }

                // Transform Data (Adapter)
                const standardizedList = (orderData.list || []).map(item => {
                    // Parse qty field if it's in "L/R" format (e.g., "5/20")
                    let parsedQtyL = item.qtyL || item.quantityL || 0;
                    let parsedQtyR = item.qtyR || item.quantityR || 0;
                    let totalQty = item.number || 0;

                    if (item.qty && typeof item.qty === 'string' && item.qty.includes('/')) {
                        const parts = item.qty.split('/');
                        parsedQtyL = parseInt(parts[0]) || 0;
                        parsedQtyR = parseInt(parts[1]) || 0;
                        totalQty = parsedQtyL + parsedQtyR;
                    } else if (item.qty) {
                        totalQty = parseInt(item.qty) || 0;
                    }

                    return {
                        // Map raw fields to standard fields
                        productName: item.productName || item.productModelName || item.goodName || item.name,
                        spec: item.spec || item.specification || item.size,
                        color: item.color || item.colour,
                        qtyL: parsedQtyL,
                        qtyR: parsedQtyR,
                        qty: item.qty || totalQty,

                        doorType: item.doorType || item.type || item.mb,
                        lockType: item.lockType || item.lock || item.sj,
                        details: item.details || item.remark || item.description || item.xsbz,

                        // All 26 fields mapping
                        mb: item.mb,                    // 门边
                        mshd: item.mshd,                // 门扇厚度
                        sj: item.sj,                    // 锁具
                        sx: item.sx,                    // 锁芯
                        sxhz: item.sxhz,                // 锁芯护罩
                        fssj: item.fssj,                // 副锁锁具
                        fssx: item.fssx,                // 副锁锁芯
                        fshz: item.fshz,                // 副锁护罩
                        sc: item.sc,                    // 锁叉
                        ml: item.ml,                    // 门铃
                        my: item.my,                    // 猫眼
                        jl: item.jl,                    // 铰链
                        bs: item.bs,                    // 边锁
                        tc: item.tc,                    // 填充
                        pt: item.pt,                    // 皮条
                        bz: item.bz,                    // 包装
                        ls: item.ls,                    // 拉手
                        xsbz: item.xsbz,                // 备注
                        tyls: item.tyls,                // 是否通用拉手
                        qbbc: item.qbbc,                // 前/后/门架
                        jb: item.jb,                    // 级别
                        xd: item.xd,                    // 下档

                        // Keep original just in case
                        ...item
                    };
                });

                const finalOrder = {
                    ...orderData,
                    list: standardizedList
                };

                store.addOrder(finalOrder);
                orderCode.value = ''; // Clear input on success

            } catch (e) {
                console.error(e);
                errorMsg.value = e.message || 'Fetch Failed';
            } finally {
                isLoading.value = false;
            }
        };

        const removeOrder = (code) => {
            store.removeOrder(code);
        };

        return {
            // State
            orderCode,
            appendMode,
            isLoading,
            errorMsg,
            currentOrder,
            orders,
            status,

            // Actions
            handleFetch,
            removeOrder
        };
    }
};
