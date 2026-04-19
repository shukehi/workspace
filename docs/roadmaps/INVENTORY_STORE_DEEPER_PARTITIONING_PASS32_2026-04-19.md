# Inventory Store Deeper Partitioning Pass 32 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass32`
> 范围：在 page query/list/movement detail state 已各自独立拥有后，继续删除 `useInventoryPageState.ts` 这一层薄组合包装，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 inventory page 相关 state 已分别拥有明确 owner：
- `useInventoryPageQueryState.ts`
- `useInventoryPageListState.ts`
- `useInventoryMovementDetailState.ts`

而 `useInventoryPageState.ts` 仅负责把三者拼在一起后再转发给 `Inventory.vue`，已经成为一层纯中转包装。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 删除 `useInventoryPageState.ts`
- 让 `Inventory.vue` 直接依赖 page query/list/movement canonical owners

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 inventory filter / export / movement detail 语义
3. 不做 multi-store 拆分
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/composables/useInventoryPageState.ts`
- `src/features/inventory/composables/useInventoryPageQueryState.ts`
- `src/features/inventory/composables/useInventoryPageListState.ts`
- `src/features/inventory/composables/useInventoryMovementDetailState.ts`
- `src/views/Inventory.vue`
- `tests/inventory-view-guard.test.ts`

目标：
- thin wrapper 被删除
- view 直接使用三个 canonical owner

---

## 5. 完成标准

至少满足：

1. `useInventoryPageState.ts` 被删除
2. `Inventory.vue` 直接组合 query/list/movement owners
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
