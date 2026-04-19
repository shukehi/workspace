# Next Phase Priority Assessment Refresh 106 (2026-04-19)

> 状态：当前有效。
> 触发点：`refactor/order-lifecycle-tail-reassessment` 已完成并并入 `main`。

---

## 1. 当前判断

当前最值得继续投入的方向调整为：

1. **Order lifecycle tail reassessment（谨慎继续）**
2. **Source-analysis deeper normalization**
3. Inventory store / state deeper partitioning（只在出现新清晰 seam 时恢复）

---

## 2. 为什么 Order 重新回到第一位

这次复盘证明订单域仍然存在真实的小 seam：
- read/query forwarding builder 不是必要层
- 删除后 composition ownership 更贴近 `order.service.ts`
- 风险小、验证完整、review 成本可控

这说明订单域还没有彻底榨干，但必须继续按 reassessment 标准推进，而不是回到 earlier 大规模 normalization 节奏。

---

## 3. 为什么 Inventory 暂时后移

Inventory 最近已经拆到非常细：
- owner composable 已经很多
- 后续 seam 越来越小
- 再推进更容易变成“为拆而拆”

因此 Inventory 仍保留为候选线，但不再默认继续。

---

## 4. 下一步建议

如果继续订单域：
- 建议分支：`refactor/order-lifecycle-tail-reassessment-pass2`
- 只接受同等级的小 seam，例如：
  - forwarding-only binding layer
  - no-value composition wrapper
  - helper-local export leakage

如果找不到同等级 seam：
- 直接切到 `Source-analysis deeper normalization`
