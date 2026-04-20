# Source-analysis Deeper Normalization (2026-04-20)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-deeper-normalization`
> 范围：在不改变 source-analysis 行为的前提下，把 result shaping / flattening 从 `src/services/sourceAnalysis.ts` 中提炼为独立 owner。

---

## 1. 背景

当前 `src/services/sourceAnalysis.ts` 同时承担：
- analysis orchestration
- empty result construction
- flat materials / packaging shaping
- final result assembly

其中 result shaping 已经形成独立职责，可以先收成一刀更小、更稳的 normalization seam。

---

## 2. 本轮目标

只做一个切口：
- 提炼 source-analysis result builder / flattener helper
- 让 `analyzeSourceOrder()` 更聚焦于 orchestration

---

## 3. 本轮不做的事

1. 不改 source-analysis runtime 对外行为
2. 不改 workflow / page state 结构
3. 不改 extractor / formula / materials 计算规则
4. 不做大范围类型重塑
5. 不引入新依赖

---

## 4. 推荐切口

建议在：
- `src/services/sourceAnalysis.ts`
- `src/services/sourceAnalysisResultBuilder.ts`（新增）
- `tests/source/sourceAnalysis.spec.ts`
- `docs/README.md`

目标：
- source-analysis result shaping 拥有独立 owner
- `analyzeSourceOrder()` 只负责 input sanity、calculate、hardware extraction、delegation

---

## 5. 完成标准

至少满足：

1. empty result construction 不再内联在 `analyzeSourceOrder()` 中
2. flat materials / packaging shaping 不再内联在 `sourceAnalysis.ts`
3. source-analysis 行为不变
4. 定向测试与全量门禁继续通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/source/sourceAnalysis.spec.ts tests/source-analysis-runtime.test.ts tests/source-store-workflow.test.ts tests/source-page-state.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
