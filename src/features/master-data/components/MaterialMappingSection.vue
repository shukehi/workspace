<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MaterialRecord } from '@/features/materials/composables/useMaterialManagementPageState';
import type {
  CreateCodeMappingPayload,
  CreateSupplierMappingPayload,
  CreateUomConversionPayload,
  MaterialCodeMappingRecord,
  MaterialCodeMappingType,
  MaterialMappingsPayload,
  MaterialSupplierMappingRecord,
  MaterialUomConversionRecord,
  UpdateCodeMappingPayload,
  UpdateSupplierMappingPayload,
  UpdateUomConversionPayload,
} from '@/services/materialMappingApi';

const props = defineProps<{
  material: MaterialRecord | null
  mappings: MaterialMappingsPayload | null
  loading: boolean
  error: string
  supplierMasterOptions: Array<{ id: number; supplierName: string }>
}>();

const emit = defineEmits<{
  (e: 'refresh', materialId: number): void
  (e: 'create-supplier', materialId: number, payload: CreateSupplierMappingPayload): void
  (e: 'update-supplier', materialId: number, mappingId: number, payload: UpdateSupplierMappingPayload): void
  (e: 'create-code', materialId: number, payload: CreateCodeMappingPayload): void
  (e: 'update-code', materialId: number, mappingId: number, payload: UpdateCodeMappingPayload): void
  (e: 'create-uom', materialId: number, payload: CreateUomConversionPayload): void
  (e: 'update-uom', materialId: number, conversionId: number, payload: UpdateUomConversionPayload): void
}>();

type SupplierDraft = {
  supplier_master_id: string;
  supplier_code: string;
  purchase_unit: string;
  stock_unit: string;
  conversion_factor: number;
  is_default: boolean;
};

type CodeDraft = {
  mapping_type: MaterialCodeMappingType;
  external_code: string;
  priority: number;
};

type UomDraft = {
  from_unit: string;
  to_unit: string;
  factor: number;
  is_purchase_default: boolean;
};

const supplierMappings = computed(() => props.mappings?.supplierMappings || []);
const codeMappings = computed(() => props.mappings?.codeMappings || []);
const uomConversions = computed(() => props.mappings?.uomConversions || []);

const supplierDraft = ref<SupplierDraft>(createSupplierDraft());
const codeDraft = ref<CodeDraft>(createCodeDraft());
const uomDraft = ref<UomDraft>(createUomDraft());

watch(() => props.material?.id, () => {
  supplierDraft.value = createSupplierDraft();
  codeDraft.value = createCodeDraft();
  uomDraft.value = createUomDraft();
});

function materialUnit() {
  return String(props.material?.unit || '').trim().toUpperCase();
}

function createSupplierDraft(): SupplierDraft {
  const unit = materialUnit();
  return {
    supplier_master_id: '',
    supplier_code: '',
    purchase_unit: unit,
    stock_unit: unit,
    conversion_factor: 1,
    is_default: false,
  };
}

function createCodeDraft(): CodeDraft {
  return { mapping_type: 'alias', external_code: '', priority: 100 };
}

function createUomDraft(): UomDraft {
  const unit = materialUnit();
  return { from_unit: unit, to_unit: unit, factor: 1, is_purchase_default: false };
}

function requireMaterialId(): number | null {
  return props.material?.id ?? null;
}

function normalizePositiveNumber(value: unknown, fallback = 1): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function submitSupplierMapping() {
  const materialId = requireMaterialId();
  if (materialId == null || !supplierDraft.value.supplier_code.trim()) return;
  emit('create-supplier', materialId, {
    supplier_master_id: supplierDraft.value.supplier_master_id ? Number(supplierDraft.value.supplier_master_id) : null,
    supplier_code: supplierDraft.value.supplier_code.trim(),
    purchase_unit: supplierDraft.value.purchase_unit.trim() || undefined,
    stock_unit: supplierDraft.value.stock_unit.trim() || undefined,
    conversion_factor: normalizePositiveNumber(supplierDraft.value.conversion_factor),
    is_default: supplierDraft.value.is_default,
  });
  supplierDraft.value = createSupplierDraft();
}

