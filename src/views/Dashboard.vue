<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted } from 'vue'
import {
  Activity,
  ArrowRight,
  ClipboardList,
  Database,
  FileText,
  PackageCheck,
  PanelsTopLeft,
  ShoppingCart,
  Warehouse
} from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { FormulaListResponse } from '@/types/formula'
import {
  buildDashboardActivityItems,
  buildDashboardStats,
  type DashboardActivityItem,
  type DashboardInventorySummary,
  type DashboardOrderSummary,
  type DashboardStat
} from '@/features/dashboard/dashboardMetrics'

const stats = ref<DashboardStat[]>([
  { label: '待处理订单', value: '-', desc: '等待处理中', tone: 'bg-secondary' },
  { label: '库存总值', value: '-', desc: '当前库存总估值', tone: 'bg-secondary' },
  { label: '活跃配方', value: '-', desc: '可用颜色配方数', tone: 'bg-secondary' },
])

const shortcuts = [
  { title: '合同查询', desc: '导入 ERP 合同明细', href: '/source', icon: Database },
  { title: '采购工作台', desc: '创建、审批与跟踪采购单', href: '/procurement', icon: ShoppingCart },
  { title: '库存台账', desc: '库存、入库与出库流水', href: '/inventory', icon: Warehouse },
  { title: '物料分析', desc: '按订单生成 BOM 清单', href: '/materials', icon: ClipboardList },
]

const masterCards = [
  { title: '主数据治理', items: ['物料数据', '供应商主数据', '物料目录配置'] },
  { title: '生产配置', items: ['配方配置', '包装配置', '锁芯/锁具/拉手配置'] },
  { title: '报表中心', items: ['数据统计', '历史合同', '主数据诊断'] },
]

const activityItems = ref<DashboardActivityItem[]>([
  { title: '正在加载活动流', desc: '从订单、库存和配置中心读取最新状态。' },
])
const statsError = ref('')
let statsAbortController: AbortController | null = null
let statsRequestId = 0

function extractFormulasCount(formulasRes: unknown): number {
  const response = formulasRes as Partial<FormulaListResponse>
  if (typeof response?.total === 'number') {
    return response.total
  }
  if (Array.isArray(response?.items)) {
    return response.items.length
  }
  return Array.isArray(formulasRes) ? formulasRes.length : 0
}

async function fetchStats() {
  const requestId = statsRequestId + 1
  statsRequestId = requestId
  statsAbortController?.abort()
  statsAbortController = new AbortController()
  statsError.value = ''

  try {
    const requestConfig = { signal: statsAbortController.signal }
    const [ordersRes, inventoryRes, formulasRes] = await Promise.all([
      api.get<DashboardOrderSummary[]>('/orders', requestConfig),
      api.get<DashboardInventorySummary[]>('/inventory', requestConfig),
      api.get<FormulaListResponse>('/config/profiles/formulas/items', {
        ...requestConfig,
        params: { page: 1, pageSize: 1 }
      })
    ])

    if (requestId !== statsRequestId) return

    const orders = Array.isArray(ordersRes) ? ordersRes : []
    const inventory = Array.isArray(inventoryRes) ? inventoryRes : []
    const formulasCount = extractFormulasCount(formulasRes)

    stats.value = buildDashboardStats({ orders, inventory, formulasCount })
    activityItems.value = buildDashboardActivityItems({ orders, inventory, formulasCount })
  } catch (e) {
    if ((e as any)?.name === 'CanceledError' || (e as any)?.code === 'ERR_CANCELED') return
    if (requestId !== statsRequestId) return
    statsError.value = '仪表盘数据加载失败，请稍后重试。'
    activityItems.value = [{ title: '数据加载失败', desc: '无法读取最新活动，请检查网络或后端服务。' }]
    console.error('Failed to load dashboard stats', e)
  }
}

onMounted(() => {
  fetchStats()
})

