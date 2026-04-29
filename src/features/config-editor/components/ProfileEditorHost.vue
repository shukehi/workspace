<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MappingJsonDialog from '@/features/config-editor/components/MappingJsonDialog.vue';
import ConfigCenterShell from '@/features/config-editor/components/ConfigCenterShell.vue';
import type { MappingValidationIssue } from '@/types/mapping';

const props = withDefaults(defineProps<{
  title: string;
  description: string;
  editor: any;
  clientIssues: MappingValidationIssue[];
  showJsonCopyButton?: boolean;
  jsonDialogDescription?: string;
  workflowMetaVariant?: 'cards' | 'inline';
  actionsPosition?: 'bottom' | 'header';
}>(), {
  workflowMetaVariant: 'cards',
  actionsPosition: 'bottom',
});

const showIssuesPanel = computed(() => props.clientIssues.length > 0 || props.editor.serverIssues.value.length > 0);
const hasReviewPanel = computed(() => Boolean(
  props.editor.diff?.value
  || props.editor.impact?.value
  || props.editor.replay?.value
  || props.editor.referenceCheck?.value
  || (props.editor.auditLogs?.value?.length > 0)
));
const showSidePanel = computed(() => showIssuesPanel.value || hasReviewPanel.value);
const hasWorkflowMeta = computed(() => {
  return props.editor.latestRevision?.value !== undefined;
});
const latestAuditLog = computed(() => props.editor.auditLogs?.value?.[0] || null);
const latestAuditTime = computed(() => (
  latestAuditLog.value?.createdAt
    ? new Date(latestAuditLog.value.createdAt).toLocaleString()
    : '暂无记录'
));
</script>

