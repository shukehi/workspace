<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'

interface DashboardStat {
    label: string;
    value: string;
    desc: string;
}

const stats = ref<DashboardStat[]>([
    { label: '待处理订单', value: '-', desc: '等待处理中' },
    { label: '库存总值', value: '-', desc: '当前库存总估值' },
    { label: '活跃配方', value: '-', desc: '可用颜色配方数' },
])

async function fetchStats() {
    try {
        // Parallel fetching for performance
        const [ordersRes, inventoryRes, formulasRes] = await Promise.all([
            api.get<any[]>('/orders'),
            api.get<any[]>('/inventory'),
            api.get<any[]>('/formulas')
        ]);

        // Simple calculation logic (could be moved to stores for complexity)
        const activeOrders = ordersRes.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
        const inventoryValue = inventoryRes.reduce((acc, curr) => acc + ((curr.stock_quantity || 0) * 10), 0);

        stats.value = [
            { 
                label: 'Active Orders', 
                value: activeOrders.toString(),
                desc: 'Pending processing'
            },
            { 
                label: 'Inventory Value', 
                value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inventoryValue),
                desc: 'Total stock valuation'
            },
            { 
                label: 'Formulas', 
                value: formulasRes.length.toString(),
                desc: 'Active color recipes'
            },
        ]
    } catch (e) {
        console.error('Failed to load dashboard stats', e)
    }
}

onMounted(() => {
    fetchStats()
})
</script>

<template>
  <div class="p-8">
    <h1 class="text-3xl font-semibold text-slate-900 mb-8">仪表盘</h1>
    
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card v-for="stat in stats" :key="stat.label" class="hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-slate-100 mb-2">
                <CardTitle class="text-sm font-medium text-slate-500">
                    {{ stat.label }}
                </CardTitle>
            </CardHeader>
            <CardContent class="pt-2">
                <div class="text-2xl font-bold text-slate-900">{{ stat.value }}</div>
                <p class="text-xs text-slate-500 mt-1">
                    {{ stat.desc }}
                </p>
            </CardContent>
        </Card>
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div class="col-span-4 rounded-xl border border-slate-200 p-4 bg-slate-50 min-h-[300px] flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-1">
            <p class="text-slate-400 font-medium">[图表占位符: 订单趋势]</p>
        </div>
        <div class="col-span-3 rounded-xl border border-slate-200 p-4 bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-1">
             <h3 class="font-semibold text-slate-900 text-sm mb-4 border-b border-slate-100 pb-2">系统消息</h3>
             <ul class="space-y-3">
                <li class="text-sm flex items-center text-rose-600">
                    <span class="w-2 h-2 rounded-full bg-rose-500 mr-3"></span>
                    Low Stock: Item INV_004 (0 qty)
                </li>
                 <li class="text-sm flex items-center text-slate-600">
                    <span class="w-2 h-2 rounded-full bg-slate-300 mr-3"></span>
                    System Backup completed at 02:00
                </li>
             </ul>
        </div>
    </div>
  </div>
</template>
