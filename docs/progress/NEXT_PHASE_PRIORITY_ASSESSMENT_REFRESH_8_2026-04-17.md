# Next Phase Priority Assessment Refresh 8 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle pass 7` 已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Order lifecycle pass 7**

这一结论已经落地，并完成：
- `createOrder` 的 transaction / retry / fallback orchestration 下沉到 `order.service.create.ts`
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第八次刷新后）

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **433 行**
- 已完成：
  - paginated query helper
  - delete lifecycle helper
  - arrive / bulk-arrive helper
  - stockIn transaction orchestration helper
  - createOrder orchestration helper

说明：
- 订单域仍然重要
- 但经过多轮 helper / orchestration 下沉后，主 service 已明显比之前薄
- 下一步若继续推进，最自然会是 `updateOrder` deeper cleanup，这已经进入更高设计复杂度的一档

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **344 行**
- 已完成：
  - pagination plumbing helper
  - core flows helper
  - location / outbound flows helper
  - receipts / movements history flows helper

说明：
- Inventory store 仍是前端层面最清晰的集中状态中心
- 虽然已多轮收口，但剩余流和状态仍集中在一个 store 内
- 与订单域相比，继续推进这条线更容易形成下一轮“小而稳”的状态分层收益

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- extractor / typing / shared types 三阶段已完成

说明：
- 当前仍是稳定后的深化统一方向，不是最紧迫主线

---

## 3. 新的收益排序

### 第一优先：Inventory store / state pass 5
**推荐重新回到 Inventory 主线。**

原因：

1. Inventory store 仍然是一个清晰且持续存在的状态中心
2. 在订单域完成 `createOrder` orchestration 下沉后，继续去碰 `updateOrder` 的复杂度已明显高于继续收 Inventory store
3. 这条线仍然更容易切出低风险、小粒度、可快速验证的下一刀
4. Source-analysis 当前没有更高的紧迫性

### 第二优先：Order lifecycle deeper normalization
适合作为第二选择。

原因：
- 订单域仍是核心业务流中心
- 但下一刀更可能是较深的 `updateOrder` contract / fallback / error shaping 清理，复杂度上升更明显

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 当前已较稳定
- 下一步更多是质量提升型统一，而不是最紧迫热点

---

## 4. 推荐的新主线

> **Inventory store / state pass 5**

建议新分支方向：
- `refactor/inventory-store-pass5`

建议优先围绕：
1. 继续梳理 store 中剩余集中状态与 flow block
2. 评估是否值得做更深的 state partitioning / composable extraction
3. 保持“低风险切口优先”的节奏

---

## 5. 与前几版决策的关系

这不是简单轮换，而是：

> **每完成一轮已封板主线，就基于最新 `main` 重新排序收益。**

当前之所以重新回到 Inventory：
- 订单域已经通过连续多轮把最自然的 orchestration 大块收掉了
- Inventory store 仍然保持着更适合继续小步推进的集中状态面

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是回到 Inventory store / state 主线，开始 pass 5。**

