# Next Phase Priority Assessment Refresh 107 (2026-04-20)

> 状态：当前有效。
> 触发点：Order lifecycle tail reassessment pass 2 已完成。

---

## 1. 当前判断

当前最值得继续投入的方向仍然是：

1. **Order lifecycle tail reassessment（极谨慎继续）**
2. **Source-analysis deeper normalization**
3. Inventory store / state deeper partitioning（只在出现新清晰 seam 时恢复）

---

## 2. 为什么 Order 仍保持第一位

pass 2 说明订单域还剩至少一类同等级 seam：
- forwarding-only lifecycle builder
- composition ownership 可以继续向 `order.service.ts` 回收

这仍然是一个低风险、可验证、可 review 的切口，因此订单域还没有完全结束。

---

## 3. 但阈值继续提高

接下来必须更严格：
- 只接受同等级 forwarding / no-value composition seam
- 如果下一刀需要跨到 deeper lifecycle regrouping，就不再值得继续
- 一旦没有同等级 seam，应立即切到 `Source-analysis deeper normalization`

---

## 4. 下一步建议

如果继续订单域：
- 建议分支：`refactor/order-lifecycle-tail-reassessment-pass3`
- 只在确认存在同等级 seam 时才落刀

否则：
- 直接切到 `Source-analysis deeper normalization`
