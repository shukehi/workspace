<script setup lang="ts">
import { ref, computed, h } from 'vue';
import { useSourceStore } from '@/stores/useSourceStore';
import { sourceColumns } from '@/components/source/SourceColumns';
import GeneratePODialog from '@/components/source/GeneratePODialog.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DataTable from '@/components/data-table/DataTable.vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { Search } from 'lucide-vue-next';
import LongTextCell from '@/components/source/LongTextCell.vue';
import ContractHistoryDialog from '@/components/source/ContractHistoryDialog.vue';

const store = useSourceStore();
const contractInput = ref('');
const longTextMode = ref<'clip' | 'hover' | 'expand'>('hover');
const historyDialogOpen = ref(false);

const longTextColumnKeys = new Set([
  'productModelName',
  'spec',
  'sj',
  'fssj',
  'xsbz',
  'qbbc',
  'bz',
]);

const handleSearch = () => {
  if (contractInput.value) {
    store.fetchContract(contractInput.value);
  }
};

const handleHistoryLoaded = (contractCode: string) => {
  contractInput.value = contractCode;
};

const sourceTableMinWidth = computed(() => {
  const indexColumnWidth = 50;
  const contentWidth = sourceColumns.reduce((total, column) => total + (column.width || 100), 0);
  return indexColumnWidth + contentWidth + 120;
});

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
      if (!longTextColumnKeys.has(col.key)) {
        return val || '-';
      }

      return h(LongTextCell, {
        text: val,
        mode: longTextMode.value,
        maxWidth: col.width || 180,
        label: col.label,
      });
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

          <Button variant="outline" :disabled="store.loading" @click="historyDialogOpen = true">
            历史合同
          </Button>

          <div class="flex items-center gap-1 rounded-md border bg-background p-1">
            <button
              class="px-2 py-1 text-xs rounded-sm transition-colors"
              :class="longTextMode === 'clip' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
              @click="longTextMode = 'clip'"
            >
              紧凑省略
            </button>
            <button
              class="px-2 py-1 text-xs rounded-sm transition-colors"
              :class="longTextMode === 'hover' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
              @click="longTextMode = 'hover'"
            >
              悬浮全文
            </button>
            <button
              class="px-2 py-1 text-xs rounded-sm transition-colors"
              :class="longTextMode === 'expand' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
              @click="longTextMode = 'expand'"
            >
              点击展开
            </button>
          </div>

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
        <p v-if="store.hasOrder" class="px-1 pb-2 text-[11px] text-muted-foreground md:hidden">表格可左右滑动查看更多列</p>
        <DataTable
          v-if="store.hasOrder"
          :columns="columns"
          :data="store.orderItems"
          :enable-selection="false"
          density="compact"
          :use-column-size="true"
          :table-min-width="sourceTableMinWidth"
        />
        <div v-else class="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
          <div class="w-12 h-12 rounded-full border flex items-center justify-center bg-background">
            <Search class="w-5 h-5" />
          </div>
          <p class="text-sm">Waiting for Contract ID...</p>
        </div>
      </CardContent>
    </Card>

    <ContractHistoryDialog
      v-model:open="historyDialogOpen"
      @loaded="handleHistoryLoaded"
    />
  </div>
</template>
