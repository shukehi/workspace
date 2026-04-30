<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

defineProps<{
  title: string
  auditLogs: Array<{
    id: number
    action: string
    operator: string
    createdAt: string
    meta: Record<string, unknown>
  }>
}>();
</script>

<template>
  <Card v-if="auditLogs.length > 0">
    <CardHeader>
      <CardTitle>{{ title }}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-2 text-sm">
      <div
        v-for="log in auditLogs"
        :key="log.id"
        class="rounded-md border bg-background px-3 py-2"
      >
        <div class="font-medium">{{ log.action }}</div>
        <div class="text-muted-foreground">{{ log.operator }} · {{ log.createdAt }}</div>
      </div>
    </CardContent>
  </Card>
</template>
