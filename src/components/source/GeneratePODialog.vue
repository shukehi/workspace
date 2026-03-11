
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { POGenerator } from '@/services/poGenerator';
import { useProcurementStore } from '@/stores/useProcurementStore';
import { useRouter } from 'vue-router';
import { useSourceStore } from '@/stores/useSourceStore';
import { parseQuantityPair } from '@/lib/erp-engine/parsers';
import { useToastStore } from '@/stores/useToastStore';

const props = defineProps<{
  disabled?: boolean;
}>();

const open = ref(false);
const mergeConfirmOpen = ref(false);
const procurementStore = useProcurementStore();
const sourceStore = useSourceStore();
const generator = new POGenerator({ sourceStore });
const router = useRouter();
const { toast } = useToastStore();

const proposals = ref<any[]>([]);
const pendingGroups = ref<{supplier: string; category: string}[]>([]);
const isGenerating = ref(false);

const availableCategories = computed(() => {
    return Array.from(new Set(proposals.value.map(p => p.category)));
});

const selectedCategories = ref<string[]>([]);
const selectedGroups = computed<{supplier: string; category: string}[]>(() => {
    return proposals.value
        .filter(p => selectedCategories.value.includes(p.category))
        .map(p => ({ supplier: p.supplierName, category: p.category }));
});

const confirmButtonText = computed(() => {
    if (isGenerating.value) return '生成中...';
    if (selectedGroups.value.length === 0) return '请选择类别';
    return `生成 ${selectedGroups.value.length} 张采购单`;
});

const packagingPreviewRows = computed(() => {
    const hasPackagingSelected = pendingGroups.value.some(group => group.category === '包装');
    if (!hasPackagingSelected) return [];

    const orderItems = sourceStore.currentOrder?.list || [];
    return orderItems
        .filter((item: any) => String(item?.bz || '').trim())
        .map((item: any, index: number) => {
            const qtyPair = parseQuantityPair(item?.qty);
            return {
            id: `${index}-${item?.productModelName || item?.spec || item?.qty || 'item'}`,
            productName: String(item?.productModelName || '').trim() || '-',
            spec: String(item?.spec || '').trim() || '-',
            mb: String(item?.mb || '').trim() || '-',
            quantityPair: `${qtyPair.left}/${qtyPair.right}`,
        };
        });
});

const toggleCategory = (cat: string, checked: boolean | 'indeterminate') => {
    const isChecked = checked === true;
    if (isChecked && !selectedCategories.value.includes(cat)) {
        selectedCategories.value.push(cat);
    } else if (!isChecked) {
        selectedCategories.value = selectedCategories.value.filter(c => c !== cat);
    }
};

const handleCategoryClick = (cat: string) => {
    const isCurrentlyChecked = selectedCategories.value.includes(cat);
    toggleCategory(cat, !isCurrentlyChecked);
};

// Load proposals when dialog opens
watch(open, (isOpen) => {
    if (isOpen && sourceStore.hasOrder) {
        const results = generator.generateProposal();
        proposals.value = results;
        // Default: no category selected, wait for user explicit choice
        selectedCategories.value = [];
    } else if (!isOpen) {
        selectedCategories.value = [];
        pendingGroups.value = [];
    }
});

const generateWithOption = async (mergeSameSpec: boolean) => {
    isGenerating.value = true;
    try {
        const orders = generator.createOrders(pendingGroups.value, { mergeSameSpec });
        const createdOrders: any[] = [];
        const duplicateOrders: Array<{ order_no: string; category: string; supplier: string; status: string }> = [];
        if (mergeSameSpec) {
            const mergedPackagingOrders = orders.filter((order: any) => order.category === '包装');
            console.log('[Merged Packaging Orders]', mergedPackagingOrders);
        }

        // Add to store sequentially to avoid SQLite write lock under concurrent POSTs
        for (const order of orders) {
            try {
                const created = await procurementStore.addOrder(order);
                createdOrders.push(created);
            } catch (e: any) {
                const status = e?.response?.status;
                if (status === 409) {
                    const existingOrder = e?.response?.data?.existingOrder;
                    duplicateOrders.push({
                        order_no: String(existingOrder?.order_no || order.order_no || '-'),
                        category: String(existingOrder?.category || order.category || '-'),
                        supplier: String(existingOrder?.supplier || order.supplier || '-'),
                        status: String(existingOrder?.status || '-'),
                    });
                    continue;
                }
                throw e;
            }
        }

        mergeConfirmOpen.value = false;
        open.value = false;
        pendingGroups.value = [];

        if (createdOrders.length > 0) {
            toast({
                title: duplicateOrders.length > 0 ? '采购单部分生成完成' : '采购单生成完成',
                description: duplicateOrders.length > 0
                    ? `成功生成 ${createdOrders.length} 张，跳过重复 ${duplicateOrders.length} 张`
                    : `成功生成 ${createdOrders.length} 张采购单`,
                variant: 'success'
            });
        }

        if (duplicateOrders.length > 0) {
            const summary = duplicateOrders
                .map((item) => `${item.category} / ${item.supplier} / ${item.order_no} / ${item.status}`)
                .join('\n');
            alert(`本次生成跳过了 ${duplicateOrders.length} 张重复采购单：\n${summary}`);
        } else if (createdOrders.length === 0) {
            toast({
                title: '未生成新采购单',
                description: '所选采购单均已存在',
                variant: 'default'
            });
        }

        // Navigate to Procurement
        await router.push('/procurement');
    } catch (e) {
        console.error(e);
        toast({
            title: '生成失败',
            description: '采购单生成失败，请稍后重试',
            variant: 'destructive'
        });
    } finally {
        isGenerating.value = false;
    }
};

