# Branch Progress Summary — `fix/week1-health-baseline` (2026-04-16)

> 状态：现行进度摘要。
> 分支：`fix/week1-health-baseline`
> 用途：总结当前分支相对 `main` 已完成的结构治理、门禁恢复、运行时契约收口与下一步建议，便于决定是否继续推进或发起 PR。

---

## 1. 当前结论

这条分支已经完成了一轮**高价值、低语义风险**的治理工作，核心成果是：

1. **恢复了可信健康基线**
2. **把运行时契约讲清楚了**
3. **显著收口了 Inventory 前端复杂度**
4. **开始了 OrderService 的第一轮低风险瘦身**

当前分支适合两种后续动作：

- 作为一个可 review 的阶段点发起 PR
- 在此基础上继续推进 `OrderService` 第二轮收口

---

## 2. 相对 `main` 的提交列表

当前分支相对 `main` 包含 8 条提交：

```text
78afd69 Trim OrderService so application flow stands out from pure helpers
 a82235c Separate Inventory query and export helpers from the store shell
 fd9b533 Pull Inventory detail panels and reverse dialogs into dedicated coordination helpers
 79ab041 Reduce Inventory tab sprawl so the page shell stays reviewable
 7f14e42 Break Inventory tab markup into focused tab components
 38375d9 Reduce Inventory page coordination weight before deeper feature work
 78d0ed7 Make the runtime contract explicit where startup and rendering depend on it
 f42a800 Restore a trustworthy Week 1 health baseline before deeper refactors
```

---

## 3. 本分支已经完成了什么

## 3.1 Week 1：健康基线恢复

已完成：

- 修复 `type-check:server`
- 修复 stale guard（`config-table-guard`）
- 修复 print E2E harness（`print-document-customer-name.e2e`）
- 补健康基线文档：
  - `docs/progress/REPO_HEALTH_BASELINE_2026-04-16.md`

### 当前门禁状态

```bash
npm run type-check         ✅
npm run type-check:server  ✅
npm test                   ✅
npm run build              ✅
```

---

## 3.2 Week 2：运行时契约显式化

已完成：

- 新增运行时契约文档：
  - `docs/reference/RUNTIME_CONTRACT_2026-04-16.md`
- 在关键代码旁补充契约注释：
  - config bootstrap
  - print/PDF base URL 解析
  - ERP fresh fetch vs cached history
  - API key 的真实行为边界

### 当前明确下来的运行时认知

1. 前端启动前先完成 config bootstrap
2. materials + published mappings 是启动硬门禁
3. formulas 当前允许降级
4. ERP 在线查询与历史缓存读取是两条不同契约链路
5. print/PDF 在生产环境下强依赖 `PRINT_RENDER_BASE_URL`
6. API key 当前只有生产环境缺失时才是硬错误

---

## 3.3 Inventory 前端：5 轮连续收口

### 第一轮：抽页面状态与编排
新增：
- `src/features/inventory/composables/useInventoryPageState.ts`
- `src/features/inventory/composables/useInventoryOutboundState.ts`
- `src/features/inventory/composables/useInventoryLocationState.ts`

### 第二轮：拆 outbound / locations tab
新增：
- `src/features/inventory/components/InventoryOutboundsTab.vue`
- `src/features/inventory/components/InventoryLocationsTab.vue`

### 第三轮：拆 stock / receipts tab
新增：
- `src/features/inventory/components/InventoryStockTab.vue`
- `src/features/inventory/components/InventoryReceiptsTab.vue`

### 第四轮：抽 detail panel / reverse dialog 协调层
新增：
- `src/features/inventory/composables/useInventoryDetailPanels.ts`
- `src/features/inventory/composables/useInventoryReverseDialogs.ts`

### 第五轮：从 store 中抽 query/export helper
新增：
- `src/features/inventory/inventoryQueryBuilders.ts`
- `src/features/inventory/inventoryCsvExports.ts`

修改：
- `src/stores/useInventoryStore.ts`
- `src/views/Inventory.vue`
- `tests/inventory-view-guard.test.ts`
- `tests/governance-boundary-guard.test.ts`

### 当前效果

- `Inventory.vue` 已从“超重单体页面”收口成接近页面装配壳
- `useInventoryStore.ts` 去掉了 URL query builder 和 CSV export helper 噪音
- inventory 相关测试在收口过程中持续保持通过

---

## 3.4 OrderService 第一轮收口

已完成：

