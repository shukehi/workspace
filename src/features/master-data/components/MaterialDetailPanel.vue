<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MaterialAuditPanel from '@/features/master-data/components/MaterialAuditPanel.vue';
import MaterialRelationshipSection from '@/features/master-data/components/MaterialRelationshipSection.vue';
import type { MaterialRecord } from '@/features/materials/composables/useMaterialManagementPageState';

defineProps<{
  material: MaterialRecord | null
  activeTab: string
  auditLogs: Array<{
    id: number
    action: string
    operator: string
    createdAt: string
    meta: Record<string, unknown>
  }>
  supplierMasterOptions: Array<{ id: number; supplierName: string }>
}>();

const emit = defineEmits<{
  (e: 'open-edit', item: MaterialRecord): void
  (e: 'auto-relink', item: MaterialRecord): void
  (e: 'jump-to-supplier', supplierMasterId: number): void
  (e: 'update:activeTab', value: string): void
}>();
</script>

<template>
  <Card class="min-h-[520px]">
    <CardHeader>
      <CardTitle>物料详情工作台</CardTitle>
    </CardHeader>
    <CardContent v-if="material" class="space-y-4">
      <div class="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
        <div>
          <div class="font-medium">{{ material.code }} · {{ material.name }}</div>
          <div class="text-sm text-muted-foreground">{{ material.model || '未填写型号' }} · {{ material.category || '未分类' }}</div>
        </div>
        <Button size="sm" variant="outline" @click="emit('open-edit', material)">编辑物料</Button>
      </div>

      <Tabs :model-value="activeTab" class="w-full" @update:model-value="emit('update:activeTab', String($event))">
        <TabsList class="grid w-full grid-cols-4">
          <TabsTrigger value="basic">基础信息</TabsTrigger>
          <TabsTrigger value="relationship">关系</TabsTrigger>
          <TabsTrigger value="diagnostics">诊断</TabsTrigger>
          <TabsTrigger value="audit">审计</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" class="mt-4 space-y-3">
          <div class="grid gap-3 md:grid-cols-2 text-sm">
            <div class="rounded-md border bg-background px-3 py-2">
              <div class="text-muted-foreground">物料编码</div>
              <div class="font-medium">{{ material.code }}</div>
            </div>
            <div class="rounded-md border bg-background px-3 py-2">
              <div class="text-muted-foreground">名称</div>
              <div class="font-medium">{{ material.name || '未填写' }}</div>
            </div>
            <div class="rounded-md border bg-background px-3 py-2">
              <div class="text-muted-foreground">型号</div>
              <div class="font-medium">{{ material.model || '未填写' }}</div>
            </div>
            <div class="rounded-md border bg-background px-3 py-2">
              <div class="text-muted-foreground">分类</div>
              <div class="font-medium">{{ material.category || '未分类' }}</div>
            </div>
            <div class="rounded-md border bg-background px-3 py-2">
              <div class="text-muted-foreground">单位</div>
              <div class="font-medium">{{ material.unit || '未填写' }}</div>
            </div>
            <div class="rounded-md border bg-background px-3 py-2">
              <div class="text-muted-foreground">单价</div>
              <div class="font-medium">¥{{ material.price ?? 0 }}</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="relationship" class="mt-4">
          <MaterialRelationshipSection
            :material="material"
            :supplier-master-options="supplierMasterOptions"
            @auto-link="emit('auto-relink', $event)"
            @open-edit="emit('open-edit', $event)"
            @jump-to-supplier="emit('jump-to-supplier', $event)"
          />
        </TabsContent>

        <TabsContent value="diagnostics" class="mt-4 space-y-3 text-sm">
          <div class="rounded-md border bg-background px-3 py-2">
            <div class="text-muted-foreground">当前链接状态</div>
            <div v-if="material.supplier_master_id" class="font-medium text-emerald-700">
              已正式关联 Supplier Master #{{ material.supplier_master_id }}
            </div>
            <div v-else class="font-medium text-amber-700">未关联 Supplier Master</div>
          </div>
          <div class="rounded-md border bg-background px-3 py-2">
            <div class="text-muted-foreground">异常判断</div>
            <div v-if="material.supplierMaster?.status === 'inactive'" class="font-medium text-amber-700">
              当前链接的 Supplier Master 已 inactive
            </div>
            <div v-else-if="!material.supplier_master_id" class="font-medium text-amber-700">
              可检查并尝试按供应商名称重新自动匹配
            </div>
            <div v-else class="font-medium text-emerald-700">当前未发现关系异常</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" @click="emit('open-edit', material)">打开编辑</Button>
            <Button size="sm" variant="outline" @click="emit('auto-relink', material)">自动重连</Button>
            <Button
              v-if="material.supplierMaster?.id"
              size="sm"
              variant="outline"
              @click="emit('jump-to-supplier', material.supplierMaster.id)"
            >
              查看供应商详情
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="audit" class="mt-4">
          <MaterialAuditPanel :audit-logs="auditLogs" />
        </TabsContent>
      </Tabs>
    </CardContent>
    <CardContent v-else class="text-sm text-muted-foreground">
      从左侧列表选择一条物料后，可在此查看基础信息、关系、诊断与审计记录。
    </CardContent>
  </Card>
</template>