onBeforeUnmount(() => {
  statsRequestId += 1
  statsAbortController?.abort()
})
</script>

<template>
  <div class="workspace-page">
    <div class="workspace-header">
      <div>
        <div class="workspace-kicker">ERP Workspace</div>
        <h1 class="workspace-title">仪表盘</h1>
        <p class="workspace-subtitle">借鉴 ERPNext Desk 的工作区结构：顶部指标、快捷入口、主数据分组和活动流，帮助用户更快进入日常流程。</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="desk-pill">站点：采购与库存控制台</span>
        <Button as-child size="sm" class="rounded-full">
          <RouterLink to="/source">
            新建流程
            <ArrowRight class="size-4" />
          </RouterLink>
        </Button>
      </div>
    </div>

    <div v-if="statsError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {{ statsError }}
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <Card v-for="stat in stats" :key="stat.label" class="overflow-hidden">
        <CardHeader class="flex flex-row items-start justify-between gap-3 p-4 pb-2">
          <div>
            <CardTitle class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {{ stat.label }}
            </CardTitle>
            <CardDescription class="mt-1 text-xs">{{ stat.desc }}</CardDescription>
          </div>
          <div class="flex size-9 items-center justify-center rounded-xl" :class="stat.tone">
            <Activity class="size-4 text-foreground/70" />
          </div>
        </CardHeader>
        <CardContent class="px-4 pb-4 pt-0">
          <div class="text-2xl font-semibold tracking-tight">{{ stat.value }}</div>
        </CardContent>
      </Card>
    </div>

    <div class="grid min-h-0 gap-4 xl:grid-cols-[1fr_360px]">
      <div class="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader class="p-4 pb-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <CardTitle class="flex items-center gap-2 text-base">
                  <PanelsTopLeft class="size-4" />
                  快捷入口
                </CardTitle>
                <CardDescription class="text-xs">常用工作区和单据入口</CardDescription>
              </div>
              <span class="desk-pill">Shortcuts</span>
            </div>
          </CardHeader>
          <CardContent class="grid gap-3 p-4 pt-0 sm:grid-cols-2 xl:grid-cols-4">
            <RouterLink
              v-for="item in shortcuts"
              :key="item.href"
              :to="item.href"
              class="group rounded-xl border border-border/70 bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-sm"
            >
              <div class="mb-4 flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
                <component :is="item.icon" class="size-4" />
              </div>
              <div class="flex items-center justify-between gap-2">
                <h3 class="font-semibold">{{ item.title }}</h3>
                <ArrowRight class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ item.desc }}</p>
            </RouterLink>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="p-4 pb-3">
            <CardTitle class="flex items-center gap-2 text-base">
              <FileText class="size-4" />
              模块与主数据
            </CardTitle>
            <CardDescription class="text-xs">按 ERPNext Workspace 的 Link Cards 方式组织后台入口</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-3 p-4 pt-0 md:grid-cols-3">
            <div v-for="card in masterCards" :key="card.title" class="rounded-xl border border-border/70 bg-muted/35 p-4">
              <h3 class="text-sm font-semibold">{{ card.title }}</h3>
              <div class="mt-3 flex flex-col gap-2">
                <div v-for="item in card.items" :key="item" class="flex items-center gap-2 text-sm text-muted-foreground">
                  <span class="size-1.5 rounded-full bg-primary/60" />
                  {{ item }}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card class="min-w-0">
        <CardHeader class="p-4 pb-3">
          <CardTitle class="flex items-center gap-2 text-base">
            <PackageCheck class="size-4" />
            活动流
          </CardTitle>
          <CardDescription class="text-xs">系统提醒和近期操作</CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-3 p-4 pt-0">
          <div
            v-for="item in activityItems"
            :key="item.title"
            class="rounded-xl border border-border/70 bg-background p-3"
          >
            <div class="text-sm font-medium">{{ item.title }}</div>
            <div class="mt-1 text-xs text-muted-foreground">{{ item.desc }}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
