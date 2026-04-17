# Inventory Store / State Pass 3 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-pass3`
> 范围：继续收口 `useInventoryStore.ts`，优先下沉 receipts / movements 等历史查询 flow，但不改变页面行为或 API contract。

---

## 1. 背景

在上一轮 `Inventory store / state pass 2` 中，已经完成：

- 分页响应归一化 helper
- fetch-all pagination helper
- location / outbound flow helper

当前 store 中剩余最明显的流程块集中在：
- receipts flow
- movements flow

---

## 2. 本轮目标

继续把自包含的 store flow block 下沉，让 `useInventoryStore.ts` 更接近：

- state container
- 轻量 orchestration shell

本轮优先顺序：
1. receipts flow
2. movements flow
3. 如果仍有明显收益，再判断是否继续更深的 state partitioning

---

## 3. 本轮不做的事

1. 不改页面行为
2. 不改 API 返回形态
3. 不改 Inventory domain contract
4. 不拆成多个 Pinia store
5. 不引入新依赖

---

## 4. 推荐切口

建议 helper 模块：
- `src/features/inventory/inventoryStoreHistoryFlows.ts`

优先承接：
- receipts list/detail/reverse flow
- movements list flow

---

## 5. 完成标准

至少满足：

1. receipts / movements flow 不再直接内联在 store 中
2. store 中剩余的 API flow 更少、更清晰
3. 全量门禁保持全绿

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
npm test -- tests/inventory-view-guard.test.ts
npm test -- tests/inventory-receipt-flow.test.ts
npm test -- tests/inventory-receipt-route-state.test.ts
npm test -- tests/inventory-route.test.ts
npm test -- tests/governance-boundary-guard.test.ts
npm test
npm run build
```
