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
import SupplierAuditPanel from '@/features/master-data/components/SupplierAuditPanel.vue';
import SupplierDiagnosticsPanel from '@/features/master-data/components/SupplierDiagnosticsPanel.vue';
import SupplierLinkedMaterialsPanel from '@/features/master-data/components/SupplierLinkedMaterialsPanel.vue';
import SupplierSummaryCards from '@/features/master-data/components/SupplierSummaryCards.vue';
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

    <SupplierSummaryCards :health="relationshipHealth" />

    <SupplierAuditPanel
      :audit-logs="auditLogs"
      :audit-trend-summary="auditTrendSummary"
    />

    <SupplierDiagnosticsPanel
      :relationship-health="relationshipHealth"
      :actionable-groups="actionableRelationshipGroups"
      @view-linked-materials="loadLinkedMaterials(Number($event.id), $event)"
      @open-edit="openEditDialog"
    />

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

    <SupplierLinkedMaterialsPanel
      :selected-supplier="selectedSupplier"
      :linked-materials="linkedMaterials"
      :loading="linkedMaterialsLoading"
    />

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