function submitCodeMapping() {
  const materialId = requireMaterialId();
  if (materialId == null || !codeDraft.value.external_code.trim()) return;
  emit('create-code', materialId, {
    mapping_type: codeDraft.value.mapping_type,
    external_code: codeDraft.value.external_code.trim(),
    priority: Number.isFinite(Number(codeDraft.value.priority)) ? Number(codeDraft.value.priority) : 100,
  });
  codeDraft.value = createCodeDraft();
}

function submitUomConversion() {
  const materialId = requireMaterialId();
  if (materialId == null || !uomDraft.value.from_unit.trim() || !uomDraft.value.to_unit.trim()) return;
  emit('create-uom', materialId, {
    from_unit: uomDraft.value.from_unit.trim(),
    to_unit: uomDraft.value.to_unit.trim(),
    factor: normalizePositiveNumber(uomDraft.value.factor),
    is_purchase_default: uomDraft.value.is_purchase_default,
  });
  uomDraft.value = createUomDraft();
}

function toggleSupplier(mapping: MaterialSupplierMappingRecord) {
  const materialId = requireMaterialId();
  if (materialId == null) return;
  emit('update-supplier', materialId, mapping.id, { is_active: !mapping.is_active });
}

function toggleCode(mapping: MaterialCodeMappingRecord) {
  const materialId = requireMaterialId();
  if (materialId == null) return;
  emit('update-code', materialId, mapping.id, { is_active: !mapping.is_active });
}

