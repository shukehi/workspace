# Next Phase Priority Assessment Refresh 130 (2026-04-20)

> 状态：当前有效。
> 触发点：`refactor/source-analysis-deeper-normalization-pass21` 已完成并并入 `main`。

---

## 1. 当前判断

当前最值得继续投入的方向仍然是：

1. **Source-analysis deeper normalization（谨慎继续）**
2. Order lifecycle tail reassessment（停止，除非出现新的同等级 seam）
3. Inventory store / state deeper partitioning（只在出现新清晰 seam 时恢复）

---

## 2. 为什么仍然是 Source-analysis

pass 21 完成后，component-level direct Source-store reads 继续减少，说明这条线仍有真实可收的 consumer-surface seam。

但同时也意味着：
- 这条线里最显性的 consumer-surface seam 已被大量消化
- 后续收益会逐步转向更细的 contract / surface polishing

因此仍可继续，但应更谨慎筛选下一刀。

---

## 3. 下一步节奏

继续 Source-analysis 时需要：
- 只接受仍然清晰、单一、可 review 的 seam
- 避免 broad workflow/store/page/dialog regrouping
- 如果下一刀不再明显，就应停下并重新评估是否换主线

---

## 4. 下一步建议

建议下一条分支：
- `refactor/source-analysis-deeper-normalization-pass22`

优先候选：
- runtime / workflow 更小的 contract normalization
- component/page/store 之间剩余的 consumer-surface polish
