
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/lib/api';
import { configLoader } from '@/services/configLoader';
import { calculateMaterialRequirements } from '@/lib/erp-engine/materialDecomposer';
import { extractCylinderData, extractLockForkData, extractPackagingData } from '@/lib/erp-engine/dataExtractors';

export const useSourceStore = defineStore('source', () => {
    // State
    const currentOrder = ref<any>(null); // Raw ERP Order
    const materialRequirements = ref<any>(null);
    const hardwareRequirements = ref<any>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Getters
    const hasOrder = computed(() => !!currentOrder.value);
    const orderItems = computed(() => currentOrder.value?.list || []);

    // Flattened Data for Views
    const flatMaterials = computed(() => {
        if (!materialRequirements.value?.requirements) return [];
        const list: any[] = [];
        Object.values(materialRequirements.value.requirements).forEach((group: any) => {
            group.materials.forEach((mat: any) => {
                list.push({ ...mat, supplierName: group.supplierName });
            });
        });
        return list;
    });

    const flatCylinders = computed(() => hardwareRequirements.value?.cylinders || []);
    const flatForks = computed(() => hardwareRequirements.value?.lockForks || []);
    const flatPackaging = computed(() => {
        const pkgMap = hardwareRequirements.value?.packaging || {};
        return Object.values(pkgMap);
    });

    // Actions
    async function fetchContract(contractId: string) {
        if (!contractId) return;

        loading.value = true;
        error.value = null;

        try {
            // 1. Fetch from ERP Proxy
            // Note: usage of 'any' because strict typing of raw ERP response is complex
            // Remove /api prefix as it is handled by baseURL
            // Use 'code' instead of 'contractNo' based on user feedback
            const res = await api.get<any>(`/getOutContractDetail?code=${contractId}`);

            // Adapter for different response structures
            // Legacy api often returns { rows: [...] } or direct object
            let orderData = res;
            if (res.rows && Array.isArray(res.rows) && res.rows.length > 0) {
                orderData = res.rows[0];
            } else if (Array.isArray(res)) {
                orderData = res[0];
            }

            if (!orderData || !orderData.list) {
                throw new Error('Contract not found or empty');
            }

            // 2. Normalization (Simplified for Phase 4.5)
            // We reuse the response directly as it closely matches what legacy logic expects
            // Ideally we should run DataNormalizer here if needed for deeper cleaning
            currentOrder.value = orderData;

            // Persist raw ERP contract snapshot for audit/replay.
            // Non-blocking: cache failure should not break sourcing flow.
            try {
                await api.post('/contracts/cache', orderData);
            } catch (cacheErr) {
                console.warn('[SourceStore] failed to cache ERP contract snapshot:', cacheErr);
            }

            // 3. Auto-calculate materials on load
            await calculateMaterials();

        } catch (e: any) {
            console.error('Fetch failed', e);
            error.value = e.message || 'Failed to fetch contract';
            currentOrder.value = null;
        } finally {
            loading.value = false;
        }
    }

    async function calculateMaterials(itemsToProcess?: any[]) {
        if (!currentOrder.value) return;

        try {
            // Ensure config is loaded
            await configLoader.loadAll();

            // Use provided items or default to all items from current order
            const targetItems = itemsToProcess || currentOrder.value.list;
            
            if (!targetItems || targetItems.length === 0) {
                materialRequirements.value = null;
                hardwareRequirements.value = null;
                return;
            }

            const items = targetItems.map((item: any, index: number) => ({
                ...item,
                _originOrder: currentOrder.value.code,
                _originIndex: index
            }));

            const result = calculateMaterialRequirements(
                items,
                configLoader.getFormulas(),
                configLoader.getMaterials()
            );

            const hardwareResult = {
                cylinders: extractCylinderData(targetItems, currentOrder.value, configLoader.getCylinderMapping()),
                lockForks: extractLockForkData(targetItems, currentOrder.value, configLoader.getLockForkMapping()),
                packaging: extractPackagingData(targetItems, configLoader.getPackagingMapping())
            };

            materialRequirements.value = result;
            hardwareRequirements.value = hardwareResult;

        } catch (e) {
            console.error('Calculation failed', e);
            error.value = 'Material calculation failed';
        }
    }

    function clear() {
        currentOrder.value = null;
        materialRequirements.value = null;
        error.value = null;
    }

    return {
        currentOrder,
        materialRequirements,
        hardwareRequirements,
        loading,
        error,
        hasOrder,
        orderItems,
        flatMaterials,
        flatCylinders,
        flatForks,
        flatPackaging,
        fetchContract,
        calculateMaterials,
        clear
    };
});