function toggleUom(conversion: MaterialUomConversionRecord) {
  const materialId = requireMaterialId();
  if (materialId == null) return;
  emit('update-uom', materialId, conversion.id, { is_active: !conversion.is_active });
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm">
      <div>
        <div class="font-medium">物料映射</div>
        <div class="text-muted-foreground">维护供应商料号、别名/条码/历史编码与单位换算。</div>
      </div>
      <Button v-if="material" size="sm" variant="outline" :disabled="loading" @click="emit('refresh', material.id)">
        {{ loading ? '加载中...' : '刷新映射' }}
      </Button>
    </div>

    <div v-if="error" class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {{ error }}
    </div>

    <div v-if="!material" class="text-sm text-muted-foreground">选择物料后可维护映射。</div>

    <template v-else>
      <Card>
        <CardHeader>
          <CardTitle class="text-base">供应商料号</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <div class="grid gap-2 md:grid-cols-[1fr_1.2fr_0.8fr_0.8fr_0.7fr_auto] md:items-end">
            <div class="space-y-1">
              <Label>Supplier Master</Label>
              <select v-model="supplierDraft.supplier_master_id" class="h-9 w-full rounded-md border bg-background px-2 text-sm">
                <option value="">不指定</option>
                <option v-for="supplier in supplierMasterOptions" :key="supplier.id" :value="String(supplier.id)">
                  {{ supplier.supplierName }} (#{{ supplier.id }})
                </option>
              </select>
            </div>
            <div class="space-y-1">
              <Label>供应商料号</Label>
              <Input v-model="supplierDraft.supplier_code" placeholder="外部编码" />
            </div>
            <div class="space-y-1">
              <Label>采购单位</Label>
              <Input v-model="supplierDraft.purchase_unit" placeholder="BOX" />
            </div>
            <div class="space-y-1">
              <Label>库存单位</Label>
              <Input v-model="supplierDraft.stock_unit" placeholder="PCS" />
            </div>
            <div class="space-y-1">
              <Label>换算</Label>
              <Input v-model.number="supplierDraft.conversion_factor" type="number" min="0.000001" step="0.000001" />
            </div>
            <Button size="sm" :disabled="!supplierDraft.supplier_code.trim()" @click="submitSupplierMapping">新增</Button>
          </div>
          <label class="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input v-model="supplierDraft.is_default" type="checkbox" class="h-4 w-4 rounded border" /> 默认供应商映射
          </label>

          <div class="space-y-2">
            <div v-if="supplierMappings.length === 0" class="rounded-md border border-dashed px-3 py-2 text-muted-foreground">
              暂无供应商料号映射。
            </div>
            <div v-for="mapping in supplierMappings" :key="mapping.id" class="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
              <div>
                <div class="font-medium">{{ mapping.supplier_code }} <span class="text-xs text-muted-foreground">#{{ mapping.id }}</span></div>
                <div class="text-xs text-muted-foreground">
                  supplier #{{ mapping.supplier_master_id || '未指定' }} · {{ mapping.purchase_unit || '-' }} → {{ mapping.stock_unit || '-' }} × {{ mapping.conversion_factor }}
                  <span v-if="mapping.is_default"> · 默认</span>
                </div>
              </div>
              <Button size="sm" variant="outline" @click="toggleSupplier(mapping)">{{ mapping.is_active ? '禁用' : '启用' }}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">别名 / 条码 / 历史编码</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <div class="grid gap-2 md:grid-cols-[0.8fr_1.4fr_0.6fr_auto] md:items-end">
            <div class="space-y-1">
              <Label>类型</Label>
              <select v-model="codeDraft.mapping_type" class="h-9 w-full rounded-md border bg-background px-2 text-sm">
                <option value="internal_code">内部编码</option>
                <option value="alias">别名</option>
                <option value="barcode">条码</option>
                <option value="legacy_code">历史编码</option>
                <option value="supplier_code">供应商编码</option>
              </select>
            </div>
            <div class="space-y-1">
              <Label>外部编码</Label>
              <Input v-model="codeDraft.external_code" placeholder="可被解析的编码" />
            </div>
            <div class="space-y-1">
              <Label>优先级</Label>
              <Input v-model.number="codeDraft.priority" type="number" />
            </div>
            <Button size="sm" :disabled="!codeDraft.external_code.trim()" @click="submitCodeMapping">新增</Button>
          </div>

          <div class="space-y-2">
            <div v-if="codeMappings.length === 0" class="rounded-md border border-dashed px-3 py-2 text-muted-foreground">
              暂无通用编码映射。
            </div>
            <div v-for="mapping in codeMappings" :key="mapping.id" class="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
              <div>
                <div class="font-medium">{{ mapping.external_code }} <span class="text-xs text-muted-foreground">{{ mapping.mapping_type }}</span></div>
                <div class="text-xs text-muted-foreground">normalized: {{ mapping.normalized_code }} · priority {{ mapping.priority }}</div>
              </div>
              <Button size="sm" variant="outline" @click="toggleCode(mapping)">{{ mapping.is_active ? '禁用' : '启用' }}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">单位换算</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <div class="grid gap-2 md:grid-cols-[1fr_1fr_0.8fr_auto] md:items-end">
            <div class="space-y-1">
              <Label>采购/来源单位</Label>
              <Input v-model="uomDraft.from_unit" placeholder="BOX" />
            </div>
            <div class="space-y-1">
              <Label>库存单位</Label>
              <Input v-model="uomDraft.to_unit" placeholder="PCS" />
            </div>
            <div class="space-y-1">
              <Label>换算系数</Label>
              <Input v-model.number="uomDraft.factor" type="number" min="0.000001" step="0.000001" />
            </div>
            <Button size="sm" :disabled="!uomDraft.from_unit.trim() || !uomDraft.to_unit.trim()" @click="submitUomConversion">新增</Button>
          </div>
          <label class="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input v-model="uomDraft.is_purchase_default" type="checkbox" class="h-4 w-4 rounded border" /> 默认采购换算
          </label>

          <div class="space-y-2">
            <div v-if="uomConversions.length === 0" class="rounded-md border border-dashed px-3 py-2 text-muted-foreground">
              暂无单位换算。
            </div>
            <div v-for="conversion in uomConversions" :key="conversion.id" class="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
              <div>
                <div class="font-medium">{{ conversion.from_unit }} → {{ conversion.to_unit }} × {{ conversion.factor }}</div>
                <div class="text-xs text-muted-foreground">
                  <span v-if="conversion.is_purchase_default">默认采购换算</span>
                  <span v-else>普通换算</span>
                </div>
              </div>
              <Button size="sm" variant="outline" @click="toggleUom(conversion)">{{ conversion.is_active ? '禁用' : '启用' }}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
