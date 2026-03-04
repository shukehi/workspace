<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import FormulaListPanel from '@/features/formulas/components/FormulaListPanel.vue';
import FormulaEditorHeader from '@/features/formulas/components/FormulaEditorHeader.vue';
import FormulaBomTable from '@/features/formulas/components/FormulaBomTable.vue';
import { useFormulaManager } from '@/features/formulas/composables/useFormulaManager';

const manager = reactive(useFormulaManager());

onMounted(() => {
  manager.initialize();
});
</script>

<template>
  <div class="h-full p-6 md:p-8 bg-muted/20 flex flex-col gap-4 overflow-hidden">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">配方管理</h1>
        <p class="text-sm text-muted-foreground mt-1">草稿编辑、发布、生效与版本回滚</p>
      </div>
    </div>

    <Card>
      <CardContent class="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
        <Input v-model="manager.keyword" placeholder="搜索配方编码/名称" class="lg:col-span-6" />
        <select v-model="manager.statusFilter" class="h-9 rounded-md border bg-background px-3 text-sm lg:col-span-2">
          <option value="">全部状态</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
        <div class="lg:col-span-4"></div>
        <Button class="lg:col-span-2" @click="manager.createFormula">+ 新增配方</Button>
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
                <Input v-model="manager.detail.formulaKey" @update:model-value="manager.markDirty" />
                <p v-if="manager.validationErrors.formulaKey" class="text-xs text-rose-600 mt-1">{{ manager.validationErrors.formulaKey }}</p>
              </div>
              <div>
                <div class="text-xs text-muted-foreground mb-1">配方名称</div>
                <Input v-model="manager.detail.displayName" @update:model-value="manager.markDirty" />
                <p v-if="manager.validationErrors.displayName" class="text-xs text-rose-600 mt-1">{{ manager.validationErrors.displayName }}</p>
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
  </div>
</template>
