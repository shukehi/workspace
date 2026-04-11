<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type {
  RuleExplainFieldDefinition,
  RuleExplainPreviewHandle,
} from '@/features/config-editor/composables/useRuleExplainPreview';

const props = withDefaults(defineProps<{
  title?: string;
  description?: string;
  preview: RuleExplainPreviewHandle;
  fields: RuleExplainFieldDefinition[];
  emptyTraceLabel?: string;
}>(), {
  title: '规则试跑',
  description: '输入样本字段，查看规则命中轨迹与最终输出。',
  emptyTraceLabel: '当前没有可解释的规则。',
});

function getFieldValue(field: RuleExplainFieldDefinition): string {
  return String(props.preview.snapshot[field.field] ?? '');
}

function updateField(field: RuleExplainFieldDefinition, value: string | number) {
  if (field.setValue) {
    field.setValue(props.preview, value);
    return;
  }
  if (field.type === 'number') {
    props.preview.setField(field.field, Number(value || 0));
    return;
  }
  props.preview.setField(field.field, String(value));
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ title }}</CardTitle>
      <CardDescription>{{ description }}</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <div v-for="field in fields" :key="field.field">
          <label class="text-xs text-muted-foreground">{{ field.label }}</label>
          <Input
            :model-value="getFieldValue(field)"
            :placeholder="field.placeholder"
            :type="field.type === 'number' ? 'number' : 'text'"
            :min="field.type === 'number' ? field.min : undefined"
            @update:model-value="updateField(field, $event)"
          />
        </div>
        <div class="flex items-end md:col-span-2 xl:col-span-3">
          <Button variant="outline" size="sm" class="w-full" @click="preview.reset()">重置样本</Button>
        </div>
      </div>

      <div class="rounded-md border bg-muted/20 p-3 space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium">命中规则数</span>
          <span>{{ preview.matchedCount }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium">最终生效规则</span>
          <span>{{ preview.result.value.winningRules.join(', ') || '无' }}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div class="rounded-md border p-3 bg-background">
          <div class="text-sm font-medium mb-2">命中轨迹</div>
          <div class="space-y-2">
            <div
              v-for="trace in preview.result.value.traces"
              :key="trace.ruleId"
              class="rounded border px-3 py-2 text-xs"
              :class="trace.matched ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-600'"
            >
              <div class="font-medium">{{ trace.ruleId }}</div>
              <div>priority={{ trace.priority }} · stage={{ trace.stage }} · {{ trace.matched ? 'matched' : trace.skippedReason }}</div>
            </div>
            <div v-if="preview.result.value.traces.length === 0" class="text-xs text-muted-foreground">{{ emptyTraceLabel }}</div>
          </div>
        </div>

        <div class="rounded-md border p-3 bg-background">
          <div class="text-sm font-medium mb-2">最终输出</div>
          <pre class="text-xs whitespace-pre-wrap break-all text-slate-700">{{ JSON.stringify(preview.result.value.output, null, 2) }}</pre>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
