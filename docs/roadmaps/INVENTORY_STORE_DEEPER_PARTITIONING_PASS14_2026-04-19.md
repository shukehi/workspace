# Inventory Store Deeper Partitioning Pass 14 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass14`
> 范围：在 payload/result canonical source 已进一步归位后，继续把 reverse dialog control typing 归回各自的 owner composable，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 reverse dialog control shape 仍在多处出现：
- `useInventoryReceiptFlow.ts`（receipt reverse owner）
- `useInventoryOutboundState.ts`（outbound reverse owner）
- `useInventoryReverseDialogs.ts`

真实的 reverse dialog refs / methods 都由各自 composable 提供，因此它们的 control type 更适合由对应 composable 导出，并让 reverse dialog helper 依赖这些 canonical type。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 统一 reverse dialog control type source
- 让 `useInventoryReverseDialogs.ts` 依赖 receipt/outbound composable 导出的 canonical control contract

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 reverse dialog 运行逻辑
3. 不做 multi-store 拆分
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/composables/useInventoryReceiptFlow.ts`
- `src/features/inventory/composables/useInventoryOutboundState.ts`
- `src/features/inventory/composables/useInventoryReverseDialogs.ts`
- `tests/inventory-view-guard.test.ts`

目标：
- receipt/outbound composable 成为 reverse control type 的 canonical source
- reverse dialog helper 不再重复定义同一 control shape

---

## 5. 完成标准

至少满足：

1. reverse dialog control type 只保留 owner composable 作为 canonical source
2. reverse dialog helper 不再重复定义它们
3. 页面行为不变
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
