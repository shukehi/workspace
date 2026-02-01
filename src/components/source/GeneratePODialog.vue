
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
const selectedSuppliers = ref<string[]>([]);
const isGenerating = ref(false);

// Load proposals when dialog opens
watch(open, (isOpen) => {
    if (isOpen && sourceStore.hasOrder) {
        const results = generator.generateProposal();
        proposals.value = results;
        // Default select all
        selectedSuppliers.value = results.map(p => p.supplierName);
    }
});

const handleConfirm = async () => {
    if (selectedSuppliers.value.length === 0) return;
    
    isGenerating.value = true;
    try {
        const orders = generator.createOrders(selectedSuppliers.value);
        
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

const toggleSelection = (supplier: string) => {
    if (selectedSuppliers.value.includes(supplier)) {
        selectedSuppliers.value = selectedSuppliers.value.filter(s => s !== supplier);
    } else {
        selectedSuppliers.value.push(supplier);
    }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button variant="default" :disabled="disabled || !sourceStore.hardwareRequirements">
        Generate PO
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[725px]">
      <DialogHeader>
        <DialogTitle>Generate Purchase Orders</DialogTitle>
        <DialogDescription>
          Review the material breakdown by supplier. Uncheck any suppliers you wish to skip.
        </DialogDescription>
      </DialogHeader>
      
      <div class="py-4">
        <div v-if="proposals.length === 0" class="text-center py-8 text-muted-foreground">
            No materials to purchase found.
        </div>

        <div v-else class="border rounded-md">
            <div class="grid grid-cols-12 gap-4 p-3 bg-muted/50 font-medium text-sm border-b">
                <div class="col-span-1">Select</div>
                <div class="col-span-4">Supplier</div>
                <div class="col-span-5">Summary</div>
                <div class="col-span-2 text-right">Items</div>
            </div>
            
            <div v-for="group in proposals" :key="group.supplierName" 
                 class="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/10 transition-colors border-b last:border-0"
            >
                <div class="col-span-1 flex justify-center">
                    <Checkbox 
                        :checked="selectedSuppliers.includes(group.supplierName)"
                        @update:checked="toggleSelection(group.supplierName)"
                    />
                </div>
                <div class="col-span-4 font-medium">
                    {{ group.supplierName }}
                </div>
                <div class="col-span-5 text-sm text-muted-foreground truncate">
                    {{ group.items.slice(0, 3).map((i:any) => i.name).join(', ') }} 
                    <span v-if="group.items.length > 3">...</span>
                </div>
                <div class="col-span-2 text-right font-mono text-sm">
                    {{ group.items.length }}
                </div>
            </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button @click="handleConfirm" :disabled="selectedSuppliers.length === 0 || isGenerating">
            {{ isGenerating ? 'Creating...' : `Create ${selectedSuppliers.length} Orders` }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
