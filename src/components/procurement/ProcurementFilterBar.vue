<script setup lang="ts">
import { Search } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

type CategoryOption = {
  id: string;
  label: string;
  count: number;
};

defineProps<{
  activeCategory: string;
  categoryOptions: CategoryOption[];
  searchQuery: string;
  visibleOrderCount: number;
  totalOrderCount: number;
  hasActiveFilters: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:activeCategory', value: string): void;
  (e: 'update:searchQuery', value: string): void;
  (e: 'reset'): void;
}>();
</script>

<template>
  <Card>
    <CardContent class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="w-full md:w-auto overflow-x-auto">
        <div class="flex w-max gap-1 rounded-md border bg-background p-1">
          <button
            v-for="cat in categoryOptions"
            :key="cat.id"
            type="button"
            class="px-3 py-1.5 text-sm rounded-sm whitespace-nowrap transition-colors"
            :class="activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
            @click="emit('update:activeCategory', cat.id)"
          >
            {{ cat.label }} ({{ cat.count }})
          </button>
        </div>
      </div>

      <div class="relative w-full md:w-80">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          :model-value="searchQuery"
          placeholder="搜单号、供应商、物料..."
          class="pl-10"
          @update:model-value="emit('update:searchQuery', String($event))"
        />
      </div>
    </CardContent>
    <div class="px-4 pb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">当前显示 {{ visibleOrderCount }} / {{ totalOrderCount }} 张订单</span>
      <Button v-if="hasActiveFilters" variant="ghost" size="sm" class="h-7 px-2" @click="emit('reset')">
        清空筛选
      </Button>
    </div>
  </Card>
</template>
