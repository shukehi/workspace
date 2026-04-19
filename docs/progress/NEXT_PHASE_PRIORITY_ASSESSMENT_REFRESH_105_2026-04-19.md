# Next Phase Priority Assessment Refresh 105 (2026-04-19)

> 状态：当前有效。
> 触发点：`refactor/inventory-store-deeper-partitioning-pass36` 已完成并并入 `main`。

---

## 1. 当前判断

当前最值得继续投入的方向仍然是：

1. **Inventory store / state deeper partitioning（谨慎继续）**
2. Order lifecycle normalization（尾段收尾备用线）
3. Source-analysis deeper normalization

---

## 2. 为什么仍然是 Inventory 优先

本轮完成后，Inventory receipt path 的 route shell 已进一步收束：
- query/filter/page state 拥有独立 owner
- route composable 更接近 sync / watch orchestration shell

这说明 Inventory 主线仍然存在可识别的小 seam，尚未完全进入“只能为拆而拆”的阶段。

---

## 3. 风险变化

需要继续保持谨慎：
- 当前收益已低于 earlier passes
- 后续只能接受**小、清晰、可验证**的 ownership / regrouping 切口
- 不能为了延续节奏而跨入高风险 multi-store 或大范围 orchestration 改写

---

## 4. 下一步建议

如果继续 Inventory：
- 建议分支：`refactor/inventory-store-deeper-partitioning-pass37`
- 建议只挑一个真实剩余 seam，例如：
  - receipt route shell 剩余 sync ownership 的再收束
  - 仍留在 `Inventory.vue` 的 receipt-specific orchestration 小切口

如果没有足够清晰的小切口，应停止 Inventory 线并切回：
- Order lifecycle normalization 尾段收尾
