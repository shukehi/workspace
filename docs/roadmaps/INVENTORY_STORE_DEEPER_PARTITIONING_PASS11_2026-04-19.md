# Inventory Store Deeper Partitioning Pass 11 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass11`
> 范围：在 flow 层已经成为 location/outbound payload canonical source 后，继续把 receipt reverse payload typing 归回 history flow 层，而不改变页面行为或 API contract。

---

## 1. 背景

当前 receipt reverse payload type 仍在多处出现：
- `inventoryStoreHistoryFlows.ts`（history flow owner）
- `inventoryStoreHistoryActions.ts`
- `useInventoryReceiptFlow.ts`

真实的撤销写入语义属于 history flow 层，因此 receipt reverse payload type 的 canonical source 更适合统一从 history flow 模块导出，并让 action/composable 层依赖它。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 统一 receipt reverse payload type source
- 让 history action / receipt composable 依赖 history flow 层导出的 canonical payload contract

---

## 3. 本轮不做的事

1. 不改 Inventory API contract
2. 不改页面行为
3. 不做 multi-store 拆分
4. 不改 receipt reverse 运行逻辑
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/inventoryStoreHistoryFlows.ts`
- `src/features/inventory/inventoryStoreHistoryActions.ts`
- `src/features/inventory/composables/useInventoryReceiptFlow.ts`
- `tests/inventory-view-guard.test.ts`

目标：
- history flow 层成为 receipt reverse payload type 的唯一 canonical source
- action/composable 层不再重复定义相同 payload shape

---

## 5. 完成标准

至少满足：

1. receipt reverse payload type 只保留一个 canonical source
2. action / composable 层不再重复定义它
3. 行为不变
4. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/inventory-view-guard.test.ts tests/inventory-receipt-flow.test.ts tests/inventory-receipt-route-state.test.ts tests/inventory-route.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
