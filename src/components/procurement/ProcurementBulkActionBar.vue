<script setup lang="ts">
import { CheckCircle2, FileSpreadsheet, PackageCheck, Trash2, X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import type { Order } from '@/types/order';

defineProps<{
  selectedCount: number;
  canSubmit: boolean;
  canComplete: boolean;
  canRestoreDraft: boolean;
}>();

const emit = defineEmits<{
  (e: 'status', value: Order['status']): void;
  (e: 'export'): void;
  (e: 'delete'): void;
  (e: 'clear'): void;
}>();
</script>

<template>
  <transition
    enter-active-class="transition duration-300 ease-out transform"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in transform"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="selectedCount > 0"
      class="fixed md:absolute bottom-3 md:bottom-6 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50"
    >
      <div class="bg-card text-card-foreground px-3 md:px-4 py-3 rounded-lg shadow-lg flex flex-wrap items-center justify-center md:justify-start gap-2 border w-full md:w-auto">
        <div class="text-xs text-muted-foreground mr-2">已选 {{ selectedCount }}</div>

        <Button variant="outline" size="sm" :disabled="!canSubmit" @click="emit('status', 'submitted')">
          <CheckCircle2 class="w-4 h-4 mr-2" /> 提交
        </Button>
        <Button variant="outline" size="sm" :disabled="!canComplete" @click="emit('status', 'completed')">
          <PackageCheck class="w-4 h-4 mr-2" /> 结案
        </Button>
        <Button variant="outline" size="sm" :disabled="!canRestoreDraft" @click="emit('status', 'draft')">
          <CheckCircle2 class="w-4 h-4 mr-2" /> 恢复草稿
        </Button>
        <Button variant="outline" size="sm" @click="emit('export')">
          <FileSpreadsheet class="w-4 h-4 mr-2" /> 导出
        </Button>
        <Button variant="destructive" size="sm" @click="emit('delete')">
          <Trash2 class="w-4 h-4 mr-2" /> 删除
        </Button>
        <Button variant="ghost" size="icon" @click="emit('clear')">
          <X class="w-4 h-4" />
        </Button>
      </div>
    </div>
  </transition>
</template>
