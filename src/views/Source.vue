<script setup lang="ts">
import { h } from 'vue';
import { useSourceStore } from '@/stores/useSourceStore';
import GeneratePODialog from '@/components/source/GeneratePODialog.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DataTable from '@/components/data-table/DataTable.vue';
import { Search } from 'lucide-vue-next';
import ContractHistoryDialog from '@/components/source/ContractHistoryDialog.vue';
import LongTextCell from '@/components/source/LongTextCell.vue';
import { useSourcePageState } from '@/features/source-analysis/composables/useSourcePageState';

const store = useSourceStore();
const {
  contractInput,
  longTextMode,
  historyDialogOpen,
  sourceTableMinWidth,
  columns,
  loading,
  hasOrder,
  orderItems,
  currentOrder,
  handleSearch,
  handleHistoryLoaded,
} = useSourcePageState(store, {
  renderLongTextCell: ({ text, mode, maxWidth, label }) => h(LongTextCell, {
    text,
    mode,
    maxWidth,
    label,
  }),
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

          <Button @click="handleSearch" :disabled="loading">
            {{ store.loading ? 'Fetching...' : '获取合同' }}
          </Button>

          <Button variant="outline" :disabled="loading" @click="historyDialogOpen = true">
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

          <div v-if="currentOrder" class="lg:ml-auto flex items-center gap-3 lg:text-right">
            <div>
              <div class="text-sm font-semibold">{{ currentOrder.customerName }}</div>
              <div class="text-xs text-muted-foreground">{{ currentOrder.code }}</div>
            </div>
            <GeneratePODialog :disabled="!hasOrder" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="flex-1 min-h-0">
      <CardContent class="h-full p-4">
        <p v-if="hasOrder" class="px-1 pb-2 text-[11px] text-muted-foreground md:hidden">表格可左右滑动查看更多列</p>
        <DataTable
          v-if="hasOrder"
          :columns="columns"
          :data="orderItems"
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
