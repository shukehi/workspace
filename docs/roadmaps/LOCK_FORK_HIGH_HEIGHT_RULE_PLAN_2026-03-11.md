# 锁叉高门基础尺寸规则开发计划（2026-03-11） [已完成]

## 1. 交付总结 (2026-03-11)
本计划中的所有功能点（5/7/9cm 高门阈值、独立基准、自动化测试及文档更新）已全部按期交付。详见 [LOCK_FORK_RULES.md](/Users/aries/Dve/workspace/docs/reference/LOCK_FORK_RULES.md)。

## 2. 目标

为锁叉提取链路增加“高门基础尺寸”规则，解决 5cm、7cm、9cm 门厚在高门场景下仍沿用旧 `2050` 基准与旧基础尺寸的问题，确保采购订单中的锁叉尺寸符合当前业务口径。

本轮计划覆盖：

1. 5cm / 7cm 在门高大于等于 `2200` 时启用新的基础尺寸与新的高度基准。
2. 9cm 在门高大于等于 `2210` 时启用独立的基础尺寸与新的高度基准。
3. 5cm / 7cm 的平下档、吊脚在高门场景下使用独立的下头基础尺寸。
4. 保持现有锁叉命名、T 型例外、P66/双头识别和采购单输出结构不变。

## 2. 已确认业务规则

### 2.1 规格解析

`spec` 使用格式：

```text
宽度*高度/门厚/开向
```

示例：

```text
960*2400/7/内开外包
```

其中：

1. `960` 是宽度。
2. `2400` 是高度。
3. 锁叉尺寸计算只使用高度，不使用宽度。

### 2.2 5cm / 7cm 高门规则

触发条件：

1. 门厚为 `5` 或 `7`
2. 门高大于等于 `2200`

高度调整公式：

```text
(实际高度 - 2200) / 2
```

普通高门基础尺寸：

1. 上头：`570*376`
2. 下头：`570*376`

平下档 / 吊脚高门基础尺寸：

1. 上头：`570*376`
2. 下头：`570*388`

示例：

```text
spec = 960*2400/7/内开外包

2400 - 2200 = 200
200 / 2 = 100

上头：570*376 + 100
下头：570*376 + 100
```

### 2.3 9cm 高门规则

触发条件：

1. 门厚为 `9`
2. 门高大于等于 `2210`

高度调整公式：

```text
(实际高度 - 2210) / 2
```

基础尺寸：

1. 上头：`524*422`
2. 下头：`524*272`

## 3. 当前实现与问题

现有锁叉提取逻辑位于 [dataExtractors.ts](/Users/aries/Dve/workspace/src/lib/erp-engine/dataExtractors.ts) 的 `extractLockForkData()`。

当前行为：

1. 门高由 [parsers.ts](/Users/aries/Dve/workspace/src/lib/erp-engine/parsers.ts) 的 `parseHeight()` 从 `spec` 中解析，现有解析方式已经是“第一段宽、第二段高”。
2. 所有门厚统一使用 [lock-fork-mapping.json](/Users/aries/Dve/workspace/data/config/lock-fork-mapping.json) 中的 `heightReference = 2050` 计算增量。
3. 基础尺寸只有两类：
   - `standard`
   - `withHangingFeet`
4. 平下档和吊脚共用 `withHangingFeet` 分支。
5. 当前默认配置仅覆盖 `5`、`7` 的基础尺寸，没有 `9` 的高门配置。

因此，现有实现无法表达以下新业务要求：

1. 不同门厚对应不同高门阈值。
2. 高门场景使用不同于常规门高的基础尺寸。
3. 5/7cm 的“普通高门”和“平下档/吊脚高门”需要分开。
4. 9cm 需要独立的高门基础尺寸与基准高度。

## 4. 实现原则

1. 继续由配置驱动基础尺寸，不将高门尺寸硬编码死在提取逻辑中。
2. 保持现有 `parseHeight()` 行为，不重写宽高解析。
3. 尽量将“高门规则选择”与“尺寸格式化输出”分离，便于测试。
4. 不改变现有锁叉名称生成规则。
5. 不改变采购单字段结构，只改变锁叉 `spec` 计算结果。

## 5. 计划改动

## 阶段 A：扩展锁叉配置结构

目标：让配置层能表达高门规则，而不是继续只支持 `standard / withHangingFeet`。

计划：

1. 扩展 [mapping.ts](/Users/aries/Dve/workspace/src/types/mapping.ts) 的锁叉映射类型。
2. 扩展 [mappingAdapter.ts](/Users/aries/Dve/workspace/src/services/mappings/mappingAdapter.ts)，兼容旧配置并适配新字段。
3. 扩展锁叉映射校验器，确保新增字段结构合法。
4. 更新 [lock-fork-mapping.json](/Users/aries/Dve/workspace/data/config/lock-fork-mapping.json)，加入：
   - 5/7cm 高门阈值与基准高度
   - 5/7cm 高门普通基础尺寸
   - 5/7cm 高门平下档/吊脚基础尺寸
   - 9cm 高门阈值与基础尺寸

建议的配置方向：

