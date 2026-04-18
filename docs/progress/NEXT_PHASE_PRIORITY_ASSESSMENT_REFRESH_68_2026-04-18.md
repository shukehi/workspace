# Next Phase Priority Assessment Refresh 68 (2026-04-18)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle normalization` 第五十一刀已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 继续 **Order lifecycle normalization**

这一结论已经落地，并完成：
- update helper 的 helper-local function export 已收束为文件内局部函数
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第六十八次刷新后）

### Order lifecycle normalization
- `server/services/orders/order.service.ts` 当前约 **222 行**
- 已完成：
  - query helper（含 shared query bindings / contracts / deps aliases）
  - read helper（list + single，含 shared read bindings / contracts / deps aliases）
  - create helper（含 deps builder + shared binding types，helper-local function 已收束）
  - update helper（含 deps builder + shared binding types，helper-local function 已收束）
  - delete helper
  - arrive / bulk-arrive helper（含 entry wrapper，local result type 已收束）
  - stockIn helper（含 entry wrapper + deps builder）
  - support helper（含 shared lifecycle bindings）
  - shared contracts 已退场，helper 直接持有剩余显式签名依赖

说明：
- 订单域 normalization 已明确进入 **后期尾段**
- 后续如果继续，最自然的方向会是：
  - helper/module surface 的最后几刀收束
  - 或认真判断是否切回 Inventory 主线
- 仍然可继续，但收益已继续缩小

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **13 行**
- 已完成 action / state / flow / composition 多轮治理

说明：
- 当前几乎已是纯薄壳
- 再继续主要是更深层 partitioning / architecture 选择
- 与订单域剩余尾段收益已非常接近

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- extractor / typing / shared contracts 三阶段已完成

说明：
- 当前依然稳定
- 下一步主要是 deeper normalization，不是最紧迫热点

---

## 3. 新的收益排序

### 第一优先：Order lifecycle normalization（谨慎继续）
**仍可继续，但已经非常接近应切回别的主线。**

原因：
1. 订单域仍有最后几刀 helper/module-surface cleanup 可做
2. 但收益已显著低于前一阶段的 contracts-layer 清理
3. 下一刀之后应认真判断是否还值得继续停留在订单域

### 第二优先：Inventory store / state deeper partitioning
现在已经非常接近第一优先。

原因：
- Inventory 仍有更深层次的结构判断空间
- 若订单域下一刀收益继续下降，这条线很可能成为更优先选择

### 第三优先：Source-analysis deeper normalization
仍保持第三优先。

原因：
- 当前稳定性最好
- 下一步主要是统一与提纯，而不是最紧迫热点

---

## 4. 推荐的新主线

> **Order lifecycle normalization 仍可继续一刀，但下一刀之后应重新判断是否切回 Inventory。**

建议新分支方向：
- `refactor/order-lifecycle-normalization-pass52`

建议额外约束：
1. 只选一个极小切口
2. 如果下一刀收益不再明显，应暂停订单域主线并重新切回 Inventory
3. 不再因惯性继续切小步清理

---

## 5. 一句话结论

> **订单域仍可继续，但已经进入非常接近收尾的阶段；下一刀之后应认真重新评估是否继续停留在这条主线上。**
