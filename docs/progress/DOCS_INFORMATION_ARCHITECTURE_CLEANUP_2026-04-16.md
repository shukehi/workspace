# Docs 信息架构清理总结（2026-04-16）

> 适用仓库：`/Users/aries/Dve/workspace`
>
> 目的：记录本轮 `docs/` 目录的信息架构清理动作、归档策略与当前结果，作为后续文档治理的基线说明。

---

## 1. 本轮清理的目标

本轮清理的目标不是删除历史文档，而是把 `docs/` 从“索引混杂、历史与现行文档混排”的状态，收敛成一个更容易判断的结构：

1. **当前执行入口** 明确
2. **现行参考文档** 与 **历史阶段文档** 分开
3. `archive/` 不再只是文件堆积区，而是有清晰索引入口
4. 尽量不破坏已有文档内容，只调整：
   - 索引
   - 归档位置
   - 引用路径
   - 顶部状态说明

---

## 2. 本轮完成了什么

### 2.1 清理并重组了 `docs/README.md`

将原本混合的索引结构，重组为更清晰的分层：

- `governance`
- `roadmaps`
  - 当前执行入口
  - 现行参考计划
  - 历史路线图与旧周清单
- `progress`
  - 当前阶段结果
  - 历史阶段进度
- `reference`
- `design`
- `issues`
- `archive`

其中最重要的变化是：

1. 不再把明显历史/已完成文档与当前执行入口混排
2. 给 `design` 单独留出了入口
3. 让 `archive` 里的子目录变成可导航的结构，而不是“只能直接翻文件夹”

---

### 2.2 迁移了一批明显历史的 roadmap 文档到 archive

已迁移：

#### 第一批
- `docs/roadmaps/PROJECT_STRUCTURE_OPTIMIZATION_PLAN_2026-03-09.md`
  -> `docs/archive/roadmaps/PROJECT_STRUCTURE_OPTIMIZATION_PLAN_2026-03-09.md`
- `docs/roadmaps/CSS_TEMPLATE_MIGRATION_PLAN.md`
  -> `docs/archive/roadmaps/CSS_TEMPLATE_MIGRATION_PLAN.md`
- `docs/roadmaps/SYSTEM_OPTIMIZATION_PHASE2_CORS_AUTH_2026-03-18.md`
  -> `docs/archive/roadmaps/SYSTEM_OPTIMIZATION_PHASE2_CORS_AUTH_2026-03-18.md`

#### 第二批（inventory 历史计划）
- `docs/roadmaps/inventory/INVENTORY_OPTIMIZATION_PLAN.md`
  -> `docs/archive/roadmaps/inventory/INVENTORY_OPTIMIZATION_PLAN.md`
- `docs/roadmaps/inventory/INVENTORY_OPTIMIZATION_TASKS.md`
  -> `docs/archive/roadmaps/inventory/INVENTORY_OPTIMIZATION_TASKS.md`
- `docs/roadmaps/inventory/INVENTORY_OPTIMIZATION_PR_BREAKDOWN.md`
  -> `docs/archive/roadmaps/inventory/INVENTORY_OPTIMIZATION_PR_BREAKDOWN.md`

---

### 2.3 迁移了一批明显历史的 progress 文档到 archive

已迁移：

- `docs/progress/SOURCE_CONFIG_REFACTOR_PROGRESS_2026-03-10.md`
  -> `docs/archive/progress/SOURCE_CONFIG_REFACTOR_PROGRESS_2026-03-10.md`
- `docs/progress/PROCUREMENT_INVENTORY_PHASE1_PROGRESS_2026-03-12.md`
  -> `docs/archive/progress/PROCUREMENT_INVENTORY_PHASE1_PROGRESS_2026-03-12.md`
- `docs/progress/PROCUREMENT_INVENTORY_MANUAL_REGRESSION_CHECKLIST_2026-03-13.md`
  -> `docs/archive/progress/PROCUREMENT_INVENTORY_MANUAL_REGRESSION_CHECKLIST_2026-03-13.md`
- `docs/progress/REFACTOR_REMAINING_SMOKE_CHECKLIST_2026-03-13.md`
  -> `docs/archive/progress/REFACTOR_REMAINING_SMOKE_CHECKLIST_2026-03-13.md`

---

### 2.4 新增了 archive 子目录索引

新增：

- `docs/archive/roadmaps/README.md`
- `docs/archive/progress/README.md`

作用：

1. 说明 archive 子目录里到底放什么
2. 指明这些文档仅适合追溯，不适合当当前执行入口
3. 给后续继续归档文档提供统一入口

---

### 2.5 补了边界最模糊文档的处理策略

