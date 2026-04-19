# Inventory Store Deeper Partitioning Pass 16 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass16`
> 范围：在 reverse dialog wrapper 已退役后，继续把 detail panel behavior ownership 归回 owner composable，并删除剩余的 detail-panel wrapper，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 detail panel 的实际 state owner 已分别存在：
- `useInventoryOutboundState.ts`（outbound detail owner）
- `useInventoryPageState.ts`（movement sheet owner）
- `useInventoryReceiptFlow.ts`（receipt audit owner）

但 `useInventoryDetailPanels.ts` 仍承担一层薄包装，只负责：
- `handleOpenOutboundDetail`
- `handleOpenMovementDetail`
- 以及 passthrough 暴露若干 close action

这让 owner 与行为边界仍然没有完全对齐。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 把 detail panel 行为归回 owner composable
- 删除 `useInventoryDetailPanels.ts` 这一层薄包装
- 让 `Inventory.vue` 直接依赖 owner composable 提供的行为/controls

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 detail panel 交互语义
3. 不做 multi-store 拆分
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/composables/useInventoryOutboundState.ts`
- `src/features/inventory/composables/useInventoryDetailPanels.ts`
- `src/views/Inventory.vue`
- `tests/inventory-view-guard.test.ts`

目标：
- outbound detail 打开行为归回 outbound state owner
- movement/receipt close 行为直接使用 owner composable
- `useInventoryDetailPanels.ts` 退役

---

## 5. 完成标准

至少满足：

1. detail panel helper 被删除
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
