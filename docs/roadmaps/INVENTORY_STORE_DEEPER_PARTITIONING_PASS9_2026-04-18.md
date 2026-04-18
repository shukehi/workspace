# Inventory Store Deeper Partitioning Pass 9 (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass9`
> 范围：在 state/derived/action composition 已进一步分层后，继续收束 outbound payload type ownership，但不改变页面行为或 API contract。

---

## 1. 背景

当前 outbound payload type 仍在多处出现：
- `inventoryStoreFlows.ts`（canonical flow owner）
- `useInventoryOutboundState.ts`
- `InventoryOutboundDialog.vue` emit payload shape

真实的写入语义属于 flow 层，因此 outbound payload type 的 canonical source 更适合统一从 flow 层导出，并让上层包装与 UI surface 依赖它。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 统一 outbound payload type source
- 让 composable / dialog surface 依赖 flow 层导出的 canonical payload type

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
- `src/features/inventory/composables/useInventoryOutboundState.ts`
- `src/components/inventory/InventoryOutboundDialog.vue`
- `tests/inventory-view-guard.test.ts`

目标：
- flow 层成为 outbound payload type 的唯一 canonical source
- composable / dialog 层不再重复定义相同 payload shape

---

## 5. 完成标准

至少满足：

1. outbound payload type 只保留一个 canonical source
2. composable / dialog 层不再重复定义它
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