#### A. `docs/reference/PROCUREMENT_TEMPLATE_PRD.md`
处理方式：**保留在 reference，不迁移**

原因：
- 它仍然具备产品/领域语义参考价值
- 不是单纯历史文档

但做了边界补强：
- 顶部新增状态说明：`状态：产品/领域参考文档`
- 明确它不是当前唯一执行清单

#### B. `docs/governance/BACKEND_OPTIMIZATION_DETAILED_PLAN_2026-03-14.md`
处理方式：**迁移到 archive**

新位置：
- `docs/archive/backend-ts/BACKEND_OPTIMIZATION_DETAILED_PLAN_2026-03-14.md`

原因：
- 它是已完成的详细实施方案
- 不再适合作为长期治理规范留在 `governance/`

---

## 3. 同步修复了哪些引用

本轮不仅迁文件，也同步修了相关文档中的引用，避免断链。

涉及更新的文件包括：

- `docs/README.md`
- `docs/governance/ENGINEERING_CONVENTIONS.md`
- `docs/governance/PR_FEATURE_CHECKLIST_2026-03-10.md`
- `docs/governance/FEATURE_DEVELOPMENT_GOVERNANCE_2026-03-10.md`
- `docs/archive/roadmaps/SOURCE_CONFIG_REFACTOR_PLAN_2026-03-10.md`
- `docs/archive/mapping-migration-plan/02-里程碑A+B任务清单.md`
- `docs/progress/PROCUREMENT_INVENTORY_PR_NOTE_2026-03-13.md`
- `docs/progress/PROCUREMENT_INVENTORY_PHASE1_SUMMARY_2026-03-11.md`
- `docs/archive/README.md`
- `docs/archive/roadmaps/inventory/INVENTORY_OPTIMIZATION_TASKS.md`
- `docs/archive/roadmaps/inventory/INVENTORY_OPTIMIZATION_PR_BREAKDOWN.md`
- `docs/reference/PROCUREMENT_TEMPLATE_PRD.md`

---

## 4. 当前 docs 结构应该怎么理解

现在可以把 `docs/` 简单理解为：

### `docs/governance/`
长期有效的规范、护栏、约束、清单。

### `docs/roadmaps/`
当前仍值得执行或参考的计划。
重点是：
- `REFACTOR_EXECUTION_PLAN_V1_2026-04-16.md`
- `WEEK1_HEALTH_BASELINE_EXECUTION_2026-04-16.md`
- `REFACTOR_EXECUTION_INDEX_2026-03-13.md`

### `docs/progress/`
当前仍有价值的阶段性结果、进度摘要、里程碑总结。

### `docs/reference/`
当前实现仍可参考的字段契约、规则说明、运行说明、产品/领域参考文档。

### `docs/design/`
设计方向文档。当前这里主要保留历史设计方案。

### `docs/issues/`
问题记录与问题分析。

### `docs/archive/`
纯历史材料。
可追溯，但不作为当前实现依据。

---

## 5. 当前仍值得后续关注的边界文档

这轮清理后，主索引已经基本健康，但仍有少数文档需要后续继续观察其归类是否长期合理：

### 1. `docs/reference/PROCUREMENT_TEMPLATE_PRD.md`
- 当前保留在 `reference/` 是合理的
- 但它属于“产品/领域参考文档”，不是纯字段契约
- 后续如果 `design/` 或 `product/` 区分类别更细，可再考虑迁移

### 2. `docs/progress/MAPPING_RULE_COMPLETION_STATUS_2026-04-12.md`
- 当前没有明确顶部状态标识
- 内容是“已完成 / 大部分完成 / 部分完成”的混合状态快照
- 建议后续补一个顶部状态说明

### 3. `docs/governance/BACKEND_OPTIMIZATION_DETAILED_PLAN_2026-03-14.md`
- 已迁走
- 当前策略是正确的：历史详细方案不再放在 `governance/`

---

## 6. 本轮清理的原则总结

这轮 docs 治理遵循的是：

1. **先整理索引，再迁移文件**
2. **先迁明显历史的，再处理边界模糊的**
3. **优先保留文档本体，不轻易删除**
4. **通过补状态说明解决“保留但易误解”的问题**
5. **archive 必须有入口，不是垃圾堆**

---

## 7. 当前结论

本轮清理完成后，`docs/` 已经从“历史文档与现行文档混排”改善为：

- 当前执行入口明确
- 现行参考与历史材料区分更清楚
- archive 具备可导航索引
- 主索引 `docs/README.md` 已可作为可信入口使用

换句话说：

> **当前 docs 信息架构已经基本健康，后续主要是小步增量治理，不再需要大规模迁移。**
