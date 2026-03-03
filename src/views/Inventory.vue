<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useInventoryStore } from '@/stores/useInventoryStore';
import DataTable from '@/components/data-table/DataTable.vue';
import { createInventoryColumns } from '@/components/inventory/InventoryColumns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RefreshCcw, Search, AlertCircle, Package } from 'lucide-vue-next';
import type { InventoryItem } from '@/types/inventory';

const store = useInventoryStore();

// --- Filter States ---
const activeCategory = ref('ALL');
const searchQuery = ref('');

const categories = [
    { id: 'ALL', label: '全部库存' },
    { id: '锁芯', label: '锁芯' },
    { id: '锁叉', label: '锁叉' },
    { id: '包装', label: '包装材料' }
];

// --- Computed Filtered Data ---
const filteredItems = computed(() => {
    let list = store.sortedItems;
    
    // Filter by category
    if (activeCategory.value !== 'ALL') {
        list = list.filter(i => i.category === activeCategory.value);
    }
    
    // Filter by search query
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        list = list.filter(i => 
            i.model.toLowerCase().includes(query) || 
            i.supplier.toLowerCase().includes(query) ||
            i.name.toLowerCase().includes(query)
        );
    }
    
    return list;
});

// --- Actions ---
const handleEdit = (item: InventoryItem) => {
    const newQty = prompt(`修改库存: ${item.model}\n当前数量: ${item.stock_quantity}`, item.stock_quantity.toString());
    if (newQty !== null && !isNaN(parseFloat(newQty))) {
        store.updateStock(item.id, parseFloat(newQty));
    }
};

const columns = createInventoryColumns({
    onEdit: handleEdit
});

onMounted(() => {
    store.fetchInventory();
});
</script>

<template>
    <div class="h-full flex flex-col p-8 pt-6 space-y-6 bg-slate-50/50">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-3xl font-semibold text-slate-900 tracking-tight">库存管理</h2>
                <p class="text-slate-500 mt-1">监控实时库存、预警低水位物料并维护基础余量。</p>
            </div>
            <div class="flex items-center gap-2">
                <Button variant="outline" size="sm" @click="store.fetchInventory()" :disabled="store.loading">
                    <RefreshCcw class="w-4 h-4 mr-2" :class="{ 'animate-spin': store.loading }" />
                    同步库存
                </Button>
            </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card class="bg-white border-slate-200">
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-xs font-bold text-slate-500 uppercase">总物料数</CardTitle>
                    <Package class="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold text-slate-900 font-mono">{{ store.items.length }}</div>
                    <p class="text-[10px] text-slate-400 mt-1">SKU 统计量</p>
                </CardContent>
            </Card>
            
            <Card class="bg-rose-50 border-rose-200 shadow-sm">
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-xs font-bold text-rose-600 uppercase">低库存预警</CardTitle>
                    <AlertCircle class="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold text-rose-600 font-mono">{{ store.lowStockItems.length }}</div>
                    <p class="text-[10px] text-rose-500 mt-1">需立即补货</p>
                </CardContent>
            </Card>
        </div>

        <!-- Filter Bar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex space-x-1 bg-white p-1 rounded-lg border border-slate-200 w-fit shadow-sm">
                <button 
                    v-for="cat in categories" 
                    :key="cat.id"
                    @click="activeCategory = cat.id"
                    class="px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide"
                    :class="activeCategory === cat.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'"
                >
                    {{ cat.label }}
                </button>
            </div>

            <div class="relative w-full md:w-80 group">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <Input 
                    v-model="searchQuery" 
                    placeholder="搜索物料型号、供应商..." 
                    class="pl-10 h-10 border-slate-200 focus:border-slate-900 focus:ring-0 rounded-lg shadow-sm font-mono text-sm"
                />
            </div>
        </div>

        <!-- Main Content -->
        <div class="flex-1 overflow-auto rounded-xl bg-white border border-slate-200 shadow-sm p-4">
            <DataTable 
                :columns="columns" 
                :data="filteredItems" 
            />
        </div>
    </div>
</template>
