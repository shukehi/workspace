<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSourceStore } from '@/stores/useSourceStore';
import { sourceColumns } from '@/components/source/SourceColumns';
import GeneratePODialog from '@/components/source/GeneratePODialog.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable from '@/components/data-table/DataTable.vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { Search } from 'lucide-vue-next';

const store = useSourceStore();
const contractInput = ref('');

// Handle search
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
</script>

<template>
    <div class="h-full flex flex-col space-y-4 p-8 pt-6 bg-slate-50/30">
        <div class="flex items-center justify-between space-y-2">
            <div>
                <h2 class="text-3xl font-semibold text-slate-900 tracking-tight">订单数据源</h2>
                <p class="text-slate-500 mt-1 italic font-mono text-sm uppercase tracking-wide">Step 1: Select items from ERP contract to generate POs.</p>
            </div>
        </div>

        <!-- Search & Control Bar -->
        <div class="flex items-center space-x-3 bg-white p-5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none">
            <div class="relative w-[350px]">
                <Input 
                    v-model="contractInput" 
                    placeholder="输入合同编号 (如 C12345)..." 
                    class="rounded-none border-black border-2 font-mono h-11 focus-visible:ring-0 focus-visible:border-black"
                    @keyup.enter="handleSearch"
                />
            </div>
            
            <Button @click="handleSearch" :disabled="store.loading" class="h-11 px-8 rounded-none bg-black text-white hover:bg-neutral-800 font-mono uppercase font-bold border-2 border-black">
                {{ store.loading ? 'Fetching...' : '获取合同' }}
            </Button>
            
            <div v-if="store.currentOrder" class="ml-auto flex items-center gap-6">
                 <div class="flex flex-col items-end border-r-2 border-black pr-6">
                    <span class="font-black text-slate-900 uppercase tracking-tighter text-lg leading-tight">{{ store.currentOrder.customerName }}</span>
                    <span class="font-mono text-xs font-bold text-slate-500">{{ store.currentOrder.code }}</span>
                 </div>
                 
                 <div class="flex items-center gap-4">
                    <GeneratePODialog :disabled="!store.hasOrder" />
                 </div>
            </div>
        </div>

        <!-- Data Table -->
        <div class="flex-1 rounded-none border-2 border-black bg-white overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-0">
            <DataTable 
                v-if="store.hasOrder"
                :columns="columns" 
                :data="store.orderItems" 
                :enable-selection="false"
            />
            <div v-else class="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 opacity-50">
                <div class="w-20 h-20 border-4 border-slate-200 rounded-full flex items-center justify-center">
                    <Search class="w-10 h-10" />
                </div>
                <p class="font-mono uppercase tracking-widest font-black">Waiting for Contract ID...</p>
            </div>
        </div>
    </div>
</template>
