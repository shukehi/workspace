<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

defineProps<{
  referenceCheck: {
    hasIssues: boolean
    supplierRefs: string[]
    materialCodeRefs: string[]
    missingMaterialCodes: string[]
    suppliersMissingInSupplierMaster: string[]
    supplierRefItems?: Array<{ path: string; value: string }>
    unlinkedMaterialCount?: number
  } | null
  relationshipHealth: {
    unlinkedMaterialCount: number
    inactiveSupplierLinkedMaterialCount: number
    unlinkedMaterialSamples: Array<{ code: string; supplier: string; path: string }>
    inactiveSupplierLinkedMaterials: Array<{ code: string; supplier: string; supplierMasterName: string }>
  }
  actionableGroups: {
    autoFixCandidates: Array<any>
    manualReviewCandidates: Array<any>
  }
}>();

const emit = defineEmits<{
  (e: 'auto-relink', item: any): void
  (e: 'open-edit', item: any): void
}>();
</script>

<template>
  <div v-if="referenceCheck" class="grid gap-4 md:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle>主数据引用检查</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2 text-sm">
        <div v-if="!referenceCheck.hasIssues" class="text-emerald-700">当前未发现主数据引用问题</div>
        <div v-if="referenceCheck.unlinkedMaterialCount" class="rounded-md border bg-background px-3 py-2">
          未关联 Supplier Master 的物料：{{ referenceCheck.unlinkedMaterialCount }}
        </div>
        <div v-if="referenceCheck.missingMaterialCodes.length > 0" class="rounded-md border bg-background px-3 py-2">
          缺失物料编码：{{ referenceCheck.missingMaterialCodes.join('，') }}
        </div>
        <div v-if="referenceCheck.suppliersMissingInSupplierMaster.length > 0" class="rounded-md border bg-background px-3 py-2">
          未出现在 Supplier Master 中的供应商：{{ referenceCheck.suppliersMissingInSupplierMaster.join('，') }}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>引用路径样例</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2 text-sm">
        <div
          v-for="item in referenceCheck.supplierRefItems?.slice(0, 5) || []"
          :key="`supplier-ref-${item.path}-${item.value}`"
          class="rounded-md border bg-background px-3 py-2"
        >
          <div class="font-medium">{{ item.path }}</div>
          <div class="text-muted-foreground">{{ item.value }}</div>
        </div>
        <div v-if="(referenceCheck.supplierRefItems?.length || 0) === 0" class="text-muted-foreground">
          暂无 supplier 引用路径
        </div>
      </CardContent>
    </Card>

    <Card v-if="relationshipHealth.unlinkedMaterialSamples.length > 0 || relationshipHealth.inactiveSupplierLinkedMaterials.length > 0">
      <CardHeader>
        <CardTitle>关系异常分组</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3 text-sm">
        <div v-if="relationshipHealth.unlinkedMaterialSamples.length > 0">
          <div class="font-medium mb-2">未关联 Supplier Master 的物料</div>
          <div
            v-for="item in relationshipHealth.unlinkedMaterialSamples"
            :key="`unlinked-material-${item.path}-${item.code}`"
            class="rounded-md border bg-background px-3 py-2 mb-2"
          >
            <div class="font-medium">{{ item.code }}</div>
            <div class="text-muted-foreground">{{ item.supplier || '未填写供应商' }}</div>
          </div>
        </div>
        <div v-if="relationshipHealth.inactiveSupplierLinkedMaterials.length > 0">
          <div class="font-medium mb-2">链接到 inactive Supplier Master</div>
          <div
            v-for="item in relationshipHealth.inactiveSupplierLinkedMaterials"
            :key="`inactive-linked-material-${item.code}`"
            class="rounded-md border bg-background px-3 py-2 mb-2"
          >
            <div class="font-medium">{{ item.code }}</div>
            <div class="text-muted-foreground">{{ item.supplier }} · {{ item.supplierMasterName }}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <div
    v-if="actionableGroups.autoFixCandidates.length > 0 || actionableGroups.manualReviewCandidates.length > 0"
    class="grid gap-4 md:grid-cols-2"
  >
    <Card v-if="actionableGroups.autoFixCandidates.length > 0">
      <CardHeader>
        <CardTitle>可自动修复</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2 text-sm">
        <div
          v-for="item in actionableGroups.autoFixCandidates"
          :key="`auto-fix-${item.id}`"
          class="rounded-md border bg-background px-3 py-2"
        >
          <div class="font-medium">{{ item.code }} · {{ item.name }}</div>
          <div class="text-muted-foreground">
            {{ item.supplier }} → 建议关联 {{ item.suggestedSupplierMaster?.supplierName }}
          </div>
          <div class="mt-2">
            <Button size="sm" variant="outline" @click="emit('auto-relink', item)">
              自动重连
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card v-if="actionableGroups.manualReviewCandidates.length > 0">
      <CardHeader>
        <CardTitle>需人工处理</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2 text-sm">
        <div
          v-for="item in actionableGroups.manualReviewCandidates"
          :key="`manual-review-${item.id}`"
          class="rounded-md border bg-background px-3 py-2"
        >
          <div class="font-medium">{{ item.code }} · {{ item.name }}</div>
          <div class="text-muted-foreground">
            <template v-if="item.supplierMaster?.status === 'inactive'">
              当前链接的 Supplier Master 已 inactive
            </template>
            <template v-else>
              未找到可自动匹配的 Supplier Master
            </template>
          </div>
          <div class="mt-2">
            <Button size="sm" variant="outline" @click="emit('open-edit', item)">
              打开编辑
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
