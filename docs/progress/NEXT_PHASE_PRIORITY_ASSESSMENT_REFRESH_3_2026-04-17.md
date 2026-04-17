# Next Phase Priority Assessment Refresh 3 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle pass 4` 已并入 `main` 后，再次刷新下一阶段主线优先级，保留前两轮刷新结论作为历史决策链。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Order lifecycle pass 4**

这一结论已经落地，并完成：
- `markArrived` payload shaping 下沉到 arrive helper
- 分支封板并合并回 `main`

因此现在需要重新看：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第三次刷新后）

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **365 行**
- 已完成：
  - query / export helper 下沉
  - pagination plumbing helper 下沉
  - location / outbound flow helper 下沉
- 仍保留：
  - receipts flow
  - movements flow
  - 以及一部分状态编排

说明：
- 这是当前前端剩余最集中的状态层热点
- 继续推进 pass 3 仍然会有直接收益

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **519 行**
- 已完成：
  - create / update / stock-in 第一轮收口
  - delete lifecycle helper
  - bulk arrive lifecycle helper
  - markArrived payload helper
- 当前最明显剩余热点，基本集中到：
  - `stockInOrder`
  - 更深的 lifecycle shared contract / error shaping

说明：
- 订单域仍然重要
- 但 pass 4 之后，下一刀开始会比前面几轮更深入、更偏“深化优化”而不是“明显低风险收口”

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- 三阶段治理已完成
- 当前更偏“可继续深化，但不急迫”

---

## 3. 新的收益排序

### 第一优先：Inventory store / state pass 3
**推荐重新回到 Inventory 主线。**

原因：

1. `useInventoryStore.ts` 再次成为剩余最清晰、最直接的前端热点
2. 这条线还有多个现成的低风险切口（receipts / movements flow）
3. 相比订单域继续深入 `stockInOrder`，Inventory store 下一刀更轻、更容易形成新阶段成果
4. 继续做这条线的 review 成本和收益比目前更优

### 第二优先：Order lifecycle deeper normalization
适合作为第二选择。

原因：
- 订单域仍是核心
- 但下一步更可能进入中等复杂度的 deeper cleanup，而不是像前几刀一样直接切一个明显低风险块

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 当前已足够稳定
- 下一阶段更多是质量提升型深入统一，不是最紧迫热点

---

## 4. 推荐的新主线

> **Inventory store / state pass 3**

建议新分支方向：
- `refactor/inventory-store-pass3`

建议优先围绕：
1. `receipts` flow helper
2. `movements` flow helper
3. 如果前两项顺利，再判断是否继续更深的 state partitioning

---

## 5. 与前几版决策的关系

- 第一版：适用于 `Order lifecycle pass 3` 开始前
- 第二版：适用于 `Inventory store / state pass 2` 开始前
- 第三版：适用于 `Order lifecycle pass 4` 开始前
- 这一版：适用于 `Order lifecycle pass 4` 已完成并合并后

这不是前后矛盾，而是：

> **每完成一轮已封板主线，就基于最新 `main` 重新排序收益。**

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是回到 Inventory store / state 主线，开始 pass 3。**

