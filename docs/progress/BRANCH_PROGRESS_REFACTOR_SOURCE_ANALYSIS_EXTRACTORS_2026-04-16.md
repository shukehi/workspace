# Branch Progress — refactor/source-analysis-extractors (2026-04-16)

> 状态：阶段性总结文档。
> 分支：`refactor/source-analysis-extractors`
> 用途：记录 source-analysis extractor 拆分这一轮相对 `main` 的成果、验证证据和封板建议。

---

## 1. 分支目标

把 `src/lib/erp-engine/dataExtractors.ts` 从“按业务域混杂的大型实现文件”收口为：

- 按领域拆分的 extractor 文件集合
- 保留稳定的聚合出口
- 不改变 `src/services/sourceAnalysis.ts` 的外部调用方式
- 现有规则行为保持不变

---

## 2. 本轮完成内容

### 2.1 新增 extractor 文件

- `src/lib/erp-engine/extractors/cylinderExtractor.ts`
- `src/lib/erp-engine/extractors/lockExtractor.ts`
- `src/lib/erp-engine/extractors/packagingExtractor.ts`
- `src/lib/erp-engine/extractors/handleExtractor.ts`
- `src/lib/erp-engine/extractors/lockForkExtractor.ts`

### 2.2 收口后的聚合层

- `src/lib/erp-engine/dataExtractors.ts`

现在只保留稳定 re-export：

- `extractCylinderData`
- `extractCylinderAccessoryPackData`
- `extractLockData`
- `extractPackagingData`
- `extractHandleData`
- `extractLockForkData`

### 2.3 计划文档

- `docs/roadmaps/SOURCE_ANALYSIS_EXTRACTOR_REFACTOR_PLAN_2026-04-16.md`

---

## 3. 相对 main 的提交

- `a4eacbc` — 拆出 cylinder extractor
- `1b35491` — 拆出 lock extractor
- `9109206` — 拆出 packaging extractor
- `7c95bcd` — 拆出 handle extractor
- `f16afd0` — 拆出 lockFork extractor，并让 `dataExtractors.ts` 收口为纯聚合层

---

## 4. 结构结果

### 之前

`dataExtractors.ts` 同时承载：

- cylinder
- cylinder accessory pack
- lock
- packaging
- handle
- lockFork

### 现在

这些领域逻辑已经分别进入独立文件；`dataExtractors.ts` 不再承载领域实现。

这意味着：

1. 每类规则现在有明确文件边界
2. 局部改动不再默认触碰无关领域
3. 问题定位与测试回归范围更清晰
4. 后续若继续做类型收紧或规则重组，可以按单领域推进

---

## 5. 验证证据

### 全量门禁

- `npm run type-check` ✅
- `npm run type-check:server` ✅
- `npm test` ✅
- `npm run build` ✅

### 重点定向验证

#### cylinder
- `tests/cylinder-accessory-pack-extraction.test.ts`
- `tests/cylinder-built-in-skip.test.ts`
- `tests/po-rule-cylinder.test.ts`

#### lock
- `tests/lock-extraction.test.ts`
- `tests/po-rule-lock.test.ts`

#### packaging
- `tests/po-rule-packaging.test.ts`
- `tests/packaging-table.test.ts`

#### handle
- `tests/handle-extraction.test.ts`
- `tests/po-rule-handle.test.ts`

#### lockFork / runtime regression
- `tests/lock-fork-extraction.test.ts`
- `tests/po-rule-lock-fork.test.ts`
- `tests/mapping-runtime-derived-regression.test.ts`
- `tests/mapping-runtime-regression.test.ts`
- `tests/source-analysis-runtime.test.ts`

---

## 6. 剩余风险

当前没有阻止封板的 blocker，但仍有这些后续工作空间：

1. 新 extractor 内部仍然保留较多 `Record<string, any>` 风格中间态
2. `dataExtractors.ts` 虽已纯化为聚合层，但调用方仍通过它访问 extractor；若未来需要更深的 domain 边界迁移，可再逐步调整 import surface
3. 本轮只做了结构拆分，没有做第二阶段的：
   - 类型收紧
   - 共享 helper 再抽象
   - 规则对象标准化

---

## 7. 是否适合封板

**适合。**

原因：

1. 本轮目标已经完整达成
2. 所有自动化门禁全绿
3. `dataExtractors.ts` 已真正从实现文件退化为聚合层
4. 再继续深挖已经不属于“第一阶段边界拆分”，而是下一阶段的规则/类型治理工作

---

## 8. 下一步建议

最合理的下一步不是继续留在当前分支上深挖，而是：

1. 本地封板 `refactor/source-analysis-extractors`
2. merge 回 `main`
3. 如果继续推进，另开下一条分支做第二阶段，例如：
   - source-analysis extractor 类型收紧
   - extractor 共享 helper 规范化
   - `sourceAnalysis.ts` / runtime 层的进一步收口

