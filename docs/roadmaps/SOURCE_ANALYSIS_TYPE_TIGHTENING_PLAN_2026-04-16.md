# Source Analysis Type Tightening Plan (2026-04-16)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-types`
> 范围：在 extractor 已按领域拆分后，逐步收紧 extractor-local 类型，但不改规则语义或外部调用面。

---

## 1. 背景

上一阶段已经完成：

- `dataExtractors.ts` → 纯聚合层
- cylinder / lock / packaging / handle / lockFork 已拆到独立 extractor 文件

当前剩余问题不是结构边界，而是 extractor 内部仍保留较多：

- `Record<string, any>`
- 宽松 `GenericMap`
- 中间态对象缺少局部约束

这会影响：

1. 重构时的静态保护能力
2. 局部规则修改的可读性
3. 错误暴露时的定位效率

---

## 2. 本轮目标

本轮只做 **extractor-local 类型收紧**：

1. 不修改 `sourceAnalysis.ts` 调用面
2. 不修改业务规则语义
3. 不引入新依赖
4. 优先从低风险 extractor 开始
5. 尽量用局部 interface / type alias 替代 `Record<string, any>`

---

## 3. 推荐顺序

### 第一轮（低风险）
- `src/lib/erp-engine/extractors/packagingExtractor.ts`
- `src/lib/erp-engine/extractors/lockExtractor.ts`

### 第二轮（中风险）
- `src/lib/erp-engine/extractors/cylinderExtractor.ts`
- `src/lib/erp-engine/extractors/handleExtractor.ts`

### 第三轮（高风险）
- `src/lib/erp-engine/extractors/lockForkExtractor.ts`

---

## 4. 本轮不做的事

1. 不重写规则执行逻辑
2. 不改变映射 adapter / runtime contract
3. 不做 extractor 之间的共享抽象提炼
4. 不把所有局部类型上提成全局公共类型

---

## 5. 完成标准

至少满足：

1. 低风险 extractor 中核心输入/配置不再默认落到 `Record<string, any>`
2. 结果行类型保持明确
3. 自动化门禁继续全绿
4. 相关定向测试通过

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
npm test -- tests/po-rule-packaging.test.ts
npm test -- tests/packaging-table.test.ts
npm test -- tests/lock-extraction.test.ts
npm test -- tests/po-rule-lock.test.ts
npm test -- tests/source-analysis-runtime.test.ts
npm test
npm run build
```
