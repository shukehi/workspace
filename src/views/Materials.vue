
<script setup lang="ts">
import { ref } from 'vue';
import { useSourceStore } from '@/stores/useSourceStore';
import DataTable from '@/components/data-table/DataTable.vue';
import { rawColumns, cylinderColumns, forkColumns, packagingColumns } from '@/components/materials/MaterialColumns';

const store = useSourceStore();
const activeTab = ref('raw'); // raw | hardware | packaging

</script>

<template>
    <div class="h-full flex flex-col p-8 pt-6 space-y-6">
        <div>
            <h2 class="text-3xl font-bold tracking-tight">Materials Analysis</h2>
            <p class="text-muted-foreground">Detailed breakdown of calculated material requirements.</p>
        </div>

        <div v-if="!store.hasOrder" class="flex-1 flex flex-col items-center justify-center border rounded-lg bg-muted/10 dashed text-muted-foreground">
             <p>No data loaded.</p>
             <p class="text-sm">Please go to <b class="text-foreground">Source</b> tab and load a contract first.</p>
        </div>

        <div v-else class="flex-1 flex flex-col space-y-4">
            <!-- Tabs Navigation -->
            <div class="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
                <button 
                    v-for="tab in ['raw', 'hardware', 'packaging']" 
                    :key="tab"
                    @click="activeTab = tab"
                    class="px-4 py-2 text-sm font-medium rounded-md transition-all uppercase"
                    :class="activeTab === tab ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
                >
                    {{ tab }}
                </button>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-auto border rounded-md bg-background">
                
                <!-- Raw Materials Tab -->
                <div v-if="activeTab === 'raw'" class="h-full">
                    <DataTable :columns="rawColumns" :data="store.flatMaterials" />
                </div>

                <!-- Hardware Tab -->
                <div v-if="activeTab === 'hardware'" class="p-6 space-y-8">
                    <div class="space-y-4">
                        <h3 class="font-bold text-lg flex items-center">
                            <span class="mr-2">🔐</span> Cylinders (锁芯)
                        </h3>
                        <div class="border rounded-md">
                            <DataTable :columns="cylinderColumns" :data="store.flatCylinders" />
                        </div>
                    </div>

                    <div class="space-y-4">
                        <h3 class="font-bold text-lg flex items-center">
                            <span class="mr-2">🔧</span> Lock Forks (锁叉)
                        </h3>
                        <div class="border rounded-md">
                            <DataTable :columns="forkColumns" :data="store.flatForks" />
                        </div>
                    </div>
                </div>

                <!-- Packaging Tab -->
                <div v-if="activeTab === 'packaging'" class="h-full">
                    <DataTable :columns="packagingColumns" :data="store.flatPackaging" />
                </div>

            </div>
        </div>
    </div>
</template>
