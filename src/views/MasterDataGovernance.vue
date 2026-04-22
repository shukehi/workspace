<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ConfigCenterShell from '@/features/config-editor/components/ConfigCenterShell.vue';
import MasterDataDiagnosticsSummaryCards from '@/features/master-data/components/MasterDataDiagnosticsSummaryCards.vue';
import { useMasterDataGovernance } from '@/features/master-data/composables/useMasterDataGovernance';

const router = useRouter();
const {
  loading,
  loadError,
  issueSummary,
  profileGovernance,
  recentActivity,
  trendSummary,
  hotspotObjects,
  riskSignals,
  governanceFocus,
  load,
} = useMasterDataGovernance();

onMounted(() => {
  void load();
});

function openProfile(code: 'material_master' | 'supplier_master', tab: 'audit' | 'diagnostics' | 'materials' = 'audit') {
  if (code === 'material_master') {
    void router.push({ name: 'material-master', query: { tab } });
    return;
  }
  void router.push({ name: 'config-suppliers', query: { tab: tab === 'materials' ? 'materials' : 'audit' } });
}

function openDiagnostics() {
  void router.push({ name: 'config-master-data-diagnostics' });
}
</script>

<template>
  <ConfigCenterShell
    title="主数据治理看板"
    description="汇总异常、修复与 lifecycle 状态，为主数据治理提供统一总览入口。"
  >
    <template #header-right>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="openDiagnostics">打开统一诊断</Button>
        <Button variant="outline" @click="load">刷新看板</Button>
      </div>
    </template>

    <MasterDataDiagnosticsSummaryCards :summary="issueSummary" />

    <div v-if="loadError" class="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {{ loadError }}
    </div>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] items-start">
      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold">治理状态总览</h3>
          <p class="text-sm text-muted-foreground">先看 profile 当前 revision 状态，再决定进入工作台还是统一诊断。</p>
        </div>
        <Card>
          <CardContent class="space-y-3 p-4 text-sm">
            <div v-if="loading" class="text-muted-foreground">加载治理状态中...</div>
            <div
              v-for="item in profileGovernance"
              :key="item.code"
              class="rounded-md border bg-background px-3 py-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-medium">{{ item.title }}</div>
                  <div class="text-muted-foreground">条目数：{{ item.totalItems }}</div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" @click="openProfile(item.code, 'audit')">打开 lifecycle</Button>
                  <Button size="sm" variant="outline" @click="openProfile(item.code, 'diagnostics')">打开工作台</Button>
                </div>
              </div>
              <div class="mt-3 grid gap-2 md:grid-cols-4 text-xs text-muted-foreground">
                <div>latest: {{ item.latestRevision ?? '-' }}</div>
                <div>draft: {{ item.draftRevision ?? '-' }}</div>
                <div>published: {{ item.publishedRevision ?? '-' }}</div>
                <div :class="item.hasPendingDraft ? 'text-amber-700 font-medium' : ''">
                  {{ item.hasPendingDraft ? '待发布' : '已对齐' }}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold">治理焦点</h3>
          <p class="text-sm text-muted-foreground">优先处理最影响治理稳定性的焦点项。</p>
        </div>
        <Card>
          <CardContent class="space-y-3 p-4 text-sm">
            <div
              v-for="item in governanceFocus"
              :key="item.key"
              class="rounded-md border bg-background px-3 py-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-medium">{{ item.title }}</div>
                  <div class="text-muted-foreground">{{ item.description }}</div>
                </div>
                <div class="text-xl font-semibold">{{ item.count }}</div>
              </div>
              <div class="mt-2">
                <Button size="sm" variant="outline" @click="openDiagnostics">打开统一诊断</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] items-start">
      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold">治理趋势与热点</h3>
          <p class="text-sm text-muted-foreground">帮助判断近期是 publish / rollback 波动，还是对象级反复修改在增加。</p>
        </div>
        <div class="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent class="p-4 space-y-1">
              <div class="text-sm text-muted-foreground">最近 publish</div>
              <div class="text-2xl font-semibold">{{ trendSummary.publishCount }}</div>
              <div class="text-xs text-muted-foreground">最近活动窗口内的 publish 次数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="p-4 space-y-1">
              <div class="text-sm text-muted-foreground">最近 rollback</div>
              <div class="text-2xl font-semibold">{{ trendSummary.rollbackCount }}</div>
              <div class="text-xs text-muted-foreground">最近活动窗口内的 rollback 次数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="p-4 space-y-1">
              <div class="text-sm text-muted-foreground">自动修复占比</div>
              <div class="text-2xl font-semibold text-emerald-700">{{ trendSummary.autoFixShare }}%</div>
              <div class="text-xs text-muted-foreground">物料异常中可自动修复的比例</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>热点对象</CardTitle>
          </CardHeader>
          <CardContent class="space-y-2 text-sm">
            <div v-if="hotspotObjects.length === 0" class="text-muted-foreground">暂无热点对象</div>
            <div
              v-for="item in hotspotObjects"
              :key="item.key"
              class="rounded-md border bg-background px-3 py-2"
            >
              <div class="font-medium">{{ item.label }}</div>
              <div class="text-muted-foreground">{{ item.source }} · 最近动作 {{ item.lastAction }} · 近窗口出现 {{ item.count }} 次</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold">风险提示与建议</h3>
          <p class="text-sm text-muted-foreground">把风险、活动和建议留在次级区，避免与主分析区争抢视觉重心。</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>风险提示</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 text-sm">
            <div v-if="riskSignals.length === 0" class="text-muted-foreground">暂无高优先级风险提示</div>
            <div
              v-for="item in riskSignals"
              :key="item.key"
              class="rounded-md border bg-background px-3 py-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-medium">{{ item.title }}</div>
                  <div class="text-muted-foreground">{{ item.description }}</div>
                </div>
                <div class="text-lg font-semibold">{{ item.count }}</div>
              </div>
              <div class="mt-2">
                <Button size="sm" variant="outline" @click="openDiagnostics">打开统一诊断</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>近期活动</CardTitle>
          </CardHeader>
          <CardContent class="space-y-2 text-sm">
            <div v-if="loading" class="text-muted-foreground">加载活动中...</div>
            <div v-if="recentActivity.length === 0 && !loading" class="text-muted-foreground">暂无近期活动</div>
            <div
              v-for="item in recentActivity"
              :key="`${item.source}-${item.id}`"
              class="rounded-md border bg-background px-3 py-2"
            >
              <div class="font-medium">{{ item.source }} · {{ item.action }}</div>
              <div class="text-muted-foreground">{{ item.operator }} · {{ item.createdAt }}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>治理建议</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 text-sm">
            <div class="rounded-md border bg-background px-3 py-3">
              <div class="font-medium">优先处理 pending draft</div>
              <div class="text-muted-foreground">先清理待发布主数据，再推进结构异常修复，能减少 live 数据与 revision 状态的偏差。</div>
            </div>
            <div class="rounded-md border bg-background px-3 py-3">
              <div class="font-medium">优先消化可自动修复</div>
              <div class="text-muted-foreground">先处理批量自动重连项，再进入人工处理任务流，修复效率更高。</div>
            </div>
            <div class="rounded-md border bg-background px-3 py-3">
              <div class="font-medium">关注高频热点对象</div>
              <div class="text-muted-foreground">如果同一对象在近期活动中反复出现，优先检查其上游配置或使用方式是否存在系统性问题。</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </ConfigCenterShell>
</template>
