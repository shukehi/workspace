<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { useSourceStore } from '@/stores/useSourceStore';
import type { ContractHistoryRow } from '@/types/source';
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
import CodeMirrorEditor from '@/components/ui/CodeMirrorEditor.vue';
import { Code, Copy, Check, Search, User, Loader2 } from 'lucide-vue-next';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'loaded', contractCode: string): void;
}>();

const store = useSourceStore();

const totalPages = computed(() => store.historyTotalPages);

const jsonDialogOpen = ref(false);
const activeJsonContract = ref<ContractHistoryRow | null>(null);
const copied = ref(false);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    store.historySelected = null;
    store.fetchHistoryContracts(true);
  }
);

function resetFilters() {
  store.historyFilters.code = '';
  store.historyFilters.customer = '';
  store.fetchHistoryContracts(true);
}

function selectRow(row: ContractHistoryRow) {
  store.historySelected = row;
}

function prevPage() {
  if (store.historyPage <= 1) return;
  store.historyPage -= 1;
  store.fetchHistoryContracts();
}

function nextPage() {
  if (store.historyPage >= totalPages.value) return;
  store.historyPage += 1;
  store.fetchHistoryContracts();
}

function handleClose() {
  emit('update:open', false);
}

async function handleLoadSelected() {
  const selected = store.historySelected;
  if (!selected) return;

  if (store.hasOrder) {
    const shouldReplace = window.confirm('当前页面已有合同数据，继续将覆盖当前内容。是否继续？');
    if (!shouldReplace) return;
  }

  try {
    await store.loadHistoryContractByCode(selected.contract_code);
    emit('loaded', selected.contract_code);
    emit('update:open', false);
  } catch (e: any) {
    const message = e?.message || store.error || '历史合同加载失败，请稍后重试';
    window.alert(message);
  }
}

function viewJson(row: ContractHistoryRow) {
  activeJsonContract.value = row;
  jsonDialogOpen.value = true;
}

async function copyJson() {
  if (!activeJsonContract.value) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(activeJsonContract.value.raw_json, null, 2));
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch (e) {
    console.error('Copy failed', e);
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[760px]">
      <DialogHeader>
        <DialogTitle>历史合同</DialogTitle>
        <DialogDescription>选择一个历史合同并加载到当前合同查询表格。</DialogDescription>
      </DialogHeader>

      <div class="space-y-3">
        <div class="flex flex-wrap items-end gap-2">
          <div class="w-[220px]">
            <label class="block text-xs text-muted-foreground mb-1">合同号</label>
            <Input v-model="store.historyFilters.code" placeholder="如 202512260031" />
          </div>
          <div class="w-[220px]">
            <label class="block text-xs text-muted-foreground mb-1">客户名称</label>
            <Input v-model="store.historyFilters.customer" placeholder="如 外贸程总" />
          </div>
          <Button :disabled="store.historyLoading" @click="store.fetchHistoryContracts(true)">
            {{ store.historyLoading ? '查询中...' : '查询' }}
          </Button>
          <Button variant="outline" :disabled="store.historyLoading" @click="resetFilters">重置</Button>
        </div>

        <div class="rounded-md border">
          <div class="px-3 py-2 text-xs text-muted-foreground border-b">
            共 {{ store.historyTotal }} 条，页 {{ store.historyPage }}/{{ totalPages }}
          </div>

          <div v-if="store.historyLoading" class="p-4 text-sm text-muted-foreground">加载中...</div>
          <div v-else-if="store.historyRows.length === 0" class="p-4 text-sm text-muted-foreground">暂无历史合同数据</div>
          <div v-else class="max-h-[240px] overflow-auto p-2 space-y-2">
            <div
              v-for="row in store.historyRows"
              :key="row.id"
              class="w-full flex items-center justify-between border rounded-md p-3 transition-colors"
              :class="store.historySelected?.contract_code === row.contract_code ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'"
            >
              <div class="flex-1 cursor-pointer" @click="selectRow(row)">
                <div class="flex items-center justify-between gap-2">
                  <div>
                    <div class="text-sm font-medium">{{ row.contract_code }}</div>
                    <div class="text-xs text-muted-foreground">{{ row.customer_name || '-' }}</div>
                  </div>
                  <div class="text-xs text-muted-foreground mr-4">
                    {{ new Date(row.last_fetched_at).toLocaleString() }}
                  </div>
                </div>
              </div>
              <div class="shrink-0 flex items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  class="h-8 px-2" 
                  @click.stop="viewJson(row)"
                  :disabled="!row.raw_json"
                  title="查看 JSON"
                >
                  <Code class="w-4 h-4 mr-1 text-muted-foreground" />
                  <span class="text-xs text-muted-foreground">JSON</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" :disabled="store.historyPage <= 1 || store.historyLoading" @click="prevPage">上一页</Button>
          <Button size="sm" variant="outline" :disabled="store.historyPage >= totalPages || store.historyLoading" @click="nextPage">下一页</Button>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleClose">取消</Button>
        <Button :disabled="!store.historySelected || store.loading" @click="handleLoadSelected">
          <Loader2 v-if="store.loading" class="w-4 h-4 mr-2 animate-spin" />
          {{ store.loading ? '加载中...' : '加载该合同' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Nested JSON Viewer Dialog -->
  <Dialog v-model:open="jsonDialogOpen">
    <DialogContent class="max-w-3xl max-h-[85vh] flex flex-col p-0 z-[100]">
      <DialogHeader class="px-6 py-4 border-b shrink-0 bg-muted/20">
        <div class="flex items-start justify-between">
          <div>
            <DialogTitle>底层数据视图 (Raw JSON)</DialogTitle>
            <DialogDescription class="mt-1" v-if="activeJsonContract">
              合同号：{{ activeJsonContract.contract_code }} | 抓取于 {{ new Date(activeJsonContract.last_fetched_at).toLocaleString() }}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div class="flex-1 overflow-hidden p-0 bg-muted/10 relative group">
        <Button
          size="sm"
          variant="secondary"
          class="absolute top-4 right-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
          @click="copyJson"
        >
          <Check v-if="copied" class="w-4 h-4 mr-2" />
          <Copy v-else class="w-4 h-4 mr-2" />
          {{ copied ? '已复制' : '复制代码' }}
        </Button>
        <CodeMirrorEditor 
          class="h-[60vh] border-0"
          :model-value="activeJsonContract ? JSON.stringify(activeJsonContract.raw_json, null, 2) : ''"
          read-only
          :lint="false"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
