# Inventory Store Deeper Partitioning Pass 18 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass18`
> 范围：在 reverse/detail wrapper 已退役后，继续把 outbound query/filter state 从综合 composable 中拆出为独立 owner，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 `useInventoryOutboundState.ts` 同时承担：
- query/filter refs
- pagination refs
- derived summary / available locations / total pages
- fetch/export/reverse/detail 行为

这些 query/filter state 更像一个独立所有权面，与出库提交/冲销/detail 行为并不完全同层。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 把 outbound query/filter state 提炼到独立 helper
- 让 `useInventoryOutboundState.ts` 更专注于行为编排与效果触发

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 outbound 查询/分页语义
3. 不做 multi-store 拆分
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/composables/useInventoryOutboundState.ts`
- `src/features/inventory/composables/useInventoryOutboundQueryState.ts`（新增）
- `tests/inventory-view-guard.test.ts`
- `docs/README.md`

目标：
- query/filter/pagination/derived state 拥有独立 owner
- outbound state composable 只组合该 owner 并保留行为层责任

---

## 5. 完成标准

至少满足：

1. outbound query/filter state 拥有独立 helper
2. `useInventoryOutboundState.ts` 不再内联整组 query/filter refs
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
