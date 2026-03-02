
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
            <h2 class="text-3xl font-semibold text-slate-900">物料分析</h2>
            <p class="text-slate-500 mt-1">根据订单计算出的详细物料清单 (BOM)。</p>
        </div>

        <div v-if="!store.hasOrder" class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500">
             <p>暂无数据。</p>
             <p class="text-sm">请先前往 <b class="text-slate-900 font-medium">原始订单</b> 页面加载合同。</p>
        </div>

        <div v-else class="flex-1 flex flex-col space-y-4">
            <!-- Tabs Navigation -->
            <div class="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
                <button 
                    v-for="tab in [{k:'raw', l:'原材料'}, {k:'hardware', l:'五金配件'}, {k:'packaging', l:'包装材料'}]" 
                    :key="tab.k"
                    @click="activeTab = tab.k"
                    class="px-4 py-2 text-sm font-medium rounded-md transition-all uppercase"
                    :class="activeTab === tab.k ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'"
                >
                    {{ tab.l }}
                </button>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-auto rounded-xl bg-white border border-slate-200 shadow-sm p-4">
                
                <!-- Raw Materials Tab -->
                <div v-if="activeTab === 'raw'" class="h-full">
                    <DataTable :columns="rawColumns" :data="store.flatMaterials" />
                </div>

                <!-- Hardware Tab -->
                <div v-if="activeTab === 'hardware'" class="space-y-8">
                    <div class="space-y-4">
                        <h3 class="font-semibold text-lg flex items-center text-slate-900">
                            <span class="mr-2">🔐</span> Cylinders (锁芯)
                        </h3>
                        <div>
                            <DataTable :columns="cylinderColumns" :data="store.flatCylinders" />
                        </div>
                    </div>

                    <div class="space-y-4">
                        <h3 class="font-semibold text-lg flex items-center text-slate-900">
                            <span class="mr-2">🔧</span> Lock Forks (锁叉)
                        </h3>
                        <div>
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
