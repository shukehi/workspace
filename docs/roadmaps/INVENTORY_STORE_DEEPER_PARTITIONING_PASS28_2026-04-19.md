# Inventory Store Deeper Partitioning Pass 28 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass28`
> 范围：在 location query/dialog state 已各自独立拥有后，继续删除 `useInventoryLocationState.ts` 这一层薄组合包装，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 location 相关 state 已分别拥有明确 owner：
- `useInventoryLocationQueryState.ts`
- `useInventoryLocationDialogState.ts`

而 `useInventoryLocationState.ts` 仅负责把两者拼在一起后再转发给 `Inventory.vue`，已经成为一层纯中转包装。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 删除 `useInventoryLocationState.ts`
- 让 `Inventory.vue` 直接依赖 location query owner 与 dialog owner

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 location 查询或 dialog 语义
3. 不做 multi-store 拆分
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/composables/useInventoryLocationState.ts`
- `src/features/inventory/composables/useInventoryLocationQueryState.ts`
- `src/features/inventory/composables/useInventoryLocationDialogState.ts`
- `src/views/Inventory.vue`
- `tests/inventory-view-guard.test.ts`

目标：
- thin wrapper 被删除
- view 直接使用两个 canonical owner

---

## 5. 完成标准

至少满足：

1. `useInventoryLocationState.ts` 被删除
2. `Inventory.vue` 直接组合 query/dialog owner
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
