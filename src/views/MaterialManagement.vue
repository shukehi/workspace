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

    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent class="p-4 space-y-1">
          <div class="text-sm text-muted-foreground">物料总数</div>
          <div class="text-2xl font-semibold">{{ relationshipHealth.totalMaterials }}</div>
          <div class="text-xs text-muted-foreground">当前列表中的主数据物料条目</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-4 space-y-1">
          <div class="text-sm text-muted-foreground">已正式链接</div>
          <div class="text-2xl font-semibold text-emerald-700">{{ relationshipHealth.linkedMaterialCount }}</div>
          <div class="text-xs text-muted-foreground">已关联 Supplier Master 的物料数</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-4 space-y-1">
          <div class="text-sm text-muted-foreground">关系异常数</div>
          <div class="text-2xl font-semibold text-amber-700">
            {{ relationshipHealth.unlinkedMaterialCount + relationshipHealth.inactiveSupplierLinkedMaterialCount }}
          </div>
          <div class="text-xs text-muted-foreground">未关联 / 链接到 inactive Supplier Master</div>
        </CardContent>
      </Card>
    </div>

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
      v-if="actionableRelationshipGroups.autoFixCandidates.length > 0 || actionableRelationshipGroups.manualReviewCandidates.length > 0"
      class="grid gap-4 md:grid-cols-2"
    >
      <Card v-if="actionableRelationshipGroups.autoFixCandidates.length > 0">
        <CardHeader>
          <CardTitle>可自动修复</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-sm">
          <div
            v-for="item in actionableRelationshipGroups.autoFixCandidates"
            :key="`auto-fix-${item.id}`"
            class="rounded-md border bg-background px-3 py-2"
          >
            <div class="font-medium">{{ item.code }} · {{ item.name }}</div>
            <div class="text-muted-foreground">
              {{ item.supplier }} → 建议关联 {{ item.suggestedSupplierMaster?.supplierName }}
            </div>
            <div class="mt-2">
              <Button size="sm" variant="outline" @click="autoRelinkMaterial(item)">
                自动重连
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card v-if="actionableRelationshipGroups.manualReviewCandidates.length > 0">
        <CardHeader>
          <CardTitle>需人工处理</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-sm">
          <div
            v-for="item in actionableRelationshipGroups.manualReviewCandidates"
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
              <Button size="sm" variant="outline" @click="openEditDialog(item)">
                打开编辑
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

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
