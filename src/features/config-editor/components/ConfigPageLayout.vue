<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MappingJsonDialog from '@/features/config-editor/components/MappingJsonDialog.vue';
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
  <div class="h-full flex flex-col gap-6 p-6 md:p-8 bg-muted/20">
    <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div class="flex items-center gap-3">
        <div>
          <h2 class="text-3xl font-semibold tracking-tight">{{ title }}</h2>
          <p class="text-muted-foreground mt-1">{{ description }}</p>
        </div>
        <slot name="header-extra"></slot>
      </div>
      <div v-if="$slots['header-right'] || actionsPosition === 'header'" class="flex flex-wrap items-center justify-end gap-3">
        <slot name="header-right"></slot>
        <template v-if="actionsPosition === 'header'">
          <Button variant="outline" :disabled="editor.isLoading.value || editor.isSaving.value" @click="editor.load">刷新配置</Button>
          <Button variant="outline" @click="editor.openJsonEditor">JSON 编辑</Button>
          <Button :disabled="editor.isLoading.value || editor.isSaving.value" @click="editor.save">保存配置</Button>
        </template>
      </div>
    </div>

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
        showIssuesPanel ? 'xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : 'xl:grid-cols-1'
      ]"
    >
      <div class="flex flex-col gap-6 min-h-0">
        <slot></slot>
      </div>

      <div v-if="showIssuesPanel" class="flex flex-col gap-6 min-h-0 xl:sticky xl:top-6 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
        <Card v-if="hasWorkflowMeta && editor.auditLogs?.value?.length > 0">
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

        <Card data-issue-anchor="true">
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
      </div>
    </div>

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

    <!-- Action Bar -->
    <div v-if="actionsPosition === 'bottom'" class="sticky bottom-0 -mx-6 md:-mx-8 -mb-6 md:-mb-8 p-4 mt-auto border-t bg-background/95 backdrop-blur z-10 flex items-center justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <Button variant="outline" :disabled="editor.isLoading.value || editor.isSaving.value" @click="editor.load">刷新配置</Button>
      <Button variant="outline" @click="editor.openJsonEditor">JSON 编辑</Button>
      <Button :disabled="editor.isLoading.value || editor.isSaving.value" @click="editor.save">保存配置</Button>
    </div>
  </div>
</template>
