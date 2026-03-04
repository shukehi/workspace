<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ContractRow {
    id: number;
    contract_code: string;
    customer_name?: string;
    total_amount?: number;
    last_fetched_at: string;
    payload_hash: string;
    raw_json: any;
}

const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const rows = ref<ContractRow[]>([]);
const expandedCode = ref<string | null>(null);

const filters = ref({
    code: '',
    customer: ''
});

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

async function fetchContracts(resetPage = false) {
    if (resetPage) page.value = 1;
    loading.value = true;
    try {
        const res = await api.get<any>('/contracts', {
            params: {
                page: page.value,
                pageSize: pageSize.value,
                code: filters.value.code || undefined,
                customer: filters.value.customer || undefined
            }
        });

        rows.value = Array.isArray(res?.rows) ? res.rows : [];
        total.value = Number(res?.total || 0);

        if (expandedCode.value && !rows.value.some(r => r.contract_code === expandedCode.value)) {
            expandedCode.value = null;
        }
    } catch (e) {
        console.error('Failed to fetch cached contracts', e);
    } finally {
        loading.value = false;
    }
}

function toggleExpand(code: string) {
    expandedCode.value = expandedCode.value === code ? null : code;
}

function nextPage() {
    if (page.value < totalPages.value) {
        page.value += 1;
        fetchContracts();
    }
}

function prevPage() {
    if (page.value > 1) {
        page.value -= 1;
        fetchContracts();
    }
}

onMounted(() => {
    fetchContracts(true);
});
</script>

<template>
    <div class="h-full flex flex-col p-8 pt-6 space-y-6 bg-slate-50/50">
        <div>
            <h2 class="text-3xl font-semibold text-slate-900 tracking-tight">历史合同</h2>
            <p class="text-slate-500 mt-1 italic font-mono text-sm uppercase tracking-wide">ERP Contract Snapshots</p>
        </div>

        <div class="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
            <div class="w-[240px]">
                <label class="block text-xs text-slate-500 mb-1">合同号</label>
                <Input v-model="filters.code" placeholder="如 202512260031" />
            </div>
            <div class="w-[240px]">
                <label class="block text-xs text-slate-500 mb-1">客户名称</label>
                <Input v-model="filters.customer" placeholder="如 外贸程总" />
            </div>
            <Button @click="fetchContracts(true)" :disabled="loading">{{ loading ? '查询中...' : '查询' }}</Button>
            <Button variant="outline" @click="filters.code=''; filters.customer=''; fetchContracts(true)">重置</Button>
        </div>

        <div class="bg-white border border-slate-200 rounded-lg p-4 min-h-0 flex-1 overflow-auto">
            <div class="text-sm text-slate-500 mb-3">
                共 {{ total }} 条，页 {{ page }}/{{ totalPages }}
            </div>

            <div v-if="rows.length === 0" class="text-sm text-slate-400 py-10 text-center">
                暂无历史合同数据
            </div>

            <div v-else class="space-y-3">
                <div
                    v-for="row in rows"
                    :key="row.id"
                    class="border border-slate-200 rounded-lg p-3 bg-white hover:border-slate-300 transition-colors"
                >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="text-sm">
                            <div class="font-semibold text-slate-900">{{ row.contract_code }}</div>
                            <div class="text-slate-500">{{ row.customer_name || '-' }}</div>
                        </div>
                        <div class="text-sm text-right">
                            <div class="font-mono text-slate-900">¥{{ Number(row.total_amount || 0).toLocaleString() }}</div>
                            <div class="text-slate-500">{{ new Date(row.last_fetched_at).toLocaleString() }}</div>
                        </div>
                    </div>

                    <div class="mt-2 flex items-center justify-between">
                        <div class="text-xs text-slate-400">Hash: {{ row.payload_hash.slice(0, 16) }}...</div>
                        <Button size="sm" variant="outline" @click="toggleExpand(row.contract_code)">
                            {{ expandedCode === row.contract_code ? '收起 JSON' : '查看 JSON' }}
                        </Button>
                    </div>

                    <div v-if="expandedCode === row.contract_code" class="mt-3">
                        <pre class="text-xs bg-slate-50 border border-slate-200 rounded p-3 overflow-auto">{{ JSON.stringify(row.raw_json, null, 2) }}</pre>
                    </div>
                </div>
            </div>
            <div class="pt-4 flex gap-2 justify-end">
                <Button size="sm" variant="outline" @click="prevPage" :disabled="page<=1 || loading">上一页</Button>
                <Button size="sm" variant="outline" @click="nextPage" :disabled="page>=totalPages || loading">下一页</Button>
            </div>
        </div>
    </div>
</template>
