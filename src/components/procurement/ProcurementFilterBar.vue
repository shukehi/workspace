<script setup lang="ts">
import { ref } from 'vue';
import { Search, Filter, ShieldAlert, ChevronDown, ChevronUp, X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

const showAdvanced = ref(false);
</script>

<template>
  <div class="space-y-2">
    <!-- Main Filter Bar -->
    <Card class="shadow-sm border-muted/40 overflow-visible">
      <CardContent class="p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2">
        <!-- Core Filters: Status -->
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <div class="flex items-center gap-1 px-1.5 py-1 text-muted-foreground shrink-0">
            <Filter class="w-3.5 h-3.5" />
            <span class="text-xs font-semibold hidden sm:inline">状态</span>
          </div>
          
          <div class="flex flex-1 overflow-x-auto no-scrollbar gap-1 p-0.5 rounded-md bg-muted/30 border border-muted-foreground/5">
            <button
              v-for="status in statusOptions"
              :key="status.id"
              type="button"
              :class="cn(
                'px-3 py-1 text-xs font-medium rounded transition-all whitespace-nowrap',
                activeStatus === status.id 
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              )"
              @click="emit('update:activeStatus', status.id)"
            >
              {{ status.label }} 
              <span class="ml-0.5 opacity-50 text-[10px] tabular-nums">({{ status.count }})</span>
            </button>
          </div>
        </div>

        <!-- Right Side: Search & Advanced Toggle -->
        <div class="flex items-center gap-2 shrink-0">
          <div class="relative w-full md:w-60 lg:w-72">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <Input
              :model-value="searchQuery"
              placeholder="搜索单号、供应商..."
              class="pl-8 h-8 text-xs bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/20"
              @update:model-value="emit('update:searchQuery', String($event))"
            />
            <button 
              v-if="searchQuery"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              @click="emit('update:searchQuery', '')"
            >
              <X class="w-3 h-3" />
            </button>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            :class="cn('h-8 px-2.5 text-xs gap-1.5', showAdvanced && 'bg-muted border-primary/30 text-primary')"
            @click="showAdvanced = !showAdvanced"
          >
            <Filter class="w-3.5 h-3.5" />
            高级筛选
            <ChevronDown v-if="!showAdvanced" class="w-3 h-3 opacity-50" />
            <ChevronUp v-else class="w-3 h-3 opacity-50" />
          </Button>

          <div v-if="hasActiveFilters" class="h-4 w-px bg-border mx-1 hidden lg:block" />
          
          <Button 
            v-if="hasActiveFilters" 
            variant="ghost" 
            size="sm" 
            class="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            @click="emit('reset')"
          >
            重置
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Advanced Filters Panel -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform -translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform -translate-y-2 opacity-0"
    >
      <Card v-if="showAdvanced" class="border-primary/20 bg-primary/[0.02] shadow-sm">
        <CardContent class="p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Risk Filters -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-1.5 text-[11px] font-bold text-amber-700/80 uppercase tracking-tight">
              <ShieldAlert class="w-3 h-3 text-amber-600" />
              风险等级过滤
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="risk in riskOptions"
                :key="risk.id"
                type="button"
                :class="cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded-full transition-all border',
                  activeRiskFilter === risk.id 
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                    : 'bg-background text-amber-700/70 border-amber-200 hover:border-amber-400 hover:bg-amber-50'
                )"
                @click="emit('update:activeRiskFilter', risk.id)"
              >
                {{ risk.label }}
                <span class="ml-0.5 opacity-70 text-[9px]">({{ risk.count }})</span>
              </button>
            </div>
          </div>

          <!-- Category Filters -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-1.5 text-[11px] font-bold text-primary/80 uppercase tracking-tight">
              <Filter class="w-3 h-3 text-primary" />
              业务领域分类
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="cat in categoryOptions"
                :key="cat.id"
                type="button"
                :class="cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded-full transition-all border',
                  activeCategory === cat.id 
                    ? 'bg-primary text-primary-foreground border-primary-foreground/20 shadow-sm' 
                    : 'bg-background text-muted-foreground border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5'
                )"
                @click="emit('update:activeCategory', cat.id)"
              >
                {{ cat.label }}
                <span class="ml-0.5 opacity-50 text-[9px]">({{ cat.count }})</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </transition>

    <!-- Visibility Indicator -->
    <div class="px-1 flex items-center justify-between text-[10px] text-muted-foreground/60">
      <div class="flex items-center gap-3">
        <span>当前显示 <span class="text-foreground font-medium">{{ visibleOrderCount }}</span> 条订单</span>
        <span class="w-1 h-1 rounded-full bg-border" />
        <span>总计 {{ totalOrderCount }}</span>
      </div>
      <div v-if="hasActiveFilters" class="flex items-center gap-1.5 text-primary/70 animate-pulse">
        <span class="relative flex h-1.5 w-1.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
        </span>
        已开启精准筛选
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
