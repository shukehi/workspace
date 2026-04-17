# Next Phase Priority Assessment Refresh 4 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Inventory store / state pass 3` 已并入 `main` 后，再次刷新下一阶段主线优先级，保留前几轮刷新结论作为历史决策链。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Inventory store / state pass 3**

这一结论已经落地，并完成：
- `receipts` history flow helper 下沉
- `movements` history flow helper 下沉
- 分支封板并合并回 `main`

因此现在需要重新看：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第四次刷新后）

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **353 行**
- 已完成：
  - query / export helper 下沉
  - pagination plumbing helper 下沉
  - location / outbound flow helper 下沉
  - receipts / movements history flow helper 下沉
- 仍可继续整理，但已经从“明显集中热点”进一步下降为“可继续精修的 store”

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **519 行**
- 已完成：
  - create / update / stock-in 第一轮收口
  - delete lifecycle helper
  - bulk arrive lifecycle helper
  - markArrived payload helper
- 当前最明显剩余热点集中在：
  - `stockInOrder`
  - 更深的 lifecycle contract / error shaping
  - 继续把 service 向 orchestration shell 纯化

说明：
- 订单域再次成为最集中的剩余核心热点
- 继续推进的收益重新超过 Inventory store

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- 三阶段治理已完成
- 当前更偏“稳定后的深化统一”，不是最紧迫主线

---

## 3. 新的收益排序

### 第一优先：Order lifecycle deeper normalization
**推荐重新回到订单生命周期主线。**

原因：

1. `order.service.ts` 重新成为剩余最集中的核心服务热点
2. `stockInOrder` 仍是一块明显的大型事务编排逻辑
3. 前几轮已经把 delete / arrive 相关的较小流转铺平，继续做下一刀顺势
4. 相比继续 Inventory store 或 source-analysis deeper normalization，收益更直接

### 第二优先：Inventory store / state pass 4
适合作为第二选择。

原因：
- 仍有继续轻量化空间
- 但当前 store 已经明显更薄，继续做的边际收益开始下降

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 当前稳定性已经较好
- 下一阶段更偏质量提升型统一，而不是最紧迫热点

---

## 4. 推荐的新主线

> **Order lifecycle pass 5**

建议新分支方向：
- `refactor/order-lifecycle-pass5`

建议优先围绕：
1. `stockInOrder` 进一步收口
2. stock-in 相关 lifecycle contract / helper 一致性整理
3. 如果前两项顺利，再判断是否继续更深的 error shaping

---

## 5. 与前几版决策的关系

- 第一版：适用于 `Order lifecycle pass 3` 开始前
- 第二版：适用于 `Inventory store / state pass 2` 开始前
- 第三版：适用于 `Order lifecycle pass 4` 开始前
- 这一版：适用于 `Inventory store / state pass 3` 已完成并合并后

这不是前后矛盾，而是：

> **每完成一轮已封板主线，就基于最新 `main` 重新排序收益。**

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是重新回到订单生命周期主线，开始 pass 5，并优先收 `stockInOrder`。**

