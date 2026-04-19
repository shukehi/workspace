# Inventory Store Deeper Partitioning Pass 34 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass34`
> 范围：在 location query state 与 dialog state 已各自拥有后，继续把 location submit behavior 从 dialog owner 中拆出为独立 owner，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 `useInventoryLocationDialogState.ts` 仍同时承担：
- dialog refs / editing location state
- create / update submit behavior
- saving state

其中 submit behavior 已足够形成一个稳定的小切口。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 把 location submit behavior 提炼到独立 helper
- 让 `useInventoryLocationDialogState.ts` 更专注于 dialog refs / editing state owner

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 location dialog / submit 语义
3. 不做 multi-store 拆分
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/composables/useInventoryLocationDialogState.ts`
- `src/features/inventory/composables/useInventoryLocationSubmitState.ts`（新增）
- `src/views/Inventory.vue`
- `tests/inventory-view-guard.test.ts`
- `docs/README.md`

目标：
- dialog refs/editing state 与 submit behavior 拥有各自 owner
- view 直接组合 query/dialog/submit 三个 canonical owner

---

## 5. 完成标准

至少满足：

1. location submit behavior 拥有独立 helper
2. `useInventoryLocationDialogState.ts` 不再内联 submit behavior
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
