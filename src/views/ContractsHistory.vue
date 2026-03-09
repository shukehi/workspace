<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/lib/api';
import { useSourceStore } from '@/stores/useSourceStore';
import { useToastStore } from '@/stores/useToastStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { Search, User, Loader2, Code, Download, Copy, Check, Trash2 } from 'lucide-vue-next';

interface ContractRow {
  id: number;
  contract_code: string;
  customer_name?: string;
  total_amount?: number;
  last_fetched_at: string;
  payload_hash: string;
  raw_json: any;
}

const router = useRouter();
const sourceStore = useSourceStore();
const { toast } = useToastStore();

const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const rows = ref<ContractRow[]>([]);

const jsonDialogOpen = ref(false);
const activeJsonContract = ref<ContractRow | null>(null);
const copied = ref(false);
const loadingContractId = ref<string | null>(null);

const deleteConfirmOpen = ref(false);
const isDeleting = ref(false);
const contractToDelete = ref<ContractRow | null>(null);

const filters = ref({
  code: '',
  customer: ''
});

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

async function fetchContracts(resetPage = false) {
  if (resetPage) page.value = 1;
  loading.value = true;
  try {
    const res = await api.get<any>('/contracts', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        code: filters.value.code || undefined,
        customer: filters.value.customer || undefined
      }
    });

    rows.value = Array.isArray(res?.rows) ? res.rows : [];
    total.value = Number(res?.total || 0);

  } catch (e) {
    console.error('Failed to fetch cached contracts', e);
    toast({
      title: '查询失败',
      description: '无法获取历史合同列表，请稍后重试',
      variant: 'destructive'
    });
  } finally {
    loading.value = false;
  }
}

function viewJson(row: ContractRow) {
  activeJsonContract.value = row;
  jsonDialogOpen.value = true;
}

async function copyJson() {
  if (!activeJsonContract.value) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(activeJsonContract.value.raw_json, null, 2));
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
    toast({ title: '复制成功', variant: 'success' });
  } catch (e) {
    toast({ title: '复制失败', variant: 'destructive' });
  }
}

async function loadContract(code: string) {
  loadingContractId.value = code;
  try {
    await sourceStore.loadHistoryContractByCode(code);
    toast({
      title: '加载成功',
      description: `合同 ${code} 已成功载入数据源`,
      variant: 'success'
    });
    router.push('/source');
  } catch (e: any) {
    toast({
      title: '加载失败',
      description: e.message || '由于未知错误无法加载该合同',
      variant: 'destructive'
    });
  } finally {
    loadingContractId.value = null;
  }
}

function promptDelete(row: ContractRow) {
  contractToDelete.value = row;
  deleteConfirmOpen.value = true;
}

async function handleDelete() {
  if (!contractToDelete.value) return;
  isDeleting.value = true;
  try {
    await api.delete(`/contracts/${contractToDelete.value.contract_code}`);
    toast({
      title: '删除成功',
      description: `合同 ${contractToDelete.value.contract_code} 已删除`,
      variant: 'success'
    });
    deleteConfirmOpen.value = false;
    // Re-fetch current page or earlier if the page becomes empty
    if (rows.value.length === 1 && page.value > 1) {
      page.value -= 1;
    }
    fetchContracts();
  } catch (e: any) {
    toast({
      title: '删除失败',
      description: e.message || '由于未知错误无法删除合同',
      variant: 'destructive'
    });
  } finally {
    isDeleting.value = false;
  }
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value += 1;
    fetchContracts();
  }
}

function prevPage() {
  if (page.value > 1) {
    page.value -= 1;
    fetchContracts();
  }
}

function formatJsonSummary(json: any) {
  if (!json || !Array.isArray(json.list)) return '无法解析的结构';
  return `包含 ${json.list.length} 个物料明细`;
}

onMounted(() => {
  fetchContracts(true);
});
</script>

