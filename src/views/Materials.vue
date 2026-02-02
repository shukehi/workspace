
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
            <h2 class="text-3xl font-bold tracking-tight">物料分析</h2>
            <p class="text-muted-foreground">根据订单计算出的详细物料清单 (BOM)。</p>
        </div>

        <div v-if="!store.hasOrder" class="flex-1 flex flex-col items-center justify-center border rounded-lg bg-muted/10 dashed text-muted-foreground">
             <p>暂无数据。</p>
             <p class="text-sm">请先前往 <b class="text-foreground">原始订单</b> 页面加载合同。</p>
        </div>

        <div v-else class="flex-1 flex flex-col space-y-4">
            <!-- Tabs Navigation -->
            <div class="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
                <button 
                    v-for="tab in [{k:'raw', l:'原材料'}, {k:'hardware', l:'五金配件'}, {k:'packaging', l:'包装材料'}]" 
                    :key="tab.k"
                    @click="activeTab = tab.k"
                    class="px-4 py-2 text-sm font-medium rounded-md transition-all uppercase"
                    :class="activeTab === tab.k ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
                >
                    {{ tab.l }}
                </button>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-auto rounded-md bg-background">
                
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
                        <div class="rounded-md">
                            <DataTable :columns="cylinderColumns" :data="store.flatCylinders" />
                        </div>
                    </div>

                    <div class="space-y-4">
                        <h3 class="font-bold text-lg flex items-center">
                            <span class="mr-2">🔧</span> Lock Forks (锁叉)
                        </h3>
                        <div class="rounded-md">
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
