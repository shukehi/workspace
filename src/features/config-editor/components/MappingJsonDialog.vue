<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CodeMirrorEditor from '@/components/ui/CodeMirrorEditor.vue';
import type { MappingValidationIssue } from '@/types/mapping';

const props = withDefaults(defineProps<{
  open: boolean;
  draft: string;
  error: string | null;
  issues: MappingValidationIssue[];
  title?: string;
  description?: string;
  showCopyButton?: boolean;
}>(), {
  title: 'JSON 编辑',
  description: '直接编辑映射 JSON，应用前会进行校验。',
  showCopyButton: false
});

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'update:draft', value: string): void;
  (e: 'format'): void;
  (e: 'reset'): void;
  (e: 'apply'): void;
  (e: 'copy'): void;
}>();
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-3xl w-[min(100%,52rem)] max-h-[85vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle>{{ props.title }}</DialogTitle>
        <DialogDescription>{{ props.description }}</DialogDescription>
      </DialogHeader>

      <div class="space-y-3 min-h-0 overflow-auto">
        <CodeMirrorEditor
          :model-value="props.draft"
          class="h-[42vh] min-h-[220px]"
          lint
          @update:model-value="emit('update:draft', $event)"
        />
        <div v-if="props.error" class="text-sm text-destructive">
          {{ props.error }}
        </div>
        <div v-if="props.issues.length > 0" class="space-y-1">
          <div class="text-sm font-medium">校验失败</div>
          <ul class="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li v-for="issue in props.issues" :key="`draft-${issue.path}-${issue.code}`">
              {{ issue.path }}: {{ issue.message }}
            </li>
          </ul>
        </div>
      </div>

      <DialogFooter class="flex-row justify-end gap-2">
        <Button v-if="props.showCopyButton" variant="ghost" size="sm" @click="emit('copy')">
          复制当前 JSON
        </Button>
        <Button variant="outline" size="sm" @click="emit('format')">格式化</Button>
        <Button variant="outline" size="sm" @click="emit('reset')">重置为当前配置</Button>
        <Button variant="outline" size="sm" @click="emit('update:open', false)">取消</Button>
        <Button size="sm" @click="emit('apply')">校验并应用</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
