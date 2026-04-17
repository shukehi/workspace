# Branch Progress — refactor/inventory-store-pass2 (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/inventory-store-pass2`
> 用途：记录 Inventory store/state 第二轮当前已完成的收口范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

继续收口 `src/stores/useInventoryStore.ts`，但优先处理：

- 重复分页 plumbing
- location / outbound API flow block

并保持：

1. 页面行为不变
2. API contract 不变
3. 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/INVENTORY_STORE_PASS2_PLAN_2026-04-17.md`

### 2.2 新增 helper 模块
- `src/features/inventory/inventoryStorePaging.ts`
- `src/features/inventory/inventoryStoreFlows.ts`

### 2.3 已从 `useInventoryStore.ts` 抽离的内容
#### 分页 plumbing
- paged response 归一化
- fetch-all pages 循环

#### location / outbound API flow
- location 列表拉取、创建、更新与排序合并
- outbound 列表拉取、详情拉取、创建、反向冲销
- outbound 列表全量抓取

---

## 3. 相对 main 的提交

- `ec90f0d` — 抽出分页响应归一化与 fetch-all pagination helper
- `b153bbc` — 抽出 location / outbound API flow helper

---

## 4. 结构结果

### 之前
`useInventoryStore.ts` 同时承载：
- state
- 分页归一化
- fetch-all 分页循环
- location flow
- outbound flow

### 现在
这些块已经部分进入：
- `inventoryStorePaging.ts`
- `inventoryStoreFlows.ts`

这意味着：

1. store 更接近“状态容器 + 轻量编排”
2. 分页基础设施不再散落在 store 主体里
3. location / outbound flow 有了更清晰的独立落点

---

## 5. 验证证据

### 当前已通过
- `npm run type-check` ✅
- `npm run type-check:server` ✅
- `npm test` ✅
- `npm run build` ✅

### 当前阶段重点验证
- `tests/inventory-view-guard.test.ts`
- `tests/inventory-receipt-flow.test.ts`
- `tests/inventory-receipt-route-state.test.ts`
- `tests/inventory-route.test.ts`
- `tests/governance-boundary-guard.test.ts`

---

## 6. 剩余可继续推进的点

### 6.1 继续第三刀
可以继续考虑：
- receipts flow helper
- movements flow helper
- 更深的 store state partitioning

### 6.2 当前仍保留在 store 中的明显块
- receipts fetch / reverse flow 仍在 store 中
- movements fetch flow 仍在 store 中
- 但当前已不再是“高复杂单体状态中心”的原始状态

---

## 7. 当前是否适合停一下

**适合。**

原因：

1. 分支主题清晰
2. 已完成两刀低风险、行为保持型收口
3. 全量门禁持续全绿
4. 现在已经是一个自然的 review / continue 决策点

---

## 8. 当前建议

最稳的下一步有两种：

### 方案 A：现在封板
如果你希望保持更小粒度，可以在当前点封板 / merge。

### 方案 B：再做第三刀后封板
如果继续推进，最自然的是：
- 收 `receipts` 或 `movements` flow
- 然后再补阶段总结与封板

### 当前偏向
如果按“最稳节奏”排序，我会偏向：
> **先停下来做封板判断。**

因为当前收益已经很清晰，再继续第三刀不是必须条件。

