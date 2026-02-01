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
    <h1 class="text-3xl font-mono font-bold uppercase mb-8">仪表盘</h1>
    
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card v-for="stat in stats" :key="stat.label" class="rounded-none border-2 border-black shadow-none bg-white">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-black/10">
                <CardTitle class="text-sm font-medium font-mono uppercase">
                    {{ stat.label }}
                </CardTitle>
            </CardHeader>
            <CardContent class="pt-4">
                <div class="text-2xl font-bold font-mono">{{ stat.value }}</div>
                <p class="text-xs text-neutral-500 font-mono mt-1">
                    {{ stat.desc }}
                </p>
            </CardContent>
        </Card>
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div class="col-span-4 border-2 border-black p-4 bg-neutral-50 min-h-[300px] flex items-center justify-center">
            <p class="font-mono text-neutral-400">[图表占位符: 订单趋势]</p>
        </div>
        <div class="col-span-3 border-2 border-black p-4 bg-white">
             <h3 class="font-mono font-bold text-sm mb-4 border-b border-black pb-2">系统消息</h3>
             <ul class="space-y-2">
                <li class="font-mono text-xs flex items-center text-red-600">
                    <span class="w-2 h-2 bg-red-600 mr-2"></span>
                    Low Stock: Item INV_004 (0 qty)
                </li>
                 <li class="font-mono text-xs flex items-center text-neutral-600">
                    <span class="w-2 h-2 bg-neutral-400 mr-2"></span>
                    System Backup completed at 02:00
                </li>
             </ul>
        </div>
    </div>
  </div>
</template>
