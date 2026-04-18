# Inventory Store Deeper Partitioning Pass 4 (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass4`
> 范围：在 state type/source 已收束后，继续把 raw refs 与 derived selectors 分层，但不改变页面行为或 API contract。

---

## 1. 背景

当前 `inventoryStoreState.ts` 既负责：
- 基础 refs / loading / page state
- derived computed selectors

这两类职责已经可以继续切开。当前最合适的小切口是：
- 将 sorted/filtered computed selectors 抽到独立 helper
- 让 state factory 更聚焦于 raw state ownership

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 新增独立 derived-state helper
- `inventoryStoreState.ts` 更聚焦于 refs / loading / page state

---

## 3. 本轮不做的事

1. 不改 Inventory API contract
2. 不改页面行为
3. 不做 multi-store 拆分
4. 不改 state/helper 运行语义
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/inventoryStoreState.ts`
- `src/features/inventory/inventoryStoreDerivedState.ts`（新增）
- `tests/inventory-view-guard.test.ts`

目标：
- raw state 与 derived selector 分层
- 保持 `createInventoryStoreState()` 对外返回 shape 不变

---

## 5. 完成标准

至少满足：

1. derived selectors 有独立 helper 文件
2. `inventoryStoreState.ts` 更聚焦在 raw refs / loading / page state
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
