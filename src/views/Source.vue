
<script setup lang="ts">
import { ref, computed, h } from 'vue';
import { useSourceStore } from '@/stores/useSourceStore';
import { sourceColumns } from '@/components/source/SourceColumns';
import GeneratePODialog from '@/components/source/GeneratePODialog.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable from '@/components/data-table/DataTable.vue';
import type { ColumnDef } from '@tanstack/vue-table';

const store = useSourceStore();
const contractInput = ref('');

const handleSearch = () => {
    if (contractInput.value) {
        store.fetchContract(contractInput.value);
    }
};

// Dynamic columns generation
const columns = computed<ColumnDef<any>[]>(() => {
    // 1. Index Column
    const cols: ColumnDef<any>[] = [
        {
            id: 'index',
            header: '#',
            cell: ({ row }) => row.index + 1,
            enableSorting: false,
            size: 50
        }
    ];

    // 2. Data Columns from Config
    const dataCols = sourceColumns.map(col => ({
        accessorKey: col.key,
        header: col.label,
        size: col.width || 100,
        cell: ({ row }: any) => {
            const val = row.original[col.key];
            return val || '-'; // Placeholder for empty
        }
    }));

    return [...cols, ...dataCols];
});

const handleGenerate = () => {
    // TODO: Phase 4.6 - Implement Generation Dialog
    alert('BOM Calculated! Raw requirements are in store. Generate Dialog coming next.');
    console.log(store.materialRequirements);
};
</script>

<template>
    <div class="h-full flex flex-col space-y-4 p-8 pt-6">
        <div class="flex items-center justify-between space-y-2">
            <div>
                <h2 class="text-3xl font-bold tracking-tight">订单数据源</h2>
                <p class="text-muted-foreground">加载 ERP 合同订单并生成采购计划。</p>
            </div>
        </div>

        <!-- Search Bar -->
        <div class="flex items-center space-x-2 bg-white/5 p-4 border rounded-lg">
            <Input 
                v-model="contractInput" 
                placeholder="输入合同编号 (如 C12345)..." 
                class="w-[300px] font-mono"
                @keyup.enter="handleSearch"
            />
            <Button @click="handleSearch" :disabled="store.loading">
                {{ store.loading ? '查询中...' : '获取合同' }}
            </Button>
            
            <div v-if="store.currentOrder" class="ml-auto flex items-center gap-4 text-sm">
                 <div class="flex flex-col items-end">
                    <span class="font-bold">{{ store.currentOrder.customerName }}</span>
                    <span class="font-mono text-xs text-muted-foreground">{{ store.currentOrder.code }}</span>
                 </div>
                 <GeneratePODialog />
            </div>
        </div>

        <!-- Error Alert -->
        <div v-if="store.error" class="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-md">
            {{ store.error }}
        </div>

        <!-- Data Table -->
        <div class="flex-1 border rounded-md overflow-hidden bg-background">
            <DataTable 
                v-if="store.hasOrder"
                :columns="columns" 
                :data="store.orderItems" 
            />
            <div v-else class="h-full flex items-center justify-center text-muted-foreground">
                请输入合同号以加载数据
            </div>
        </div>
    </div>
</template>
