<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MappingJsonDialog from '@/features/config-editor/components/MappingJsonDialog.vue';
import type { MappingValidationIssue } from '@/types/mapping';

const props = defineProps<{
  title: string;
  description: string;
  editor: any;
  clientIssues: MappingValidationIssue[];
  showJsonCopyButton?: boolean;
  jsonDialogDescription?: string;
}>();

const showIssuesPanel = computed(() => props.clientIssues.length > 0 || props.editor.serverIssues.value.length > 0);
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
      <slot name="header-right"></slot>
    </div>

    <Card v-if="editor.loadError.value">
      <CardContent class="p-4 text-sm text-destructive">
        {{ editor.loadError.value }}
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
    <div class="sticky bottom-0 -mx-6 md:-mx-8 -mb-6 md:-mb-8 p-4 mt-auto border-t bg-background/95 backdrop-blur z-10 flex items-center justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <Button variant="outline" :disabled="editor.isLoading.value || editor.isSaving.value" @click="editor.load">刷新配置</Button>
      <Button variant="outline" @click="editor.openJsonEditor">JSON 编辑</Button>
      <Button :disabled="editor.isLoading.value || editor.isSaving.value || clientIssues.length > 0" @click="editor.save">保存配置</Button>
    </div>
  </div>
</template>