<template>
  <ConfigCenterShell :title="title" :description="description">
    <template #header-extra>
      <slot name="header-extra"></slot>
    </template>

    <template #header-right>
      <div v-if="$slots['header-right'] || actionsPosition === 'header'" class="flex flex-wrap items-center justify-end gap-3">
        <slot name="header-right"></slot>
        <template v-if="actionsPosition === 'header'">
          <Button variant="outline" :disabled="editor.isLoading.value || editor.isSaving.value" @click="editor.load">刷新配置</Button>
          <Button variant="outline" @click="editor.openJsonEditor">JSON 编辑</Button>
          <Button :disabled="editor.isLoading.value || editor.isSaving.value" @click="editor.save">保存配置</Button>
        </template>
      </div>
    </template>

    <Card v-if="editor.loadError.value">
      <CardContent class="p-4 text-sm text-destructive">
        {{ editor.loadError.value }}
      </CardContent>
    </Card>

    <div v-if="hasWorkflowMeta && workflowMetaVariant === 'cards'" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs text-muted-foreground">Latest Revision</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ editor.latestRevision.value || '-' }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs text-muted-foreground">Draft Revision</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ editor.draftRevision?.value ?? '-' }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs text-muted-foreground">Published Revision</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ editor.publishedRevision?.value ?? '-' }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs text-muted-foreground">最近动作</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-sm font-medium">{{ latestAuditLog?.action || '-' }}</div>
          <div class="text-xs text-muted-foreground mt-1">
            {{ latestAuditTime }}
          </div>
        </CardContent>
      </Card>
    </div>

    <Card v-else-if="hasWorkflowMeta && workflowMetaVariant === 'inline'" class="border-dashed bg-background/90">
      <CardContent class="px-4 py-3">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div class="text-muted-foreground">当前版本 <span class="ml-1 font-semibold text-foreground">{{ editor.latestRevision.value || '-' }}</span></div>
          <div class="text-muted-foreground">草稿版本 <span class="ml-1 font-semibold text-foreground">{{ editor.draftRevision?.value ?? '-' }}</span></div>
          <div class="text-muted-foreground">已发布版本 <span class="ml-1 font-semibold text-foreground">{{ editor.publishedRevision?.value ?? '-' }}</span></div>
          <div class="text-muted-foreground">最近动作 <span class="ml-1 font-semibold text-foreground">{{ latestAuditLog?.action || '-' }}</span></div>
          <div class="text-muted-foreground">时间 <span class="ml-1 font-medium text-foreground">{{ latestAuditTime }}</span></div>
        </div>
      </CardContent>
    </Card>

    <div
      :class="[
        'grid grid-cols-1 gap-6 flex-1',
        showSidePanel ? 'xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : 'xl:grid-cols-1'
      ]"
    >
      <div class="flex flex-col gap-6 min-h-0">
        <slot></slot>
      </div>

      <div v-if="showSidePanel" class="flex flex-col gap-4 min-h-0 xl:sticky xl:top-6 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
        <Card v-if="showIssuesPanel" data-issue-anchor="true">
          <CardHeader>
            <CardTitle>校验结果</CardTitle>
            <CardDescription>请修正以下问题后再保存。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div v-if="clientIssues.length > 0" class="space-y-1">
              <div class="text-sm font-medium">本地校验</div>
              <ul class="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li v-for="issue in clientIssues" :key="`client-${issue.path}-${issue.code}`">
                  {{ issue.path }}: {{ issue.message }}
                </li>
              </ul>
            </div>
            <div v-if="editor.serverIssues.value.length > 0" class="space-y-1">
              <div class="text-sm font-medium">服务端校验</div>
              <ul class="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li v-for="issue in editor.serverIssues.value" :key="`server-${issue.path}-${issue.code}`">
                  {{ issue.path }}: {{ issue.message }}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <details v-if="hasReviewPanel" class="rounded-lg border border-dashed bg-muted/20 px-4 py-3" data-review-panel="true">
          <summary class="cursor-pointer text-sm font-medium text-muted-foreground">发布前检查与审计记录</summary>
          <div class="mt-4 space-y-4">
            <Card v-if="editor.diff?.value" class="bg-background/95">
              <CardHeader>
                <CardTitle>配置差异</CardTitle>
                <CardDescription>当前 draft 与 published 的最小结构差异。</CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <div class="text-xs text-muted-foreground">
                  draft: {{ editor.diff.value.draftRevision ?? '-' }} · published: {{ editor.diff.value.publishedRevision ?? '-' }}
                </div>
                <div v-if="editor.diffLoading?.value" class="text-sm text-muted-foreground">差异加载中...</div>
                <div v-else-if="!editor.diff.value.hasChanges" class="text-sm text-muted-foreground">当前无结构差异</div>
                <div v-else class="space-y-2">
                  <div
                    v-for="item in editor.diff.value.items.slice(0, 10)"
                    :key="`${item.kind}-${item.path}`"
                    class="rounded-md border bg-background px-3 py-2"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="text-sm font-medium">{{ item.path || '(root)' }}</div>
                      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">{{ item.kind }}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card v-if="editor.impact?.value" class="bg-background/95">
              <CardHeader>
                <CardTitle>影响摘要</CardTitle>
                <CardDescription>基于当前 draft 与 published 差异的最小影响统计。</CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <div v-if="editor.impactLoading?.value" class="text-sm text-muted-foreground">影响摘要加载中...</div>
                <template v-else>
                  <div class="grid grid-cols-2 gap-3">
                    <div class="rounded-md border bg-background px-3 py-2">
                      <div class="text-xs text-muted-foreground">总变更数</div>
                      <div class="text-xl font-semibold">{{ editor.impact.value.totalChanges }}</div>
                    </div>
                    <div class="rounded-md border bg-background px-3 py-2">
                      <div class="text-xs text-muted-foreground">changed</div>
                      <div class="text-xl font-semibold">{{ editor.impact.value.counts.changed }}</div>
                    </div>
                    <div class="rounded-md border bg-background px-3 py-2">
                      <div class="text-xs text-muted-foreground">added</div>
                      <div class="text-xl font-semibold">{{ editor.impact.value.counts.added }}</div>
                    </div>
                    <div class="rounded-md border bg-background px-3 py-2">
                      <div class="text-xs text-muted-foreground">removed</div>
                      <div class="text-xl font-semibold">{{ editor.impact.value.counts.removed }}</div>
                    </div>
                  </div>
                  <div v-if="editor.impact.value.topPaths.length > 0" class="space-y-2">
                    <div class="text-sm font-medium">Top Paths</div>
                    <div
                      v-for="item in editor.impact.value.topPaths.slice(0, 5)"
                      :key="`impact-${item.kind}-${item.path}`"
                      class="rounded-md border bg-background px-3 py-2"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <div class="text-sm font-medium">{{ item.path || '(root)' }}</div>
                        <div class="text-[10px] uppercase tracking-wide text-muted-foreground">{{ item.kind }}</div>
                      </div>
                    </div>
                  </div>
                </template>
              </CardContent>
            </Card>

            <Card v-if="editor.replay?.value" class="bg-background/95">
              <CardHeader>
                <CardTitle>样本回放</CardTitle>
                <CardDescription>基于内置样本的最小回放摘要。</CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <div v-if="editor.replayLoading?.value" class="text-sm text-muted-foreground">样本回放加载中...</div>
                <template v-else>
                  <div class="grid grid-cols-2 gap-3">
                    <div class="rounded-md border bg-background px-3 py-2">
                      <div class="text-xs text-muted-foreground">样本数</div>
                      <div class="text-xl font-semibold">{{ editor.replay.value.sampleCount }}</div>
                    </div>
                    <div class="rounded-md border bg-background px-3 py-2">
                      <div class="text-xs text-muted-foreground">变化样本</div>
                      <div class="text-xl font-semibold">{{ editor.replay.value.changedSampleCount }}</div>
                    </div>
                  </div>
                  <div v-if="editor.replay.value.items.length > 0" class="space-y-2">
                    <div class="text-sm font-medium">Samples</div>
                    <div
                      v-for="item in editor.replay.value.items.slice(0, 5)"
                      :key="`replay-${item.id}`"
                      class="rounded-md border bg-background px-3 py-2"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <div class="text-sm font-medium">{{ item.label }}</div>
                        <div class="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {{ item.changed ? 'changed' : 'unchanged' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </CardContent>
            </Card>

            <Card v-if="editor.referenceCheck?.value" class="bg-background/95">
              <CardHeader>
                <CardTitle>主数据引用检查</CardTitle>
                <CardDescription>检查当前配置中的 supplier / materialCode 引用是否落在主数据视图中。</CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <div v-if="editor.referenceCheckLoading?.value || editor.supplierMasterLoading?.value" class="text-sm text-muted-foreground">
                  引用检查加载中...
                </div>
                <template v-else>
                  <div class="grid grid-cols-2 gap-3">
                    <div class="rounded-md border bg-background px-3 py-2">
                      <div class="text-xs text-muted-foreground">supplier refs</div>
                      <div class="text-xl font-semibold">{{ editor.referenceCheck.value.supplierRefs.length }}</div>
                    </div>
                    <div class="rounded-md border bg-background px-3 py-2">
                      <div class="text-xs text-muted-foreground">material refs</div>
                      <div class="text-xl font-semibold">{{ editor.referenceCheck.value.materialCodeRefs.length }}</div>
                    </div>
                  </div>

                  <div v-if="editor.referenceCheck.value.hasIssues" class="space-y-2">
                    <div class="text-sm font-medium text-amber-700">发现潜在问题</div>
                    <div v-if="editor.referenceCheck.value.missingMaterialCodes.length > 0" class="rounded-md border bg-background px-3 py-2 text-sm">
                      缺失物料编码：{{ editor.referenceCheck.value.missingMaterialCodes.join('，') }}
                    </div>
                    <div v-if="editor.referenceCheck.value.suppliersMissingInMaterialMaster.length > 0" class="rounded-md border bg-background px-3 py-2 text-sm">
                      未出现在物料主档供应商中的引用：{{ editor.referenceCheck.value.suppliersMissingInMaterialMaster.join('，') }}
                    </div>
                  </div>

                  <div v-if="editor.referenceCheck.value.materialCodeRefItems?.length > 0" class="space-y-2">
                    <div class="text-sm font-medium">Material Ref Paths</div>
                    <div
                      v-for="item in editor.referenceCheck.value.materialCodeRefItems.slice(0, 5)"
                      :key="`material-ref-${item.path}-${item.value}`"
                      class="rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <div class="font-medium">{{ item.path }}</div>
                      <div class="text-muted-foreground">{{ item.value }}</div>
                    </div>
                  </div>

                  <div v-if="editor.referenceCheck.value.supplierRefItems?.length > 0" class="space-y-2">
                    <div class="text-sm font-medium">Supplier Ref Paths</div>
                    <div
                      v-for="item in editor.referenceCheck.value.supplierRefItems.slice(0, 5)"
                      :key="`supplier-ref-${item.path}-${item.value}`"
                      class="rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <div class="font-medium">{{ item.path }}</div>
                      <div class="text-muted-foreground">{{ item.value }}</div>
                    </div>
                  </div>

                  <div class="text-xs text-muted-foreground">
                    当前 supplier master 聚合条目：{{ editor.supplierMaster.value.length }}
                  </div>
                </template>
              </CardContent>
            </Card>

            <Card v-if="hasWorkflowMeta && editor.auditLogs?.value?.length > 0" class="bg-background/95">
              <CardHeader>
                <CardTitle>审计记录</CardTitle>
                <CardDescription>最近的 workflow 操作记录。</CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <div
                  v-for="log in editor.auditLogs.value.slice(0, 6)"
                  :key="log.id"
                  class="rounded-md border bg-background px-3 py-3"
                >
                  <div class="flex items-center justify-between gap-2">
                    <div class="font-medium text-sm">{{ log.action }}</div>
                    <div class="text-xs text-muted-foreground">{{ new Date(log.createdAt).toLocaleString() }}</div>
                  </div>
                  <div class="mt-2 text-xs text-muted-foreground space-y-1">
                    <div>operator: {{ log.operator }}</div>
                    <div>from: {{ log.fromRevision ?? '-' }} -> to: {{ log.toRevision ?? '-' }}</div>
                    <div v-if="log.meta?.changeNote">note: {{ log.meta.changeNote }}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </details>
      </div>
    </div>

    <template #footer>
      <MappingJsonDialog
        v-model:open="editor.isJsonDialogOpen.value"
        v-model:draft="editor.jsonDraft.value"
        :description="jsonDialogDescription || '直接编辑 JSON 配置，应用前会进行校验。'"
        :error="editor.jsonDraftError.value"
        :issues="editor.jsonDraftIssues.value"
        :show-copy-button="showJsonCopyButton"
        @format="editor.formatJsonDraft"
        @reset="editor.resetJsonDraft"
        @apply="editor.applyJsonDraft"
        @copy="editor.copyJsonPreview"
      />

      <div v-if="actionsPosition === 'bottom'" class="sticky bottom-0 -mx-6 md:-mx-8 -mb-6 md:-mb-8 p-4 mt-auto border-t bg-background/95 backdrop-blur z-10 flex items-center justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button variant="outline" :disabled="editor.isLoading.value || editor.isSaving.value" @click="editor.load">刷新配置</Button>
        <Button variant="outline" @click="editor.openJsonEditor">JSON 编辑</Button>
        <Button :disabled="editor.isLoading.value || editor.isSaving.value" @click="editor.save">保存配置</Button>
      </div>
    </template>
  </ConfigCenterShell>
</template>
