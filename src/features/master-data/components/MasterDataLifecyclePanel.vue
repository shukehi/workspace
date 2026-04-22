<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WorkflowRevisionMeta } from '@/services/materialMasterProfileApi';

defineProps<{
  title?: string
  latestRevision?: WorkflowRevisionMeta | null
  draftRevision?: WorkflowRevisionMeta | null
  publishedRevision?: WorkflowRevisionMeta | null
  revisions: WorkflowRevisionMeta[]
  publishing?: boolean
  rollingBackRevision?: number | null
}>();

const emit = defineEmits<{
  (e: 'publish'): void
  (e: 'rollback', revision: number): void
}>();
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ title || 'Lifecycle' }}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 text-sm">
      <div class="grid gap-3 md:grid-cols-3">
        <div class="rounded-md border bg-background px-3 py-2">
          <div class="text-muted-foreground">latest revision</div>
          <div class="font-medium">{{ latestRevision?.revision ?? '-' }}</div>
        </div>
        <div class="rounded-md border bg-background px-3 py-2">
          <div class="text-muted-foreground">draft revision</div>
          <div class="font-medium">{{ draftRevision?.revision ?? '-' }}</div>
        </div>
        <div class="rounded-md border bg-background px-3 py-2">
          <div class="text-muted-foreground">published revision</div>
          <div class="font-medium">{{ publishedRevision?.revision ?? '-' }}</div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" :disabled="!draftRevision || publishing" @click="emit('publish')">
          发布当前 draft
        </Button>
      </div>

      <div>
        <div class="font-medium mb-2">修订历史</div>
        <div v-if="revisions.length === 0" class="text-muted-foreground">暂无修订记录</div>
        <div
          v-for="revision in revisions.slice(0, 8)"
          :key="revision.revision"
          class="rounded-md border bg-background px-3 py-2 mb-2"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="font-medium">#{{ revision.revision }} · {{ revision.state }}</div>
              <div class="text-muted-foreground">{{ revision.changeNote || '无变更说明' }}</div>
            </div>
            <Button
              v-if="publishedRevision && revision.revision !== publishedRevision.revision"
              size="sm"
              variant="outline"
              :disabled="rollingBackRevision === revision.revision"
              @click="emit('rollback', revision.revision)"
            >
              回滚到此版本
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
