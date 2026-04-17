# Next Phase Priority Assessment Refresh 5 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle pass 5` 已并入 `main` 后，再次刷新下一阶段主线优先级，确保下一轮治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Order lifecycle pass 5**

这一结论已经落地，并完成：
- `stockInOrder` 事务编排下沉到 `order.stockin.ts`
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第五次刷新后）

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **508 行**
- 已完成：
  - create / update data shaping 收口
  - delete lifecycle helper
  - bulk arrive lifecycle helper
  - markArrived payload helper
  - stockIn transaction orchestration helper

说明：
- 订单域依然重要
- 但最直接、最低风险、最显眼的 lifecycle block 已经被连续拿掉
- 继续往下做会更偏“deeper normalization / contract shaping”，复杂度和设计判断都会上升

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **353 行**
- 已完成：
  - pagination plumbing helper
  - location / outbound flow helper
  - receipts / movements history flow helper

说明：
- store 已明显变薄，但仍是一个清晰的状态中心
- 剩余逻辑仍集中在单 store 中
- 如果继续推进，仍有较低风险的状态/flow 收口空间

### Source-analysis
- `src/services/sourceAnalysis.ts` 约 **91 行**
- extractor / local typing / shared types 都已完成阶段治理

说明：
- 当前已进入“稳定后深化”阶段
- 短期收益仍然低于订单域和 Inventory state 层

---

## 3. 新的收益排序

### 第一优先：Inventory store / state pass 4
**推荐重新回到 Inventory 主线。**

原因：

1. Inventory store 仍然是前端层面最清晰的集中状态中心
2. 继续推进这条线，仍有相对低风险的收益空间
3. 相比订单域继续做 deeper lifecycle normalization，Inventory 下一步更容易形成小而稳的新阶段成果
4. Source-analysis 当前没有更高的紧迫性

### 第二优先：Order lifecycle deeper normalization
适合作为第二选择。

原因：
- 订单域仍是核心业务流中心
- 但下一步更像“更深层设计整理”，不再是前几刀那种直接低风险切口

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 当前结构、类型与共享 contracts 已比较稳定
- 下一步主要是质量提升型统一，而不是最紧迫热点

---

## 4. 推荐的新主线

> **Inventory store / state pass 4**

建议新分支方向：
- `refactor/inventory-store-pass4`

建议优先围绕：
1. 继续收 store 中剩余的状态/flow block
2. 评估是否值得把 store 再分层，而不是直接拆成多个 store
3. 保持“低风险切口优先”的节奏

---

## 5. 与前几版决策的关系

- 第一版：Order lifecycle pass 3 前
- 第二版：Inventory store / state pass 2 前
- 第三版：Order lifecycle pass 4 前
- 第四版：Inventory store / state pass 3 前
- 这一版：Order lifecycle pass 5 已完成并合并后

这不是反复横跳，而是：

> **每完成一轮已封板主线，就基于最新 `main` 重新排序收益。**

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是回到 Inventory store / state 主线，开始 pass 4。**

