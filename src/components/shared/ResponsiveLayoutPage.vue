<script setup lang="ts">
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  subtitle?: string;
  className?: string;
}

defineProps<Props>();
</script>

<template>
  <div :class="cn('h-full flex flex-col p-4 md:p-6 lg:p-8 gap-4 bg-muted/20 relative overflow-hidden', className)">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{{ title }}</h2>
        <p v-if="subtitle" class="text-muted-foreground mt-1 text-[11px] uppercase tracking-wider font-medium opacity-70">
          {{ subtitle }}
        </p>
      </div>

      <!-- Action Area Slot -->
      <div class="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
        <slot name="actions" />
      </div>
    </div>

    <!-- Summary Section Slot (Optional) -->
    <slot name="summary" />

    <!-- Filter Section Slot -->
    <slot name="filters" />

    <!-- Main Content Section -->
    <div class="flex-1 min-h-0 relative">
      <slot />
    </div>

    <!-- Bottom Action Bar Slot (Optional) -->
    <slot name="footer" />
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
