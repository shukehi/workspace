<script setup lang="ts">
import { Search, Filter, ShieldAlert } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

type CategoryOption = {
  id: string;
  label: string;
  count: number;
};

defineProps<{
  activeStatus: string;
  activeCategory: string;
  activeRiskFilter: string;
  statusOptions: CategoryOption[];
  categoryOptions: CategoryOption[];
  riskOptions: CategoryOption[];
  searchQuery: string;
  visibleOrderCount: number;
  totalOrderCount: number;
  hasActiveFilters: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:activeStatus', value: string): void;
  (e: 'update:activeCategory', value: string): void;
  (e: 'update:activeRiskFilter', value: string): void;
  (e: 'update:searchQuery', value: string): void;
  (e: 'reset'): void;
}>();
</script>

<template>
  <Card class="shadow-sm border-muted/40">
    <CardContent class="p-2 md:p-3 flex flex-col gap-2">
      <!-- Row 1: Status & Risk Filters (Core Workflow) -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <!-- Status Group -->
          <div class="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md border border-muted-foreground/10 shrink-0">
            <Filter class="w-3 h-3 text-muted-foreground" />
            <span class="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">订单状态</span>
          </div>
          <div class="flex overflow-x-auto scrollbar-hide">
            <div class="flex w-max gap-1 p-0.5 rounded-lg bg-muted/20">
              <button
                v-for="status in statusOptions"
                :key="status.id"
                type="button"
                class="px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-all duration-200 border border-transparent"
                :class="activeStatus === status.id 
                  ? 'bg-background text-foreground shadow-sm border-border' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'"
                @click="emit('update:activeStatus', status.id)"
              >
                {{ status.label }} 
                <span class="ml-0.5 opacity-60 text-[9px] font-normal">({{ status.count }})</span>
              </button>
            </div>
          </div>

          <div class="h-4 w-px bg-border/60 mx-1 shrink-0 hidden sm:block" />

          <!-- Risk Group -->
          <div class="flex items-center gap-1.5 px-2 py-1 bg-amber-500/5 rounded-md border border-amber-200/50 shrink-0 hidden sm:flex">
            <ShieldAlert class="w-3 h-3 text-amber-600" />
            <span class="text-[10px] uppercase font-bold text-amber-700/80 tracking-wider">风控</span>
          </div>
          <div class="flex overflow-x-auto scrollbar-hide">
            <div class="flex w-max gap-1 p-0.5 rounded-lg border border-dashed border-amber-200 bg-amber-500/5">
              <button
                v-for="risk in riskOptions"
                :key="risk.id"
                type="button"
                class="px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-all duration-200 border border-transparent"
                :class="activeRiskFilter === risk.id 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'text-amber-700/70 hover:text-amber-700 hover:bg-amber-500/10'"
                @click="emit('update:activeRiskFilter', risk.id)"
              >
                {{ risk.label }}
                <span class="ml-0.5 opacity-70 text-[9px] font-normal">({{ risk.count }})</span>
              </button>
            </div>
          </div>
        </div>

        <div class="hidden lg:flex items-center gap-2 text-[11px] text-muted-foreground shrink-0 px-2">
          <span>{{ visibleOrderCount }} / {{ totalOrderCount }}</span>
          <Button v-if="hasActiveFilters" variant="ghost" size="sm" class="h-6 px-2 text-[10px]" @click="emit('reset')">
            重置
          </Button>
        </div>
      </div>

      <!-- Row 2: Category & Search (Material Specific) -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-muted/30">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <div class="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md border border-muted-foreground/10 shrink-0">
            <span class="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">物料分类</span>
          </div>
          
          <div class="flex-1 overflow-x-auto scrollbar-hide">
            <div class="flex w-max gap-1 p-0.5 rounded-lg bg-muted/20">
              <button
                v-for="cat in categoryOptions"
                :key="cat.id"
                type="button"
                class="px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-all duration-200 border border-transparent"
                :class="activeCategory === cat.id 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'"
                @click="emit('update:activeCategory', cat.id)"
              >
                {{ cat.label }}
                <span class="ml-0.5 opacity-70 text-[9px] font-normal">({{ cat.count }})</span>
              </button>
            </div>
          </div>
        </div>

        <div class="relative w-full md:w-64 lg:w-72 shrink-0">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
          <Input
            :model-value="searchQuery"
            placeholder="搜单号、供应商、物料..."
            class="pl-8 h-8 text-[11px] rounded-md border-muted-foreground/20 focus-visible:ring-primary/20 bg-background/50"
            @update:model-value="emit('update:searchQuery', String($event))"
          />
        </div>
      </div>
    </CardContent>
    <div class="px-3 py-1 flex lg:hidden items-center justify-between text-[10px] text-muted-foreground border-t border-muted/30 bg-muted/5">
      <span>当前显示 {{ visibleOrderCount }} / {{ totalOrderCount }} 张订单</span>
      <Button v-if="hasActiveFilters" variant="ghost" size="sm" class="h-5 px-1.5 text-[9px]" @click="emit('reset')">
        清空筛选
      </Button>
    </div>
  </Card>
</template>
