# Inventory Store Deeper Partitioning Pass 2 (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass2`
> 范围：在 export surface 已独立后，继续收束 stateful action composition，但不改变页面行为或 API contract。

---

## 1. 背景

上一刀已经把 export-only surface 从 `inventoryStoreActions.ts` 中拆走。当前 `inventoryStoreActions.ts` 剩余的主要职责是：
- 组合 core actions
- 组合 history actions
- 组合 flow actions
- 返回聚合后的 stateful actions

这仍然是一层明确的 wiring / regrouping 责任，适合再向下收一刀。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 新增独立的 stateful-action composition helper
- `inventoryStoreActions.ts` 只负责组合：
  - stateful actions
  - export actions

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
- `src/features/inventory/inventoryStoreActions.ts`
- `src/features/inventory/inventoryStoreStatefulActions.ts`（新增）
- `tests/inventory-view-guard.test.ts`

目标：
- 将 core/history/flow action composition 从 `inventoryStoreActions.ts` 中拆出
- 保持 `useInventoryStore()` 对外暴露面不变

---

## 5. 完成标准

至少满足：

1. stateful action composition 有独立 helper 文件
2. `inventoryStoreActions.ts` 更聚焦在最终对外 surface 拼装
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
