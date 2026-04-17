# Next Phase Priority Assessment Refresh 18 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle pass 12` 已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Order lifecycle pass 12**

这一结论已经落地，并完成：
- `markArrived` / `bulkMarkArrived` entry wrapper 下沉到 `order.service.arrive.ts`
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第十八次刷新后）

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **229 行**
- 已完成：
  - query helper
  - read helper（list + single）
  - create helper
  - update helper
  - delete helper
  - arrive / bulk-arrive helper（含 entry wrapper）
  - stockIn helper
  - support helper

说明：
- 订单域已经把最自然的 low-risk lifecycle / read-path / support 切口收得很深
- 下一步如果继续，更多会进入：
  - deeper normalization
  - shared contract shaping
  - 更高复杂度的 service-surface cleanup
- 仍有价值，但不再是当前最直接、最低风险的一刀来源

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **13 行**
- 已完成：
  - pagination helper
  - core flow helper
  - core actions helper
  - state helper
  - history flows / history actions helper
  - location / outbound flow helper
  - location / outbound actions helper
  - action composition helper

说明：
- store 主体已经几乎是纯薄壳
- 再继续做 Inventory，明显会进入更深层 partitioning / multi-store / composable strategy 决策
- 这条线当前已经不再是最直接、最低风险的下一刀来源

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- extractor / typing / shared contracts 三阶段已完成

说明：
- 当前依然稳定
- 下一步主要是 deeper normalization，不是最紧迫热点

---

## 3. 新的收益排序

### 第一优先：Order lifecycle pass 13
**推荐继续留在订单生命周期主线。**

原因：

1. Inventory store 已经收薄到几乎纯薄壳，继续推进会明显进入更深层架构选择
2. 订单域虽然也推进很多轮，但仍保留更集中的主服务复杂度
3. Source-analysis 当前依旧最稳定、最不急迫

### 第二优先：Inventory store / state deeper partitioning
适合作为第二选择。

原因：
- 仍有空间
- 但下一步更偏架构判断，而不是继续拿明显的低风险切口

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 当前稳定性最好
- 下一步主要是质量提升型统一，而不是最紧迫热点

---

## 4. 推荐的新主线

> **Order lifecycle pass 13**

建议新分支方向：
- `refactor/order-lifecycle-pass13`

建议优先围绕：
1. 继续处理剩余 service surface / deeper normalization 切口
2. 评估最小且仍行为保持的下一刀
3. 保持小步、可验证的节奏

---

## 5. 与前几版决策的关系

这不是机械轮换，而是：

> **每完成一轮已封板主线，就基于最新 `main` 重新排序收益。**

当前之所以继续保留订单主线，是因为：
- Inventory store 已经收薄到几乎纯薄壳
- 订单域仍是更值得继续切小刀的后端热点

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是继续订单生命周期主线，开始 pass 13。**
