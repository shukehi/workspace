# Next Phase Priority Assessment Refresh 70 (2026-04-18)

> 状态：当前决策文档。
> 用途：在 `Inventory store deeper partitioning` 第一刀已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 把主线切回 **Inventory store / state deeper partitioning**

这一结论已经落地，并完成：
- export-only action surface 已从 `inventoryStoreActions.ts` 中拆出
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第七十次刷新后）

### Inventory store / state deeper partitioning
- `src/stores/useInventoryStore.ts` 当前约 **13 行**
- `inventoryStoreActions.ts` 继续收束，export-only surface 已抽到：
  - `inventoryStoreExportActions.ts`

说明：
- Inventory 线已经从“薄壳已成”进入“组合层进一步分区”阶段
- 这一刀证明 deeper partitioning 仍然能稳定拿到收益
- 下一步若继续，最自然的方向会是：
  - 继续收紧 action composition 边界
  - 或进一步判断是否需要更深的 composable regrouping / multi-store 切分

### Order lifecycle normalization
- `server/services/orders/order.service.ts` 当前约 **222 行**
- 订单域已经完成长序列 normalization，并进入 very-low-yield tail stage

说明：
- 仍可继续，但已经不再是默认最优先主线
- 如果 Inventory 还能继续稳定拿到收益，应优先留在 Inventory

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
1. 这轮 deeper partitioning 第一刀已经证明仍能稳定拿到收益
2. Inventory 的下一步虽然更偏结构判断，但依然比订单域尾段 cleanup 更值得做
3. 订单域当前已进入 very-low-yield tail stage，不宜因为惯性继续停留

### 第二优先：Order lifecycle normalization（尾段收尾备用线）
原因：
- 仍可继续
- 但应作为后备线，而不是当前主线

### 第三优先：Source-analysis deeper normalization
保持第三优先。

---

## 4. 推荐的新主线

> **继续 Inventory store / state deeper partitioning**

建议新分支方向：
- `refactor/inventory-store-deeper-partitioning-pass2`

建议动作：
1. 继续盘点 `inventoryStoreActions.ts` 剩余组合层责任
2. 选择一个小而稳的 regrouping 切口
3. 避免直接跳到高风险 multi-store 方案

---

## 5. 一句话结论

> **Inventory 主线已经重新进入正收益区，当前最合理的是继续沿 Inventory deeper partitioning 往下推进。**
