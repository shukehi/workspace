<script setup lang="ts">
import { ref, computed, h } from 'vue';
import { useSourceStore } from '@/stores/useSourceStore';
import { sourceColumns } from '@/components/source/SourceColumns';
import GeneratePODialog from '@/components/source/GeneratePODialog.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import DataTable from '@/components/data-table/DataTable.vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { Search, Loader2, ArrowRight, Settings2, RefreshCw } from 'lucide-vue-next';
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
            <Loader2 v-if="store.loading" class="w-4 h-4 mr-2 animate-spin" />
            {{ store.loading ? '获取中...' : '获取合同' }}
          </Button>

          <Button variant="outline" :disabled="store.loading" @click="historyDialogOpen = true">
            历史合同
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="icon" class="ml-auto lg:ml-0" title="文本显示设置">
                <Settings2 class="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>长文本显示</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup v-model="longTextMode">
                <DropdownMenuRadioItem value="clip">紧凑省略</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="hover">悬浮全文</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="expand">点击展开</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div v-if="store.currentOrder" class="lg:ml-auto flex items-center gap-3 lg:text-right">
            <div>
              <div class="text-sm font-semibold flex items-center justify-end gap-2">
                {{ store.currentOrder.customerName }}
                <Button variant="ghost" size="icon" class="h-6 w-6" title="刷新数据" @click="handleSearch" :disabled="store.loading">
                  <RefreshCw :class="['h-3 w-3', store.loading ? 'animate-spin' : '']" />
                </Button>
              </div>
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
          :use-column-size="true"
        />
        <div v-else class="h-full flex flex-col items-center justify-center text-muted-foreground gap-5">
          <div class="w-16 h-16 rounded-full border border-dashed flex items-center justify-center bg-muted/30">
            <Search class="w-8 h-8 opacity-50" />
          </div>
          <p class="text-base text-foreground font-medium">请输入或者选择历史合同，以开始解析订单明细</p>
          <Button @click="historyDialogOpen = true" variant="secondary" class="shadow-sm">
            历史合同快照
            <ArrowRight class="w-4 h-4 ml-2 opacity-70" />
          </Button>
        </div>
      </CardContent>
    </Card>

    <ContractHistoryDialog
      v-model:open="historyDialogOpen"
      @loaded="handleHistoryLoaded"
    />
  </div>
</template>
