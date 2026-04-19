# Inventory Store Deeper Partitioning Pass 36 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass36`
> 范围：把 receipt query/filter/page state 从 `useInventoryReceiptRouteState.ts` 提炼到独立 helper，而不改变路由同步、筛选语义或页面行为。

---

## 1. 背景

当前 receipt route 相关逻辑仍把两类职责放在同一个 composable：
- query/filter/page refs 与 fetch params 构造
- route query 同步与 watch 驱动刷新

这已经形成一个清晰的小切口：query state 应该先有自己的 owner，再由 route shell 负责同步与 orchestration。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 把 receipt query/filter/page state 提炼到独立 helper
- 让 `useInventoryReceiptRouteState.ts` 更接近 route sync shell

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 receipt route query 语义
3. 不改 fetch params 形状
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/composables/useInventoryReceiptQueryState.ts`（新增）
- `src/features/inventory/composables/useInventoryReceiptRouteState.ts`
- `tests/inventory-receipt-route-state.test.ts`
- `tests/inventory-view-guard.test.ts`
- `docs/README.md`

目标：
- receipt query/filter/page state 拥有独立 owner
- route composable 只组合 canonical query owner 与 route-sync/watch 行为

---

## 5. 完成标准

至少满足：

1. receipt query/filter/page state 拥有独立 helper
2. `useInventoryReceiptRouteState.ts` 不再内联整组 receipt query refs/debounced/build params 逻辑
3. 路由同步与页面行为不变
4. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/inventory-view-guard.test.ts tests/inventory-receipt-route-state.test.ts tests/inventory-receipt-flow.test.ts tests/inventory-receipt-route-state.test.ts tests/inventory-route.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
