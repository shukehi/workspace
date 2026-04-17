# Next Phase Priority Assessment Refresh 14 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle pass 10` 已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Order lifecycle pass 10**

这一结论已经落地，并完成：
- `getAllOrders` read helper 下沉到 `order.service.read.ts`
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第十四次刷新后）

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **225 行**
- 已完成：
  - query helper
  - read helper
  - create helper
  - update helper
  - delete helper
  - arrive / bulk-arrive helper
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
- `src/stores/useInventoryStore.ts` 当前约 **227 行**
- 已完成：
  - pagination helper
  - core flow helper
  - core actions helper
  - state helper
  - history flows / history actions helper
  - location / outbound flow helper

说明：
- store 主体虽然也已很薄，但相比订单域更适合继续切“小而稳”的剩余 surface
- 下一步仍可围绕：
  - deeper partitioning
  - remaining action surface normalization
- 以当前热点分布看，它重新成为收益/风险比最好的主线

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- extractor / typing / shared contracts 三阶段已完成

说明：
- 当前依然稳定
- 下一步主要是 deeper normalization，不是最紧迫热点

---

## 3. 新的收益排序

### 第一优先：Inventory store / state pass 8
**推荐重新回到 Inventory store / state 主线。**

原因：

1. 订单域已经推进到 read/support/helper 基本齐备，继续往下会进入更深的 normalization 判断
2. Inventory store 虽然也推进很多轮，但仍保留更适合继续拿“小而稳”收口的一段 surface
3. Source-analysis 当前依旧最稳定、最不急迫

### 第二优先：Order lifecycle deeper normalization
适合作为第二选择。

原因：
- 仍有价值
- 但下一步更偏 deeper normalization，而不是继续拿明显的低风险切口

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 当前稳定性最好
- 下一步主要是质量提升型统一，而不是最紧迫热点

---

## 4. 推荐的新主线

> **Inventory store / state pass 8**

建议新分支方向：
- `refactor/inventory-store-pass8`

建议优先围绕：
1. 继续处理 store 中剩余的 action / partitioning surface
2. 评估最小且仍行为保持的下一刀
3. 保持小步、可验证的节奏

---

## 5. 与前几版决策的关系

这不是机械轮换，而是：

> **每完成一轮已封板主线，就基于最新 `main` 重新排序收益。**

当前之所以切回 Inventory，是因为：
- 订单域已经推进到更深层 normalization 阶段
- Inventory store 重新成为更值得继续切小刀的前端状态热点

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是回到 Inventory store / state 主线，开始 pass 8。**
