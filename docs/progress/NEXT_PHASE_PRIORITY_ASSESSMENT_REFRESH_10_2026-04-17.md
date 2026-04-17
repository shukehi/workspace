# Next Phase Priority Assessment Refresh 10 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle pass 8` 已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Order lifecycle pass 8**

这一结论已经落地，并完成：
- `updateOrder` orchestration 下沉到 `order.service.update.ts`
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第十次刷新后）

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **336 行**
- 已完成：
  - query helper
  - create helper
  - update helper
  - delete helper
  - arrive/bulk-arrive helper
  - stockIn helper

说明：
- 订单域仍是核心，但主 service 已明显收薄
- 继续推进会更偏“deeper normalization / contracts / error shaping”，已经不再是当前最直接的低风险热点

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **306 行**
- 已完成：
  - pagination helper
  - core flow helper
  - location / outbound flow helper
  - receipts / movements history flow helper
  - state/computed initialization helper

说明：
- Inventory 仍然保留一个清晰的单点 store
- 继续推进这条线，更可能仍能切出清楚的小阶段收益
- 相比订单域当前更像“下一轮更适合继续拿低风险收益”的对象

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- extractor / typing / shared types 三阶段已完成

说明：
- 当前仍处于稳定后的深化统一方向
- 不是最紧迫热点

---

## 3. 新的收益排序

### 第一优先：Inventory store / state pass 6
**推荐重新回到 Inventory 主线。**

原因：

1. `useInventoryStore.ts` 当前仍是一个清晰的状态中心
2. 订单域在 pass 8 后已经进入更深的 normalization 范畴，下一刀的复杂度明显上升
3. Inventory 更适合继续切出新的小阶段成果
4. Source-analysis 当前没有更高的紧迫性

### 第二优先：Order lifecycle deeper normalization
适合作为第二选择。

原因：
- 订单域依然重要
- 但下一步更像 deeper contract/error shaping，而不是继续拿明显的低风险 orchestration 大块

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 当前稳定性最好
- 下一阶段主要是质量提升型统一，而不是最紧迫热点

---

## 4. 推荐的新主线

> **Inventory store / state pass 6**

建议新分支方向：
- `refactor/inventory-store-pass6`

建议优先围绕：
1. 继续识别 store 中剩余最集中、最值得切出的状态/flow 边界
2. 判断是否需要更轻量的 composable / helper 化，而不是直接深度分 store
3. 维持“低风险切口优先”的节奏

---

## 5. 与前几版决策的关系

这不是简单轮换，而是：

> **每完成一轮已封板主线，就基于最新 `main` 重新排序收益。**

当前之所以重新回到 Inventory：
- 订单域已经把最核心的 orchestration 块连续收走
- Inventory 仍然保留一个更适合继续切小刀的集中状态面

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是回到 Inventory store / state 主线，开始 pass 6。**

