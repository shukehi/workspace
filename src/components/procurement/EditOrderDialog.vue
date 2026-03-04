<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProcurementStore } from '@/stores/useProcurementStore';
import type { Order } from '@/types/order';
import { packagingMatcher } from '@/lib/packagingMatcher';
import { configLoader } from '@/services/configLoader';

const props = defineProps<{
  open: boolean;
  order: Order | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'saved'): void;
}>();

const store = useProcurementStore();
const form = ref<Partial<Order>>({});

const formattedOrderDate = computed({
  get: () => form.value.created_at ? new Date(form.value.created_at).toISOString().split('T')[0] : '',
  set: (val) => { if (val) form.value.created_at = new Date(val).toISOString(); }
});

const formattedDeliveryDate = computed({
  get: () => form.value.delivery_date ? new Date(form.value.delivery_date).toISOString().split('T')[0] : '',
  set: (val) => { if (val) form.value.delivery_date = new Date(val).toISOString(); }
});

watch(
  () => props.order,
  (newOrder) => {
    if (newOrder) {
      const copy = JSON.parse(JSON.stringify(newOrder));
      if (!copy.metadata) copy.metadata = {};

      const isPackagingOrder = copy.category && String(copy.category).includes('包装');
      if (isPackagingOrder && !copy.metadata.external_name && copy.items && copy.items.length > 0) {
        const firstItem = copy.items[0];
        const matched = packagingMatcher.match(firstItem.model || firstItem.name);

        if (matched) {
          copy.metadata.external_name = matched;
        }

        if (!copy.supplier) {
          const packagingConfig = configLoader.getPackagingMapping();
          copy.supplier = packagingConfig?.supplierName || '默认供应商';
        }
      }

      form.value = copy;
    }
  },
  { immediate: true }
);

const handleSave = () => {
  if (!form.value.id || !props.order) return;

  try {
    store.updateOrder(form.value.id, form.value);
    emit('saved');
    emit('update:open', false);
  } catch (e) {
    console.error('Update failed', e);
    alert('保存失败');
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-[1100px] max-h-[90vh] flex flex-col p-0 gap-0 bg-background">
      <DialogHeader class="sr-only">
        <DialogTitle>编辑采购单</DialogTitle>
        <DialogDescription>编辑采购单基础信息和明细项数据。</DialogDescription>
      </DialogHeader>

      <div class="px-6 py-4 bg-background border-b flex justify-between items-center sticky top-0 z-10">
        <DialogTitle class="text-lg font-semibold">编辑采购单</DialogTitle>
        <div class="flex gap-2">
          <Button variant="outline" size="sm" @click="$emit('update:open', false)">取消</Button>
          <Button size="sm" @click="handleSave">保存修改</Button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-6 bg-muted/20">
        <div class="bg-card border rounded-lg p-6 max-w-[210mm] mx-auto min-h-[500px]">
          <div class="mb-6 border rounded-lg p-4">
            <h1 class="text-xl font-semibold text-center mb-5">采购订单</h1>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <Label class="min-w-16">客户名称:</Label>
                  <Input v-model="form.metadata!.customer_name" placeholder="内部" class="h-8 text-xs" />
                </div>
                <div class="flex items-center gap-2">
                  <Label class="min-w-16">订单号:</Label>
                  <span class="font-medium">{{ form.order_no }}</span>
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <Label class="min-w-16">内部名称:</Label>
                  <Input v-model="form.metadata!.internal_name" class="h-8 text-xs" />
                </div>
                <div class="flex items-center gap-2">
                  <Label class="min-w-16">外协名称:</Label>
                  <Input v-model="form.metadata!.external_name" class="h-8 text-xs" />
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <Label class="min-w-16">制单日期:</Label>
                  <Input type="date" v-model="formattedOrderDate" class="h-8 text-xs w-36" />
                </div>
                <div class="flex items-center gap-2">
                  <Label class="min-w-16">交货日期:</Label>
                  <Input type="date" v-model="formattedDeliveryDate" class="h-8 text-xs w-36" />
                </div>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-dashed">
              <div class="flex items-center gap-2">
                <Label class="min-w-16">供应商:</Label>
                <Input v-model="form.supplier" class="h-8 text-xs w-64" />
              </div>
            </div>
          </div>

          <div class="border rounded-lg overflow-hidden">
            <table class="w-full text-xs">
              <thead class="bg-muted/40 border-b">
                <tr>
                  <th class="border-r p-2 w-10 text-center">序号</th>
                  <th class="border-r p-2 text-left">产品名称</th>
                  <th class="border-r p-2 text-left w-32">规格尺寸</th>
                  <th class="border-r p-2 text-center w-12">门边</th>
                  <th class="border-r p-2 text-center w-12">左数</th>
                  <th class="border-r p-2 text-center w-12">右数</th>
                  <th class="border-r p-2 text-center w-16">数量</th>
                  <th class="p-2 text-left">备注</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr v-for="(item, idx) in form.items" :key="idx" class="hover:bg-muted/30">
                  <td class="border-r p-1 text-center text-muted-foreground">{{ idx + 1 }}</td>

                  <td class="border-r p-0">
                    <input v-model="item.name" class="w-full h-full p-2 bg-transparent outline-none focus:bg-muted/40" />
                  </td>

                  <td class="border-r p-0">
                    <input v-model="item.model" class="w-full h-full p-2 bg-transparent outline-none focus:bg-muted/40" />
                  </td>

                  <td class="border-r p-0">
                    <input v-model="item.orientation" class="w-full h-full p-2 text-center bg-transparent outline-none focus:bg-muted/40" />
                  </td>

                  <td class="border-r p-0">
                    <input v-model.number="item.quantity_left" type="number" class="w-full h-full p-2 text-center bg-transparent outline-none focus:bg-muted/40" placeholder="-" />
                  </td>
                  <td class="border-r p-0">
                    <input v-model.number="item.quantity_right" type="number" class="w-full h-full p-2 text-center bg-transparent outline-none focus:bg-muted/40" placeholder="-" />
                  </td>

                  <td class="border-r p-0">
                    <input v-model.number="item.quantity" type="number" class="w-full h-full p-2 text-center bg-transparent outline-none focus:bg-muted/40 font-medium" />
                  </td>

                  <td class="p-0">
                    <input v-model="item.remark" class="w-full h-full p-2 bg-transparent outline-none focus:bg-muted/40" />
                  </td>
                </tr>
                <tr v-if="(!form.items || form.items.length < 5)" v-for="i in (5 - (form.items?.length || 0))" :key="'empty-'+i">
                  <td class="border-r p-2">&nbsp;</td>
                  <td class="border-r">&nbsp;</td>
                  <td class="border-r">&nbsp;</td>
                  <td class="border-r">&nbsp;</td>
                  <td class="border-r">&nbsp;</td>
                  <td class="border-r">&nbsp;</td>
                  <td class="border-r">&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex justify-between mt-10 pt-5 border-t text-sm">
            <div class="flex items-center gap-2">
              <span>制单人:</span>
              <div class="w-24 border-b"></div>
            </div>
            <div class="flex items-center gap-2">
              <span>审核人:</span>
              <div class="w-24 border-b"></div>
            </div>
            <div class="flex items-center gap-2">
              <span>供应商签字:</span>
              <div class="w-24 border-b"></div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
