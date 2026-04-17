# Next Phase Priority Assessment Refresh 20 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle normalization` 第一刀已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 进入 **Order lifecycle deeper normalization**

这一结论已经落地，并完成：
- `updateOrder` dependency assembly 归一到 `buildUpdateOrderLifecycleDeps()`
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第二十次刷新后）

### Order lifecycle normalization
- `server/services/orders/order.service.ts` 当前约 **221 行**
- 已完成：
  - query helper
  - read helper（list + single）
  - create helper
  - update helper
  - delete helper
  - arrive / bulk-arrive helper（含 entry wrapper）
  - stockIn helper（含 entry wrapper）
  - support helper
  - update lifecycle deps builder

说明：
- 订单域已经正式进入 deeper normalization 阶段
- 当前第一刀效果不错，但如果继续马上做 create/update 多面同时 normalization，复杂度会明显上升
- 仍然值得继续，但不一定要立即连续做第二刀

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **13 行**
- 已完成 action / state / flow / composition 多轮治理

说明：
- 当前几乎已是纯薄壳
- 再继续主要是更深层 partitioning / architecture 选择
- 不是当前最直接热点

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- extractor / typing / shared contracts 三阶段已完成

说明：
- 当前依然稳定
- 下一步主要是 deeper normalization，不是最紧迫热点

---

## 3. 新的收益排序

### 第一优先：Order lifecycle normalization（第二刀）
**推荐继续停留在订单域，但保持 normalization 级别的小步推进。**

原因：

1. 第一刀已经证明 normalization 可以在可控范围内推进
2. Inventory 与 Source-analysis 当前都更偏“可做但不急”的 deeper architecture / normalization
3. 订单域仍然是最集中、最核心的后端复杂度面

### 第二优先：Inventory store / state deeper partitioning
适合作为第二选择。

原因：
- 仍有空间
- 但下一步更偏架构判断，而不是直接的小步收益

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 当前稳定性最好
- 下一步主要是统一与提纯，而不是最紧迫热点

---

## 4. 推荐的新主线

> **继续 Order lifecycle normalization**

建议新分支方向：
- `refactor/order-lifecycle-normalization-pass2`

建议优先围绕：
1. 继续处理 create/update 中 remaining dependency assembly / normalization surface
2. 维持单切口推进，不要一次跨多个 lifecycle path
3. 保持小步、可验证的节奏

---

## 5. 与前几版决策的关系

这不是回到旧的 `pass N` 节奏，而是：

> **低风险切片阶段结束后，进入 normalization 阶段，仍然按小步验证推进。**

当前之所以继续停留在订单域，是因为：
- 第一个 normalization 切口已经验证可控
- 订单域仍然保留最值得继续投入的复杂度收益面

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，是继续订单生命周期 normalization 阶段，但仍保持一次只切一个 normalization 切口。**
