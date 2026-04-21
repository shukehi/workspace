<script setup lang="ts">
import ConfigCenterShell from '@/features/config-editor/components/ConfigCenterShell.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, Edit2 } from 'lucide-vue-next';
import { useMaterialManagementPageState } from '@/features/materials/composables/useMaterialManagementPageState';
import MaterialAuditPanel from '@/features/master-data/components/MaterialAuditPanel.vue';
import MaterialDiagnosticsPanel from '@/features/master-data/components/MaterialDiagnosticsPanel.vue';
import MaterialSummaryCards from '@/features/master-data/components/MaterialSummaryCards.vue';

const {
  materials,
  loading,
  searchQuery,
  profileDetail,
  referenceCheck,
  auditLogs,
  supplierMasterOptions,
  relationshipHealth,
  actionableRelationshipGroups,
  isEditDialogOpen,
  editingMaterial,
  dialogTitle,
  fetchMaterials,
  openCreateDialog,
  openEditDialog,
  saveMaterial,
  autoRelinkMaterial,
} = useMaterialManagementPageState();
</script>

<template>
  <ConfigCenterShell
    title="物料管理"
    description="维护系统基础物料信息、价格与供应商。"
  >
    <template #header-right>
      <Button @click="openCreateDialog">
        <Plus class="mr-2 h-4 w-4" /> 新增物料
      </Button>
    </template>

    <Card>
      <CardContent v-if="profileDetail" class="px-4 py-3 border-b text-sm text-muted-foreground flex flex-wrap items-center gap-4">
        <div>profile: {{ profileDetail.profile.code }}</div>
        <div>workflow: {{ profileDetail.profile.workflowKind }}</div>
        <div>total: {{ profileDetail.collection.total }}</div>
      </CardContent>
      <CardContent v-if="referenceCheck" class="px-4 py-3 border-b text-sm text-muted-foreground flex flex-wrap items-center gap-4">
        <div>supplierRefs: {{ referenceCheck.supplierRefs.length }}</div>
        <div>materialRefs: {{ referenceCheck.materialCodeRefs.length }}</div>
        <div v-if="referenceCheck.hasIssues" class="text-amber-700">存在主数据引用问题</div>
      </CardContent>
      <CardContent class="p-4 flex items-center gap-2">
        <div class="relative w-full max-w-sm">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input v-model="searchQuery" placeholder="搜索物料编码、名称..." class="pl-8" @keyup.enter="fetchMaterials" />
        </div>
        <Button variant="outline" @click="fetchMaterials">搜索</Button>
      </CardContent>
    </Card>

    <MaterialSummaryCards :health="relationshipHealth" />

    <MaterialDiagnosticsPanel
      :reference-check="referenceCheck"
      :relationship-health="relationshipHealth"
      :actionable-groups="actionableRelationshipGroups"
      @auto-relink="autoRelinkMaterial"
      @open-edit="openEditDialog"
    />

    <MaterialAuditPanel :audit-logs="auditLogs" />

    <Card class="flex-1 min-h-0">
      <CardContent class="p-0 h-full overflow-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-muted-foreground bg-muted/50 sticky top-0">
            <tr>
              <th class="px-6 py-3">编码</th>
              <th class="px-6 py-3">名称</th>
              <th class="px-6 py-3">型号</th>
              <th class="px-6 py-3">分类</th>
              <th class="px-6 py-3">供应商</th>
              <th class="px-6 py-3">供应商主数据</th>
              <th class="px-6 py-3">单价</th>
              <th class="px-6 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mat in materials" :key="mat.id" class="bg-background border-b hover:bg-muted/40 transition-colors">
              <td class="px-6 py-4 font-medium">{{ mat.code }}</td>
              <td class="px-6 py-4 text-muted-foreground">{{ mat.name }}</td>
              <td class="px-6 py-4 text-muted-foreground">{{ mat.model }}</td>
              <td class="px-6 py-4 text-muted-foreground">{{ mat.category }}</td>
              <td class="px-6 py-4 text-muted-foreground">{{ mat.supplier }}</td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium border"
                  :class="mat.supplier_master_id ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'"
                >
                  {{ mat.supplier_master_id ? `已关联 #${mat.supplier_master_id}` : '未关联' }}
                </span>
                <div v-if="mat.supplierMaster" class="mt-1 text-xs text-muted-foreground">
                  {{ mat.supplierMaster.supplier_name }} · {{ mat.supplierMaster.status }}
                </div>
              </td>
              <td class="px-6 py-4 text-emerald-600 font-semibold">¥{{ mat.price }}</td>
              <td class="px-6 py-4">
                <Button variant="ghost" size="sm" @click="openEditDialog(mat)">
                  <Edit2 class="h-4 w-4" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="materials.length === 0 && !loading" class="p-8 text-center text-muted-foreground">
          暂无数据
        </div>
      </CardContent>
    </Card>

    <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{{ dialogTitle }}</DialogTitle>
          <DialogDescription>
            请完善物料的基础信息。
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="code" class="text-right">编码</Label>
            <Input id="code" v-model="editingMaterial.code" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="name" class="text-right">名称</Label>
            <Input id="name" v-model="editingMaterial.name" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="model" class="text-right">型号</Label>
            <Input id="model" v-model="editingMaterial.model" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="supplier" class="text-right">供应商</Label>
            <Input id="supplier" v-model="editingMaterial.supplier" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">主数据链接</Label>
            <div class="col-span-3 text-sm text-muted-foreground">
                <template v-if="editingMaterial.supplier_master_id">
                  已关联 supplier_master #{{ editingMaterial.supplier_master_id }}
                  <span v-if="editingMaterial.supplierMaster">（{{ editingMaterial.supplierMaster.supplier_name }}）</span>
                </template>
                <template v-else>
                  保存后按供应商名称自动尝试关联
              </template>
            </div>
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">手动关联</Label>
            <select v-model="editingMaterial.supplier_master_id" class="col-span-3 h-9 rounded-md border bg-background px-3 text-sm">
              <option :value="null">自动匹配 / 不指定</option>
              <option v-for="supplier in supplierMasterOptions" :key="supplier.id" :value="supplier.id">
                {{ supplier.supplierName }} (#{{ supplier.id }})
              </option>
            </select>
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="price" class="text-right">单价</Label>
            <Input id="price" type="number" v-model="editingMaterial.price" class="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" @click="saveMaterial">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </ConfigCenterShell>
</template>
