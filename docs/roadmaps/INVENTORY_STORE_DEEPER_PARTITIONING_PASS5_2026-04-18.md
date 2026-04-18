# Inventory Store Deeper Partitioning Pass 5 (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass5`
> 范围：在 state/derived/action composition 已进一步分层后，继续收束 flow payload type ownership，但不改变页面行为或 API contract。

---

## 1. 背景

当前 outbound payload type 在两处重复定义：
- `inventoryStoreFlowActions.ts`
- `inventoryStoreFlows.ts`

真实的 API 写入语义属于 flow 层，因此 payload type 的 canonical source 更适合放在 flow 层，而不是 action 包装层。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 统一 outbound payload type source
- 让 action 层依赖 flow 层导出的 canonical payload type

---

## 3. 本轮不做的事

1. 不改 Inventory API contract
2. 不改页面行为
3. 不做 multi-store 拆分
4. 不改 flow/helper 运行语义
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/inventoryStoreFlows.ts`
- `src/features/inventory/inventoryStoreFlowActions.ts`
- `tests/inventory-view-guard.test.ts`

目标：
- flow 层成为 outbound payload type 的 canonical source
- action 层不再重复定义相同 payload shape

---

## 5. 完成标准

至少满足：

1. outbound payload type 只保留一个 canonical source
2. `inventoryStoreFlowActions.ts` 不再重复定义它
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
