# Inventory Store Deeper Partitioning Pass 17 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass17`
> 范围：在 reverse/detail wrapper 已退役后，继续去掉 `Inventory.vue` 中针对 owner composable state 的本地别名层，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 `Inventory.vue` 已直接依赖 owner composable：
- `useInventoryOutboundState.ts`
- `useInventoryReceiptFlow.ts`

但 view 层仍保留一组纯转发别名，例如：
- `reverseReceiptDialogOpen = reverseDialogOpen`
- `reverseOutboundConfirmOpen = reverseOutboundDialogOpen`
- `closeReceiptAuditPanel = closeReceiptAudit`

这些别名没有新增语义，只让 view 多一层绑定中转。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 删除 `Inventory.vue` 中的本地 alias 层
- 让模板直接依赖 owner composable 提供的 state / action 名称

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 reverse/detail 交互语义
3. 不做 multi-store 拆分
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/views/Inventory.vue`
- `tests/inventory-view-guard.test.ts`
- `docs/README.md`

目标：
- 移除本地 alias 常量
- 模板直接使用 owner composable 的原始字段/方法名

---

## 5. 完成标准

至少满足：

1. view 层不再保留纯转发 alias 常量
2. 模板直接绑定 owner composable 字段/方法
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
