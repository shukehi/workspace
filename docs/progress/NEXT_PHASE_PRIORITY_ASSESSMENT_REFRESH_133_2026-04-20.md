# Next Phase Priority Assessment Refresh 133 (2026-04-20)

> 状态：当前有效。
> 触发点：`refactor/source-analysis-deeper-normalization-pass24` 已完成并并入 `main`。

---

## 1. 当前判断

当前最值得继续投入的方向仍然是：

1. **Source-analysis deeper normalization（谨慎继续）**
2. Order lifecycle tail reassessment（停止，除非出现新的同等级 seam）
3. Inventory store / state deeper partitioning（只在出现新清晰 seam 时恢复）

---

## 2. 为什么仍然是 Source-analysis

pass 24 完成后，Materials 页面也不再直接读取 Source store 的核心 consumer-facing values，说明这条 consumer-surface 收束主线仍然有结构收益。

但同时也意味着：
- Source 页面、ContractsHistory、GeneratePODialog、Materials 页面里的显性 direct-read seam 已经被连续清理很多
- 后续收益会更偏细粒度 polish 与 contract shaping

因此仍可继续，但必须更严格筛选下一刀。

---

## 3. 下一步节奏

继续 Source-analysis 时需要：
- 只接受仍然清晰、单一、可 review 的 seam
- 避免 broad workflow/store/page/dialog regrouping
- 如果下一刀不再明显，就应停下并重新评估是否换主线

---

## 4. 下一步建议

建议下一条分支：
- `refactor/source-analysis-deeper-normalization-pass25`

优先候选：
- runtime / workflow 更小的 contract normalization
- component/page/store 之间剩余 consumer-surface polish