<template>
  <div class="h-full flex flex-col p-6 md:p-8 gap-6 bg-muted/20">
    <div>
      <h2 class="text-3xl font-semibold tracking-tight">历史合同</h2>
      <p class="text-muted-foreground mt-1 text-sm">ERP contract snapshots</p>
    </div>

    <Card>
      <CardContent class="p-4 flex flex-wrap items-end gap-3">
        <div class="relative w-[240px]">
          <label class="block text-xs text-muted-foreground mb-1">合同号</label>
          <Search class="absolute left-3 top-[28px] h-4 w-4 text-muted-foreground" />
          <Input 
            v-model="filters.code" 
            placeholder="如 202512260031"
            class="pl-9"
            @keyup.enter="fetchContracts(true)" 
          />
        </div>
        <div class="relative w-[240px]">
          <label class="block text-xs text-muted-foreground mb-1">客户名称</label>
          <User class="absolute left-3 top-[28px] h-4 w-4 text-muted-foreground" />
          <Input 
            v-model="filters.customer" 
            placeholder="如 外贸程总"
            class="pl-9"
            @keyup.enter="fetchContracts(true)"
          />
        </div>
        <Button @click="fetchContracts(true)" :disabled="loading">
          <Loader2 v-if="loading" class="w-4 h-4 mr-2 animate-spin" />
          <Search v-else class="w-4 h-4 mr-2" />
          查询
        </Button>
        <Button variant="outline" @click="filters.code=''; filters.customer=''; fetchContracts(true)" :disabled="loading" class="px-3">
          重置
        </Button>
      </CardContent>
    </Card>

    <Card class="flex-1 min-h-0 flex flex-col">
      <CardContent class="p-0 flex-1 flex flex-col overflow-hidden">
        <div class="px-4 py-3 border-b flex justify-between items-center bg-card shrink-0">
          <div class="text-xs text-muted-foreground">
            共查询到 <span class="font-medium text-foreground">{{ total }}</span> 条历史快照
          </div>
        </div>

        <div class="flex-1 overflow-auto">
          <Table>
            <TableHeader class="sticky top-0 bg-muted/40 backdrop-blur z-10 border-b">
              <TableRow>
                <TableHead class="w-[180px]">合同编号</TableHead>
                <TableHead>客户名称</TableHead>
                <TableHead>摘要信息</TableHead>
                <TableHead class="w-[160px]">抓取时间</TableHead>
                <TableHead class="text-right w-[200px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="rows.length > 0">
                <TableRow v-for="row in rows" :key="row.id" class="group">
                  <TableCell class="font-medium">{{ row.contract_code }}</TableCell>
                  <TableCell>{{ row.customer_name || '-' }}</TableCell>
                  <TableCell class="text-muted-foreground text-xs">{{ formatJsonSummary(row.raw_json) }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ new Date(row.last_fetched_at).toLocaleString() }}</TableCell>
                  <TableCell class="text-right">
                    <div class="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" class="h-8 px-2" @click="viewJson(row)">
                        <Code class="w-4 h-4 mr-1" />
                        JSON
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        class="h-8 px-3" 
                        :disabled="loadingContractId === row.contract_code"
                        @click="loadContract(row.contract_code)"
                      >
                        <Loader2 v-if="loadingContractId === row.contract_code" class="w-3 h-3 mr-1.5 animate-spin" />
                        <Download v-else class="w-3 h-3 mr-1.5" />
                        载入此单
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        class="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10" 
                        @click="promptDelete(row)"
                      >
                        <Trash2 class="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>
              <template v-else>
                <TableRow>
                  <TableCell colspan="5" class="h-48 text-center text-muted-foreground">
                    <div class="flex flex-col items-center justify-center gap-2">
                      <Search class="w-8 h-8 text-muted-foreground/50" />
                      <p>未找到匹配的历史合同</p>
                    </div>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>

        <div class="px-4 py-3 border-t shrink-0 flex items-center justify-between bg-card text-sm">
           <div class="text-muted-foreground">
             页码：{{ page }} / {{ totalPages }}
           </div>
           <div class="flex items-center gap-2">
            <Button size="sm" variant="outline" @click="prevPage" :disabled="page<=1 || loading">上一页</Button>
            <Button size="sm" variant="outline" @click="nextPage" :disabled="page>=totalPages || loading">下一页</Button>
           </div>
        </div>
      </CardContent>
    </Card>

    <Dialog v-model:open="jsonDialogOpen">
      <DialogContent class="max-w-3xl max-h-[85vh] flex flex-col p-0">
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
        <div class="flex-1 overflow-auto p-4 bg-muted/10 relative group">
          <Button
            size="sm"
            variant="secondary"
            class="absolute top-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity"
            @click="copyJson"
          >
            <Check v-if="copied" class="w-4 h-4 mr-2" />
            <Copy v-else class="w-4 h-4 mr-2" />
            {{ copied ? '已复制' : '复制代码' }}
          </Button>
          <pre class="text-xs bg-background p-4 rounded-md border shadow-sm font-mono whitespace-pre-wrap word-break-all">{{ activeJsonContract ? JSON.stringify(activeJsonContract.raw_json, null, 2) : '' }}</pre>
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      v-model:open="deleteConfirmOpen"
      title="确认删除合同"
      variant="danger"
      confirm-text="确认删除"
      :loading="isDeleting"
      @confirm="handleDelete"
    >
      <div v-if="contractToDelete">
        您确定要永久删除合同 <span class="font-bold text-foreground">{{ contractToDelete.contract_code }}</span> 吗？此操作无法撤销。
      </div>
    </ConfirmDialog>
  </div>
</template>
