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

const activeCategory = ref('ALL');
const searchQuery = ref('');

const categories = [
  { id: 'ALL', label: '全部库存' },
  { id: '锁芯', label: '锁芯' },
  { id: '锁叉', label: '锁叉' },
  { id: '包装', label: '包装材料' }
];

const filteredItems = computed(() => {
  let list = store.sortedItems;

  if (activeCategory.value !== 'ALL') {
    list = list.filter(i => i.category === activeCategory.value);
  }

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

const handleEdit = (item: InventoryItem) => {
  const newQty = prompt(`修改库存: ${item.model}\n当前数量: ${item.stock_quantity}`, item.stock_quantity.toString());
  if (newQty !== null && !isNaN(parseFloat(newQty))) {
    store.updateStock(item.id, parseFloat(newQty));
  }
};

const columns = createInventoryColumns({ onEdit: handleEdit });

onMounted(() => {
  store.fetchInventory();
});
</script>

<template>
  <div class="h-full flex flex-col p-6 md:p-8 gap-6 bg-muted/20">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div>
        <h2 class="text-3xl font-semibold tracking-tight">库存管理</h2>
        <p class="text-muted-foreground mt-1">监控实时库存、预警低水位物料并维护基础余量。</p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="store.fetchInventory()" :disabled="store.loading">
          <RefreshCcw class="w-4 h-4 mr-2" :class="{ 'animate-spin': store.loading }" />
          同步库存
        </Button>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">总物料数</CardTitle>
          <Package class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ store.items.length }}</div>
          <p class="text-xs text-muted-foreground mt-1">SKU 统计量</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">低库存预警</CardTitle>
          <AlertCircle class="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold text-rose-600">{{ store.lowStockItems.length }}</div>
          <p class="text-xs text-muted-foreground mt-1">需立即补货</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardContent class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex flex-wrap gap-1 rounded-md border bg-background p-1 w-fit">
          <button
            v-for="cat in categories"
            :key="cat.id"
            @click="activeCategory = cat.id"
            class="px-3 py-1.5 text-sm rounded-sm transition-colors"
            :class="activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
          >
            {{ cat.label }}
          </button>
        </div>

        <div class="relative w-full md:w-80">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索物料型号、供应商..."
            class="pl-10"
          />
        </div>
      </CardContent>
    </Card>

    <Card class="flex-1 min-h-0">
      <CardContent class="p-4 h-full overflow-auto">
        <DataTable
          :columns="columns"
          :data="filteredItems"
          density="compact"
        />
      </CardContent>
    </Card>
  </div>
</template>
