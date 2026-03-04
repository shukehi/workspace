<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { FormulaRevisionMeta } from '@/types/formula';

const props = defineProps<{
  open: boolean;
  draftRevision: FormulaRevisionMeta | null;
  publishedRevision: FormulaRevisionMeta | null;
  revisions: FormulaRevisionMeta[];
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'rollback', revision: number): void;
}>();

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
});
</script>

<template>
  <Dialog v-model:open="openModel">
    <DialogTrigger as-child>
      <Button variant="outline" size="sm">版本历史</Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[640px]">
      <DialogHeader>
        <DialogTitle>版本历史</DialogTitle>
        <DialogDescription>
          Draft: {{ draftRevision?.revision ?? '-' }} | Published: {{ publishedRevision?.revision ?? '-' }}
        </DialogDescription>
      </DialogHeader>

      <div class="max-h-[65vh] overflow-auto">
        <div v-for="rev in revisions" :key="rev.id" class="border rounded-md p-3 mb-2 text-sm">
          <div class="font-medium">r{{ rev.revision }} · {{ rev.state }}</div>
          <div class="text-xs text-muted-foreground mt-1">{{ rev.createdBy }} · {{ new Date(rev.createdAt).toLocaleString() }}</div>
          <div class="text-xs mt-1">{{ rev.changeNote || '-' }}</div>
          <Button
            size="sm"
            variant="ghost"
            class="mt-2 px-0 h-7"
            :disabled="rev.state === 'archived'"
            @click="emit('rollback', rev.revision)"
          >
            回滚到此版本
          </Button>
        </div>
        <div v-if="revisions.length === 0" class="text-sm text-muted-foreground">暂无历史版本</div>
      </div>
    </DialogContent>
  </Dialog>
</template>
