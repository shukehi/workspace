# Inventory Store Deeper Partitioning Pass 26 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass26`
> 范围：在 outbound/page/receipt 已持续拆分后，继续把 location search/filter state 从综合 location composable 中拆出为独立 owner，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 `useInventoryLocationState.ts` 同时承担：
- location search query
- filtered locations derived state
- location dialog state
- location submit/open behavior

其中 search/filter state 已足够形成一个稳定的小切口。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 把 location search/filter state 提炼到独立 helper
- 让 `useInventoryLocationState.ts` 更专注于 dialog state 与 submit behavior

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 location submit / dialog 语义
3. 不做 multi-store 拆分
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/composables/useInventoryLocationState.ts`
- `src/features/inventory/composables/useInventoryLocationQueryState.ts`（新增）
- `tests/inventory-view-guard.test.ts`
- `docs/README.md`

目标：
- location search/filter refs 与 derived state 拥有独立 owner
- location state composable 只组合该 owner 并保留 dialog / submit 责任

---

## 5. 完成标准

至少满足：

1. location query/filter state 拥有独立 helper
2. `useInventoryLocationState.ts` 不再内联整组 search/filter refs
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
