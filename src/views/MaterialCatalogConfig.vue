<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import CodeMirrorEditor from '@/components/ui/CodeMirrorEditor.vue';
import ProfileEditorHost from '@/features/config-editor/components/ProfileEditorHost.vue';
import { useProfileEditor } from '@/features/config-editor/composables/useProfileEditor';
import { refreshMaterialsRuntime } from '@/services/configRuntime';
import { CONFIG_ENDPOINTS } from '@/shared/constants/endpoints';

const jsonDraft = ref('{}');
const changeNote = ref('');

const payload = computed(() => {
  let parsed = {};
  try { parsed = JSON.parse(jsonDraft.value); } catch (e) {}
  return { ...parsed, _changeNote: changeNote.value };
});

const editor = useProfileEditor<any>({
  endpoint: CONFIG_ENDPOINTS.MATERIAL_CATALOG.path,
  workflowProfileCode: CONFIG_ENDPOINTS.MATERIAL_CATALOG.profile,
  workflowBasePath: CONFIG_ENDPOINTS.MATERIAL_CATALOG.basePath,
  loadErrorDescription: '无法读取物料目录配置',
  saveSuccessDescription: '物料目录已发布',
  getPayload: () => payload.value,
  getClientIssues: () => {
    try {
      const parsed = JSON.parse(jsonDraft.value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [{ path: 'json', code: 'invalid-type', message: '必须是对象' }];
    } catch (e: any) {
      return [{ path: 'json', code: 'parse-error', message: e.message }];
    }
    return [];
  },
  validatePayload: () => [],
  resetWithPayload: (data) => {
    const { _changeNote, ...pureData } = data;
    jsonDraft.value = JSON.stringify(pureData, null, 2);
    changeNote.value = '';
  },
  refreshRuntime: refreshMaterialsRuntime
});

const entryCount = computed(() => Object.keys(JSON.parse(jsonDraft.value || '{}')).length);

onMounted(editor.load);
</script>

<template>
  <ProfileEditorHost
    title="物料目录 JSON 兜底"
    description="高级管理员入口：仅用于发布物料目录 JSON 的兜底维护；日常物料维护请使用物料数据。"
    :editor="editor"
    :clientIssues="editor.clientIssues.value"
  >
    <template #header-extra>
      <div class="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs font-medium">
        高级管理员兜底 ·
        条目数: {{ entryCount }}
      </div>
    </template>

    <template #header-right>
      <div class="flex items-center gap-3">
        <Input v-model="changeNote" placeholder="变更说明" class="w-64 h-9 bg-background" />
        <Button variant="outline" size="sm" @click="editor.formatJsonDraft">格式化</Button>
      </div>
    </template>

    <Card>
      <CardHeader>
        <CardTitle>高级管理员 JSON 兜底</CardTitle>
        <CardDescription>
          此页面保留给配置管理员处理发布态物料目录 JSON 的应急兜底。常规新增、编辑、供应商归属和关系修复应优先在「物料数据」中完成。
        </CardDescription>
      </CardHeader>
    </Card>

    <Card class="flex-1 min-h-0">
      <CardHeader>
        <CardTitle>物料目录 JSON</CardTitle>
        <CardDescription>直接编辑发布用物料目录对象。保存后仍会创建 draft 并立即发布，请仅在管理员兜底场景使用。</CardDescription>
      </CardHeader>
      <CardContent class="h-[60vh]">
        <CodeMirrorEditor v-model="jsonDraft" class="h-full border rounded-md" />
      </CardContent>
    </Card>
  </ProfileEditorHost>
</template>
