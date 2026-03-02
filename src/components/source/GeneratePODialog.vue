
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

const props = defineProps<{
  disabled?: boolean;
}>();

const open = ref(false);
const generator = new POGenerator();
const procurementStore = useProcurementStore();
const sourceStore = useSourceStore();
const router = useRouter();

const proposals = ref<any[]>([]);
const selectedGroups = ref<{supplier: string; category: string}[]>([]);
const isGenerating = ref(false);

const availableCategories = computed(() => {
    return Array.from(new Set(proposals.value.map(p => p.category)));
});

const selectedCategories = ref<string[]>([]);

watch(selectedCategories, (newVal) => {
    // keeping groups in sync when user toggles categories
    const newGroups = proposals.value
        .filter(p => newVal.includes(p.category))
        .map(p => ({ supplier: p.supplierName, category: p.category }));
    selectedGroups.value = newGroups;
}, { deep: true });

const toggleCategory = (cat: string, checked: boolean) => {
    if (checked && !selectedCategories.value.includes(cat)) {
        selectedCategories.value.push(cat);
    } else if (!checked) {
        selectedCategories.value = selectedCategories.value.filter(c => c !== cat);
    }
};

// Load proposals when dialog opens
watch(open, (isOpen) => {
    if (isOpen && sourceStore.hasOrder) {
        const results = generator.generateProposal();
        proposals.value = results;
        // Default select all categories
        selectedCategories.value = Array.from(new Set(results.map(p => p.category)));
    }
});

const handleConfirm = async () => {
    if (selectedGroups.value.length === 0) return;
    
    isGenerating.value = true;
    try {
        const orders = generator.createOrders(selectedGroups.value);
        
        // Add to store
        orders.forEach(order => {
            procurementStore.addOrder(order);
        });

        open.value = false;
        
        // Navigate to Procurement
        router.push('/procurement');
    } catch (e) {
        console.error(e);
        alert('Failed to generate orders');
    } finally {
        isGenerating.value = false;
    }
};


</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button variant="default" :disabled="disabled || !sourceStore.hardwareRequirements">
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
                            @update:checked="(checked: boolean) => toggleCategory(cat, checked)"
                        />
                    </div>
                    <div class="col-span-4 font-medium text-foreground">
                        {{ cat }}
                    </div>
                    <div class="col-span-3 text-right text-muted-foreground">
                        {{ proposals.filter(p => p.category === cat).length }}
                    </div>
                    <div class="col-span-3 text-right font-mono text-sm">
                        {{ proposals.filter(p => p.category === cat).reduce((sum, p) => sum + p.items.length, 0) }}
                    </div>
                </div>
            </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">取消</Button>
        <Button @click="handleConfirm" :disabled="selectedGroups.length === 0 || isGenerating">
            {{ isGenerating ? '生成中...' : `生成 ${selectedGroups.length} 张采购单` }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
