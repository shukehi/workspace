<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

// Computed for date formatting for input[type="date"]
const formattedOrderDate = computed({
    get: () => form.value.created_at ? new Date(form.value.created_at).toISOString().split('T')[0] : '',
    set: (val) => { if (val) form.value.created_at = new Date(val).toISOString(); }
});

const formattedDeliveryDate = computed({
    get: () => form.value.delivery_date ? new Date(form.value.delivery_date).toISOString().split('T')[0] : '',
    set: (val) => { if (val) form.value.delivery_date = new Date(val).toISOString(); }
});



// Initialize form when order changes
watch(
  () => props.order,
  (newOrder) => {
    if (newOrder) {
      // Deep copy
      const copy = JSON.parse(JSON.stringify(newOrder));
      
      // Ensure metadata exists
      if (!copy.metadata) copy.metadata = {};
      
      const isPackagingOrder = copy.category && String(copy.category).includes('包装');

      // Auto-fill missing names using packaging matcher only for packaging orders
      if (isPackagingOrder && !copy.metadata.external_name && copy.items && copy.items.length > 0) {
          // Heuristic: If it looks like packaging, try to match
          const firstItem = copy.items[0];
          const matched = packagingMatcher.match(firstItem.model || firstItem.name);
          
          // Always try to set external name if matched
          if (matched) {
             copy.metadata.external_name = matched;
          }
          
          // Always try to set supplier if missing
          // This ensures that even if the name matches perfectly (matched === original),
          // we still apply the correct supplier from config.
          if (!copy.supplier) {
              const packagingConfig = configLoader.getPackagingMapping();
              copy.supplier = packagingConfig?.supplierName || '默认供应商'; 
              // console.log('Auto-filled supplier:', copy.supplier);
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
    // Notification handled by parent or simple alert
    // alert('✅ 订单已更新'); 
  } catch (e) {
    console.error('Update failed', e);
    alert('保存失败');
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-[1000px] max-h-[90vh] flex flex-col p-0 gap-0 bg-neutral-100">
      <DialogHeader class="sr-only">
        <DialogTitle>编辑采购单</DialogTitle>
        <DialogDescription>编辑采购单基础信息和明细项数据。</DialogDescription>
      </DialogHeader>
      
      <!-- Toolbar -->
      <div class="px-6 py-4 bg-white border-b flex justify-between items-center sticky top-0 z-10">
          <DialogTitle class="text-lg font-bold">编辑采购单</DialogTitle>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" @click="$emit('update:open', false)">取消</Button>
            <Button size="sm" @click="handleSave" class="bg-emerald-600 hover:bg-emerald-700 text-white">保存修改</Button>
          </div>
      </div>

      <div class="flex-1 overflow-auto p-6">
        <!-- Paper Logic: White background, shadow, similar to print page -->
        <div class="bg-white shadow-sm border border-neutral-200 p-8 max-w-[210mm] mx-auto min-h-[500px]">
            
            <!-- Header Section (Matching PDF) -->
            <div class="mb-8 border-2 border-black p-6">
                <h1 class="text-2xl font-bold text-center mb-6 uppercase tracking-wider">采购订单</h1>
                
                <div class="grid grid-cols-3 gap-8 text-sm">
                    <!-- Column 1 -->
                    <div class="space-y-3">
                        <div class="flex items-center gap-2">
                            <Label class="font-bold min-w-16">客户名称:</Label>
                            <Input v-model="form.metadata!.customer_name" placeholder="内部" class="h-7 text-xs" /> 
                            <!-- Fallback or mock data usually -->
                        </div>
                        <div class="flex items-center gap-2">
                            <Label class="font-bold min-w-16">订单号:</Label>
                            <span class="font-mono font-medium">{{ form.order_no }}</span>
                        </div>
                    </div>

                    <!-- Column 2 -->
                    <div class="space-y-3">
                        <div class="flex items-center gap-2">
                            <Label class="font-bold min-w-16">内部名称:</Label>
                            <Input v-model="form.metadata!.internal_name" class="h-7 text-xs" />
                        </div>
                        <div class="flex items-center gap-2">
                            <Label class="font-bold min-w-16">外协名称:</Label>
                            <Input v-model="form.metadata!.external_name" class="h-7 text-xs" />
                        </div>
                    </div>

                    <!-- Column 3 -->
                    <div class="space-y-3">
                        <div class="flex items-center gap-2">
                            <Label class="font-bold min-w-16">制单日期:</Label>
                             <Input type="date" v-model="formattedOrderDate" class="h-7 text-xs w-32" />
                        </div>
                        <div class="flex items-center gap-2">
                            <Label class="font-bold min-w-16">交货日期:</Label>
                            <Input type="date" v-model="formattedDeliveryDate" class="h-7 text-xs w-32" />
                        </div>
                    </div>
                </div>

                <!-- Bottom Row -->
                <div class="mt-4 pt-4 border-t border-dashed border-gray-300">
                     <div class="flex items-center gap-2">
                        <Label class="font-bold min-w-16">供应商:</Label>
                        <Input v-model="form.supplier" class="h-7 text-xs w-64" />
                    </div>
                </div>
            </div>

            <!-- Items Table (Matching PDF Styles) -->
            <div class="border-2 border-black">
                <table class="w-full text-xs font-mono">
                    <thead class="bg-gray-100 font-bold border-b border-black">
                        <tr>
                            <th class="border-r border-black p-2 w-10 text-center">序号</th>
                            <th class="border-r border-black p-2 text-left">产品名称</th>
                            <th class="border-r border-black p-2 text-left w-32">规格尺寸</th>
                            <th class="border-r border-black p-2 text-center w-12">门边</th>
                            <th class="border-r border-black p-2 text-center w-12">左数</th>
                            <th class="border-r border-black p-2 text-center w-12">右数</th>
                             <th class="border-r border-black p-2 text-center w-16">数量</th> <!-- Totals fallback -->
                            <th class="p-2 text-left">备注</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-black">
                        <tr v-for="(item, idx) in form.items" :key="idx" class="hover:bg-blue-50/50">
                            <td class="border-r border-black p-1 text-center text-gray-500">{{ idx + 1 }}</td>
                            
                            <td class="border-r border-black p-0">
                                <input v-model="item.name" class="w-full h-full p-2 bg-transparent outline-none focus:bg-blue-50" />
                            </td>
                            
                            <td class="border-r border-black p-0">
                                <input v-model="item.model" class="w-full h-full p-2 bg-transparent outline-none focus:bg-blue-50" />
                            </td>

                            <td class="border-r border-black p-0">
                                <input v-model="item.orientation" class="w-full h-full p-2 text-center bg-transparent outline-none focus:bg-blue-50" />
                            </td>

                            <!-- Quantity Split Logic -->
                            <td class="border-r border-black p-0">
                                <input v-model.number="item.quantity_left" type="number" class="w-full h-full p-2 text-center bg-transparent outline-none focus:bg-blue-50" placeholder="-" />
                            </td>
                             <td class="border-r border-black p-0">
                                <input v-model.number="item.quantity_right" type="number" class="w-full h-full p-2 text-center bg-transparent outline-none focus:bg-blue-50" placeholder="-" />
                            </td>

                             <td class="border-r border-black p-0">
                                <!-- Main Quantity (if left/right empty, or explicit total) -->
                                <input v-model.number="item.quantity" type="number" class="w-full h-full p-2 text-center bg-transparent outline-none focus:bg-blue-50 font-bold" />
                            </td>

                            <td class="p-0">
                                <input v-model="item.remark" class="w-full h-full p-2 bg-transparent outline-none focus:bg-blue-50" />
                            </td>
                        </tr>
                        <!-- Empty Rows Filler for visuals -->
                        <tr v-if="(!form.items || form.items.length < 5)" v-for="i in (5 - (form.items?.length || 0))" :key="'empty-'+i">
                             <td class="border-r border-black p-2">&nbsp;</td>
                             <td class="border-r border-black">&nbsp;</td>
                             <td class="border-r border-black">&nbsp;</td>
                             <td class="border-r border-black">&nbsp;</td>
                             <td class="border-r border-black">&nbsp;</td>
                             <td class="border-r border-black">&nbsp;</td>
                             <td class="border-r border-black">&nbsp;</td>
                             <td>&nbsp;</td>
                        </tr>
                    </tbody>
                </table>
            </div>

             <!-- Footer (Signatures) -->
            <div class="flex justify-between mt-12 pt-6 border-t border-black text-sm">
                <div class="flex items-center gap-2">
                    <span>制单人:</span>
                    <div class="w-24 border-b border-black"></div>
                </div>
                 <div class="flex items-center gap-2">
                    <span>审核人:</span>
                    <div class="w-24 border-b border-black"></div>
                </div>
                 <div class="flex items-center gap-2">
                    <span>供应商签字:</span>
                    <div class="w-24 border-b border-black"></div>
                </div>
            </div>

        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
