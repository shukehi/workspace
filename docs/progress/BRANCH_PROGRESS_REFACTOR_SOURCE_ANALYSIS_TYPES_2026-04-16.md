# Branch Progress — refactor/source-analysis-types (2026-04-16)

> 状态：阶段性总结文档。
> 分支：`refactor/source-analysis-types`
> 用途：记录 source-analysis 第二阶段类型收紧的成果、验证证据与封板建议。

---

## 1. 分支目标

在 extractor 已经按领域拆分完成后，进一步把 extractor-local 的宽松边界收紧，减少：

- `Record<string, any>`
- `GenericMap`
- 隐式中间态对象

同时保持：

1. `sourceAnalysis.ts` facade 不变
2. extractor 对外函数签名语义不变
3. 规则行为不变
4. 回归测试输出不变

---

## 2. 本轮完成内容

### 2.1 计划文档
- `docs/roadmaps/SOURCE_ANALYSIS_TYPE_TIGHTENING_PLAN_2026-04-16.md`

### 2.2 完成类型收紧的 extractor
- `src/lib/erp-engine/extractors/lockExtractor.ts`
- `src/lib/erp-engine/extractors/packagingExtractor.ts`
- `src/lib/erp-engine/extractors/cylinderExtractor.ts`
- `src/lib/erp-engine/extractors/handleExtractor.ts`
- `src/lib/erp-engine/extractors/lockForkExtractor.ts`

---

## 3. 相对 main 的提交

- `e3448e1` — 从 lock / packaging 低风险边界开始做第一轮 tightening
- `1c0890f` — 收紧 cylinder extractor 局部类型
- `8bdf7ed` — 收紧 handle extractor 局部类型
- `1dc4284` — 收紧 lockFork extractor 局部类型

---

## 4. 结构结果

### 之前
extractor 已拆分，但各文件内部仍广泛依赖：

- `Record<string, any>`
- `GenericMap`
- 隐式 fallback / detection / mapping 中间态

### 现在
每个 extractor 至少已有一层明确的局部边界类型，例如：

- order item 形状
- order summary 形状
- mapping config / mapping entry 形状
- detection result / resolution result 形状

这意味着：

1. 局部规则修改时更容易获得静态保护
2. extractor 内部的中间对象语义更清楚
3. 后续若要抽 shared types，会有更稳定的基础形状可参考

---

## 5. 验证证据

### 全量门禁
- `npm run type-check` ✅
- `npm run type-check:server` ✅
- `npm test` ✅
- `npm run build` ✅

### 定向验证
#### lock / packaging
- `tests/lock-extraction.test.ts`
- `tests/po-rule-lock.test.ts`
- `tests/po-rule-packaging.test.ts`
- `tests/packaging-table.test.ts`
- `tests/source-analysis-runtime.test.ts`

#### cylinder
- `tests/cylinder-accessory-pack-extraction.test.ts`
- `tests/cylinder-built-in-skip.test.ts`
- `tests/po-rule-cylinder.test.ts`
- `tests/source-analysis-runtime.test.ts`
- `tests/mapping-runtime-derived-regression.test.ts`
- `tests/mapping-runtime-regression.test.ts`

#### handle
- `tests/handle-extraction.test.ts`
- `tests/po-rule-handle.test.ts`
- `tests/source-analysis-runtime.test.ts`

#### lockFork
- `tests/lock-fork-extraction.test.ts`
- `tests/po-rule-lock-fork.test.ts`
- `tests/mapping-runtime-derived-regression.test.ts`
- `tests/mapping-runtime-regression.test.ts`
- `tests/source-analysis-runtime.test.ts`

---

## 6. 剩余风险

当前没有阻止封板的 blocker，但仍有这些后续空间：

1. extractor-local 类型仍然偏“局部实用型”，还没有整理成更统一的共享 contracts
2. 某些深层 mapping config 仍然通过宽松对象流转，没有完全强类型化
3. 本轮没有触碰：
   - shared extractor helper 抽象
   - runtime contract 深层统一
   - sourceAnalysis facade 再分层

---

## 7. 是否适合封板

**适合。**

原因：

1. 第二阶段的目标已经完整达成
2. 所有 extractor 都已经过一轮局部类型收紧
3. 自动化门禁持续全绿
4. 继续往下做会进入下一阶段（shared types / rule normalization / deeper runtime cleanup）

---

## 8. 下一步建议

最合理的下一步不是继续在当前分支深挖，而是：

1. 本地封板 `refactor/source-analysis-types`
2. merge 回 `main`
3. 如果继续推进，再开新分支做下一阶段，例如：
   - extractor shared type 提炼
   - source-analysis runtime / facade 再收口
   - mapping/runtime 合同进一步统一

