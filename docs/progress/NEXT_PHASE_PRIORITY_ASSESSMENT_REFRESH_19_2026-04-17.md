# Next Phase Priority Assessment Refresh 19 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle pass 13` 已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Order lifecycle pass 13**

这一结论已经落地，并完成：
- `stockInOrder` entry wrapper 下沉到 `order.stockin.ts`
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第十九次刷新后）

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **229 行**
- 已完成：
  - query helper
  - read helper（list + single）
  - create helper
  - update helper
  - delete helper
  - arrive / bulk-arrive helper（含 entry wrapper）
  - stockIn helper（含 entry wrapper）
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
- 这条线当前不是最直接、最低风险的下一刀来源

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- extractor / typing / shared contracts 三阶段已完成

说明：
- 当前依然稳定
- 下一步主要是 deeper normalization，不是最紧迫热点

---

## 3. 新的收益排序

### 第一优先：Order lifecycle deeper normalization
**推荐继续留在订单生命周期主线，但从这里开始不再用“低风险切片 pass N”视角，而改为 deeper normalization 视角。**

原因：

1. Inventory store 已经收薄到几乎纯薄壳，继续推进会明显进入更深层架构选择
2. 订单域仍保留更集中的主服务复杂度，但接下来将不再是同等级的低风险 wrapper/helper 切口
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

> **Order lifecycle deeper normalization**

建议新分支方向：
- `refactor/order-lifecycle-normalization`

建议优先围绕：
1. 评估剩余 `order.service.ts` 的真正复杂度来源
2. 从 wrapper/helper 拆分转向 contract / normalization / service-surface 统一
3. 保持小步、可验证的节奏，但接受这已进入下一层级工作

---

## 5. 与前几版决策的关系

这不是机械轮换，而是：

> **当低风险切片几乎拿尽时，路线会从“继续拆小刀”切换到“开始 deeper normalization”。**

当前之所以不再命名为 `pass 14`，是因为：
- 订单域与 Inventory store 都已把最明显的低风险切口拿得很深
- 再往下的收益来自更深层统一，而不是继续同形态地抽一个 wrapper

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，仍然在订单域，但它已经进入 deeper normalization 阶段，而不是继续按同等级低风险切片推进。**
