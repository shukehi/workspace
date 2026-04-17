# Next Phase Priority Assessment Refresh 7 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle pass 6` 已并入 `main` 后，再次刷新下一阶段主线优先级，保证后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Order lifecycle pass 6**

这一结论已经落地，并完成：
- `getPaginatedOrders` 组装逻辑下沉到 `order.service.query.ts`
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第七次刷新后）

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **478 行**
- 已完成：
  - create / update data shaping 收口
  - delete lifecycle helper
  - arrive / bulk-arrive helper
  - stockIn transaction orchestration helper
  - paginated query helper

说明：
- 尽管已经连续收口多轮，订单域仍然是后端最集中的核心 service 热点
- 当前剩余最值得继续处理的块，更偏：
  - `createOrder`
  - `updateOrder`
  - 更深的 lifecycle contract / fallback / error shaping
- 这些块的复杂度和业务影响仍高于前端 store 剩余的零散流转

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **344 行**
- 已完成：
  - pagination helper
  - core flows helper
  - location / outbound flows helper
  - receipts / movements history flows helper

说明：
- 这条线已经进入“相对稳定、可继续深化但不再是最尖锐热点”的状态
- 若继续做，下一步更像更深层的 state partitioning 设计判断，而不是继续拿明显低风险切口

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- extractor / typing / shared types 三阶段已完成

说明：
- 当前仍然不是最紧迫主线
- 继续推进更多是质量提升型统一，而不是当前最高收益点

---

## 3. 新的收益排序

### 第一优先：Order lifecycle pass 7
**推荐继续留在订单生命周期主线。**

原因：

1. `order.service.ts` 仍是当前最集中的核心服务热点
2. 与 Inventory 相比，订单域剩余复杂度更靠近核心业务语义与主流程稳定性
3. 继续推进订单域，仍能带来更高的结构收益和维护收益
4. Inventory 这条线当前已经没有同等明显的低风险“下一刀”优势

### 第二优先：Inventory store / state deeper partitioning
适合作为第二选择。

原因：
- 仍有可做空间
- 但下一步更偏结构设计，而不是立即可拿的清晰 helper 切口

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 当前已比较稳定
- 下一步主要是进一步统一 contracts / normalization，不是最紧迫热点

---

## 4. 推荐的新主线

> **Order lifecycle pass 7**

建议新分支方向：
- `refactor/order-lifecycle-pass7`

建议优先围绕：
1. `createOrder` deeper cleanup
2. `updateOrder` deeper cleanup
3. fallback / duplicate / error shaping 一致性

并继续保持：
- 不改 API contract
- 先切小块再判断是否继续扩大

---

## 5. 与前几版决策的关系

这不是反复摇摆，而是：

> **每完成一轮已封板主线，就基于最新 `main` 重新排序收益。**

当前之所以重新回到订单主线，是因为：
- Inventory store 已经过多轮低风险 helper 下沉
- 订单域虽然也推进了多轮，但仍然保留了更集中、更核心的复杂块

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是继续订单生命周期主线，开始 pass 7。**

