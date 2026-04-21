# MaterialManagement 组件拆分实施方案（2026-04-21）

## 1. 目标

在不大改数据流的前提下，先把 `MaterialManagement.vue` 中最适合独立的展示区块拆出，降低页面复杂度，为后续详情工作台化做准备。

---

## 2. 第一批拆分范围

### 2.1 `MaterialSummaryCards.vue`
职责：
- 展示顶部摘要卡：
  - 总物料数
  - 已正式链接数
  - 未关联数
  - inactive supplier linked 数

输入：
- `relationshipHealth`

特点：
- 纯展示
- 无内部状态
- 拆分风险最低

---

### 2.2 `MaterialAuditPanel.vue`
职责：
- 展示最近审计记录

输入：
- `auditLogs`

特点：
- 纯展示
- 与页面主逻辑弱耦合
- 可最先拆出

---

### 2.3 `MaterialDiagnosticsPanel.vue`
职责：
- 展示主数据引用检查
- 展示关系异常分组
- 展示可自动修复 / 需人工处理列表
- 发出修复动作事件

输入：
- `referenceCheck`
- `relationshipHealth`
- `actionableRelationshipGroups`

输出事件：
- `auto-relink`
- `open-edit`

特点：
- 第一批里最复杂
- 但也是页面瘦身收益最大的一块

---

## 3. 暂不拆分的部分

第一阶段建议保留在 `MaterialManagement.vue`：
- 搜索栏
- 主表格
- 编辑弹窗
- composable 调用与状态协调

原因：
- 这些块当前耦合较高
- 先拆展示层更稳妥

---

## 4. 推荐目录

建议新增：

```text
src/features/master-data/components/
  MaterialSummaryCards.vue
  MaterialDiagnosticsPanel.vue
  MaterialAuditPanel.vue
```

若当前阶段不想调整到 `master-data/components`，也可先放入：

```text
src/features/materials/components/
```

但长期更建议归到 `master-data/components`。

---

## 5. 页面接入方式

拆分后，`MaterialManagement.vue` 建议只承担：
- 页面布局
- 子组件编排
- 状态分发

理想形态：

```vue
<ConfigCenterShell>
  <MaterialSummaryCards :health="relationshipHealth" />

  <!-- 搜索栏保留 -->

  <MaterialDiagnosticsPanel
    :reference-check="referenceCheck"
    :relationship-health="relationshipHealth"
    :actionable-groups="actionableRelationshipGroups"
    @auto-relink="autoRelinkMaterial"
    @open-edit="openEditDialog"
  />

  <MaterialAuditPanel :audit-logs="auditLogs" />

  <!-- 表格保留 -->
  <!-- dialog 保留 -->
</ConfigCenterShell>
```

---

## 6. props 设计原则

### 6.1 展示组件优先纯 props
第一阶段不要在子组件里放业务加载逻辑。\
让组件只消费父层状态。

### 6.2 事件只向上抛，不在组件内直接改主状态
例如：
- `auto-relink`
- `open-edit`

由页面容器或 composable 决定具体动作。

### 6.3 宁可 props 多一点，也不要过早抽象
第一阶段目标是“页面瘦身”，不是做抽象框架。

---

## 7. 推荐实施顺序

### Step 1
拆 `MaterialAuditPanel.vue`

### Step 2
拆 `MaterialSummaryCards.vue`

### Step 3
拆 `MaterialDiagnosticsPanel.vue`

这是当前最稳的顺序：
- 风险从低到高
- 每一步都能看到页面变清爽

---

## 8. 成功标准

这轮拆分成功的标准：
- `MaterialManagement.vue` 体积明显变小
- 功能完全不变
- `useMaterialManagementPageState` 基本不需要大改
- 测试只需要少量同步
- 后续拆“详情面板 / 列表面板 / dialog”会更容易

---

## 9. 下一阶段（不是本轮）

第一批拆分完成后，后续再考虑：
- `MaterialListPanel.vue`
- `MaterialDetailPanel.vue`
- `MaterialRelationshipSection.vue`
- `MaterialEditDialog.vue`

那会是第二阶段，而不是这轮最小重构目标。

---

## 10. 一句话结论

`MaterialManagement.vue` 第一阶段最值得拆的是 Summary / Diagnostics / Audit 三块纯展示组件；先瘦页面，再做工作台化。
