# Next Phase Priority Assessment Refresh 108 (2026-04-20)

> 状态：当前有效。
> 触发点：Order lifecycle tail reassessment pass 3 已完成。

---

## 1. 当前判断

当前最值得继续投入的方向调整为：

1. **Source-analysis deeper normalization**
2. Order lifecycle tail reassessment（停止，除非发现新的同等级 seam）
3. Inventory store / state deeper partitioning（只在出现新清晰 seam 时恢复）

---

## 2. 为什么现在应离开 Order 尾段

pass 3 已把最后一个同等级 forwarding seam 收掉：
- read/query builder 已退场
- lifecycle builder 已退场
- stock-in builder 已退场

剩余可见问题更像 deeper regrouping / type shaping，而不再是同级别的无价值 forwarding layer。

继续留在 Order 线，风险会高于收益。

---

## 3. 为什么下一条线应是 Source-analysis

当前 Source-analysis 仍具备：
- 较清楚的 deeper normalization 空间
- 相比 Inventory 和 Order 尾段，更高的边际收益
- 更适合重新回到“可识别结构收益”的节奏

---

## 4. 下一步建议

建议下一条主线：
- `refactor/source-analysis-deeper-normalization`

Order 线仅在满足以下条件时才恢复：
- 能指出一个新的、同等级的小 seam
- 且该 seam 不是 deeper regrouping / broad reshaping
