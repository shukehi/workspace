<script setup lang="ts">
import { onMounted } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2, Plus } from 'lucide-vue-next';
import ConfigCenterShell from '@/features/config-editor/components/ConfigCenterShell.vue';
import { useSupplierMaster } from '@/features/master-data/composables/useSupplierMaster';

const {
  loading,
  saving,
  loadError,
  searchQuery,
  filteredItems,
  relationshipHealth,
  actionableRelationshipGroups,
  auditTrendSummary,
  profileDetail,
  auditLogs,
  linkedMaterials,
  selectedSupplier,
  linkedMaterialsLoading,
  isEditDialogOpen,
  editingItem,
  dialogTitle,
  load,
  openCreateDialog,
  openEditDialog,
  saveItem,
  archiveItem,
  loadLinkedMaterials,
} = useSupplierMaster();

onMounted(() => {
  load();
});
</script>

<template>
  <ConfigCenterShell
    title="供应商主数据"
    description="维护系统供应商主数据与物料关联视图。"
  >
    <template #header-right>
      <Button @click="openCreateDialog">
        <Plus class="mr-2 h-4 w-4" /> 新增供应商
      </Button>
    </template>

    <Card v-if="profileDetail">
      <CardContent class="p-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div>profile: {{ profileDetail.profile.code }}</div>
        <div>workflow: {{ profileDetail.profile.workflowKind }}</div>
        <div>total: {{ profileDetail.collection.total }}</div>
      </CardContent>
    </Card>

    <Card v-if="filteredItems.some((item) => item.hasLinkedMaterialsWhileInactive)">
      <CardContent class="p-4 text-sm text-amber-700">
        存在 inactive 但仍关联物料的供应商，请优先处理。
      </CardContent>
    </Card>

    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent class="p-4 space-y-1">
          <div class="text-sm text-muted-foreground">关联健康总览</div>
          <div class="text-2xl font-semibold">{{ relationshipHealth.totalSuppliers }}</div>
          <div class="text-xs text-muted-foreground">已纳入供应商主数据的供应商数</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-4 space-y-1">
          <div class="text-sm text-muted-foreground">关联物料总数</div>
          <div class="text-2xl font-semibold">{{ relationshipHealth.totalLinkedMaterials }}</div>
          <div class="text-xs text-muted-foreground">已正式链接到 Supplier Master 的物料数</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-4 space-y-1">
          <div class="text-sm text-muted-foreground">异常供应商数</div>
          <div class="text-2xl font-semibold text-amber-700">
            {{ relationshipHealth.inactiveLinkedSupplierCount + relationshipHealth.suppliersWithUnlinkedMaterialsCount }}
          </div>
          <div class="text-xs text-muted-foreground">inactive 仍关联 / 有物料但尚未正式链接</div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardContent class="p-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div>最近 5 条变更</div>
        <div>create: {{ auditTrendSummary.createCount }}</div>
        <div>update: {{ auditTrendSummary.updateCount }}</div>
        <div>archive: {{ auditTrendSummary.archiveCount }}</div>
        <div v-if="auditTrendSummary.latestCreatedAt">latest: {{ auditTrendSummary.latestCreatedAt }}</div>
      </CardContent>
    </Card>

    <div
      v-if="relationshipHealth.inactiveLinkedSupplierCount > 0 || relationshipHealth.suppliersWithUnlinkedMaterialsCount > 0"
      class="grid gap-4 md:grid-cols-2"
    >
      <Card v-if="relationshipHealth.inactiveLinkedSupplierCount > 0">
        <CardHeader>
          <CardTitle>inactive 但仍有关联物料</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-sm">
          <div
            v-for="item in relationshipHealth.inactiveLinkedSuppliers"
            :key="`inactive-linked-${item.normalizedName}`"
            class="rounded-md border bg-background px-3 py-2"
          >
            <div class="font-medium">{{ item.supplierName }}</div>
            <div class="text-muted-foreground">已链接物料：{{ item.linkedMaterialCount }}</div>
            <div class="mt-2 flex items-center gap-2">
              <Button size="sm" variant="outline" @click="loadLinkedMaterials(Number(item.id), item)">
                查看关联物料
              </Button>
              <Button size="sm" variant="outline" @click="openEditDialog(item)">
                打开编辑
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card v-if="relationshipHealth.suppliersWithUnlinkedMaterialsCount > 0">
        <CardHeader>
          <CardTitle>需补充正式链接</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-sm">
          <div
            v-for="item in actionableRelationshipGroups.suppliersWithUnlinkedMaterials"
            :key="`unlinked-supplier-${item.normalizedName}`"
            class="rounded-md border bg-background px-3 py-2"
          >
            <div class="font-medium">{{ item.supplierName }}</div>
            <div class="text-muted-foreground">物料数：{{ item.materialCount }} · 已链接：{{ item.linkedMaterialCount }}</div>
            <div class="mt-2">
              <Button size="sm" variant="outline" @click="openEditDialog(item)">
                打开编辑
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardContent class="p-4 flex items-center gap-3">
        <Input v-model="searchQuery" placeholder="搜索供应商或来源..." class="flex-1 min-w-0" />
      </CardContent>
    </Card>

    <Card v-if="loadError">
      <CardContent class="p-4 text-sm text-destructive">{{ loadError }}</CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>供应商列表（{{ filteredItems.length }}）</CardTitle>
      </CardHeader>
      <CardContent class="overflow-auto">
        <div v-if="loading" class="text-sm text-muted-foreground">加载中...</div>
        <div v-else-if="filteredItems.length === 0" class="text-sm text-muted-foreground">暂无供应商主数据</div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-left border-b">
              <th class="py-2 pr-4">供应商</th>
              <th class="py-2 pr-4">来源</th>
              <th class="py-2 pr-4">物料数</th>
              <th class="py-2 pr-4">已链接物料</th>
              <th class="py-2 pr-4">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.normalizedName" class="border-b align-top">
              <td class="py-2 pr-4 font-medium">{{ item.supplierName }}</td>
              <td class="py-2 pr-4 text-muted-foreground">{{ item.sources.join('，') }}</td>
              <td class="py-2 pr-4">{{ item.materialCount }}</td>
              <td class="py-2 pr-4">
                <div>{{ item.linkedMaterialCount }}</div>
                <div v-if="item.linkedMaterialCodes?.length" class="text-xs text-muted-foreground mt-1">
                  {{ item.linkedMaterialCodes.join('，') }}
                </div>
                <div v-if="item.hasLinkedMaterialsWhileInactive" class="mt-1 text-xs text-amber-700">
                  inactive 但仍有关联物料
                </div>
              </td>
              <td class="py-2 pr-4">
                <div class="flex items-center gap-2">
                  <Button variant="ghost" size="sm" @click="openEditDialog(item)">
                    <Edit2 class="h-4 w-4" />
                  </Button>
                  <Button v-if="item.id" variant="outline" size="sm" @click="loadLinkedMaterials(Number(item.id), item)">
                    查看关联物料
                  </Button>
                  <Button v-if="item.id && item.status !== 'inactive'" variant="outline" size="sm" @click="archiveItem(item)">
                    归档
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>

    <Card v-if="selectedSupplier">
      <CardHeader>
        <CardTitle>关联物料明细 · {{ selectedSupplier.supplierName }}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2 text-sm">
        <div v-if="linkedMaterialsLoading" class="text-muted-foreground">加载关联物料中...</div>
        <div v-else-if="linkedMaterials.length === 0" class="text-muted-foreground">
          当前 supplier master 暂无已关联物料
        </div>
        <div
          v-for="material in linkedMaterials.slice(0, 10)"
          :key="material.id"
          class="rounded-md border bg-background px-3 py-2"
        >
          <div class="font-medium">{{ material.code }} · {{ material.name }}</div>
          <div class="text-muted-foreground">
            {{ material.category || '未分类' }} · {{ material.supplier || '未填写供应商' }}
          </div>
        </div>
        <div v-if="linkedMaterials.length > 10" class="text-muted-foreground">
          仅展示最近 10 条，请使用物料管理页查看完整列表。
        </div>
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

    <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{{ dialogTitle }}</DialogTitle>
          <DialogDescription>
            维护供应商主数据条目。
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">供应商</Label>
            <Input v-model="editingItem.supplierName" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">状态</Label>
            <select v-model="editingItem.status" class="col-span-3 h-9 rounded-md border bg-background px-3 text-sm">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">备注</Label>
            <Input v-model="editingItem.sourceNote" class="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button :disabled="saving" @click="saveItem">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </ConfigCenterShell>
</template>
