<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSourceStore } from '@/stores/useSourceStore';
import { sourceColumns } from '@/components/source/SourceColumns';
import GeneratePODialog from '@/components/source/GeneratePODialog.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DataTable from '@/components/data-table/DataTable.vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { Search } from 'lucide-vue-next';

const store = useSourceStore();
const contractInput = ref('');

const handleSearch = () => {
  if (contractInput.value) {
    store.fetchContract(contractInput.value);
  }
};

const columns = computed<ColumnDef<any>[]>(() => {
  const cols: ColumnDef<any>[] = [
    {
      id: 'index',
      header: '#',
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      size: 50
    }
  ];

  const dataCols = sourceColumns.map(col => ({
    accessorKey: col.key,
    header: col.label,
    size: col.width || 100,
    cell: ({ row }: any) => {
      const val = row.original[col.key];
      return val || '-';
    }
  }));

  return [...cols, ...dataCols];
});
</script>

<template>
  <div class="h-full flex flex-col p-6 md:p-8 gap-6 bg-muted/20">
    <div>
      <h2 class="text-3xl font-semibold tracking-tight">订单数据源</h2>
      <p class="text-muted-foreground mt-1 text-sm">Step 1: Select items from ERP contract to generate POs.</p>
    </div>

    <Card>
      <CardHeader class="pb-4">
        <CardTitle class="text-base">合同查询</CardTitle>
        <CardDescription>输入 ERP 合同编号并拉取明细。</CardDescription>
      </CardHeader>
      <CardContent class="pt-0">
        <div class="flex flex-col lg:flex-row lg:items-center gap-3">
          <div class="relative w-full lg:w-[360px]">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="contractInput"
              placeholder="输入合同编号 (如 C12345)..."
              class="pl-9"
              @keyup.enter="handleSearch"
            />
          </div>

          <Button @click="handleSearch" :disabled="store.loading">
            {{ store.loading ? 'Fetching...' : '获取合同' }}
          </Button>

          <div v-if="store.currentOrder" class="lg:ml-auto flex items-center gap-3 lg:text-right">
            <div>
              <div class="text-sm font-semibold">{{ store.currentOrder.customerName }}</div>
              <div class="text-xs text-muted-foreground">{{ store.currentOrder.code }}</div>
            </div>
            <GeneratePODialog :disabled="!store.hasOrder" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="flex-1 min-h-0">
      <CardContent class="h-full p-4">
        <DataTable
          v-if="store.hasOrder"
          :columns="columns"
          :data="store.orderItems"
          :enable-selection="false"
          density="compact"
        />
        <div v-else class="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
          <div class="w-12 h-12 rounded-full border flex items-center justify-center bg-background">
            <Search class="w-5 h-5" />
          </div>
          <p class="text-sm">Waiting for Contract ID...</p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
