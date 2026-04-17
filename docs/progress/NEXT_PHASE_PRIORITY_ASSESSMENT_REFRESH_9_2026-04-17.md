# Next Phase Priority Assessment Refresh 9 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Inventory store / state pass 5` 已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Inventory store / state pass 5**

这一结论已经落地，并完成：
- store state/computed 初始化下沉到 `inventoryStoreState.ts`
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第九次刷新后）

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **306 行**
- 已完成：
  - pagination helper
  - core flows helper
  - location/outbound flows helper
  - receipts/movements history flows helper
  - state/computed initialization helper

说明：
- 这条线已经完成了最自然的一整组低风险 helper 下沉
- 继续推进当然仍可行，但下一步更像：
  - deeper store partitioning
  - 更细的状态/组合式设计判断
- 已经不再是“当前最直接的低风险高收益热点”

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **433 行**
- 已完成：
  - paginated query helper
  - delete lifecycle helper
  - arrive / bulk-arrive helper
  - stockIn transaction orchestration helper
  - createOrder orchestration helper

说明：
- 与 Inventory 相比，订单域当前仍然保留更集中的核心服务复杂度
- 下一步虽然会进入 `updateOrder` 相关 deeper cleanup，但它依然是主业务中心更高价值的一条线

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- extractor / typing / shared types 三阶段已完成

说明：
- 当前依旧更像稳定后的深化统一方向，而不是最紧迫热点

---

## 3. 新的收益排序

### 第一优先：Order lifecycle pass 8
**推荐重新回到订单生命周期主线。**

原因：

1. `order.service.ts` 当前仍明显比 `useInventoryStore.ts` 更集中、更靠近核心业务语义
2. Inventory 当前如果继续推进，下一步会更偏架构设计判断，而不是继续拿到明显低风险切口
3. 订单域继续推进仍有结构收益，尤其是 `updateOrder` 这类剩余大块
4. Source-analysis 当前没有更高的紧迫性

### 第二优先：Inventory store / state deeper partitioning
适合作为第二选择。

原因：
- 仍然有可做空间
- 但下一步更偏结构设计，不再是同等低风险的一刀

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 当前已较稳定
- 下一步主要是质量提升型统一，而不是当前最紧迫热点

---

## 4. 推荐的新主线

> **Order lifecycle pass 8**

建议新分支方向：
- `refactor/order-lifecycle-pass8`

建议优先围绕：
1. `updateOrder` 的更深层 orchestration / fallback / error shaping 收口
2. 继续压缩 `order.service.ts` 主体
3. 保持“小步、单切口、全量验证”的节奏

---

## 5. 与前几版决策的关系

这不是简单轮换，而是：

> **每完成一轮已封板主线，就基于最新 `main` 重新排序收益。**

当前之所以重新回到订单主线，是因为：
- Inventory 已完成多轮低风险下沉
- 订单域仍保留更集中、业务更核心的剩余复杂度

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是重新回到订单生命周期主线，开始 pass 8。**

