# Mapping Rule Completion Status (2026-04-12)

## 已完成

### 1. 统一规则基础设施

已落地：

- `src/types/mappingRules.ts`
- `src/services/mappings/mappingRules.validator.ts`
- `src/services/mappings/mappingRules.execute.ts`
- `src/services/mappings/mappingRules.explain.ts`

说明：

- 统一 DTO 已建立
- validator / execute / explain 已具备可运行能力
- 规则系统不再停留在设计草案

### 2. 通用规则调试能力

已落地：

- `src/features/config-editor/components/RuleExplainPlayground.vue`
- `src/features/config-editor/composables/useRuleExplainPreview.ts`

说明：

- 配置页已具备统一的规则试跑和解释能力

### 3. `lock`

状态：`已完成核心规则化`

已落地：

- adapter 已落地
- 真实提取已接入 rule engine
- 配置页已可试跑

关键文件：

- `src/services/mappings/mappingRules.adapter.ts`
- `src/lib/erp-engine/dataExtractors.ts`
- `src/views/LockConfig.vue`

### 4. `cylinder accessory`

状态：`已完成核心规则化`

已落地：

- accessory 规则已 adapter 化
- 真实提取已接入 rule engine
- 配置页已可试跑

关键文件：

- `src/services/mappings/mappingRules.adapter.ts`
- `src/lib/erp-engine/dataExtractors.ts`
- `src/views/CylinderConfig.vue`

### 5. `lock_fork`

状态：`已完成大部分`

已落地：

- 识别层已规则化：
  - `lockTypes`
  - `edgeTypes`
  - `hangingFeet`
  - `flatBottom`
- 尺寸来源选择层已规则化并切主路径
- 计算拼装层已 helper 化

关键文件：

- `src/services/mappings/mappingRules.adapter.ts`
- `src/services/mappings/lockForkDimensionSelector.ts`
- `src/services/lockForkDeriver.ts`
- `src/lib/erp-engine/dataExtractors.ts`
- `src/views/LockForkConfig.vue`

## 部分完成

### 1. `cylinder` 主体规则

状态：`部分完成`

说明：

- accessory 部分已完成
- 主锁芯 / 副锁芯尺寸和特殊规则主体尚未全面迁到统一 rule execution 主路径

### 2. `sourceAnalysis` 可解释性

状态：`部分完成`

说明：

- `lock`
- `accessory`
- `lock_fork`

已具备 `matchedRules / winningRules`

- 但并非所有硬件类别都同等完整

### 3. 规则文档状态

状态：`部分完成`

说明：

- 已有计划文档
- 但尚未完全收口为最终“完成态文档”

## 未开始 / 明显未完成

### 1. `handle` 规则全面迁移

状态：`未开始`

说明：

- 还未像 `lock` 一样进入统一 rule engine 主路径

### 2. `packaging` 规则全面迁移

状态：`未开始`

说明：

- 当前仍主要是既有 matcher / 映射逻辑

### 3. 计算拼装层正式 rule DSL 化

状态：`未完成`

说明：

- 当前 `lock_fork` 只是 helper 化
- 尚未抽象成正式 rule output contract

## 总体判断

- `lock`：完成
- `cylinder accessory`：完成
- `lock_fork`：大部分完成
- `cylinder` 主体：部分完成
- `handle`：未开始
- `packaging`：未开始

## 总进度

- 从“规则优化”整体看：`约 85%`
- 从“核心架构是否完成”看：`已完成`
- 从“所有 profile 是否全部统一到 rule engine”看：`未完成`
