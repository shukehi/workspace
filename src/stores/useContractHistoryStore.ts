import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/lib/api';
import type { ContractHistoryRow } from '@/types/source';

type ContractHistoryListResponse = {
    rows?: ContractHistoryRow[];
    total?: number;
};

export const useContractHistoryStore = defineStore('contractHistory', () => {
    const historyLoading = ref(false);
    const historyRows = ref<ContractHistoryRow[]>([]);
    const historyPage = ref(1);
    const historyPageSize = ref(20);
    const historyTotal = ref(0);
    const historyFilters = ref({
        code: '',
        customer: ''
    });
    const historySelected = ref<ContractHistoryRow | null>(null);
    const error = ref<string | null>(null);

    const historyTotalPages = computed(() => Math.max(1, Math.ceil(historyTotal.value / historyPageSize.value)));

    async function fetchHistoryContracts(resetPage = false) {
        if (resetPage) historyPage.value = 1;

        historyLoading.value = true;
        error.value = null;

        try {
            const res = await api.get<ContractHistoryListResponse>('/contracts', {
                params: {
                    page: historyPage.value,
                    pageSize: historyPageSize.value,
                    code: historyFilters.value.code || undefined,
                    customer: historyFilters.value.customer || undefined
                }
            });

            historyRows.value = Array.isArray(res?.rows) ? res.rows : [];
            historyTotal.value = Number(res?.total || 0);

            if (
                historySelected.value &&
                !historyRows.value.some((row) => row.contract_code === historySelected.value?.contract_code)
            ) {
                historySelected.value = null;
            }
        } catch (e: any) {
            console.error('Fetch history contracts failed', e);
            error.value = e.message || '历史合同列表加载失败，请稍后重试';
            historyRows.value = [];
            historyTotal.value = 0;
        } finally {
            historyLoading.value = false;
        }
    }

    function resetHistoryFilters() {
        historyFilters.value.code = '';
        historyFilters.value.customer = '';
    }

    function clearSelection() {
        historySelected.value = null;
    }

    function selectHistoryRow(row: ContractHistoryRow | null) {
        historySelected.value = row;
    }

    return {
        error,
        historyLoading,
        historyRows,
        historyPage,
        historyPageSize,
        historyTotal,
        historyTotalPages,
        historyFilters,
        historySelected,
        fetchHistoryContracts,
        resetHistoryFilters,
        clearSelection,
        selectHistoryRow
    };
});
