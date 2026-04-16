# Current Refactor Status (2026-04-17)

> 状态：当前阶段总盘点文档。
> 用途：汇总最近几轮结构治理、健康基线恢复、运行时契约澄清，以及 Inventory / OrderService / source-analysis 三条主线的当前状态，作为后续继续推进前的一页式状态面。

---

## 1. 当前总判断

项目已经从“门禁不完全可信、热点复杂度集中、文档入口混杂”的状态，推进到：

- **核心门禁可持续信任**
- **docs / README / archive 信息架构清晰**
- **Inventory 页面已明显收口**
- **OrderService 已完成两轮低风险收口**
- **source-analysis 已完成 extractor 拆分、局部类型收紧与 shared types 第一轮提炼**

当前仓库已进入：

> **可以稳定继续迭代的中期治理阶段**

而不是之前那种必须先“恢复地面”的阶段。

---

## 2. 最近完成的主要阶段

### A. 文档与仓库入口治理
已完成：
- `docs/README.md` 重组为可信导航入口
- 历史 roadmap / progress 文档迁入 `docs/archive/`
- 根目录历史 md 清理
- 根目录 `README.md` 收敛为项目入口页
- `.omx/` / `.claude/` 加入 `.gitignore`

相关文档：
- `docs/progress/DOCS_INFORMATION_ARCHITECTURE_CLEANUP_2026-04-16.md`

### B. Week 1 健康基线恢复
已恢复并验证：
- `npm run type-check`
- `npm run type-check:server`
- `npm test`
- `npm run build`

相关文档：
- `docs/progress/REPO_HEALTH_BASELINE_2026-04-16.md`
- `docs/progress/BRANCH_PROGRESS_FIX_WEEK1_HEALTH_BASELINE_2026-04-16.md`

### C. Week 2 运行时契约显式化
已明确：
- config bootstrap
- ERP fresh fetch vs cached history
- print / PDF render base URL
- API key 行为边界

相关文档：
- `docs/reference/RUNTIME_CONTRACT_2026-04-16.md`

### D. Inventory 前端收口
已完成多轮收口：
- 页面状态抽离
- tab 组件化
- detail panel / reverse dialog 协调层抽离
- store query / export helper 抽离

结果：
- `src/views/Inventory.vue` 已明显接近页面装配壳
- Inventory 前端从高风险单体页面进入可持续维护状态

相关文档：
- `docs/roadmaps/INVENTORY_PAGE_REFACTOR_PLAN_2026-04-16.md`

### E. OrderService 第二轮收口
已完成：
- `createOrder` data shaping 收口
- `updateOrder` context / validation / next values 收口
- `stockInOrder` orchestration 收口

结果：
- `order.service.ts` 更接近 orchestration shell
- helper / create / update / stock-in 责任边界更清晰

相关文档：
- `docs/roadmaps/ORDER_SERVICE_REFACTOR_PLAN_2026-04-16.md`
- `docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_SERVICE_PASS2_2026-04-16.md`

### F. Source-analysis 三阶段治理
#### Phase 1：Extractor 边界拆分
已完成：
- cylinder
- lock
- packaging
- handle
- lockFork

结果：
- `dataExtractors.ts` 已退化为纯聚合层

#### Phase 2：Extractor 局部类型收紧
已完成：
- 所有 extractor 第一轮局部类型收紧

#### Phase 3：Shared types 第一轮提炼
已完成：
- `src/lib/erp-engine/extractorTypes.ts`
- `SourceOrderItemBase`
- `SourceOrderInfo`
- `RuleTrace`
- `RuleDetectionResult<T>`

相关文档：
- `docs/roadmaps/SOURCE_ANALYSIS_EXTRACTOR_REFACTOR_PLAN_2026-04-16.md`
- `docs/roadmaps/SOURCE_ANALYSIS_TYPE_TIGHTENING_PLAN_2026-04-16.md`
- `docs/roadmaps/SOURCE_ANALYSIS_SHARED_TYPES_PLAN_2026-04-16.md`
- `docs/progress/BRANCH_PROGRESS_REFACTOR_SOURCE_ANALYSIS_EXTRACTORS_2026-04-16.md`
- `docs/progress/BRANCH_PROGRESS_REFACTOR_SOURCE_ANALYSIS_TYPES_2026-04-16.md`
- `docs/progress/BRANCH_PROGRESS_REFACTOR_SOURCE_ANALYSIS_SHARED_TYPES_2026-04-17.md`

---

## 3. 当前 main 的工程状态

### 当前可持续信任的门禁
- `npm run type-check` ✅
- `npm run type-check:server` ✅
- `npm test` ✅
- `npm run build` ✅

### 当前状态意义
这意味着：

1. 后续继续收热点，不需要再先回头修“地面”
2. 阶段性重构已经有可依赖的自动化验证基础
3. 当前 `main` 已可以作为新阶段工作的稳定起点

---

## 4. 目前还剩下的主要热点

### 4.1 `useInventoryStore.ts`
虽然已经抽出了 query/export helpers，但它仍然是 Inventory 域的重要中心 store。

### 4.2 Order lifecycle 更深层收口
`order.service.ts` 虽然已经完成两轮清理，但如果继续深入，仍可以在：
- bulk arrive
- delete lifecycle
- 更深的 shared order contracts
上继续收口。

### 4.3 Source-analysis 更深层统一
source-analysis 已经做完边界与第一轮类型/共享 contract，但如果继续推进，下一阶段才会进入：
- 更深的 mapping entry / dimension rule shared contracts
- facade / runtime 再收口
- deeper normalization

### 4.4 其它域的一致性治理
例如：
- Procurement 前端是否还需要继续像 Inventory 一样进一步收口
- 规范层与实现层是否还有可继续同步的 guard

---

## 5. 当前最合理的下一步候选

### 方案 A：继续 Inventory / Procurement 状态层治理
适合目标：进一步收 store complexity。

### 方案 B：继续订单生命周期更深层收口
适合目标：把订单域再推进一轮 architecture cleanup。

### 方案 C：继续 source-analysis deeper normalization
适合目标：把 source-analysis 从“结构稳定”推进到“契约更统一”。

---

## 6. 当前我最推荐的顺序

### 第一优先
**先做一轮 Order / Inventory / source-analysis 三域的“下一阶段优先级评估”**，不要立刻继续某一个域的惯性重构。

原因：
- 当前三条线都已经从“危险热点”变成“可继续深挖，但收益开始分化”的状态
- 现在更需要按收益排序，而不是按惯性继续做最近一个文件

### 如果必须立即选一个实现方向
我当前更推荐：

> **继续 Order 生命周期更深层收口**

原因：
1. 订单域仍然是后端业务核心
2. `order.service.ts` 已经有两轮铺垫，继续做第三轮最顺
3. source-analysis 当前已经比之前稳定得多，短期收益不一定高于订单域

---

## 7. 当前结论

当前项目不再处于“必须先修基础设施”的阶段，而已经进入：

> **可以基于稳定 `main` 做下一轮收益导向优化选择**

如果只用一句话概括当前状态：

> **基础面已修复，关键热点已被拆散，接下来要做的是“择优继续”，而不是“继续抢修”。**

