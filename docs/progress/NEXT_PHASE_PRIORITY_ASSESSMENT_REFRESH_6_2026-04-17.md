# Next Phase Priority Assessment Refresh 6 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Inventory store / state pass 4` 已并入 `main` 后，再次刷新下一阶段主线优先级，确保下一轮治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Inventory store / state pass 4**

这一结论已经落地，并完成：
- inventory list / min-stock / adjustment core flow helper 下沉
- 分支封板并合并回 `main`

因此现在需要重新看：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第六次刷新后）

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **344 行**
- 已完成：
  - pagination plumbing helper
  - location / outbound flow helper
  - receipts / movements history flow helper
  - inventory core flow helper

说明：
- 这条线已经完成了最自然的低风险 helper 下沉
- 继续推进当然仍可行，但下一步更像：
  - deeper state partitioning
  - 更深的 store 设计判断
- 这已经不再是前几轮那种“顺手一刀就能明显降复杂度”的阶段

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **508 行**
- 已完成：
  - create / update data shaping 收口
  - delete lifecycle helper
  - bulk arrive lifecycle helper
  - markArrived payload helper
  - stockIn transaction orchestration helper

说明：
- 订单域仍然是后端核心主服务中心
- 与 Inventory 相比，它现在仍更像“有清晰后续可收口空间的核心服务热点”
- 下一步会更偏：
  - deeper lifecycle normalization
  - contract / error shaping
  - 继续纯化 service shell

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- 三阶段治理已完成
- 当前仍然更偏稳定后的深化统一，不是最紧迫主线

---

## 3. 新的收益排序

### 第一优先：Order lifecycle deeper normalization
**推荐重新回到订单生命周期主线。**

原因：

1. 在 Inventory store 完成四轮 helper 下沉后，订单域重新成为更集中的核心服务热点
2. `order.service.ts` 仍然有明显的中心化复杂度
3. 继续推进这条线，仍能产出结构性收益，而不仅仅是细碎优化
4. 相比继续 Inventory store 深化分层，这条线的收益更直接、主业务相关度更高

### 第二优先：Inventory store / state deeper partitioning
适合作为第二选择。

原因：
- 仍有可做空间
- 但接下来需要更偏结构设计判断，而不是继续轻量 helper 抽离

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 当前已经比较稳定
- 继续深入更多是质量提升型工作，而不是热点拆解

---

## 4. 推荐的新主线

> **Order lifecycle pass 6**

建议新分支方向：
- `refactor/order-lifecycle-pass6`

建议优先围绕：
1. `create / update / getPaginatedOrders` 这类更深层 service shell 纯化
2. lifecycle contract / error shaping 一致性
3. 在不改变业务语义的前提下继续压缩 `order.service.ts`

---

## 5. 与前几版决策的关系

这不是反复横跳，而是：

> **每完成一轮已封板主线，就基于最新 `main` 重新排序收益。**

到当前为止，排序变化主要由一件事驱动：
- Inventory store 已经完成多轮低风险 helper 下沉，剩余问题从“明显热点”转向“更深的结构设计”
- 因此订单域重新成为下一轮更适合继续推进的主线

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是重新回到订单生命周期主线，开始 pass 6。**

