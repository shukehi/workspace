# Next Phase Priority Assessment Refresh 66 (2026-04-18)

> 状态：当前决策文档。
> 用途：在 `Order lifecycle normalization` 第四十九刀已并入 `main` 后，再次刷新下一阶段主线优先级，确保后续治理继续跟随最新热点分布。

---

## 1. 为什么再次刷新

上一版刷新结论是：

> 继续 **Order lifecycle normalization**

这一结论已经落地，并完成：
- `order.service.contracts.ts` 已退场
- 各 helper 直接拥有自己剩余的显式签名依赖
- 分支封板并合并回 `main`

因此现在需要重新回答：

> **在最新 `main` 上，下一轮最值得继续投入的主线是什么？**

---

## 2. 当前客观状态（第六十六次刷新后）

### Order lifecycle normalization
- `server/services/orders/order.service.ts` 当前约 **222 行**
- 已完成：
  - query helper（含 shared query bindings / deps alias 清理）
  - read helper（list + single，含 shared read bindings / deps alias 清理）
  - create helper（含 deps builder + shared binding types 清理）
  - update helper（含 deps builder + shared binding types 清理）
  - delete helper
  - arrive / bulk-arrive helper（含 entry wrapper）
  - stockIn helper（含 entry wrapper + deps builder）
  - support helper（含 shared lifecycle bindings）
  - `order.service.contracts.ts` 已退场，helper 直接持有剩余显式签名依赖

说明：
- 订单域 normalization 已从 alias cleanup 进入 **更后期的 surface/organization 收尾阶段**
- 后续如果继续，最自然的方向会是：
  - post-contracts 模块表面收束
  - helper 间更高层组织边界判断
- 仍然可继续，但收益已明显变得更小、更细

### Inventory store / state
- `src/stores/useInventoryStore.ts` 当前约 **13 行**
- 已完成 action / state / flow / composition 多轮治理

说明：
- 当前几乎已是纯薄壳
- 再继续主要是更深层 partitioning / architecture 选择
- 仍不是当前最直接的小切口主线，但相对收益开始接近订单域后续尾段整理

### Source-analysis
- `src/services/sourceAnalysis.ts` 仍约 **91 行**
- extractor / typing / shared contracts 三阶段已完成

说明：
- 当前依然稳定
- 下一步主要是 deeper normalization，不是最紧迫热点

---

## 3. 新的收益排序

### 第一优先：Order lifecycle normalization（谨慎继续）
**仍可继续，但应更谨慎。**

原因：
1. 订单域仍然是当前最适合继续做“最后几刀”的主线
2. 但 contracts 层退场后，后续切口的收益会明显缩小
3. 每一刀都更接近真正的 stopping point，而不是机械式继续切 alias

### 第二优先：Inventory store / state deeper partitioning
已经比之前更接近第一优先。

原因：
- Inventory 已经是薄壳，但下一步可能开始值得重新评估是否切换主线
- 若订单域再往下收益继续下降，这条线会很快成为更优先选择

### 第三优先：Source-analysis deeper normalization
仍保持第三优先。

原因：
- 当前稳定性最好
- 下一步主要是统一与提纯，而不是最紧迫热点

---

## 4. 推荐的新主线

> **继续 Order lifecycle normalization，但进入“是否该停”的高敏感区。**

建议新分支方向：
- `refactor/order-lifecycle-normalization-pass50`

但建议额外约束：
1. 只选一个极小切口
2. 如果下一刀收益不再明显，应及时停下并重新评估是否切回 Inventory
3. 不再因为惯性而继续切小步清理

---

## 5. 与前几版决策的关系

> **订单域仍然领先，但已经接近从“继续推进”转向“考虑收束主线”的边界。**

也就是说：
- 当前仍建议继续一刀
- 但下一刀之后，应重新认真判断是否还值得继续停留在订单域

---

## 6. 一句话结论

> **现在仍可继续优化订单域，但已经进入接近收尾的阶段；后续每一刀都要更严格判断收益是否还足够高。**
