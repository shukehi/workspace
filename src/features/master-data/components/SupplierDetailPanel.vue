<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SupplierAuditPanel from '@/features/master-data/components/SupplierAuditPanel.vue';
import SupplierLinkedMaterialsPanel from '@/features/master-data/components/SupplierLinkedMaterialsPanel.vue';
import type { SupplierMasterEntry } from '@/services/mappingConfigApi';
import type { SupplierLinkedMaterialItem } from '@/services/supplierMasterProfileApi';

defineProps<{
  supplier: SupplierMasterEntry | null
  activeTab: string
  linkedMaterials: SupplierLinkedMaterialItem[]
  linkedMaterialsLoading?: boolean
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

const emit = defineEmits<{
  (e: 'open-edit', item: SupplierMasterEntry): void
  (e: 'view-linked-materials', item: SupplierMasterEntry): void
  (e: 'jump-to-material', item: { id: number; code: string; name: string }): void
  (e: 'update:activeTab', value: string): void
}>();
</script>

<template>
  <Card class="min-h-[520px]">
    <CardHeader>
      <CardTitle>供应商详情工作台</CardTitle>
    </CardHeader>
    <CardContent v-if="supplier" class="space-y-4">
      <div class="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
        <div>
          <div class="font-medium">{{ supplier.supplierName }}</div>
          <div class="text-sm text-muted-foreground">{{ supplier.status || 'active' }} · {{ supplier.materialCount }} 个物料</div>
        </div>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline" @click="emit('view-linked-materials', supplier)">查看关联物料</Button>
          <Button size="sm" variant="outline" @click="emit('open-edit', supplier)">编辑供应商</Button>
        </div>
      </div>

      <Tabs :model-value="activeTab" class="w-full" @update:model-value="emit('update:activeTab', String($event))">
        <TabsList class="grid w-full grid-cols-4">
          <TabsTrigger value="basic">基础信息</TabsTrigger>
          <TabsTrigger value="materials">关联物料</TabsTrigger>
          <TabsTrigger value="diagnostics">诊断</TabsTrigger>
          <TabsTrigger value="audit">审计</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" class="mt-4 space-y-3 text-sm">
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-md border bg-background px-3 py-2">
              <div class="text-muted-foreground">供应商名称</div>
              <div class="font-medium">{{ supplier.supplierName }}</div>
            </div>
            <div class="rounded-md border bg-background px-3 py-2">
              <div class="text-muted-foreground">标准化名称</div>
              <div class="font-medium">{{ supplier.normalizedName }}</div>
            </div>
            <div class="rounded-md border bg-background px-3 py-2">
              <div class="text-muted-foreground">状态</div>
              <div class="font-medium">{{ supplier.status || 'active' }}</div>
            </div>
            <div class="rounded-md border bg-background px-3 py-2">
              <div class="text-muted-foreground">来源备注</div>
              <div class="font-medium">{{ supplier.sourceNote || '未填写' }}</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="materials" class="mt-4">
          <SupplierLinkedMaterialsPanel
            :selected-supplier="supplier"
            :linked-materials="linkedMaterials"
            :loading="linkedMaterialsLoading"
            @jump-to-material="emit('jump-to-material', $event)"
          />
        </TabsContent>

        <TabsContent value="diagnostics" class="mt-4 space-y-3 text-sm">
          <div class="rounded-md border bg-background px-3 py-2">
            <div class="text-muted-foreground">关系健康</div>
            <div v-if="supplier.hasLinkedMaterialsWhileInactive" class="font-medium text-amber-700">
              当前 inactive，但仍有关联物料
            </div>
            <div v-else-if="supplier.materialCount > 0 && supplier.linkedMaterialCount === 0" class="font-medium text-amber-700">
              当前有物料，但尚未形成正式链接
            </div>
            <div v-else class="font-medium text-emerald-700">当前未发现供应商关系异常</div>
          </div>
          <div class="rounded-md border bg-background px-3 py-2">
            <div class="text-muted-foreground">物料链接概览</div>
            <div class="font-medium">已链接 {{ supplier.linkedMaterialCount }} / 共 {{ supplier.materialCount }}</div>
            <div v-if="supplier.linkedMaterialCodes?.length" class="mt-1 text-xs text-muted-foreground">
              {{ supplier.linkedMaterialCodes.join('，') }}
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" @click="emit('view-linked-materials', supplier)">查看关联物料</Button>
            <Button size="sm" variant="outline" @click="emit('open-edit', supplier)">打开编辑</Button>
          </div>
        </TabsContent>

        <TabsContent value="audit" class="mt-4">
          <SupplierAuditPanel
            :audit-logs="auditLogs"
            :audit-trend-summary="auditTrendSummary"
          />
        </TabsContent>
      </Tabs>
    </CardContent>
    <CardContent v-else class="text-sm text-muted-foreground">
      从左侧列表选择一条供应商后，可在此查看基础信息、关联物料、诊断与审计记录。
    </CardContent>
  </Card>
</template>
