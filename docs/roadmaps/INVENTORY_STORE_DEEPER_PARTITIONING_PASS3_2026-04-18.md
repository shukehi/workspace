# Inventory Store Deeper Partitioning Pass 3 (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass3`
> 范围：在 action composition 已进一步分层后，继续收束 state ownership/type source，但不改变页面行为或 API contract。

---

## 1. 背景

当前 Inventory store 相关文件间仍有一处不够理想的类型依赖：
- `InventoryStoreState` 类型定义挂在 `inventoryStoreActions.ts`
- 但它实际来源于 `createInventoryStoreState()`
- `inventoryStoreStatefulActions.ts` 反向从 action 文件拿这个类型

这让 state source 与 type source 不完全一致，也形成了不必要的横向依赖。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 把 `InventoryStoreState` 类型归还到 `inventoryStoreState.ts`
- 让 action/stateful helper 都从 state 模块读取 canonical state type

---

## 3. 本轮不做的事

1. 不改 Inventory API contract
2. 不改页面行为
3. 不做 multi-store 拆分
4. 不改 flow/state/helper 运行语义
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/inventoryStoreState.ts`
- `src/features/inventory/inventoryStoreActions.ts`
- `src/features/inventory/inventoryStoreStatefulActions.ts`
- `tests/inventory-view-guard.test.ts`

目标：
- state type 的 canonical source 与 state factory 保持一致
- action composition 层不再反向承载 state type source

---

## 5. 完成标准

至少满足：

1. `InventoryStoreState` 从 `inventoryStoreState.ts` 导出
2. action/stateful helper 都改为依赖 state 模块的类型源
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
