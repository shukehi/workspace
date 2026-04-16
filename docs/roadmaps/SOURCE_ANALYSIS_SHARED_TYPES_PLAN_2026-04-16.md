# Source Analysis Shared Types Plan (2026-04-16)

> 状态：当前执行计划。
> 分支：`refactor/source-analysis-shared-types`
> 范围：从已稳定的 extractor-local 类型中提炼少量共享 contracts，但不改变规则语义、runtime contract 或 facade。

---

## 1. 背景

source-analysis 已完成两轮治理：

1. extractor 按领域拆分
2. 每个 extractor 完成一轮局部类型收紧

现在最自然的下一步，是把重复且已稳定的局部类型提炼成共享 contracts，减少各 extractor 之间的重复定义。

---

## 2. 本轮目标

只提炼“明显重复且稳定”的共享类型，例如：

- 基础订单行输入边界
- source-analysis 订单摘要边界
- 规则 matched/winning trace
- 通用 detection result 结构

同时保持：

1. 不改 extractor 对外行为
2. 不改 `sourceAnalysis.ts` facade
3. 不做 mapping config 的大一统建模
4. 不引入新依赖

---

## 3. 本轮不做的事

1. 不把所有 extractor-local type 一次性上提
2. 不建立过重的 shared schema 层
3. 不改 runtime contract / adapter contract
4. 不重写 lockFork / handle / cylinder 规则逻辑

---

## 4. 推荐顺序

### 第一轮
- 提炼最基础共享类型文件
- 迁移 lock / cylinder / handle / lockFork 中重复边界

### 第二轮（若还有收益）
- 只提炼已经被至少两个 extractor 使用的 mapping-entry 或 row-trace 类型

---

## 5. 完成标准

至少满足：

1. 出现 2 次以上的重复 extractor-local 类型得到共享化
2. extractors 可读性提升，而不是被更抽象的层掩盖
3. 自动化门禁保持全绿

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
npm test -- tests/cylinder-accessory-pack-extraction.test.ts
npm test -- tests/cylinder-built-in-skip.test.ts
npm test -- tests/lock-extraction.test.ts
npm test -- tests/po-rule-lock.test.ts
npm test -- tests/handle-extraction.test.ts
npm test -- tests/po-rule-handle.test.ts
npm test -- tests/lock-fork-extraction.test.ts
npm test -- tests/mapping-runtime-derived-regression.test.ts
npm test -- tests/mapping-runtime-regression.test.ts
npm test -- tests/source-analysis-runtime.test.ts
npm test
npm run build
```
