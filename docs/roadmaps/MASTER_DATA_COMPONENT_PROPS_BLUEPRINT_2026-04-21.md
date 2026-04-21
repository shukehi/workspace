# 主数据组件 Props 蓝图（2026-04-21）

## 1. 目标

为主数据层前端拆分提供统一的 props / emits 草稿，降低组件拆分时的重复设计成本。

涉及页面：
- `MaterialManagement.vue`
- `SupplierMaster.vue`

---

## 2. Material 侧组件

### 2.1 `MaterialSummaryCards.vue`

#### Props
```ts
interface MaterialRelationshipHealth {
  totalMaterials: number
  linkedMaterialCount: number
  unlinkedMaterialCount: number
  inactiveSupplierLinkedMaterialCount: number
}

defineProps<{
  health: MaterialRelationshipHealth
}>()
```

#### Emits
- 无

---

### 2.2 `MaterialAuditPanel.vue`

#### Props
```ts
interface AuditLogItem {
  id: number
  action: string
  operator: string
  createdAt: string
  meta: Record<string, unknown>
}

defineProps<{
  auditLogs: AuditLogItem[]
}>()
```

#### Emits
- 无

---

### 2.3 `MaterialDiagnosticsPanel.vue`

#### Props
```ts
interface MaterialReferenceCheck {
  hasIssues: boolean
  supplierRefs: string[]
  materialCodeRefs: string[]
  missingMaterialCodes: string[]
  suppliersMissingInSupplierMaster: string[]
  supplierRefItems?: Array<{ path: string; value: string }>
}

interface MaterialRelationshipHealth {
  unlinkedMaterialCount: number
  inactiveSupplierLinkedMaterialCount: number
  unlinkedMaterialSamples: Array<{
    code: string
    supplier: string
    path: string
  }>
  inactiveSupplierLinkedMaterials: Array<{
    code: string
    supplier: string
    supplierMasterName: string
  }>
}

interface MaterialActionableGroups {
  autoFixCandidates: Array<any>
  manualReviewCandidates: Array<any>
}

defineProps<{
  referenceCheck: MaterialReferenceCheck | null
  relationshipHealth: MaterialRelationshipHealth
  actionableGroups: MaterialActionableGroups
}>()
```

#### Emits
```ts
defineEmits<{
  (e: 'auto-relink', item: any): void
  (e: 'open-edit', item: any): void
}>()
```

---

### 2.4 `MaterialListPanel.vue`

#### Props
```ts
interface MaterialRecord {
  id: number
  code: string
  name: string
  model: string
  supplier: string
  supplier_master_id?: number | null
  supplierMaster?: {
    id: number
    supplier_name: string
    normalized_name: string
    status: string
  } | null
  unit: string
  price: number
  category: string
}

defineProps<{
  materials: MaterialRecord[]
  selectedMaterialId?: number | null
  loading?: boolean
}>()
```

#### Emits
```ts
defineEmits<{
  (e: 'select', item: MaterialRecord): void
  (e: 'create'): void
  (e: 'edit', item: MaterialRecord): void
}>()
```

---

### 2.5 `MaterialRelationshipSection.vue`

#### Props
```ts
defineProps<{
  material: MaterialRecord | null
  supplierMasterOptions: Array<{ id: number; supplierName: string }>
}>()
```

#### Emits
```ts
defineEmits<{
  (e: 'link-change', supplierMasterId: number | null): void
  (e: 'auto-link'): void
}>()
```

---

### 2.6 `MaterialEditDialog.vue`

#### Props
```ts
interface EditableMaterial extends Partial<MaterialRecord> {}

defineProps<{
  open: boolean
  modelValue: EditableMaterial
  title: string
  supplierMasterOptions: Array<{ id: number; supplierName: string }>
}>()
```

#### Emits
```ts
defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:modelValue', value: EditableMaterial): void
  (e: 'save'): void
}>()
```

---

## 3. Supplier 侧组件

### 3.1 `SupplierSummaryCards.vue`

#### Props
```ts
interface SupplierRelationshipHealth {
  totalSuppliers: number
  totalLinkedMaterials: number
  inactiveLinkedSupplierCount: number
  suppliersWithUnlinkedMaterialsCount: number
}

defineProps<{
  health: SupplierRelationshipHealth
}>()
```

#### Emits
- 无

---

### 3.2 `SupplierAuditPanel.vue`

#### Props
```ts
interface SupplierAuditTrendSummary {
  sampleSize: number
  createCount: number
  updateCount: number
  archiveCount: number
  latestCreatedAt: string | null
}

defineProps<{
  auditLogs: AuditLogItem[]
  auditTrendSummary: SupplierAuditTrendSummary
}>()
```

#### Emits
- 无

---

### 3.3 `SupplierDiagnosticsPanel.vue`

#### Props
```ts
interface SupplierEntry {
  id?: number | null
  supplierName: string
  normalizedName: string
  status?: string
  sourceNote?: string
  sources: string[]
  materialCount: number
  linkedMaterialCount: number
  linkedMaterialCodes: string[]
  hasLinkedMaterialsWhileInactive: boolean
  persisted: boolean
}

interface SupplierActionableGroups {
  inactiveLinkedSuppliers: SupplierEntry[]
  suppliersWithUnlinkedMaterials: SupplierEntry[]
}

defineProps<{
  relationshipHealth: SupplierRelationshipHealth
  actionableGroups: SupplierActionableGroups
}>()
```

#### Emits
```ts
defineEmits<{
  (e: 'view-linked-materials', item: SupplierEntry): void
  (e: 'open-edit', item: SupplierEntry): void
}>()
```

---

### 3.4 `SupplierListPanel.vue`

#### Props
```ts
defineProps<{
  items: SupplierEntry[]
  selectedSupplierId?: number | null
  loading?: boolean
}>()
```

#### Emits
```ts
defineEmits<{
  (e: 'select', item: SupplierEntry): void
  (e: 'create'): void
  (e: 'edit', item: SupplierEntry): void
  (e: 'archive', item: SupplierEntry): void
}>()
```

---

### 3.5 `SupplierLinkedMaterialsPanel.vue`

#### Props
```ts
interface SupplierLinkedMaterialItem {
  id: number
  code: string
  name: string
  category: string
  supplier: string
  supplierMasterId: number | null
  updatedAt: string | null
}

defineProps<{
  selectedSupplier: SupplierEntry | null
  linkedMaterials: SupplierLinkedMaterialItem[]
  loading?: boolean
}>()
```

#### Emits
```ts
defineEmits<{
  (e: 'open-material', item: SupplierLinkedMaterialItem): void
}>()
```

---

### 3.6 `SupplierEditDialog.vue`

#### Props
```ts
defineProps<{
  open: boolean
  modelValue: Partial<SupplierEntry>
  title: string
}>()
```

#### Emits
```ts
defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:modelValue', value: Partial<SupplierEntry>): void
  (e: 'save'): void
}>()
```

---

## 4. 统一设计原则

### 4.1 第一阶段组件优先纯展示
- 不在组件里做异步加载
- 不在组件里持有主状态
- 只消费 props、抛出事件

### 4.2 事件只向上抛，不直接改父状态
这样便于：
- 页面编排
- composable 集中管理
- 测试更稳定

### 4.3 暂时接受 props 偏多
第一阶段目标是把页面拆薄，不是提前做抽象框架。

---

## 5. 一句话结论

Material / Supplier 两页的拆分应先遵循“纯 props 展示 + 事件上抛”的模式，等页面瘦下来后，再考虑更高层复用。
