# Inventory Store Deeper Partitioning Pass 35 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass35`
> 范围：在 receipt audit/reverse owner 已成型后，继续把 receipt list-facing behavior 从 `Inventory.vue` 提炼到独立 helper，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 receipt 相关逻辑仍有一块留在 `Inventory.vue`：
- `filteredReceipts`
- `receiptSummary`
- `receiptTotalPages`
- `loadReceipts`
- `nextReceiptPage` / `prevReceiptPage`
- `handleExportReceipts`

这是一组围绕 receipt list/filter/export/paging 的同质职责，已经足够形成一个稳定的小切口。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 把 receipt list-facing behavior 提炼到独立 helper
- 让 `Inventory.vue` 更接近 owner composition shell

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 receipt query / export / paging 语义
3. 不做 multi-store 拆分
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/views/Inventory.vue`
- `src/features/inventory/composables/useInventoryReceiptListState.ts`（新增）
- `tests/inventory-view-guard.test.ts`
- `docs/README.md`

目标：
- receipt list-facing summary/export/paging/load 拥有独立 owner
- view 只组合 canonical owners

---

## 5. 完成标准

至少满足：

1. receipt list-facing behavior 拥有独立 helper
2. `Inventory.vue` 不再内联整组 receipt list summary/export/paging/load 逻辑
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
