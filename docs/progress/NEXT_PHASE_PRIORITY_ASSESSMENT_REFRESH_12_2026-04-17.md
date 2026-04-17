# Next Phase Priority Assessment Refresh 12 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle pass 9` 已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Order lifecycle pass 9**

这一结论已经落地，并完成：
- order number / duplicate / idempotency support helper 下沉到 `order.service.support.ts`
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第十二次刷新后）

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **236 行**
- 已完成：
  - query helper
  - create helper
  - update helper
  - delete helper
  - arrive / bulk-arrive helper
  - stockIn helper
  - support helper

说明：
- 订单域已经把最自然的 lifecycle / support 小切口收得很深
- 下一步如果继续，更多会进入：
  - deeper normalization
  - shared contract shaping
  - 更高复杂度的 read-path / surface cleanup
- 仍有价值，但不再是当前最直接、最低风险的一刀来源

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **262 行**
- 已完成：
  - pagination helper
  - core flow helper
  - state helper
  - history actions helper
  - location/outbound flows helper

说明：
- store 仍是前端状态中心，但相比订单域更适合继续拿“小而稳”的切口
- 下一步仍可继续朝：
  - deeper partitioning
  - action-group / state-surface 进一步收口
- 以当前 `main` 的热点分布看，它重新成为收益/风险比最好的主线

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- extractor / typing / shared contracts 三阶段已完成

说明：
- 当前依然稳定
- 下一步主要是 deeper normalization，不是最紧迫热点

---

## 3. 新的收益排序

### 第一优先：Inventory store / state pass 7
**推荐重新回到 Inventory store / state 主线。**

原因：

1. 订单域已经完成到 support helper 这一轮，继续往下会进入明显更深的 normalization 判断
2. Inventory store 虽然也推进多轮，但仍然保留更适合继续切“小而稳”收口的状态中心特征
3. Source-analysis 当前仍然最稳定、最不急迫

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

> **Inventory store / state pass 7**

建议新分支方向：
- `refactor/inventory-store-pass7`

建议优先围绕：
1. 继续缩薄 `useInventoryStore.ts` 的剩余 action surface
2. 评估剩余可独立下沉的 state/action group
3. 保持小步、可验证的节奏

---

## 5. 与前几版决策的关系

这不是机械轮换，而是：

> **每完成一轮已封板主线，就基于最新 `main` 重新排序收益。**

当前之所以切回 Inventory，是因为：
- 订单域已经推进到 support helper 这一层
- Inventory store 重新成为“还能继续低风险切小刀”的前端热点

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是回到 Inventory store / state 主线，开始 pass 7。**
