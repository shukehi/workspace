# Next Phase Priority Assessment Refresh (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle pass 3` 已并入 `main` 后，重新评估下一阶段最值得投入的主线，保留上一版决策历史，不直接覆盖。

---

## 1. 为什么要刷新判断

上一版优先级评估推荐：

> 先做 **Order lifecycle pass 3**

这个判断已经落地，并完成：
- `deleteOrder` lifecycle helper 下沉
- `bulkMarkArrived` lifecycle helper 下沉
- 分支封板并合并回 `main`

因此，当前最合理的问题已经变成：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（刷新后）

### Inventory 状态层
- `src/stores/useInventoryStore.ts` 当前约 **376 行**
- 仍然同时承载：
  - inventory / receipt / outbound / movement 多条 fetch 流
  - 多分页状态
  - location / outbound / receipt 相关请求编排
- 虽然 query/export helpers 已下沉，但它仍然是 Inventory 域最明显的状态中心

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **524 行**
- 已完成：
  - helper 抽离
  - create/update data shaping 收口
  - stock-in 收口
  - delete lifecycle 收口
  - bulk arrive lifecycle 收口
- 剩余仍可做，但已经从“高收益主热点”下降到“可继续优化的核心服务”

### Source-analysis
- `src/services/sourceAnalysis.ts` 当前约 **91 行**
- `dataExtractors.ts` 已是纯聚合层
- extractor 拆分 / 局部类型收紧 / shared types 第一轮已完成
- 这条线已经进入“可以继续深化，但并不紧急”的状态

---

## 3. 新的收益排序

### 第一优先：Inventory store / state layer 继续治理
**推荐作为当前下一轮主线。**

原因：

1. `useInventoryStore.ts` 仍是前端主域中最集中的状态中心
2. 这条线此前主要收的是 view / page coordination，store 仍有继续瘦身空间
3. 现在切回 Inventory，不会打断已经完成的 Order lifecycle 阶段边界
4. 相比 source-analysis deeper normalization，收益更直接、风险更低

### 第二优先：Order lifecycle deeper normalization
适合作为第二选择。

原因：
- 订单域仍然重要
- 但 pass 3 之后，收益最高的低风险切口已经先收掉了
- 再继续会进入更深的 lifecycle contract / shared error shaping，节奏可以稍后再开

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 当前已经足够稳定
- 下一阶段更偏“质量提升型深化”，不是最急迫热点

---

## 4. 推荐的新主线

> **Inventory state/store pass 2**

建议新分支方向：
- `refactor/inventory-store-pass2`

建议优先围绕：
1. receipt / outbound / movement fetch 编排拆分
2. 分页/查询状态的进一步下沉
3. 让 `useInventoryStore.ts` 更聚焦于状态容器，而不是继续承载过多流程细节

---

## 5. 与上一版决策的关系

- 上一版评估：适用于 **Order lifecycle pass 3 开始前**
- 这一版评估：适用于 **Order lifecycle pass 3 已完成并合并后**

所以这不是推翻前一版，而是：

> **在主线状态发生变化后，重新按收益排序。**

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是 Inventory store / state layer 的第二阶段治理。**

