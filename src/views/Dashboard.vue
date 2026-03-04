<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
    const [ordersRes, inventoryRes, formulasRes] = await Promise.all([
      api.get<any[]>('/orders'),
      api.get<any[]>('/inventory'),
      api.get<any>('/config/formulas')
    ]);

    const orders = Array.isArray(ordersRes) ? ordersRes : [];
    const inventory = Array.isArray(inventoryRes) ? inventoryRes : [];
    const formulasCount = typeof formulasRes?.total === 'number'
      ? formulasRes.total
      : (Array.isArray(formulasRes?.items)
        ? formulasRes.items.length
        : (Array.isArray(formulasRes) ? formulasRes.length : 0));

    const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
    const inventoryValue = inventory.reduce((acc, curr) => acc + ((curr.stock_quantity || 0) * 10), 0);

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
        value: formulasCount.toString(),
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
  <div class="p-6 md:p-8 bg-muted/20 h-full overflow-auto">
    <h1 class="text-3xl font-semibold tracking-tight mb-8">仪表盘</h1>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card v-for="stat in stats" :key="stat.label">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2 border-b mb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            {{ stat.label }}
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-2">
          <div class="text-2xl font-semibold">{{ stat.value }}</div>
          <p class="text-xs text-muted-foreground mt-1">
            {{ stat.desc }}
          </p>
        </CardContent>
      </Card>
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <div class="col-span-4 rounded-lg border p-4 bg-muted/40 min-h-[300px] flex items-center justify-center">
        <p class="text-muted-foreground font-medium">[图表占位符: 订单趋势]</p>
      </div>
      <Card class="col-span-3">
        <CardContent class="p-4">
          <h3 class="font-semibold text-sm mb-4 border-b pb-2">系统消息</h3>
          <ul class="space-y-3">
            <li class="text-sm flex items-center text-rose-600">
              <span class="w-2 h-2 rounded-full bg-rose-500 mr-3"></span>
              Low Stock: Item INV_004 (0 qty)
            </li>
            <li class="text-sm flex items-center text-muted-foreground">
              <span class="w-2 h-2 rounded-full bg-muted-foreground/40 mr-3"></span>
              System Backup completed at 02:00
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
