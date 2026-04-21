<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>

<template>
  <div class="h-full flex flex-col gap-6 p-6 md:p-8 bg-muted/20">
    <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div class="flex items-center gap-3">
        <div>
          <h2 class="text-3xl font-semibold tracking-tight">{{ title }}</h2>
          <p class="text-muted-foreground mt-1">{{ description }}</p>
        </div>
        <slot name="header-extra"></slot>
      </div>
      <div v-if="$slots['header-right']" class="flex flex-wrap items-center justify-end gap-3">
        <slot name="header-right"></slot>
      </div>
    </div>

    <slot></slot>

    <slot name="footer"></slot>
  </div>
</template>
