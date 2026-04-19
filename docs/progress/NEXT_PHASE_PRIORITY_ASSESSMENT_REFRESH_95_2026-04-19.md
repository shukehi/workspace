# Next Phase Priority Assessment Refresh 95 (2026-04-19)

> 状态：当前决策文档。
> 用途：在 `Inventory deeper partitioning` 第二十六刀已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 继续 **Inventory store / state deeper partitioning**

这一结论已经再次落地，并完成：
- location query/filter state 已收回到独立 owner helper
- location state composable 不再内联整组 search/filter refs 与 filtered state
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第九十五次刷新后）

### Inventory store / state deeper partitioning
- `src/stores/useInventoryStore.ts` 当前约 **13 行**
- `inventoryStoreActions.ts` 当前约 **13 行**
- `inventoryStoreStatefulActions.ts` 当前约 **41 行**
- `inventoryStoreState.ts` 当前约 **26 行**
- `inventoryStoreFlows.ts` 已成为 location / outbound / outbound reverse payload 的 canonical type owner
- `inventoryStoreHistoryFlows.ts` 已成为 receipt reverse payload 的 canonical type owner
- `useInventoryOutboundQueryState.ts` 已成为 outbound query/filter/pagination/derived state 的 canonical owner
- `useInventoryOutboundReverseState.ts` 已成为 outbound reverse refs/behavior 的 canonical owner
- `useInventoryOutboundDetailState.ts` 已成为 outbound detail refs/open-close lifecycle 的 canonical owner
- `useInventoryOutboundSubmitState.ts` 已成为 outbound submit refs/behavior 的 canonical owner
- `useInventoryReceiptAuditState.ts` 已成为 receipt audit refs/result/open-close lifecycle 的 canonical owner
- `useInventoryReceiptReverseState.ts` 已成为 receipt reverse refs/behavior 的 canonical owner
- `useInventoryPageQueryState.ts` 已成为 page query/filter/derived state 的 canonical owner
- `useInventoryMovementDetailState.ts` 已成为 movement detail refs/summary/open-close lifecycle 的 canonical owner
- `useInventoryLocationQueryState.ts` 已成为 location query/filter state 的 canonical owner
- `useInventoryLocationState.ts` 更接近 location dialog behavior orchestration shell
- `useInventoryPageState.ts` 更接近 page-level orchestration shell
- `useInventoryOutboundState.ts` 更接近 list-level outbound orchestration shell
- `useInventoryReceiptFlow.ts` 更接近 receipt orchestration shell

说明：
- Inventory 线继续稳定拿到 ownership / payload source / result-type / control-type / query-state regrouping / reverse-state regrouping / detail-state regrouping / submit-state regrouping / audit-state regrouping / movement-detail regrouping / location-query regrouping 收益
- 当前最明显的剩余复杂度已集中在少数 orchestration composable 的残余 mixed behavior concerns，而不是 store shell、view alias、或 helper duplication
- 下一步若继续，最自然的方向会是：
  - 继续围绕 `useInventoryOutboundState.ts` / `useInventoryReceiptFlow.ts` / `useInventoryPageState.ts` / `useInventoryLocationState.ts` 做小而稳的行为层 regrouping
  - 或重新判断是否该从 Inventory 线切换到其他主线

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

### 第一优先：Inventory store / state deeper partitioning（继续）
**推荐继续停留在 Inventory 主线。**

原因：
1. deeper partitioning 第二十六刀再次证明仍能稳定拿到收益
2. Inventory 仍有可控的小切口，而不必立刻跳到高风险 multi-store 方案
3. 订单域当前更适合作为备用线，而不是默认主线

### 第二优先：Order lifecycle normalization（尾段收尾备用线）
原因：
- 仍可继续
- 但收益已明显进入尾段

### 第三优先：Source-analysis deeper normalization
保持第三优先。

---

## 4. 推荐的新主线

> **继续 Inventory store / state deeper partitioning**

建议新分支方向：
- `refactor/inventory-store-deeper-partitioning-pass27`

建议动作：
1. 继续盘点 Inventory composable 内部剩余的 ownership / type / binding 交叉点
2. 选择一个小而稳的 regrouping / ownership 切口
3. 暂不直接进入 multi-store 拆分

---

## 5. 一句话结论

> **Inventory 主线仍然在正收益区，当前最合理的是继续沿 Inventory deeper partitioning 往下推进。**
