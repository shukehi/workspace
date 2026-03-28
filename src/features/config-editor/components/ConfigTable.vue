<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-vue-next';

const props = defineProps<{
  title?: string;
  description?: string;
  columns: {
    key: string;
    label: string;
    width?: string;
  }[];
  rows: any[];
  maxHeight?: string;
}>();

const emit = defineEmits<{
  (e: 'add'): void;
  (e: 'remove', id: string): void;
}>();
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-3">
      <div>
        <div v-if="title" class="text-sm font-medium">{{ title }}</div>
        <div v-if="description" class="text-xs text-muted-foreground">{{ description }}</div>
      </div>
      <div class="flex items-center gap-2">
        <slot name="header-actions"></slot>
        <Button variant="outline" size="sm" class="h-8 gap-1" @click="emit('add')">
          <Plus class="h-3.5 w-3.5" />
          添加行
        </Button>
      </div>
    </div>

    <div 
      class="overflow-auto rounded-md border" 
      :style="{ maxHeight: maxHeight || '400px' }"
    >
      <table class="w-full text-sm text-left border-separate border-spacing-0">
        <thead class="sticky top-0 z-20 bg-muted text-xs text-muted-foreground shadow-sm">
          <tr>
            <th 
              v-for="col in columns" 
              :key="col.key" 
              class="px-3 py-2 border-b font-medium"
              :style="{ width: col.width }"
            >
              {{ col.label }}
            </th>
            <th class="px-3 py-2 w-[80px] border-b text-center font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="row in rows" 
            :key="row.id" 
            class="bg-background border-b last:border-0 hover:bg-muted/30 transition-colors"
            data-issue-item="true"
          >
            <td 
              v-for="col in columns" 
              :key="col.key" 
              class="px-3 py-2"
            >
              <slot :name="`cell-${col.key}`" :row="row">
                {{ row[col.key] }}
              </slot>
            </td>
            <td class="px-3 py-2 text-center">
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                @click="emit('remove', row.id)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td :colspan="columns.length + 1" class="px-3 py-8 text-center text-muted-foreground italic">
              暂无数据
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