- 新增：
  - `server/services/orders/order.service.helpers.ts`
- 从 `order.service.ts` 中抽走纯 helper：
  - 备注/日期归一化
  - bulk order ids 归一化
  - 手动/自动单号生成相关 helper
  - unique order_no 错误识别
  - bulk-arrive 错误序列化
- 新增计划文档：
  - `docs/roadmaps/ORDER_SERVICE_REFACTOR_PLAN_2026-04-16.md`

### 当前效果

`order.service.ts` 更接近：
- 应用编排
- 事务控制
- repository / domain helper 组合

而不再混杂大量纯工具函数。

---

## 4. 主要改动面（相对 `main`）

按 `git diff --stat main...HEAD`，本分支大致包括：

- 36 个文件改动
- 约 2700+ 行新增
- 约 1300+ 行删除

高影响目录主要集中在：

### 文档
- `docs/README.md`
- `docs/progress/REPO_HEALTH_BASELINE_2026-04-16.md`
- `docs/reference/RUNTIME_CONTRACT_2026-04-16.md`
- `docs/roadmaps/INVENTORY_PAGE_REFACTOR_PLAN_2026-04-16.md`
- `docs/roadmaps/ORDER_SERVICE_REFACTOR_PLAN_2026-04-16.md`

### 前端 inventory
- `src/views/Inventory.vue`
- `src/features/inventory/**`
- `src/stores/useInventoryStore.ts`
- `tests/inventory-view-guard.test.ts`

### 后端 order / runtime
- `server/services/orders/order.service.ts`
- `server/services/orders/order.service.helpers.ts`
- `server/app/middleware/apiKeyAuth.ts`
- `server/services/renderBaseUrl.ts`
- `server/scripts/audit_po_quantity_history.ts`
- `server/models/types.ts`
- `server/validators/order.validators.ts`
- `tsconfig.server.json`

---

## 5. 当前已经验证通过的内容

### 全量门禁
- `npm run type-check`
- `npm run type-check:server`
- `npm test`
- `npm run build`

### 额外 targeted 验证
- `tests/config-table-guard.test.ts`
- `tests/print-document-customer-name.e2e.test.ts`
- `tests/inventory-view-guard.test.ts`
- `tests/inventory-receipt-flow.test.ts`
- `tests/inventory-receipt-route-state.test.ts`
- `tests/inventory-route.test.ts`
- `tests/governance-boundary-guard.test.ts`
- `tests/order-service.test.ts`
- `tests/order-routes.test.ts`

---

## 6. 当前仍然存在的热点

## 6.1 `useInventoryStore.ts`
虽然已经瘦身，但它仍然是 inventory 域的状态与请求中心：

- 多个 fetch
- 多个分页状态
- receipt/outbound/movement/location 混在一个 store

这已经比之前好很多，但如果继续往下收口，这里仍是可继续优化的点。

## 6.2 `order.service.ts`
第一轮已经抽掉纯 helper，但大方法还在：

- `createOrder`
- `updateOrder`
- `stockInOrder`
- `bulkMarkArrived`

下一轮若继续推进，最自然的方向就是进一步缩这些应用编排方法。

---

## 7. 这条分支现在适不适合开 PR？

**适合。**

原因：

1. 门禁全绿
2. 运行时契约与结构治理都已形成明确成果
3. Inventory 的前端复杂度已经明显下降
4. OrderService 第一轮也已形成独立、低风险的收口提交
5. 当前是一个逻辑清晰、可 review 的阶段点

---

## 8. 如果继续开发，下一步最值得做什么？

### 推荐优先级 1：OrderService 第二轮收口
进一步把 `updateOrder` / `stockInOrder` 等大方法的纯编排片段继续下沉。

### 推荐优先级 2：Inventory store 边界继续收口
如果还想继续打磨 inventory 域，可考虑按 receipt / outbound / movement 拆分更细的 store helper 或 facade。

### 推荐优先级 3：停下来开 PR
如果当前更重视交付和 review，建议先以现在这条分支作为阶段性成果发 PR。

---

## 9. 最终判断

这条分支当前已经完成了一个很扎实的阶段目标：

> **把仓库从“门禁不可信 + Inventory 前端复杂度过高”的状态，推进到了“门禁可信 + 运行时契约明确 + Inventory 前端基本可持续维护”的状态。**

如果现在停下来开 PR，是合理的；如果继续做，最自然的方向就是 `OrderService` 第二轮收口。
