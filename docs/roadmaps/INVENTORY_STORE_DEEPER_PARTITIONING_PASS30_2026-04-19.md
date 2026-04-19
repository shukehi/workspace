# Inventory Store Deeper Partitioning Pass 30 (2026-04-19)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-deeper-partitioning-pass30`
> 范围：在 outbound query/reverse/detail/submit state 已各自独立拥有后，继续把 outbound list behavior 从综合 outbound composable 中拆出为独立 owner，而不改变页面行为或交互逻辑。

---

## 1. 背景

当前 `useInventoryOutboundState.ts` 仍同时承担：
- 出库列表加载逻辑
- 筛选变化后的 watch / page reset
- warehouse/location filter 联动修正
- 导出正式出库记录
- 翻页行为

这些职责已经围绕同一个“outbound list behavior”聚合，适合作为下一刀独立 owner 提炼。

---

## 2. 本轮目标

继续做 Inventory deeper partitioning：
- 把 outbound list behavior 提炼到独立 helper
- 让 `useInventoryOutboundState.ts` 更接近 owner composition shell

---

## 3. 本轮不做的事

1. 不改 Inventory 页面行为
2. 不改 outbound 列表、导出、翻页语义
3. 不做 multi-store 拆分
4. 不做更大范围 composable 重组
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/features/inventory/composables/useInventoryOutboundState.ts`
- `src/features/inventory/composables/useInventoryOutboundListState.ts`（新增）
- `tests/inventory-view-guard.test.ts`
- `docs/README.md`

目标：
- load/export/page/watch/filer-coherence 拥有独立 owner
- outbound state composable 只组合各 owner 并保留最薄的 surface assembly

---

## 5. 完成标准

至少满足：

1. outbound list behavior 拥有独立 helper
2. `useInventoryOutboundState.ts` 不再内联整组 load/export/pagination/watch 逻辑
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
