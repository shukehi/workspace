<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FormulaSummary } from '@/types/formula';

const props = defineProps<{
  list: FormulaSummary[];
  total: number;
  selectedKey: string;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', formulaKey: string): void;
  (e: 'load-more'): void;
}>();

const listContainerRef = ref<HTMLDivElement | null>(null);
const loadMoreTriggerRef = ref<HTMLDivElement | null>(null);

function isLocalDraft(item: FormulaSummary) {
  return item.formulaKey.startsWith('__local_draft__:');
}

function getRowTitle(item: FormulaSummary) {
  if (isLocalDraft(item)) {
    return item.displayName?.trim() || '未命名配方';
  }
  const formulaKey = String(item.formulaKey || '').trim();
  const displayName = String(item.displayName || '').trim();
  if (!displayName) return formulaKey || '未命名配方';

  const compactFormulaKey = formulaKey.replace(/\s+/g, '');
  const compactDisplayName = displayName.replace(/\s+/g, '');
  if (!formulaKey || compactFormulaKey === compactDisplayName) {
    return displayName;
  }
  return `${formulaKey} - ${displayName}`;
}

function requestLoadMore() {
  if (!props.loading && !props.loadingMore && props.hasMore) {
    emit('load-more');
  }
}

function ensureScrollable() {
  nextTick(() => {
    const el = listContainerRef.value;
    if (!el || props.loading || props.loadingMore) return;
    if (props.hasMore && el.scrollHeight <= el.clientHeight + 8) {
      requestLoadMore();
    }
  });
}

function onListScroll(event: Event) {
  const target = event.target as HTMLDivElement;
  const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
  if (remaining < 80) {
    requestLoadMore();
  }
}

useIntersectionObserver(
  loadMoreTriggerRef,
  ([entry]) => {
    if (entry?.isIntersecting) {
      requestLoadMore();
    }
  },
  {
    root: listContainerRef,
    rootMargin: '120px 0px 120px 0px'
  }
);

watch(
  () => [props.list.length, props.loading, props.loadingMore, props.hasMore],
  () => ensureScrollable(),
  { immediate: true }
);
</script>

<template>
  <Card class="xl:col-span-3 min-h-0 overflow-hidden flex flex-col">
    <CardHeader class="pb-3 border-b">
      <CardTitle class="text-base">配方列表 ({{ list.length }}/{{ total }})</CardTitle>
    </CardHeader>
    <CardContent class="p-0 overflow-hidden">
      <div
        ref="listContainerRef"
        class="formula-list-viewport overflow-auto overscroll-contain"
        @scroll.passive="onListScroll"
        @mouseenter="ensureScrollable"
      >
        <div v-if="loading" class="p-4 text-sm text-muted-foreground">加载中...</div>
        <button
          v-for="item in list"
          :key="item.formulaKey"
          class="formula-list-row w-full text-left px-4 border-b hover:bg-muted/40"
          :class="item.formulaKey === selectedKey ? 'bg-muted' : ''"
          @click="emit('select', item.formulaKey)"
        >
          <div class="text-[13px] font-medium leading-5">
            {{ getRowTitle(item) }}
          </div>
          <div class="text-[11px] text-muted-foreground mt-1">
            {{ isLocalDraft(item) ? '未保存草稿' : `${item.status} · rev ${item.activeRevision ?? '-'}` }}
          </div>
        </button>
        <div ref="loadMoreTriggerRef" class="h-1 w-full"></div>
        <div v-if="loadingMore" class="p-3 text-center text-xs text-muted-foreground">加载更多...</div>
        <div v-else-if="!hasMore && list.length > 0" class="p-3 text-center text-xs text-muted-foreground">已加载全部配方</div>
        <div v-if="!loading && list.length === 0" class="p-4 text-sm text-muted-foreground">暂无配方</div>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.formula-list-viewport {
  height: calc(9 * 3.5rem);
}

.formula-list-row {
  min-height: 3.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>
