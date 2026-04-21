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
    title="物料目录配置"
    description="管理 BOM 计算使用的材料目录发布态与审计记录。"
    :editor="editor"
    :clientIssues="editor.clientIssues.value"
  >
    <template #header-extra>
      <div class="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs font-medium">
        条目数: {{ entryCount }}
      </div>
    </template>

    <template #header-right>
      <div class="flex items-center gap-3">
        <Input v-model="changeNote" placeholder="变更说明" class="w-64 h-9 bg-background" />
        <Button variant="outline" size="sm" @click="editor.formatJsonDraft">格式化</Button>
      </div>
    </template>

    <Card class="flex-1 min-h-0">
      <CardHeader>
        <CardTitle>目录 JSON</CardTitle>
        <CardDescription>直接编辑物料目录对象。保存后将创建 draft 并立即发布。</CardDescription>
      </CardHeader>
      <CardContent class="h-[60vh]">
        <CodeMirrorEditor v-model="jsonDraft" class="h-full border rounded-md" />
      </CardContent>
    </Card>
  </ProfileEditorHost>
</template>