1. 保留现有 `baseDimensions` 兼容旧逻辑。
2. 新增 `highHeightRules` 或等价结构，按门厚表达：
   - `minHeight`
   - `heightReference`
   - `standard`
   - `withHangingFeet`

## 阶段 B：改造锁叉尺寸计算逻辑

目标：根据门厚、门高、平下档/吊脚状态自动切换到正确的基础尺寸和高度基准。

计划：

1. 在 [dataExtractors.ts](/Users/aries/Dve/workspace/src/lib/erp-engine/dataExtractors.ts) 内新增“尺寸规则选择”逻辑。
2. 优先判断是否命中高门规则：
   - `5/7` 且 `doorHeight >= 2200`
   - `9` 且 `doorHeight >= 2210`
3. 命中高门规则时：
   - 使用高门基础尺寸
   - 使用高门 `heightReference`
4. 未命中时，继续回退到现有 `baseDimensions + heightReference`
5. 平下档和吊脚在高门场景仍共用一套 `withHangingFeet` 高门基础尺寸。

建议拆分的内部职责：

1. `resolveLockForkDimensionRule()`
   - 输入：门厚、门高、是否平下档/吊脚、配置
   - 输出：最终尺寸组与高度基准
2. `calculateHeightAdjustment()`
   - 输入：门高、heightReference
   - 输出：增量值

## 阶段 C：补齐回归测试

目标：让新旧规则边界都可验证，避免再次回归。

至少新增这些测试：

1. 5cm 普通门高 `< 2200`
   - 继续使用旧 `2050` 基准和旧基础尺寸
2. 7cm 普通高门 `>= 2200`
   - 使用 `2200` 基准
   - 使用 `570*376 / 570*376`
3. 7cm 平下档高门 `>= 2200`
   - 使用 `570*376 / 570*388`
4. 7cm 吊脚高门 `>= 2200`
   - 同平下档高门基础尺寸
   - 同时确认是否仍叠加现有 `hangingFeetAdjustment`
5. 9cm 高门 `>= 2210`
   - 使用 `524*422 / 524*272`
6. 阈值边界测试
   - `2199`
   - `2200`
   - `2209`
   - `2210`
7. 旧规则回归
   - T 型内开例外不变
   - P66 / 双头命名不变

建议优先修改或新增：

1. [lock-fork-extraction.test.ts](/Users/aries/Dve/workspace/tests/lock-fork-extraction.test.ts)
2. [mapping-validator.test.ts](/Users/aries/Dve/workspace/tests/mapping-validator.test.ts)
3. [mapping-adapter-baseline.test.ts](/Users/aries/Dve/workspace/tests/mapping-adapter-baseline.test.ts)
4. 如有必要，补一组来源分析或采购生成集成测试

## 阶段 D：更新文档

目标：让锁叉规则说明和配置说明同步新逻辑。

需要更新：

1. [LOCK_FORK_RULES.md](/Users/aries/Dve/workspace/docs/reference/LOCK_FORK_RULES.md)
   - 增加 5/7cm 高门规则
   - 增加 9cm 高门规则
   - 增加高门平下档/吊脚规则
2. [README.md](/Users/aries/Dve/workspace/README.md)
   - 若 README 已列锁叉规则摘要，补充高门规则说明

## 6. 关键待确认项

本轮开发前需要按当前已确认口径执行以下约束：

1. `spec` 第一段宽度不参与尺寸计算。
2. 5/7cm 普通高门下头第二段是 `376`。
3. 5/7cm 平下档/吊脚高门下头第二段是 `388`。
4. 9cm 高门阈值是 `2210`，不是 `2200`。

开发中唯一需要额外确认的细节：

1. 5/7cm 高门吊脚是否仍然保留现有 `hangingFeetAdjustment = standard - actual` 的额外增量。

当前倾向：

1. 保留现有吊脚增量逻辑，只替换高门基础尺寸。
2. 如果业务上希望“2200 以上吊脚只换基础尺寸，不再额外加减吊脚值”，则需在实现前单独改规则。

## 7. 风险与回滚

主要风险：

1. 新配置结构如果设计过深，前后端 adapter / validator 维护成本会上升。
2. 9cm 旧配置缺失，若兼容处理不当，可能影响已有 9cm 订单。
3. 吊脚高门是否叠加额外吊脚调整，存在业务理解偏差风险。

控制方式：

1. 先补测试再改计算。
2. 适配层保持向后兼容，旧配置不报错。
3. 将高门规则写成显式阈值分支，不做隐式推断。

回滚方案：

1. 保留旧 `baseDimensions + heightReference` 路径作为默认回退。
2. 若新规则出现异常，可仅移除新增高门配置并恢复旧逻辑。

## 8. 验收标准

满足以下条件即可认为本轮完成：

1. `960*2400/7/内开外包` 这类 5/7cm 高门按 `2200` 基准计算。
2. 5/7cm 高门普通与平下档/吊脚能产生不同下头基础尺寸。
3. 9cm 高门能按 `2210` 基准与 `524*422 / 524*272` 计算。
4. 现有非高门锁叉结果不回归。
5. 锁叉规则文档同步更新。
