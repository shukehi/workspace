<script setup lang="ts">
import { CardHeader, CardTitle } from '@/components/ui/card';
import FormulaHistoryDialog from '@/features/formulas/components/FormulaHistoryDialog.vue';
import type { FormulaRevisionMeta } from '@/types/formula';

defineProps<{
  historyOpen: boolean;
  draftRevision: FormulaRevisionMeta | null;
  publishedRevision: FormulaRevisionMeta | null;
  revisions: FormulaRevisionMeta[];
}>();

const emit = defineEmits<{
  (e: 'update:historyOpen', value: boolean): void;
  (e: 'rollback', revision: number): void;
}>();
</script>

<template>
  <CardHeader class="pb-3 border-b">
    <div class="flex items-center justify-between gap-2">
      <CardTitle class="text-base">配方编辑</CardTitle>
      <FormulaHistoryDialog
        :open="historyOpen"
        :draft-revision="draftRevision"
        :published-revision="publishedRevision"
        :revisions="revisions"
        @update:open="emit('update:historyOpen', $event)"
        @rollback="emit('rollback', $event)"
      />
    </div>
  </CardHeader>
</template>
