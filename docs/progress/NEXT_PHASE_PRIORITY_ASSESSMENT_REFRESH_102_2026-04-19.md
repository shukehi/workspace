# Next Phase Priority Assessment Refresh 102 (2026-04-19)

> 状态：当前决策文档。
> 用途：在 `Inventory deeper partitioning` 第三十三刀已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 继续 **Inventory store / state deeper partitioning**

这一结论已经再次落地，并完成：
- outbound thin wrapper 已删除
- view 直接依赖 outbound canonical owners
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第102次刷新后）

### Inventory store / state deeper partitioning
- `src/stores/useInventoryStore.ts` 当前约 **13 行**
- `inventoryStoreActions.ts` 当前约 **13 行**
- `inventoryStoreStatefulActions.ts` 当前约 **41 行**
- `inventoryStoreState.ts` 当前约 **26 行**
- `inventoryStoreFlows.ts` 已成为 location / outbound / outbound reverse payload 的 canonical type owner
- `inventoryStoreHistoryFlows.ts` 已成为 receipt reverse payload 的 canonical type owner
- `useInventoryOutboundQueryState.ts` 已成为 outbound query/filter/pagination/derived state 的 canonical owner
- `useInventoryOutboundListState.ts` 已成为 outbound list-facing load/export/pagination/watch behavior 的 canonical owner
- `useInventoryOutboundReverseState.ts` 已成为 outbound reverse refs/behavior 的 canonical owner
- `useInventoryOutboundDetailState.ts` 已成为 outbound detail refs/open-close lifecycle 的 canonical owner
- `useInventoryOutboundSubmitState.ts` 已成为 outbound submit refs/behavior 的 canonical owner
- `useInventoryReceiptAuditState.ts` 已成为 receipt audit refs/result/open-close lifecycle 的 canonical owner
- `useInventoryReceiptReverseState.ts` 已成为 receipt reverse refs/behavior 的 canonical owner
- `useInventoryPageQueryState.ts` 已成为 page query/filter/derived state 的 canonical owner
- `useInventoryPageListState.ts` 已成为 page list-facing load/export/filter-watch/coherence behavior 的 canonical owner
- `useInventoryMovementDetailState.ts` 已成为 movement detail refs/summary/open-close lifecycle 的 canonical owner
- `useInventoryLocationQueryState.ts` 已成为 location query/filter state 的 canonical owner
- `useInventoryLocationDialogState.ts` 已成为 location dialog refs/behavior 的 canonical owner
- `useInventoryLocationState.ts` / `useInventoryReceiptFlow.ts` / `useInventoryPageState.ts` / `useInventoryOutboundState.ts` 已退役
- view 层已直接接入 canonical owners for location / receipt / page / outbound paths

说明：
- Inventory 线继续稳定拿到 ownership / payload source / result-type / control-type / query-state regrouping / list-state regrouping / reverse-state regrouping / detail-state regrouping / submit-state regrouping / audit-state regrouping / movement-detail regrouping / wrapper deletion 收益
- 当前最明显的剩余复杂度已进一步集中在极少数 canonical owner composable 自身，而不是 store shell、view alias、或 thin wrapper
- 下一步若继续，最自然的方向会是：
  - 重新评估是否继续沿 Inventory owner 内部细分推进仍有足够边际收益
  - 或切回其他主线（Order / Source）做新的 bounded slice

### Order lifecycle normalization
- `server/services/orders/order.service.ts` 当前约 **222 行**
- 订单域已经进入明显尾段，继续收益较低

说明：
- 仍可继续
- 但更适合作为后备线，而不是当前默认主线

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- extractor / typing / shared contracts 三阶段已完成

说明：
- 当前稳定
- 仍不是最紧迫热点

---

## 3. 新的收益排序

### 第一优先：Inventory store / state deeper partitioning（谨慎继续）
**仍推荐停留在 Inventory 主线，但已进入更需要节制的阶段。**

原因：
1. 第三十三刀仍然拿到了真实收益
2. 但 wrapper / owner 边界已经非常清楚，后续再切的收益可能开始递减
3. 下一刀应更认真评估是否仍值得继续留在 Inventory

### 第二优先：Order lifecycle normalization（尾段收尾备用线）
原因：
- 仍可继续
- 但收益已明显进入尾段

### 第三优先：Source-analysis deeper normalization
保持第三优先。

---

## 4. 推荐的新主线

> **Inventory store / state deeper partitioning（谨慎继续）**

建议新分支方向：
- `refactor/inventory-store-deeper-partitioning-pass34`

建议动作：
1. 先盘点 remaining owner composable 内部 mixed concerns 是否仍有清晰小切口
2. 若没有，就不要因惯性继续拆分
3. 必要时重新切回其它主线

---

## 5. 一句话结论

> **Inventory 主线仍在正收益区，但已经进入更需要节制和重新评估边际收益的阶段。**
