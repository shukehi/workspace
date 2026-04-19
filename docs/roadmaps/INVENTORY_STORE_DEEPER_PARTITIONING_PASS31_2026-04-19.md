# Inventory Store Deeper Partitioning Pass 31 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass31`
> 范围：在 page query/movement detail state 已各自独立拥有后，继续把 inventory page list behavior 从综合 page composable 中拆出为独立 owner，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 `useInventoryPageState.ts` 仍同时承担：
- inventory list load logic
- warehouse/location coherence watch
- query/filter watch 触发刷新
- inventory / reconciliation export behavior
- movement detail owner 的组合

这些职责已经围绕同一个“inventory page list behavior”聚合，适合作为下一刀独立 owner 提炼。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 把 inventory page list behavior 提炼到独立 helper
- 让 `useInventoryPageState.ts` 更接近 cross-owner composition shell

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 inventory list / export / filter 语义
3. 不做 multi-store 拆分
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/composables/useInventoryPageState.ts`
- `src/features/inventory/composables/useInventoryPageListState.ts`（新增）
- `tests/inventory-view-guard.test.ts`
- `docs/README.md`

目标：
- load/export/filter-watch/coherence 拥有独立 owner
- page state composable 只组合各 owner 并保留最薄的 surface assembly

---

## 5. 完成标准

至少满足：

1. inventory page list behavior 拥有独立 helper
2. `useInventoryPageState.ts` 不再内联整组 load/export/watch 逻辑
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
