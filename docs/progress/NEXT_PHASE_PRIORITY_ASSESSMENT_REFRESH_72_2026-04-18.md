# Next Phase Priority Assessment Refresh 72 (2026-04-18)

> 状态：当前决策文档。
> 用途：在 `Inventory deeper partitioning` 第三刀已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 继续 **Inventory store / state deeper partitioning**

这一结论已经落地，并完成：
- `InventoryStoreState` 已回到 state 模块，成为 canonical type source
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第七十二次刷新后）

### Inventory store / state deeper partitioning
- `src/stores/useInventoryStore.ts` 当前约 **13 行**
- `inventoryStoreActions.ts` 已是最终 surface 组合层
- `inventoryStoreStatefulActions.ts` 已承接 core/history/flow wiring
- `inventoryStoreState.ts` 现在同时是 state factory 与 canonical state type source

说明：
- Inventory 线继续稳定拿到结构收益
- 组合层、导出层、state ownership 现在都比之前清晰
- 下一步若继续，最自然的方向会是：
  - 继续收紧 helper 之间的依赖方向
  - 或进入更深一层的 composable / multi-store 方案判断

### Order lifecycle normalization
- `server/services/orders/order.service.ts` 当前约 **222 行**
- 订单域已进入尾段，继续收益较低

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
1. deeper partitioning 第三刀再次证明仍能稳定拿到收益
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
- `refactor/inventory-store-deeper-partitioning-pass4`

建议动作：
1. 继续盘点 helper 之间剩余的 ownership / type / binding 交叉点
2. 选择一个小而稳的 regrouping / ownership 切口
3. 暂不直接进入 multi-store 拆分

---

## 5. 一句话结论

> **Inventory 主线仍然在正收益区，当前最合理的是继续沿 Inventory deeper partitioning 往下推进。**
