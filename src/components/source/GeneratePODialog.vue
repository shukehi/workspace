
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
});

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

const isSelected = (group: any) => selectedGroups.value.some(g => g.supplier === group.supplierName && g.category === group.category);

const toggleSelection = (group: any) => {
    if (isSelected(group)) {
        selectedGroups.value = selectedGroups.value.filter(g => !(g.supplier === group.supplierName && g.category === group.category));
    } else {
        selectedGroups.value.push({ supplier: group.supplierName, category: group.category });
    }
};

const filteredProposals = computed(() => {
    return proposals.value.filter(p => selectedCategories.value.includes(p.category));
});
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
          请确认按供应商拆分的采购建议。取消勾选以跳过某些供应商。
        </DialogDescription>
      </DialogHeader>
      
      <div class="py-4">
        <div v-if="proposals.length === 0" class="text-center py-8 text-muted-foreground">
            没有发现需要采购的物料。
        </div>

        <div v-else class="space-y-4">
            <!-- Category Filter -->
            <div class="flex flex-wrap gap-4 items-center p-3 bg-muted/30 rounded-md">
                <span class="text-sm font-medium text-muted-foreground mr-2">选择类别:</span>
                <label v-for="cat in availableCategories" :key="cat" class="flex items-center space-x-2 text-sm cursor-pointer">
                    <Checkbox :checked="selectedCategories.includes(cat)" @update:checked="(checked: boolean) => {
                        if (checked) selectedCategories.push(cat);
                        else selectedCategories = selectedCategories.filter(c => c !== cat);
                    }" />
                    <span>{{ cat }}</span>
                </label>
            </div>

            <!-- Proposals Table -->
            <div class="border rounded-md">
                <div class="grid grid-cols-12 gap-4 p-3 bg-muted/50 font-medium text-sm border-b">
                    <div class="col-span-1">选择</div>
                    <div class="col-span-2">类别</div>
                    <div class="col-span-3">供应商</div>
                    <div class="col-span-4">摘要</div>
                    <div class="col-span-2 text-right">项数</div>
                </div>
                
                <div v-if="filteredProposals.length === 0" class="p-4 text-center text-sm text-muted-foreground">
                    请勾选要生成的类别。
                </div>

                <div v-for="group in filteredProposals" :key="group.category + group.supplierName" 
                     class="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/10 transition-colors border-b last:border-0"
                >
                    <div class="col-span-1 flex justify-center">
                        <Checkbox 
                            :checked="isSelected(group)"
                            @update:checked="toggleSelection(group)"
                        />
                    </div>
                    <div class="col-span-2 font-medium text-muted-foreground">
                        {{ group.category }}
                    </div>
                    <div class="col-span-3 font-medium truncate">
                        {{ group.supplierName }}
                    </div>
                    <div class="col-span-4 text-sm text-muted-foreground truncate">
                        {{ group.items.slice(0, 3).map((i:any) => i.name).join(', ') }} 
                        <span v-if="group.items.length > 3">...</span>
                    </div>
                    <div class="col-span-2 text-right font-mono text-sm">
                        {{ group.items.length }}
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
