# Next Phase Priority Assessment Refresh 11 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Inventory store / state pass 6` 已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Inventory store / state pass 6**

这一结论已经落地，并完成：
- receipts / movements action 组下沉到 `inventoryStoreHistoryActions.ts`
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第十一次刷新后）

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **262 行**
- 已完成：
  - pagination helper
  - core flow helper
  - state helper
  - history actions helper
  - location/outbound flows helper

说明：
- 这条线已经把最自然的 helper / action / state 下沉做得很充分
- 下一步如果继续，更多会进入：
  - deeper store partitioning
  - composable / multi-store 设计判断
- 已经不再是当前最直接、最低风险的下一刀来源

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **336 行**
- 已完成：
  - query helper
  - create helper
  - update helper
  - delete helper
  - arrive / bulk-arrive helper
  - stockIn helper

说明：
- 订单域仍然是后端主业务的集中服务面
- 相比 Inventory 当前的“继续优化更偏设计”，订单域仍更适合继续拿结构性收益
- 下一步如果继续，会是更深层的 lifecycle normalization / contract shaping，但其业务价值仍更高

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- 三阶段治理已完成

说明：
- 当前仍处于稳定后的深化统一方向
- 不是最紧迫热点

---

## 3. 新的收益排序

### 第一优先：Order lifecycle pass 9
**推荐重新回到订单生命周期主线。**

原因：

1. Inventory store 在连续多轮之后，已经把最自然的低风险切口大多拿掉了
2. 订单域仍然保留更集中的核心服务复杂度
3. 继续推进订单域，仍然更可能带来直接的结构收益和主业务维护收益
4. Source-analysis 当前没有更高的紧迫性

### 第二优先：Inventory store / state deeper partitioning
适合作为第二选择。

原因：
- 仍有可做空间
- 但下一步更偏架构设计，而不是继续拿明显的小切口

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 当前稳定性最好
- 下一步主要是质量提升型统一，而不是最紧迫热点

---

## 4. 推荐的新主线

> **Order lifecycle pass 9**

建议新分支方向：
- `refactor/order-lifecycle-pass9`

建议优先围绕：
1. 继续处理更深的 lifecycle contract / fallback / error shaping
2. 评估 `updateOrder` / create/update shared lifecycle concerns
3. 保持小步、可验证的节奏

---

## 5. 与前几版决策的关系

这不是机械轮换，而是：

> **每完成一轮已封板主线，就基于最新 `main` 重新排序收益。**

当前之所以再次回到订单主线，是因为：
- Inventory store 已经显著收薄
- 订单域仍然是更集中、更核心的后端服务热点

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是回到订单生命周期主线，开始 pass 9。**

