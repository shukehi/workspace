# 主数据层前端实施顺序清单（2026-04-21）

## 1. 目标

把主数据层前端重构从“方案讨论”落成一份可执行顺序清单，方便按低风险节奏推进。

涉及页面：
- `MaterialManagement.vue`
- `SupplierMaster.vue`

---

## 2. 实施原则

1. **先拆展示层，再拆结构层**
2. **先低耦合组件，再高耦合组件**
3. **先不改后端协议**
4. **先不大改 composable 数据流**
5. **每一步都保持行为不变**

---

## 3. Phase 1：低风险页面瘦身

### Material 页面
1. `MaterialAuditPanel.vue`
2. `MaterialSummaryCards.vue`
3. `MaterialDiagnosticsPanel.vue`

### Supplier 页面
4. `SupplierAuditPanel.vue`
5. `SupplierSummaryCards.vue`
6. `SupplierDiagnosticsPanel.vue`

### 完成标准
- 页面主文件明显变短
- 所有拆出的组件以 props 驱动
- 现有 composable 基本不动
- 测试只需小范围同步

---

## 4. Phase 2：页面结构工作台化

### Material 页面
7. `MaterialListPanel.vue`
8. `MaterialLinked/RelationshipSection.vue`
9. `MaterialDetailPanel.vue`

### Supplier 页面
10. `SupplierListPanel.vue`
11. `SupplierLinkedMaterialsPanel.vue`
12. `SupplierDetailPanel.vue`

### 完成标准
- 页面从“增强版列表页”升级为“列表 + 详情工作台”
- 选中态更清晰
- 关系查看不再全靠弹窗

---

## 5. Phase 3：编辑与修复流优化

### Material 页面
13. `MaterialEditDialog.vue`
14. 自动重连 / 打开编辑 / 跳转 supplier 的交互统一

### Supplier 页面
15. `SupplierEditDialog.vue`
16. 查看关联物料 / 打开编辑 / 风险提示交互统一

### 完成标准
- 从“发现问题”到“修复问题”的路径更顺
- 动作入口统一，不再分散在多个块里

---

## 6. Phase 4：跨页统一与复用

17. 抽共用摘要卡模式
18. 抽共用审计面板模式
19. 抽共用诊断面板模式（如适合）
20. 评估是否新增统一“主数据诊断页”

### 完成标准
- Supplier / Material 两页结构更一致
- 组件命名与职责更稳定
- 为后续扩更多主数据对象打基础

---

## 7. 每阶段检查项

### 代码检查
- 页面主文件是否明显变薄
- 子组件职责是否单一
- 是否避免过早抽象

### 验证
- `npm run type-check`
- `npm run type-check:server`
- 相关页面/状态测试同步通过

### 人工检查
- 页面渲染是否正常
- 动作按钮是否仍然可用
- 诊断/审计信息是否完整显示

---

## 8. 推荐执行顺序（最简版）

### 第一批（马上可做）
- MaterialAuditPanel
- MaterialSummaryCards
- MaterialDiagnosticsPanel
- SupplierAuditPanel
- SupplierSummaryCards
- SupplierDiagnosticsPanel

### 第二批
- MaterialListPanel
- SupplierListPanel
- SupplierLinkedMaterialsPanel

### 第三批
- MaterialDetailPanel
- SupplierDetailPanel
- EditDialog 细化

---

## 9. 一句话结论

主数据层前端最稳的推进方式，是先拆 Summary / Diagnostics / Audit 三类低风险展示组件，再把页面逐步升级成真正的工作台结构。
