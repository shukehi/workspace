# Source Analysis Extractor Refactor Plan (2026-04-16)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-extractors`
> 范围：拆分 `src/lib/erp-engine/dataExtractors.ts`，按领域组织 extractor，但不改变对外调用语义。

---

## 1. 现状问题

`src/lib/erp-engine/dataExtractors.ts` 当前同时承载：

- `extractCylinderData`
- `extractCylinderAccessoryPackData`
- `extractLockData`
- `extractPackagingData`
- `extractLockForkData`
- `extractHandleData`

这会造成：

1. 多个业务规则域混在单文件里
2. 规则定位成本高
3. 局部修改时容易触碰无关逻辑
4. 新规则接入会继续把复杂度堆回单体文件

---

## 2. 本轮目标

本轮不改外部 contract，只做结构拆分：

1. 按领域拆出 extractor 文件
2. 保留 `src/services/sourceAnalysis.ts` 作为统一 facade
3. 保持 `src/lib/erp-engine/dataExtractors.ts` 继续作为聚合出口（过渡层）
4. 现有测试语义不变

---

## 3. 第一轮建议拆分结构

建议新增：

- `src/lib/erp-engine/extractors/cylinderExtractor.ts`
- `src/lib/erp-engine/extractors/lockExtractor.ts`
- `src/lib/erp-engine/extractors/packagingExtractor.ts`
- `src/lib/erp-engine/extractors/lockForkExtractor.ts`
- `src/lib/erp-engine/extractors/handleExtractor.ts`

其中：
- `cylinderExtractor.ts` 同时承接 `extractCylinderData` 与 `extractCylinderAccessoryPackData`

保留：
- `src/lib/erp-engine/dataExtractors.ts`
  - 只作为聚合 re-export 层

---

## 4. 本轮不做的事

1. 不修改 `src/services/sourceAnalysis.ts` 的调用形态
2. 不改测试断言语义
3. 不修改 mapping/runtime contract
4. 不重写 extractor 内部规则
5. 不和 `materialDecomposer.ts` 一起做大范围合并重构

---

## 5. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
npm test -- tests/cylinder-accessory-pack-extraction.test.ts
npm test -- tests/cylinder-built-in-skip.test.ts
npm test -- tests/handle-extraction.test.ts
npm test -- tests/lock-extraction.test.ts
npm test -- tests/lock-fork-extraction.test.ts
npm test -- tests/source-analysis-runtime.test.ts
npm test
npm run build
```

---

## 6. 完成标准

第一轮完成后至少满足：

1. `dataExtractors.ts` 不再承载全部领域逻辑
2. 每个领域 extractor 都有单独文件边界
3. `sourceAnalysis.ts` 外部调用不变
4. 现有 extractor 相关测试继续通过
5. 门禁保持全绿
