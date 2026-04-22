<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ConfigCenterShell from '@/features/config-editor/components/ConfigCenterShell.vue';
import MasterDataDiagnosticsSummaryCards from '@/features/master-data/components/MasterDataDiagnosticsSummaryCards.vue';
import { useMasterDataDiagnostics } from '@/features/master-data/composables/useMasterDataDiagnostics';
import type { MaterialMasterItem } from '@/services/materialMasterProfileApi';
import type { SupplierMasterEntry } from '@/services/mappingConfigApi';

const router = useRouter();
const {
  loading,
  loadError,
  relinkingMaterialId,
  materialIssues,
  supplierIssues,
  summary,
  load,
  autoRelinkMaterial,
} = useMasterDataDiagnostics();

onMounted(() => {
  void load();
});

function openMaterial(item: { id: number }, tab: 'basic' | 'relationship' | 'diagnostics' | 'audit' = 'diagnostics') {
  void router.push({
    name: 'material-master',
    query: {
      materialId: String(item.id),
      tab,
    },
  });
}

function openSupplier(item: SupplierMasterEntry, tab: 'basic' | 'materials' | 'diagnostics' | 'audit' = 'diagnostics') {
  if (!item.id) return;
  void router.push({
    name: 'config-suppliers',
    query: {
      supplierId: String(item.id),
      tab,
    },
  });
}

function jumpToSuggestedSupplier(item: MaterialMasterItem & { suggestedSupplierMaster?: { id?: number | null } | null }) {
  const supplierId = Number(item.suggestedSupplierMaster?.id || 0);
  if (!supplierId) return;
  void router.push({
    name: 'config-suppliers',
    query: {
      supplierId: String(supplierId),
      tab: 'materials',
    },
  });
}
</script>

<template>
  <ConfigCenterShell
    title="主数据统一诊断"
    description="聚合物料与供应商主数据异常，缩短发现问题到进入修复对象的路径。"
  >
    <template #header-right>
      <Button variant="outline" @click="load">刷新诊断</Button>
    </template>

    <MasterDataDiagnosticsSummaryCards :summary="summary" />

    <Card v-if="loadError">
      <CardContent class="p-4 text-sm text-destructive">{{ loadError }}</CardContent>
    </Card>

    <div class="grid gap-4 xl:grid-cols-2 items-start">
      <Card>
        <CardHeader>
          <CardTitle>物料异常</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div v-if="loading" class="text-muted-foreground">加载诊断中...</div>

          <div>
            <div class="font-medium mb-2">可自动修复</div>
            <div v-if="materialIssues.autoFixCandidates.length === 0" class="text-muted-foreground">暂无可自动修复的物料</div>
            <div
              v-for="item in materialIssues.autoFixCandidates.slice(0, 8)"
              :key="`auto-fix-${item.id}`"
              class="rounded-md border bg-background px-3 py-2 mb-2"
            >
              <div class="font-medium">{{ item.code }} · {{ item.name }}</div>
              <div class="text-muted-foreground">{{ item.supplier }} → {{ item.suggestedSupplierMaster?.supplierName }}</div>
              <div class="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" :disabled="relinkingMaterialId === item.id" @click="autoRelinkMaterial(item)">
                  自动重连
                </Button>
                <Button size="sm" variant="outline" @click="openMaterial(item, 'relationship')">查看物料详情</Button>
                <Button size="sm" variant="outline" @click="jumpToSuggestedSupplier(item)">查看供应商详情</Button>
              </div>
            </div>
          </div>

          <div>
            <div class="font-medium mb-2">需人工处理</div>
            <div v-if="materialIssues.manualReviewCandidates.length === 0" class="text-muted-foreground">暂无需人工处理的物料</div>
            <div
              v-for="item in materialIssues.manualReviewCandidates.slice(0, 8)"
              :key="`manual-review-${item.id}`"
              class="rounded-md border bg-background px-3 py-2 mb-2"
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
              <div class="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" @click="openMaterial(item, 'diagnostics')">查看物料详情</Button>
                <Button v-if="item.supplierMaster?.id" size="sm" variant="outline" @click="openSupplier({ id: item.supplierMaster.id } as SupplierMasterEntry, 'diagnostics')">
                  查看供应商详情
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>供应商异常</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div v-if="loading" class="text-muted-foreground">加载诊断中...</div>

          <div>
            <div class="font-medium mb-2">inactive 但仍有关联物料</div>
            <div v-if="supplierIssues.inactiveLinkedSuppliers.length === 0" class="text-muted-foreground">暂无 inactive 仍有关联物料的供应商</div>
            <div
              v-for="item in supplierIssues.inactiveLinkedSuppliers.slice(0, 8)"
              :key="`inactive-supplier-${item.normalizedName}`"
              class="rounded-md border bg-background px-3 py-2 mb-2"
            >
              <div class="font-medium">{{ item.supplierName }}</div>
              <div class="text-muted-foreground">已链接物料：{{ item.linkedMaterialCount }}</div>
              <div class="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" @click="openSupplier(item, 'materials')">查看供应商详情</Button>
              </div>
            </div>
          </div>

          <div>
            <div class="font-medium mb-2">需补充正式链接</div>
            <div v-if="supplierIssues.suppliersWithUnlinkedMaterials.length === 0" class="text-muted-foreground">暂无待补充正式链接的供应商</div>
            <div
              v-for="item in supplierIssues.suppliersWithUnlinkedMaterials.slice(0, 8)"
              :key="`supplier-unlinked-${item.normalizedName}`"
              class="rounded-md border bg-background px-3 py-2 mb-2"
            >
              <div class="font-medium">{{ item.supplierName }}</div>
              <div class="text-muted-foreground">物料数：{{ item.materialCount }} · 已链接：{{ item.linkedMaterialCount }}</div>
              <div class="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" @click="openSupplier(item, 'diagnostics')">查看供应商详情</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </ConfigCenterShell>
</template>
