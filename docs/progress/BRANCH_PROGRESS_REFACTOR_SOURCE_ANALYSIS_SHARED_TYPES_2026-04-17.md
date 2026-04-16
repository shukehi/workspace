# Branch Progress — refactor/source-analysis-shared-types (2026-04-17)

> 状态：阶段性总结文档。
> 分支：`refactor/source-analysis-shared-types`
> 用途：记录 source-analysis shared types 第一轮提炼的成果、验证证据与是否适合封板的判断。

---

## 1. 分支目标

在 source-analysis 已完成：

1. extractor 按领域拆分
2. extractor-local 类型第一轮收紧

之后，把**重复且已稳定**的 extractor-local 类型提炼成共享 contracts，减少跨 extractor 的重复定义，同时避免过度抽象。

本轮明确要求：

- 不修改规则语义
- 不修改 `sourceAnalysis.ts` facade
- 不推进到 mapping 深层 schema 统一
- 只提炼最明显、最稳定的共享边界

---

## 2. 本轮完成内容

### 2.1 计划文档
- `docs/roadmaps/SOURCE_ANALYSIS_SHARED_TYPES_PLAN_2026-04-16.md`

### 2.2 新增共享类型文件
- `src/lib/erp-engine/extractorTypes.ts`

新增的共享 contracts：
- `SourceOrderItemBase`
- `SourceOrderInfo`
- `RuleTrace`
- `RuleDetectionResult<T>`

### 2.3 已接入共享类型的 extractor
- `src/lib/erp-engine/extractors/lockExtractor.ts`
- `src/lib/erp-engine/extractors/cylinderExtractor.ts`
- `src/lib/erp-engine/extractors/handleExtractor.ts`
- `src/lib/erp-engine/extractors/lockForkExtractor.ts`

说明：
- `packagingExtractor.ts` 本轮无需接入 `extractorTypes.ts`，因为它已经直接复用 `aggregatePackaging` 的参数与返回类型。

---

## 3. 相对 main 的提交

- `f62296a` — 第一次 shared types 提炼：新增 `extractorTypes.ts`，并让多个 extractor 共享基础输入/trace 类型

---

## 4. 结构结果

### 之前
多个 extractor 分别维护相似但重复的类型：

- order item 边界
- order info 边界
- matched/winning rule trace
- detection result

### 现在
这些最稳定、最重复的类型已经统一进入：
- `src/lib/erp-engine/extractorTypes.ts`

带来的结果：

1. 跨 extractor 的基础类型噪音下降
2. rule trace / detection result 表达方式统一
3. 后续如果继续提炼 shared contracts，有了一个轻量、已落地的入口文件

---

## 5. 验证证据

### 全量门禁
- `npm run type-check` ✅
- `npm run type-check:server` ✅
- `npm test` ✅
- `npm run build` ✅

### 本轮定向验证
- `tests/cylinder-accessory-pack-extraction.test.ts`
- `tests/cylinder-built-in-skip.test.ts`
- `tests/po-rule-cylinder.test.ts`
- `tests/lock-extraction.test.ts`
- `tests/po-rule-lock.test.ts`
- `tests/handle-extraction.test.ts`
- `tests/po-rule-handle.test.ts`
- `tests/lock-fork-extraction.test.ts`
- `tests/mapping-runtime-derived-regression.test.ts`
- `tests/mapping-runtime-regression.test.ts`
- `tests/source-analysis-runtime.test.ts`

---

## 6. 剩余风险

当前没有 blocker，但仍有这些后续空间：

1. 共享类型目前只覆盖“基础稳定边界”，还没有覆盖更深层的 mapping entry / dimension rule / model resolution 共享契约
2. 各 extractor 里仍保留部分局部专用类型，说明还没有到“全局统一 schema”阶段
3. 如果继续上提过多类型，容易把当前清晰的局部语义重新抽象得过重

---

## 7. 是否适合封板

**适合。**

原因：

1. 这一阶段的目标已经完整达成：共享了最稳定、最重复的基础 contracts
2. 全量门禁持续全绿
3. 再继续往下做，就会进入下一阶段（更深的 shared contracts / runtime facade / mapping schema 统一）
4. 当前停在这里，review 与后续决策成本最低

---

## 8. 下一步建议

最合理的下一步不是继续在当前分支深挖，而是：

1. 本地封板 `refactor/source-analysis-shared-types`
2. merge 回 `main`
3. 如继续推进，再开新分支做下一阶段，例如：
   - mapping entry / dimension rule 的 shared contracts 提炼
   - `sourceAnalysis.ts` facade / runtime 再收口
   - mapping/runtime contract 更深层统一

