<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import ConfigCenterShell from '@/features/config-editor/components/ConfigCenterShell.vue';
import FormulaListPanel from '@/features/formulas/components/FormulaListPanel.vue';
import FormulaEditorHeader from '@/features/formulas/components/FormulaEditorHeader.vue';
import FormulaBomTable from '@/features/formulas/components/FormulaBomTable.vue';

defineProps<{
  manager: any;
}>();
</script>

<template>
  <ConfigCenterShell
    title="配方管理"
    description="草稿编辑、发布、生效与版本回滚"
  >
    <template #header-extra>
      <div class="flex flex-wrap items-center gap-2">
        <div class="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
          profile: formulas
        </div>
        <div v-if="manager.collectionProfileDetail" class="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
          workflow: {{ manager.collectionProfileDetail.profile.workflowKind }}
        </div>
        <div v-if="manager.collectionProfileImpact" class="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
          changes: {{ manager.collectionProfileImpact.totalChanges }}
        </div>
      </div>
    </template>

    <Card>
      <CardContent class="p-4 flex items-center gap-3">
        <Button class="shrink-0" @click="manager.createFormula">+ 新增配方</Button>
        <Input v-model="manager.keyword" placeholder="搜索配方编码/名称" class="flex-1 min-w-0" />
        <select v-model="manager.statusFilter" class="h-9 w-[180px] shrink-0 rounded-md border bg-background px-3 text-sm">
          <option value="">全部状态</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
      </CardContent>
    </Card>

    <div class="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4 overflow-hidden">
      <FormulaListPanel
        :list="manager.list"
        :total="manager.displayTotal"
        :selected-key="manager.selectedKey"
        :loading="manager.loading"
        :loading-more="manager.loadingMore"
        :has-more="manager.hasMore"
        @select="manager.loadDetail"
        @load-more="manager.loadNextPage"
      />

      <Card class="xl:col-span-9 min-h-0 h-full overflow-hidden flex flex-col">
        <FormulaEditorHeader
          :history-open="manager.historyOpen"
          :draft-revision="manager.draftRevision"
          :published-revision="manager.publishedRevision"
          :revisions="manager.revisions"
          @update:history-open="manager.historyOpen = $event"
          @rollback="manager.rollbackFormula"
        />

        <CardContent class="p-4 space-y-4 overflow-auto flex-1 min-h-0">
          <div v-if="!manager.detail" class="text-sm text-muted-foreground">请选择左侧配方</div>

          <template v-else>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div class="text-xs text-muted-foreground mb-1">配方编码</div>
                <Input
                  v-model="manager.detail.formulaKey"
                  readonly
                  placeholder="保存后自动生成（FYYYYMMDD-####）"
                />
                <p class="text-xs text-muted-foreground mt-1">系统自动生成，不可手动修改</p>
                <p v-if="manager.validationErrors.formulaKey" class="text-xs text-rose-600 mt-1">{{ manager.validationErrors.formulaKey }}</p>
              </div>
              <div>
                <div class="text-xs text-muted-foreground mb-1">配方名称</div>
                <Input v-model="manager.detail.displayName" @update:model-value="manager.markDirty" />
                <p v-if="manager.validationErrors.displayName" class="text-xs text-rose-600 mt-1">{{ manager.validationErrors.displayName }}</p>
              </div>
            </div>

            <div class="rounded-md border bg-muted/20 p-3 space-y-2">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-medium">BOM 推荐候选</div>
                  <p class="text-xs text-muted-foreground">从已发布配方复制 BOM 到当前本地草稿；不会自动保存或发布。</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <select
                    v-model="manager.recommendationSourceKey"
                    class="h-9 min-w-[220px] rounded-md border bg-background px-3 text-sm"
                    :disabled="manager.recommendationLoading || manager.recommendationSources.length === 0"
                  >
                    <option value="">选择已发布配方</option>
                    <option
                      v-for="source in manager.recommendationSources"
                      :key="source.formulaKey"
                      :value="source.formulaKey"
                    >
                      {{ source.displayName }}（{{ source.formulaKey }}）
                    </option>
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    :disabled="!manager.detail || !manager.recommendationSourceKey || manager.recommendationLoading"
                    @click="manager.applyBomRecommendation"
                  >
                    {{ manager.recommendationLoading ? '读取中...' : '应用推荐 BOM' }}
                  </Button>
                </div>
              </div>
              <div v-if="manager.recommendation" class="text-xs text-muted-foreground space-y-1">
                <div>
                  来源：{{ manager.recommendation.source.displayName || manager.recommendation.source.formulaKey || '未选择' }}
                  · 置信度：{{ manager.recommendation.confidence }}
                  · {{ manager.recommendation.explanation }}
                </div>
                <ul v-if="manager.recommendation.warnings.length > 0" class="list-disc pl-5 text-amber-700">
                  <li v-for="warning in manager.recommendation.warnings" :key="`${warning.code}-${warning.field || warning.message}`">
                    {{ warning.message }}
                  </li>
                </ul>
              </div>
            </div>

            <FormulaBomTable
              :bom-draft="manager.bomDraft"
              :validation-errors="manager.validationErrors"
              :material-categories="manager.bomMaterialCategories"
              @dirty="manager.markDirty"
              @add-row="manager.addBomRow"
              @remove-row="manager.removeBomRow"
            />

            <div>
              <div class="text-xs text-muted-foreground mb-1">变更说明</div>
              <Textarea v-model="manager.changeNote" placeholder="本次变更说明（发布/回滚建议填写）" />
            </div>

            <div class="flex flex-wrap gap-2">
              <Button :disabled="manager.saving || !manager.detail" @click="manager.saveDraft">
                {{ manager.saving ? '保存中...' : '保存草稿' }}
              </Button>
              <Button :disabled="manager.publishing || !manager.draftRevision" variant="outline" @click="manager.publishFormula">
                {{ manager.publishing ? '发布中...' : '发布' }}
              </Button>
              <Button variant="outline" :disabled="!manager.detail || manager.isLocalDraftSelected" @click="manager.archiveFormula">归档</Button>
              <Button variant="destructive" :disabled="!manager.detail" @click="manager.deleteFormula">
                {{ manager.isLocalDraftSelected ? '取消新增' : '删除' }}
              </Button>
            </div>
          </template>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <Card v-if="manager.collectionProfileDiff">
        <CardHeader><CardTitle class="text-base">Collection Diff</CardTitle></CardHeader>
        <CardContent class="text-sm text-muted-foreground">
          <div>hasChanges: {{ manager.collectionProfileDiff.hasChanges }}</div>
          <div>items: {{ manager.collectionProfileDiff.items.length }}</div>
        </CardContent>
      </Card>
      <Card v-if="manager.collectionProfileImpact">
        <CardHeader><CardTitle class="text-base">Collection Impact</CardTitle></CardHeader>
        <CardContent class="text-sm text-muted-foreground">
          <div>totalChanges: {{ manager.collectionProfileImpact.totalChanges }}</div>
          <div>changed: {{ manager.collectionProfileImpact.counts.changed }}</div>
        </CardContent>
      </Card>
      <Card v-if="manager.collectionProfileReplay">
        <CardHeader><CardTitle class="text-base">Collection Replay</CardTitle></CardHeader>
        <CardContent class="text-sm text-muted-foreground">
          <div>sampleCount: {{ manager.collectionProfileReplay.sampleCount }}</div>
          <div>changedSampleCount: {{ manager.collectionProfileReplay.changedSampleCount }}</div>
        </CardContent>
      </Card>
      <Card v-if="manager.collectionProfileReferenceCheck">
        <CardHeader><CardTitle class="text-base">Collection Reference Check</CardTitle></CardHeader>
        <CardContent class="text-sm text-muted-foreground">
          <div>supplierRefs: {{ manager.collectionProfileReferenceCheck.supplierRefs.length }}</div>
          <div>materialRefs: {{ manager.collectionProfileReferenceCheck.materialCodeRefs.length }}</div>
          <div>supplierMaster: {{ manager.collectionSupplierMaster.length }}</div>
        </CardContent>
      </Card>
    </div>
  </ConfigCenterShell>
</template>
