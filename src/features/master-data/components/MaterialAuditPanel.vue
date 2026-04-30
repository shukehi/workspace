<script setup lang="ts">
import MasterDataAuditLogList from '@/features/master-data/components/MasterDataAuditLogList.vue';

defineProps<{
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
  <MasterDataAuditLogList
    title="最近审计记录"
    :audit-logs="auditLogs.slice(0, 10)"
  />
</template>
