# Inventory Store Deeper Partitioning Pass 19 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass19`
> 范围：在 outbound query state 已独立拥有后，继续把 receipt audit state 从综合 receipt flow 中拆出为独立 owner，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 `useInventoryReceiptFlow.ts` 同时承担：
- reverse dialog state / behavior
- receipt audit state / derived audit result
- audit 打开 / 关闭 / 协调逻辑

其中 audit state 更像一个独立所有权面，与 reverse dialog 行为并不完全同层。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 把 receipt audit state 提炼到独立 helper
- 让 `useInventoryReceiptFlow.ts` 更专注于 reverse behavior orchestration

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 receipt audit / reverse 语义
3. 不做 multi-store 拆分
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/composables/useInventoryReceiptFlow.ts`
- `src/features/inventory/composables/useInventoryReceiptAuditState.ts`（新增）
- `tests/inventory-view-guard.test.ts`
- `docs/README.md`

目标：
- audit state/result 拥有独立 owner
- receipt flow composable 只组合该 owner 并保留 reverse 行为层责任

---

## 5. 完成标准

至少满足：

1. receipt audit state 拥有独立 helper
2. `useInventoryReceiptFlow.ts` 不再内联整组 audit refs/computed
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
