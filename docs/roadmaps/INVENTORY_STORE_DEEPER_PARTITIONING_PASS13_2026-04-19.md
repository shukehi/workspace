# Inventory Store Deeper Partitioning Pass 13 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass13`
> 范围：在 payload canonical source 已进一步归位后，继续把 receipt audit result typing 归回 receipt flow 模块，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 receipt audit result shape 仍在多处出现：
- `useInventoryReceiptFlow.ts`（真实 owner）
- `useInventoryDetailPanels.ts`

`selectedReceiptAudit` 的数据来源与计算都由 receipt flow 负责，因此它的 result type 更适合由 receipt flow 模块导出，并让 detail panel 层依赖该 canonical type。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 统一 receipt audit result type source
- 让 detail panel 层依赖 receipt flow 模块导出的 canonical audit type

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 receipt audit 运行逻辑
3. 不做 multi-store 拆分
4. 不引入新依赖
5. 不做更大范围 composable 重组

---

## 4. 推荐切口

建议在：
- `src/features/inventory/composables/useInventoryReceiptFlow.ts`
- `src/features/inventory/composables/useInventoryDetailPanels.ts`
- `tests/inventory-view-guard.test.ts`

目标：
- receipt flow 成为 audit result type 的唯一 canonical source
- detail panel 不再重复定义同一 result shape

---

## 5. 完成标准

至少满足：

1. receipt audit result type 只保留一个 canonical source
2. detail panel 层不再重复定义它
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
