# Next Phase Priority Assessment Refresh 2 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Inventory store / state pass 2` 已并入 `main` 后，再次刷新下一阶段主线优先级，避免沿用过时判断。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 优先做 **Inventory store / state pass 2**

这一结论已经落地，并完成：
- 分页 plumbing helper 下沉
- location / outbound flow helper 下沉
- 分支封板并合并回 `main`

因此现在需要重新看：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（再次刷新后）

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **365 行**
- 已完成：
  - query / export helper 下沉
  - pagination plumbing helper 下沉
  - location / outbound flow helper 下沉
- 仍可继续收 `receipts` / `movements` flow，但已经不再是最集中的单点风险

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **524 行**
- 已完成：
  - helper 抽离
  - create / update / stock-in 多轮收口
  - delete lifecycle helper
  - bulk arrive lifecycle helper
- 仍然是后端核心主域中心 service
- 如果继续推进，仍有：
  - `markArrived` 与 arrive 小流转整理
  - 更深的 lifecycle contract / error shaping
  - service shell 继续纯化

### Source-analysis
- `src/services/sourceAnalysis.ts` 约 **91 行**
- extractor / typing / shared types 三阶段均已完成
- 目前更偏“精修深化”而不是“高收益热点收口”

---

## 3. 新的收益排序

### 第一优先：Order lifecycle deeper normalization
**推荐重新回到订单生命周期主线。**

原因：

1. `order.service.ts` 重新成为最集中的剩余核心热点
2. 前几轮已经把继续推进的地面铺平
3. 继续做 pass 4，能更稳定地压缩主 service 的生命周期噪音
4. 相比继续 Inventory store 或 source-analysis deeper normalization，收益更直接

### 第二优先：Inventory store / state pass 3
适合作为第二选择。

原因：
- 仍有 receipts / movements flow 可继续下沉
- 但当前 store 已明显更轻，继续做的收益已经下降一档

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 结构、局部类型、shared types 都已成型
- 下一阶段更多是质量提升型统一，而不是最紧迫热点

---

## 4. 推荐的新主线

> **Order lifecycle pass 4**

建议新分支方向：
- `refactor/order-lifecycle-pass4`

建议优先围绕：
1. `markArrived` 小流转整理
2. arrive / bulk-arrive 生命周期共享 contract
3. 如果前两项顺利，再判断是否继续收更深的 lifecycle error shaping

---

## 5. 与前两版决策的关系

- 第一版：适用于 `Order lifecycle pass 3` 开始前
- 第二版：适用于 `Inventory store / state pass 2` 开始前
- 这一版：适用于 `Inventory store / state pass 2` 已完成并合并后

这不是前后矛盾，而是：

> **每一轮阶段完成后，都按最新 `main` 重新排序收益。**

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是重新回到订单生命周期主线，开始 Order lifecycle pass 4。**

