# Next Phase Priority Assessment Refresh 40 (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle normalization` 第二十二刀已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 继续 **Order lifecycle normalization**

这一结论已经落地，并完成：
- contracts 层完全等价的 lifecycle alias 已收束为 canonical alias
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第四十次刷新后）

### Order lifecycle normalization
- `server/services/orders/order.service.ts` 当前约 **222 行**
- 已完成：
  - query helper（含 shared query bindings / contracts / deps aliases）
  - read helper（list + single，含 shared read bindings / contracts / deps aliases）
  - create helper（含 deps builder + shared binding types）
  - update helper（含 deps builder + shared binding types）
  - delete helper
  - arrive / bulk-arrive helper（含 entry wrapper）
  - stockIn helper（含 entry wrapper + deps builder）
  - support helper（含 shared lifecycle bindings）
  - shared order-service contracts（serialization / summary-facet / lookup / transaction / persistence / duplicate / idempotency / allocation / lifecycle core / runtime-deps alias / read-query deps alias / canonical alias consolidation）

说明：
- 订单域 normalization 已连续推进多刀，并且 contracts 层的命名噪音继续下降
- 下一步如果继续，最自然的方向会是：
  - contracts 层剩余最小的 organization / naming cleanup
  - helper-facing deps surface 的最后几处统一
- 仍然是当前最值得继续投入的热点，但必须继续保持单切口推进

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

### 第一优先：Order lifecycle normalization（继续）
**推荐继续停留在订单域 normalization 主线。**

原因：

1. contracts 层仍然在持续收束，并继续带来 bounded 收益
2. Inventory 与 Source-analysis 当前都更偏“可做但不急”的 deeper architecture / normalization 选择
3. 订单域仍然是最集中的后端复杂度收益面

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
- `refactor/order-lifecycle-normalization-pass23`

建议优先围绕：
1. 评估 contracts 层里剩余最小的 naming / organization cleanup target
2. 继续坚持一次只推进一个 normalization 面
3. 保持小步、可验证的节奏

---

## 5. 与前几版决策的关系

> **normalization 阶段仍然在产生连续收益，所以继续停留在订单域是合理的。**

当前之所以继续留在订单域，是因为：
- contracts 层继续成熟并持续带来 bounded 价值
- 订单域仍然保留最值得继续提纯的复杂度面

---

## 6. 一句话结论

> **现在最值得继续投入的一轮优化，仍然在订单域，并继续保持 normalization 阶段的一次一切口推进。**
