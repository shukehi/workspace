# Next Phase Priority Assessment Refresh 111 (2026-04-20)

> 状态：当前有效。
> 触发点：`refactor/source-analysis-deeper-normalization-pass2` 已完成并并入 `main`。

---

## 1. 当前判断

当前最值得继续投入的方向仍然是：

1. **Source-analysis deeper normalization（继续）**
2. Order lifecycle tail reassessment（停止，除非出现新的同等级 seam）
3. Inventory store / state deeper partitioning（只在出现新清晰 seam 时恢复）

---

## 2. 为什么 Source-analysis 仍然第一位

pass 2 再次证明 source-analysis 还有清晰、低风险的小 seam：
- workflow orchestration 和 analysis-result state application 可以分离
- 分离后 owner 更明确
- review 面小，验证成本可控，结构收益直接

这说明 Source-analysis 还处在“值得继续小步推进”的阶段。

---

## 3. 下一步节奏

继续 Source-analysis 时仍要保持：
- 一次只切一个 seam
- 优先 owner / contract / state-application 层收束
- 暂不扩大到 broad workflow/store regrouping

---

## 4. 下一步建议

建议下一条分支：
- `refactor/source-analysis-deeper-normalization-pass3`

优先候选：
- runtime / workflow 间依赖面的更小 contract normalization
- workflow 对 contract fetch / snapshot side-effect application 的 owner 再收束
