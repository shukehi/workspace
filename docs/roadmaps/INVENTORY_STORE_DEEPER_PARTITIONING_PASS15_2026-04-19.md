# Inventory Store Deeper Partitioning Pass 15 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass15`
> 范围：在 reverse control typing 已进一步归位后，继续把 reverse dialog behavior ownership 归回 owner composable，并退役单独的 wrapper helper，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 reverse dialog 的实际 refs / actions 已分别由：
- `useInventoryReceiptFlow.ts`
- `useInventoryOutboundState.ts`

拥有。

但 `useInventoryReverseDialogs.ts` 仍承担一层薄包装，只负责：
- `requestReverseOutbound`
- `resetReceiptReverseQuantityToMax`
- 以及 passthrough 暴露同一批 controls

这让 owner 与行为边界仍然没有完全对齐。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 把 reverse dialog 行为归回 owner composable
- 删除 `useInventoryReverseDialogs.ts` 这一层薄包装
- 让 `Inventory.vue` 直接依赖 owner composable 提供的行为/controls

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 reverse dialog 交互语义
3. 不做 multi-store 拆分
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/composables/useInventoryOutboundState.ts`
- `src/features/inventory/composables/useInventoryReceiptFlow.ts`
- `src/features/inventory/composables/useInventoryReverseDialogs.ts`
- `src/views/Inventory.vue`
- `tests/inventory-view-guard.test.ts`

目标：
- `requestReverseOutbound` 归回 outbound state owner
- `resetReceiptReverseQuantityToMax` 归回 receipt flow owner
- `useInventoryReverseDialogs.ts` 退役

---

## 5. 完成标准

至少满足：

1. reverse dialog helper 被删除
2. owner composable 直接提供其所属行为
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
