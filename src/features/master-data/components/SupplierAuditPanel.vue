<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

defineProps<{
  auditLogs: Array<{
    id: number
    action: string
    operator: string
    createdAt: string
    meta: Record<string, unknown>
  }>
  auditTrendSummary: {
    sampleSize: number
    createCount: number
    updateCount: number
    archiveCount: number
    latestCreatedAt: string | null
  }
}>();
</script>

<template>
  <Card>
    <CardContent class="p-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <div>最近 5 条变更</div>
      <div>create: {{ auditTrendSummary.createCount }}</div>
      <div>update: {{ auditTrendSummary.updateCount }}</div>
      <div>archive: {{ auditTrendSummary.archiveCount }}</div>
      <div v-if="auditTrendSummary.latestCreatedAt">latest: {{ auditTrendSummary.latestCreatedAt }}</div>
    </CardContent>
  </Card>

  <Card v-if="auditLogs.length > 0">
    <CardHeader>
      <CardTitle>最近审计记录</CardTitle>
    </CardHeader>
    <CardContent class="space-y-2 text-sm">
      <div
        v-for="log in auditLogs.slice(0, 5)"
        :key="log.id"
        class="rounded-md border bg-background px-3 py-2"
      >
        <div class="font-medium">{{ log.action }}</div>
        <div class="text-muted-foreground">{{ log.operator }} · {{ log.createdAt }}</div>
      </div>
    </CardContent>
  </Card>
</template>
