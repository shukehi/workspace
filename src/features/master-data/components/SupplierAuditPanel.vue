<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card';
import MasterDataAuditLogList from '@/features/master-data/components/MasterDataAuditLogList.vue';

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

  <MasterDataAuditLogList
    title="最近审计记录"
    :audit-logs="auditLogs.slice(0, 5)"
  />
</template>