const handleConfirm = () => {
    if (selectedGroups.value.length === 0) return;
    pendingGroups.value = [...selectedGroups.value];
    const hasPackaging = selectedGroups.value.some(group => group.category === '包装');
    if (hasPackaging) {
        mergeConfirmOpen.value = true;
        return;
    }
    generateWithOption(false);
};


</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button variant="default" :disabled="disabled || !sourceStore.hasOrder">
        一键生成采购单
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[725px]">
      <DialogHeader>
        <DialogTitle>生成采购提案</DialogTitle>
        <DialogDescription>
          请确认并选择需要生成的采购类别。
        </DialogDescription>
      </DialogHeader>
      
      <div class="py-4">
        <div v-if="proposals.length === 0" class="text-center py-8 text-muted-foreground">
            没有发现需要采购的物料。
        </div>

        <div v-else class="space-y-4">
            <!-- Categorized Table -->
            <div class="border rounded-md">
                <div class="grid grid-cols-12 gap-4 p-3 bg-muted/50 font-medium text-sm border-b">
                    <div class="col-span-2 text-center">选择</div>
                    <div class="col-span-4">资源类别</div>
                    <div class="col-span-3 text-right">生成订单数</div>
                    <div class="col-span-3 text-right">包含物料项数</div>
                </div>
                
                <div v-for="cat in availableCategories" :key="cat" 
                     class="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/10 transition-colors border-b last:border-0"
                >
                    <div class="col-span-2 flex justify-center">
                        <Checkbox 
                            :checked="selectedCategories.includes(cat)"
                            @click="handleCategoryClick(cat)"
                        />
                    </div>
                    <div class="col-span-4 font-medium text-foreground">
                        {{ cat }}
                    </div>
                    <div class="col-span-3 text-right text-muted-foreground">
                        {{ proposals.filter(p => p.category === cat).length }}
                    </div>
                    <div class="col-span-3 text-right text-sm">
                        {{ proposals.filter(p => p.category === cat).reduce((sum, p) => sum + p.items.length, 0) }}
                    </div>
                </div>
            </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">取消</Button>
        <Button @click="handleConfirm" :disabled="selectedGroups.length === 0 || isGenerating">
            {{ confirmButtonText }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog v-model:open="mergeConfirmOpen">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>包装采购订单：是否合并相同规格尺寸？</DialogTitle>
        <DialogDescription>
          当前是包装采购订单操作。选择“合并”会将同规格尺寸汇总为一条明细；选择“不合并”则保留逐项明细。
        </DialogDescription>
      </DialogHeader>
        <div class="space-y-2">
        <div class="text-xs text-muted-foreground">包装明细预览（产品名称、规格/洞口尺寸、门边、左右数量）</div>
        <div class="max-h-[260px] overflow-auto rounded-md border">
          <div class="grid grid-cols-12 gap-2 p-2 bg-muted/40 text-xs font-medium border-b">
            <div class="col-span-4">产品名称</div>
            <div class="col-span-4">规格/洞口尺寸</div>
            <div class="col-span-2">门边</div>
            <div class="col-span-2 text-right">左右数量</div>
          </div>
          <div v-if="packagingPreviewRows.length === 0" class="p-3 text-xs text-muted-foreground">暂无包装明细</div>
          <div
            v-for="row in packagingPreviewRows"
            :key="row.id"
            class="grid grid-cols-12 gap-2 p-2 text-xs border-b last:border-0"
          >
            <div class="col-span-4 truncate" :title="row.productName">{{ row.productName }}</div>
            <div class="col-span-4 truncate" :title="row.spec">{{ row.spec }}</div>
            <div class="col-span-2 truncate" :title="row.mb">{{ row.mb }}</div>
            <div class="col-span-2 text-right">{{ row.quantityPair }}</div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" :disabled="isGenerating" @click="mergeConfirmOpen = false">返回修改</Button>
        <Button variant="outline" :disabled="isGenerating" @click="generateWithOption(false)">不合并</Button>
        <Button :disabled="isGenerating" @click="generateWithOption(true)">
          {{ isGenerating ? '生成中...' : '合并后生成' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
