<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const props = withDefaults(
  defineProps<{
    text?: string | number | null;
    mode: 'clip' | 'hover' | 'expand';
    maxWidth?: number;
    label?: string;
  }>(),
  {
    maxWidth: 180,
    label: '字段详情',
  }
);

const normalizedText = computed(() => {
  if (props.text === null || props.text === undefined || props.text === '') {
    return '-';
  }
  return String(props.text).trim();
});

const isPlaceholder = computed(() => normalizedText.value === '-');
const isLongText = computed(() => normalizedText.value.length > 24);
</script>

<template>
  <span
    v-if="mode === 'clip' || isPlaceholder"
    class="block whitespace-nowrap overflow-hidden text-ellipsis"
    :style="{ maxWidth: `${maxWidth}px` }"
  >
    {{ normalizedText }}
  </span>

  <span
    v-else-if="mode === 'hover'"
    class="block whitespace-nowrap overflow-hidden text-ellipsis cursor-help"
    :style="{ maxWidth: `${maxWidth}px` }"
    :title="normalizedText"
  >
    {{ normalizedText }}
  </span>

  <div v-else class="space-y-1" :style="{ maxWidth: `${maxWidth}px` }">
    <p class="longtext-clamp-2 break-words">
      {{ normalizedText }}
    </p>
    <Dialog v-if="isLongText">
      <DialogTrigger as-child>
        <Button variant="ghost" size="sm" class="h-6 px-1 text-xs">查看全文</Button>
      </DialogTrigger>
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{{ label }}</DialogTitle>
          <DialogDescription>完整内容</DialogDescription>
        </DialogHeader>
        <div class="max-h-[60vh] overflow-auto rounded-md border bg-muted/20 p-3 text-sm leading-6 break-words">
          {{ normalizedText }}
        </div>
        <DialogFooter>
          <DialogClose as-child>
            <Button variant="outline">关闭</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.longtext-clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
</style>
