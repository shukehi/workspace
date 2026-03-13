<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { normalizeDateString } from '@/features/procurement/docModel';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useToastStore } from '@/stores/useToastStore';
import type { InventoryReceipt } from '@/types/inventory';

const route = useRoute();
const router = useRouter();
const store = useInventoryStore();
const { toast } = useToastStore();

const loading = ref(false);
const receipt = ref<InventoryReceipt | null>(null);
const relatedRows = ref<InventoryReceipt[]>([]);

const receiptId = computed(() => Number(route.params.id || 0));

const auditDetail = computed(() => {
  const current = receipt.value;
  if (!current) return null;

  const originalId = current.direction === 'reversal'
    ? Number(current.source_receipt_id || 0)
    : Number(current.id);
  const original = relatedRows.value.find((item) => Number(item.id) === originalId && item.direction !== 'reversal')
    || (current.direction !== 'reversal' ? current : null);
  if (!original) return null;

  const reversals = relatedRows.value
    .filter((item) => Number(item.source_receipt_id || 0) === originalId)
    .sort((a, b) => new Date(b.receipt_date || b.created_at || 0).getTime() - new Date(a.receipt_date || a.created_at || 0).getTime());
  const reversedQuantity = reversals.reduce((sum, item) => sum + Math.abs(Number(item.quantity || 0)), 0);
  const netQuantity = Number(original.quantity || 0) - reversedQuantity;

  return {
    original,
    reversals,
    reversedQuantity,
    netQuantity
  };
});

async function loadDetail() {
  if (!Number.isInteger(receiptId.value) || receiptId.value <= 0) {
    toast({ title: '入库记录不存在', variant: 'destructive' });
    return router.replace({ name: 'inventory', query: { tab: 'receipts' } });
  }

  loading.value = true;
  try {
    const current = await store.fetchInventoryReceipt(receiptId.value);
    receipt.value = current;
    relatedRows.value = await store.fetchAllInventoryReceipts({ orderNo: current.order_no });
  } catch {
    toast({
      title: '详情加载失败',
      description: '无法获取该入库记录的完整详情',
      variant: 'destructive'
    });
    router.replace({ name: 'inventory', query: { tab: 'receipts' } }).catch(() => undefined);
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push({
    name: 'inventory',
    query: {
      orderNo: receipt.value?.order_no || undefined,
      tab: 'receipts'
    }
  }).catch(() => undefined);
}

function jumpToProcurement() {
  if (!receipt.value?.order_no) return;
  router.push({
    name: 'procurement',
    query: {
      orderNo: receipt.value.order_no
    }
  }).catch(() => undefined);
}

onMounted(() => {
  loadDetail().catch(() => undefined);
});

watch(() => route.params.id, () => {
  loadDetail().catch(() => undefined);
});
</script>

<template>
  <div class="h-full flex flex-col p-6 md:p-8 gap-6 bg-muted/20">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-3xl font-semibold tracking-tight">入库记录详情</h2>
        <p class="text-muted-foreground mt-1">查看单条入库记录及其关联撤销轨迹。</p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" @click="goBack">返回库存页</Button>
        <Button variant="outline" @click="jumpToProcurement" :disabled="!receipt?.order_no">跳转采购单</Button>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-muted-foreground">详情加载中...</div>

    <template v-else-if="receipt && auditDetail">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-xs text-muted-foreground">订单号</CardTitle>
          </CardHeader>
          <CardContent class="text-lg font-semibold">{{ receipt.order_no }}</CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-xs text-muted-foreground">原始入库数量</CardTitle>
          </CardHeader>
          <CardContent class="text-lg font-semibold">{{ Number(auditDetail.original.quantity || 0) }} {{ auditDetail.original.unit || '' }}</CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-xs text-muted-foreground">已撤销量</CardTitle>
          </CardHeader>
          <CardContent class="text-lg font-semibold text-rose-600">{{ auditDetail.reversedQuantity }} {{ auditDetail.original.unit || '' }}</CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-xs text-muted-foreground">净入库数量</CardTitle>
          </CardHeader>
          <CardContent class="text-lg font-semibold text-emerald-600">{{ auditDetail.netQuantity }} {{ auditDetail.original.unit || '' }}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>记录概览</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 text-sm">
          <div><span class="text-muted-foreground">供应商：</span>{{ auditDetail.original.supplier || '-' }}</div>
          <div><span class="text-muted-foreground">物料：</span>{{ auditDetail.original.item_name || '-' }}</div>
          <div><span class="text-muted-foreground">方向：</span>{{ receipt.direction === 'reversal' ? '撤销' : '入库' }}</div>
          <div><span class="text-muted-foreground">入库日期：</span>{{ normalizeDateString(auditDetail.original.receipt_date) || '-' }}</div>
          <div><span class="text-muted-foreground">操作人：</span>{{ auditDetail.original.operator || '-' }}</div>
          <div><span class="text-muted-foreground">剩余可撤销：</span>{{ Number(auditDetail.original.reversible_quantity || 0) }} {{ auditDetail.original.unit || '' }}</div>
          <div class="md:col-span-2 xl:col-span-3"><span class="text-muted-foreground">备注：</span>{{ auditDetail.original.remark || '-' }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>撤销轨迹</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div v-if="auditDetail.reversals.length === 0" class="text-sm text-muted-foreground">尚无撤销流水</div>
          <div
            v-for="reversal in auditDetail.reversals"
            :key="reversal.id"
            class="rounded-md border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm"
          >
            <div class="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div class="font-medium text-rose-700">
                撤销 {{ Math.abs(Number(reversal.quantity || 0)) }} {{ reversal.unit || '' }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{ normalizeDateString(reversal.receipt_date) || '-' }} / {{ reversal.operator || '-' }}
              </div>
            </div>
            <div class="mt-1 text-xs text-muted-foreground">原因：{{ reversal.reverse_reason || '-' }}</div>
            <div class="mt-1 text-xs text-muted-foreground">备注：{{ reversal.remark || '-' }}</div>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
