<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface ContractRow {
  id: number;
  contract_code: string;
  customer_name?: string;
  total_amount?: number;
  last_fetched_at: string;
  payload_hash: string;
  raw_json: any;
}

const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const rows = ref<ContractRow[]>([]);
const expandedCode = ref<string | null>(null);

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

    if (expandedCode.value && !rows.value.some(r => r.contract_code === expandedCode.value)) {
      expandedCode.value = null;
    }
  } catch (e) {
    console.error('Failed to fetch cached contracts', e);
  } finally {
    loading.value = false;
  }
}

function toggleExpand(code: string) {
  expandedCode.value = expandedCode.value === code ? null : code;
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
        <div class="w-[240px]">
          <label class="block text-xs text-muted-foreground mb-1">合同号</label>
          <Input v-model="filters.code" placeholder="如 202512260031" />
        </div>
        <div class="w-[240px]">
          <label class="block text-xs text-muted-foreground mb-1">客户名称</label>
          <Input v-model="filters.customer" placeholder="如 外贸程总" />
        </div>
        <Button @click="fetchContracts(true)" :disabled="loading">{{ loading ? '查询中...' : '查询' }}</Button>
        <Button variant="outline" @click="filters.code=''; filters.customer=''; fetchContracts(true)">重置</Button>
      </CardContent>
    </Card>

    <Card class="flex-1 min-h-0">
      <CardContent class="p-4 h-full overflow-auto">
        <div class="text-sm text-muted-foreground mb-3">
          共 {{ total }} 条，页 {{ page }}/{{ totalPages }}
        </div>

        <div v-if="rows.length === 0" class="text-sm text-muted-foreground py-10 text-center">
          暂无历史合同数据
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="row in rows"
            :key="row.id"
            class="border rounded-lg p-3 bg-card"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="text-sm">
                <div class="font-semibold">{{ row.contract_code }}</div>
                <div class="text-muted-foreground">{{ row.customer_name || '-' }}</div>
              </div>
              <div class="text-sm text-right">
                <div class="font-medium">¥{{ Number(row.total_amount || 0).toLocaleString() }}</div>
                <div class="text-muted-foreground">{{ new Date(row.last_fetched_at).toLocaleString() }}</div>
              </div>
            </div>

            <div class="mt-2 flex items-center justify-between">
              <div class="text-xs text-muted-foreground">Hash: {{ row.payload_hash.slice(0, 16) }}...</div>
              <Button size="sm" variant="outline" @click="toggleExpand(row.contract_code)">
                {{ expandedCode === row.contract_code ? '收起 JSON' : '查看 JSON' }}
              </Button>
            </div>

            <div v-if="expandedCode === row.contract_code" class="mt-3">
              <pre class="text-xs bg-muted/50 border rounded-md p-3 overflow-auto">{{ JSON.stringify(row.raw_json, null, 2) }}</pre>
            </div>
          </div>
        </div>

        <div class="pt-4 flex gap-2 justify-end">
          <Button size="sm" variant="outline" @click="prevPage" :disabled="page<=1 || loading">上一页</Button>
          <Button size="sm" variant="outline" @click="nextPage" :disabled="page>=totalPages || loading">下一页</Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
