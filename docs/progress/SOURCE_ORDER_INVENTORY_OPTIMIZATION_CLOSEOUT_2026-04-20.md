# Source / Order / Inventory 本轮优化阶段总结（2026-04-20）

> 状态：现行参考文档。
> 用途：总结 2026-04-17 至 2026-04-20 这一轮 Inventory deeper partitioning、Order tail reassessment、Source-analysis deeper normalization 的主要成果，并明确当前是否继续优化。

## 1. 本轮完成了什么

这一轮优化不是围绕新功能扩展，而是围绕三个高复杂度域做渐进式结构收束：

1. **Inventory 线**：持续推进 store/state deeper partitioning，把大部分 page / outbound / receipt / location 的 owner 边界拆清。
2. **Order 线**：完成 lifecycle 尾段 reassessment，清理 read/query/lifecycle/stock-in 里的 forwarding-only seam。
3. **Source-analysis 线**：以 result shaping、state application、runner、selector、page-state、consumer-surface 为主线，完成连续多刀 deeper normalization。

整体结果不是“重写系统”，而是把这三条高复杂度链路从“还可以继续长”推进到“当前主要高收益 seam 已被收走”。

## 2. 当前最关键的结构收益

### 2.1 Inventory

当前已拿到的关键收益：

- `src/stores/useInventoryStore.ts` 已压到 **13 行**
- page / outbound / receipt / location 的 owner 基本拆清
- 大量 wrapper / forwarding composable 已删除
- Inventory 主线已经从“厚壳 store 驱动”转向“多 owner 组合”结构

这意味着 Inventory 的主结构瘦身目标已经基本完成。

### 2.2 Order

当前已拿到的关键收益：

- `server/services/orders/order.service.ts` 约 **219 行**
- read/query/lifecycle/stock-in 的 forwarding-only builder seam 已清理完毕
- 尾段 reassessment 已确认：剩余可收 seam 不再属于同等级低风险 forwarding seam

这意味着 Order 线当前已经不适合继续用相同方法推进。

### 2.3 Source-analysis

当前已拿到的关键收益：

- `src/services/sourceAnalysis.ts` 已压到 **53 行**
- `src/features/source-analysis/services/sourceOrderWorkflow.ts` 约 **126 行**
- `src/stores/useSourceStore.ts` 约 **70 行**
- `src/features/source-analysis/composables/useSourcePageState.ts` 约 **60 行**

并且这条线已经连续完成：

- result builder / result applier
- contract state / cache / request / error / clear applier
- analysis / fetch / apply / rehydrate runner
- store state / selector / derived state / workflow bridge
- Source / Materials / GeneratePODialog / ContractHistoryDialog / ContractsHistory 等 consumer-surface 收束

这意味着 Source-analysis 从“workflow + store + page 混合承担”推进到了更清楚的 owner 组合结构。

## 3. 为什么现在要停，而不是继续机械推进

当前三条线都已经进入 **边际收益递减区**。

### 3.1 Inventory 不宜继续的原因

Inventory 现在剩余的多半是：
- owner 内部小 regrouping
- composable 间更细粒度命名/边界 polish
- 低收益 wiring 清理

继续推进，容易从“结构收益”滑向“为拆而拆”。

### 3.2 Order 不宜继续的原因

Order 当前若继续推进，更多会进入：
- deeper regrouping
- type shaping
- support helper 再拆

这些已经不再是此前那种清晰、单一、可验证的 forwarding seam。

### 3.3 Source-analysis 谨慎暂停的原因

Source-analysis 仍然是当前最健康的一条线，但当前审计显示：
- runtime 已很薄
- workflow 虽然仍有体量，但内部已拆成大量小 owner
- 页面/对话框/store consumer-surface 的显性 seam 已被连续消化很多

剩下的大多数候选 seam 更像：
- bridge wiring polish
- helper of helper
- owner 之间更轻薄的 contract 微调

这类改动再继续推进，收益会快速下降。

## 4. 当前是否继续优化

结论：

## **先停止本轮结构清理型优化。**

这里的“停止”不是放弃治理，而是：
- 停止凭惯性继续切刀
- 进入稳定观察期
- 等新的真实维护痛点出现后，再有针对性地重开主线

当前优先级判断为：

1. **Source-analysis deeper normalization（暂停）**
2. **Order lifecycle tail reassessment（暂停）**
3. **Inventory deeper partitioning（暂停）**

## 5. 什么时候再重启优化

只有在出现以下情况时，才建议重启：

1. 新功能开发暴露出新的边界膨胀点
2. 某个文件/模块重新变厚，明显超出当前 owner 边界承载能力
3. 测试、排错、review 成本集中指向某个具体 seam
4. 发现新的 **单一、清晰、可验证** 的低风险切口

换句话说：
- **有真实痛点，再重启**
- **没有真实痛点，不再为了整齐继续整形**

## 6. 当前阶段的推荐动作

当前阶段最合适的动作不是继续拆，而是：

1. 维持当前主干稳定
2. 让后续功能开发自然验证这些边界是否真的够用
3. 只在真实痛点再次出现时，以小切口方式恢复某一条主线

## 7. 参考文档

- `docs/roadmaps/SOURCE_ANALYSIS_DEEPER_NORMALIZATION_2026-04-20.md`
- `docs/roadmaps/SOURCE_ANALYSIS_DEEPER_NORMALIZATION_PASS25_2026-04-20.md`
- `docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_134_2026-04-20.md`
- `docs/progress/BRANCH_PROGRESS_REFACTOR_SOURCE_ANALYSIS_DEEPER_NORMALIZATION_PASS25_2026-04-20.md`
