# Next Phase Priority Assessment Refresh 69 (2026-04-18)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle normalization` 第五十二刀已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 继续 **Order lifecycle normalization，但已经非常接近应该切回 Inventory 的边界**

这一结论已经落地，并完成：
- stock-in helper 的 helper-local function export 已收束为文件内局部函数
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第六十九次刷新后）

### Order lifecycle normalization
- `server/services/orders/order.service.ts` 当前约 **222 行**
- 已完成：
  - query helper（含 shared query bindings / deps alias 清理）
  - read helper（list + single，含 shared read bindings / deps alias 清理）
  - create helper（deps builder + binding cleanup + helper-local function 收束）
  - update helper（deps builder + binding cleanup + helper-local function 收束）
  - delete helper
  - arrive / bulk-arrive helper（entry wrapper + helper-local result type 收束）
  - stockIn helper（entry wrapper + deps builder + helper-local function 收束）
  - support helper（shared lifecycle bindings）
  - shared contracts 已退场，helper 直接持有剩余显式签名依赖

说明：
- 订单域 normalization 已进入非常后期的尾段
- 再继续仍然可以做，但已经明显进入“最后几刀”区域
- 后续收益已不再像早期那样明确、连续、低风险

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **13 行**
- 已完成 action / state / flow / composition 多轮治理

说明：
- 当前几乎是纯薄壳
- 下一步主要是更深层 partitioning / architecture 选择
- 但与订单域尾段 cleanup 相比，**现在开始重新变成更值得切换评估的主线**

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- extractor / typing / shared contracts 三阶段已完成

说明：
- 当前依然稳定
- 下一步主要是 deeper normalization，不是最紧迫热点

---

## 3. 新的收益排序

### 第一优先：Inventory store / state deeper partitioning
**推荐把主线切回 Inventory。**

原因：
1. 订单域已经完成了长序列 normalization，小切口的边际收益显著下降
2. Inventory 虽然已是薄壳，但下一阶段的 deeper partitioning 已重新成为更值得投入的结构优化面
3. 继续停留在订单域，更容易因为惯性而做收益有限的尾部清理

### 第二优先：Order lifecycle normalization（可继续，但不再是第一优先）
原因：
- 仍有空间
- 但已经进入 very-low-yield tail work
- 更适合作为后备线，而不是默认主线

### 第三优先：Source-analysis deeper normalization
保持第三优先。

原因：
- 当前稳定性最好
- 下一步主要是统一与提纯，不是最紧迫热点

---

## 4. 推荐的新主线

> **现在最合理的是切回 Inventory store / state deeper partitioning。**

建议新分支方向：
- `refactor/inventory-store-deeper-partitioning`

建议动作：
1. 重新盘点 `useInventoryStore` 之外的 helper 组合面
2. 确认是否需要多-store / composable regrouping
3. 避免在订单域继续做低收益尾部清理

---

## 5. 一句话结论

> **Order lifecycle normalization 已足够深，当前最合理的下一步，是切回 Inventory 主线。**
