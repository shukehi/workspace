# SupplierMaster 组件拆分实施方案（2026-04-21）

## 1. 目标

在不大改数据流的前提下，先把 `SupplierMaster.vue` 中最适合独立的展示区块拆出，降低页面复杂度，为后续详情工作台化做准备。

---

## 2. 第一批拆分范围

### 2.1 `SupplierSummaryCards.vue`
职责：
- 展示顶部摘要卡：
  - 总供应商数
  - 已链接物料总数
  - 异常供应商数

输入：
- `relationshipHealth`

特点：
- 纯展示
- 无内部状态
- 拆分风险最低

---

### 2.2 `SupplierAuditPanel.vue`
职责：
- 展示最近审计记录
- 展示最近变更摘要（create / update / archive）

输入：
- `auditLogs`
- `auditTrendSummary`

特点：
- 纯展示
- 与页面主逻辑弱耦合
- 适合第一批拆出

---

### 2.3 `SupplierDiagnosticsPanel.vue`
职责：
- 展示关系健康摘要
- 展示异常分组：
  - inactive 但仍有关联物料
  - 需补充正式链接
- 发出修复动作事件

输入：
- `relationshipHealth`
- `actionableRelationshipGroups`

输出事件：
- `view-linked-materials`
- `open-edit`

特点：
- 第一批里最复杂
- 也是页面可读性提升最明显的一块

---

## 3. 第二批拆分范围

### 3.1 `SupplierListPanel.vue`
职责：
- 左侧供应商列表
- 搜索 / 筛选
- 选中供应商

输入：
- `items`
- `filteredItems`
- `selectedSupplierId`
- `loading`

输出事件：
- `select`
- `create`
- `edit`
- `archive`

---

### 3.2 `SupplierLinkedMaterialsPanel.vue`
职责：
- 展示当前供应商关联物料明细
- 支持后续跳转到 material 详情/页面

输入：
- `selectedSupplier`
- `linkedMaterials`
- `linkedMaterialsLoading`

特点：
- 当前已有独立区块，抽离成本较低
- 是 Supplier 页最适合工作台化的部分之一

---

## 4. 暂不拆分的部分

第一阶段建议保留在 `SupplierMaster.vue`：
- 页面级布局
- 搜索栏
- 弹窗开关与表单状态
- composable 调用与整体状态协调

原因：
- 这些部分当前耦合较高
- 先拆展示层更稳妥

---

## 5. 推荐目录

建议新增：

```text
src/features/master-data/components/
  SupplierSummaryCards.vue
  SupplierDiagnosticsPanel.vue
  SupplierAuditPanel.vue
  SupplierListPanel.vue
  SupplierLinkedMaterialsPanel.vue
```

---

## 6. 页面接入方式

第一阶段拆分后，`SupplierMaster.vue` 建议只承担：
- 页面布局
- 子组件编排
- 状态分发

理想形态：

```vue
<ConfigCenterShell>
  <SupplierSummaryCards :health="relationshipHealth" />

  <!-- 搜索栏保留 -->

  <SupplierDiagnosticsPanel
    :relationship-health="relationshipHealth"
    :actionable-groups="actionableRelationshipGroups"
    @view-linked-materials="loadLinkedMaterials"
    @open-edit="openEditDialog"
  />

  <SupplierAuditPanel
    :audit-logs="auditLogs"
    :audit-trend-summary="auditTrendSummary"
  />

  <!-- 列表保留在页面，后续再拆 SupplierListPanel -->
  <!-- 关联物料区块后续再拆 SupplierLinkedMaterialsPanel -->
  <!-- dialog 保留 -->
</ConfigCenterShell>
```

---

## 7. props 设计原则

### 7.1 展示组件优先纯 props
第一阶段不要在子组件里放业务加载逻辑，组件只消费父层状态。

### 7.2 动作只向上抛事件
例如：
- `view-linked-materials`
- `open-edit`
- `archive`

由页面容器或 composable 决定具体执行。

### 7.3 不过早抽象成“万能组件”
先把页面瘦身，后续再统一 Supplier / Material 的共享模式。

---

## 8. 推荐实施顺序

### Step 1
拆 `SupplierAuditPanel.vue`

### Step 2
拆 `SupplierSummaryCards.vue`

### Step 3
拆 `SupplierDiagnosticsPanel.vue`

### Step 4
再拆 `SupplierLinkedMaterialsPanel.vue`

这样顺序最稳：
- 风险从低到高
- 每一步都能明显减轻页面复杂度

---

## 9. 成功标准

这轮拆分成功的标准：
- `SupplierMaster.vue` 体积明显变小
- 功能完全不变
- `useSupplierMaster` 基本不需要大改
- 诊断、审计、关系区块职责更清楚
- 后续拆详情工作台会更容易

---

## 10. 下一阶段（不是本轮）

第一批拆分完成后，再考虑：
- `SupplierDetailPanel.vue`
- `SupplierEditDialog.vue`
- Supplier / Material 共用的 RelationshipHealth 组件

---

## 11. 一句话结论

`SupplierMaster.vue` 第一阶段最值得拆的是 Summary / Diagnostics / Audit 三块展示组件，第二阶段再拆列表与关联物料面板。
