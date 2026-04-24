<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

defineProps<Props>()
</script>

<template>
  <div :class="cn('animate-pulse rounded-md bg-muted', className)" />
</template>
