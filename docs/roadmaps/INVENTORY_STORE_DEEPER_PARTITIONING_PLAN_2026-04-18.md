# Inventory Store Deeper Partitioning Plan (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning`
> 范围：在 store 已经成为薄壳之后，继续做小步的 deeper partitioning，但不改变页面行为或 API contract。

---

## 1. 背景

`useInventoryStore.ts` 已经收成真正的薄壳：
- `state` 由 `inventoryStoreState.ts` 提供
- action wiring 由 `inventoryStoreActions.ts` 提供

现在继续推进，应优先选择 **更深一层但仍低风险的组合面拆分**，而不是直接做高风险 multi-store 重组。

当前最合适的小切口是：
- 把 CSV / reconciliation / outbound export surface 从 `inventoryStoreActions.ts` 中拿走
- 让 actions 组合层只关注“会触发 store state / flow 行为的 action”

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 新增独立 export-actions surface
- `inventoryStoreActions.ts` 只负责组合 stateful action groups

---

## 3. 本轮不做的事

1. 不改 Inventory API contract
2. 不改页面导出行为
3. 不做 multi-store 拆分
4. 不重写 flow/state helper
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/inventoryStoreActions.ts`
- `src/features/inventory/inventoryStoreExportActions.ts`（新增）
- `tests/inventory-view-guard.test.ts`

目标：
- 将导出 action surface 从 store action composition 中拆出
- 保持 `useInventoryStore()` 对外暴露面不变

---

## 5. 完成标准

至少满足：

1. export action surface 有独立 helper 文件
2. `inventoryStoreActions.ts` 更聚焦在 stateful action composition
3. 行为不变
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
