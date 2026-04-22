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
          <h3 class="text-lg font-semibold">近期活动</h3>
          <p class="text-sm text-muted-foreground">通过近期活动判断当前治理的活跃区与高频改动点。</p>
        </div>
        <Card>
          <CardContent class="space-y-2 p-4 text-sm">
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
      </div>

      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold">治理建议</h3>
          <p class="text-sm text-muted-foreground">保留轻量建议，避免和主分析区抢视觉重心。</p>
        </div>
        <Card>
          <CardContent class="space-y-3 p-4 text-sm">
            <div class="rounded-md border bg-background px-3 py-3">
              <div class="font-medium">优先处理 pending draft</div>
              <div class="text-muted-foreground">先清理待发布主数据，再推进结构异常修复，能减少 live 数据与 revision 状态的偏差。</div>
            </div>
            <div class="rounded-md border bg-background px-3 py-3">
              <div class="font-medium">优先消化可自动修复</div>
              <div class="text-muted-foreground">先处理批量自动重连项，再进入人工处理任务流，修复效率更高。</div>
            </div>
            <div class="rounded-md border bg-background px-3 py-3">
              <div class="font-medium">定期回看近期活动</div>
              <div class="text-muted-foreground">通过最近活动识别高频变更区，帮助发现反复修复的热点对象。</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </ConfigCenterShell>
</template>
