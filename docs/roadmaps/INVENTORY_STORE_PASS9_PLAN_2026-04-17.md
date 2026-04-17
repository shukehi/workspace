# Inventory Store / State Pass 9 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-pass9`
> 范围：继续收口 `useInventoryStore.ts`，优先处理剩余 action helper 的组合面，让 store 更接近纯 state 壳，但不改变页面行为或 API contract。

---

## 1. 背景

在前几轮 store/state 收口后，已经完成：

- pagination helper
- core flow helper
- core actions helper
- state helper
- history flows / history actions helper
- location / outbound flow helper
- location / outbound actions helper

当前 `useInventoryStore.ts` 中剩余最自然的一块，是：
- 多组 action helper 的组合与对外暴露

这部分虽然不大，但仍让 store 主体承担 helper wiring 细节。

---

## 2. 本轮目标

继续把剩余自包含的 action composition surface 下沉，让 `useInventoryStore.ts` 更接近：

- state container
- helper 组合后的对外壳

本轮优先顺序：
1. action composition helper
2. 如果这一刀顺利，再判断是否还需要更深的 partitioning

---

## 3. 本轮不做的事

1. 不改页面行为
2. 不改 API contract
3. 不拆成多个 Pinia store
4. 不改 Inventory domain model
5. 不引入新依赖

---

## 4. 推荐切口

建议 helper 模块：
- `src/features/inventory/inventoryStoreActions.ts`

优先承接：
- core/history/flow action helper 组合
- store export action surface

---

## 5. 完成标准

至少满足：

1. action helper wiring 不再直接内联在 store 中
2. store 中剩余逻辑更接近纯 state/container 壳
3. 全量门禁保持全绿

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
