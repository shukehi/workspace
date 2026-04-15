# Mapping Rule DTO Draft

日期：2026-04-10

> 状态：**DTO 草案（已部分实现）**。
> 已落地代码：
> - [mappingRules.ts](/Users/aries/Dve/workspace/src/types/mappingRules.ts)
> - [mappingRules.validator.ts](/Users/aries/Dve/workspace/src/services/mappings/mappingRules.validator.ts)
> - [mappingRules.adapter.ts](/Users/aries/Dve/workspace/src/services/mappings/mappingRules.adapter.ts)
> - [mappingRules.execute.ts](/Users/aries/Dve/workspace/src/services/mappings/mappingRules.execute.ts)
> 这份文档仍保留为设计参考，但不再代表“仅草案、未实现”的状态。

## 目标

定义一套统一规则 DTO，用于承载未来数据库化后的 mapping rule payload。

设计要求：

1. 能覆盖当前 `lock / cylinder / accessory / lock_fork / handle / packaging` 的主要规则形态
2. 能映射到现有 workflow `draft / published / rollback` 结构
3. 能支持规则校验、规则优先级、规则解释
4. 尽量贴近当前 `src/types/mapping.ts` 命名风格，避免后续迁移成本过高

---

## 统一 profile 标识

```ts
export type RuleProfileCode =
  | 'packaging'
  | 'cylinder'
  | 'lock'
  | 'lock_fork'
  | 'handle'
  | 'accessory';
```

说明：

- 现有 `PublishedMappingProfileCode` 可继续保留
- `accessory` 当前虽主要从 `cylinder` 派生，但长期建议拆成独立 profile 语义

---

## Rule Set 顶层结构

```ts
export interface RuleSetMetadata {
  profileCode: RuleProfileCode;
  schemaVersion: number;
  description?: string;
  defaultEnabled?: boolean;
}

export interface MappingRuleSet {
  metadata: RuleSetMetadata;
  defaults?: MappingRuleDefaults;
  rules: MappingRule[];
}
```

说明：

- `defaults` 用于承载当前各 profile 的默认值，例如 `defaultUnit`、`primaryLabel`、`secondaryLabel`
- `rules` 是统一规则数组

---

## Defaults 结构

```ts
export interface MappingRuleDefaults {
  supplier?: string;
  unit?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  unmatchedSupplier?: string;
  manualReviewLabel?: string;
  heightReference?: number;
  extra?: Record<string, unknown>;
}
```

说明：

- 当前 `lock.defaultUnit`、`lock.primaryLabel`、`lock.secondaryLabel`
- 当前 `handle.defaultSupplier`、`handle.unmatchedSupplier`
- 当前 `lock_fork.heightReference`
- 都可以先挂在 `defaults`

---

## Rule 主体

```ts
export interface MappingRule {
  id: string;
  profile: RuleProfileCode;
  enabled: boolean;
  priority: number;
  stage: RuleStage;
  scope?: RuleScope;
  when: RuleConditionGroup;
  then: RuleOutput;
  notes?: string;
  tags?: string[];
}
```

### RuleStage

```ts
export type RuleStage =
  | 'base_mapping'
  | 'derived_mapping'
  | 'output_assembly';
```

说明：

- `base_mapping`：基础映射，例如 `F02-A副锁 -> 汇成`
- `derived_mapping`：按门厚、开向、护罩派生
- `output_assembly`：remark、聚合键、数量策略

### RuleScope

```ts
export type RuleScope =
  | 'primary'
  | 'secondary'
  | 'all'
  | 'export_only';
```

说明：

- `primary / secondary` 用于表达主锁 / 副锁
- `export_only` 可对应当前某些仅外贸客户启用的逻辑

---

## 条件结构

### 条件组

```ts
export interface RuleConditionGroup {
  operator: 'and' | 'or';
  items: Array<RuleCondition | RuleConditionGroup>;
}
```

### 原子条件

```ts
export type RuleCondition =
  | RuleEqualsCondition
  | RuleIncludesCondition
  | RuleInCondition
  | RuleExistsCondition
  | RuleNumericCondition;

export interface RuleBaseCondition {
  field: RuleFieldRef;
}

export interface RuleEqualsCondition extends RuleBaseCondition {
  op: 'eq';
  value: string | number | boolean;
}

export interface RuleIncludesCondition extends RuleBaseCondition {
  op: 'includes';
  value: string;
}

export interface RuleInCondition extends RuleBaseCondition {
  op: 'in';
  value: Array<string | number>;
}

export interface RuleExistsCondition extends RuleBaseCondition {
  op: 'exists' | 'not_exists';
}

export interface RuleNumericCondition extends RuleBaseCondition {
  op: 'gt' | 'gte' | 'lt' | 'lte';
  value: number;
}
```

### 字段引用

```ts
export type RuleFieldRef =
  | 'sj'
  | 'fssj'
  | 'sx'
  | 'fssx'
  | 'sxhz'
  | 'fshz'
  | 'spec'
  | 'thickness'
  | 'openDirection'
  | 'doorHeight'
  | 'mb'
  | 'xsbz'
  | 'customerName'
  | 'productModelName'
  | 'qtyLeft'
  | 'qtyRight'
  | 'qtyTotal'
  | `meta.${string}`;
```

说明：

- 建议先定义一批系统保留字段
- 再允许 `meta.*` 扩展字段

---

## 输出结构

```ts
export interface RuleOutput {
  supplier?: string;
  type?: string;
  spec?: string;
  unit?: string;
  remark?: string;
  eccentricity?: string;
  code?: string;
  accessoryPack?: string;
  quantityStrategy?: QuantityStrategy;
  quantityFormula?: QuantityFormula;
  categoryOverride?: string;
  mergeKey?: string;
  flags?: Record<string, boolean>;
  extra?: Record<string, unknown>;
}
```

### 数量策略

```ts
export type QuantityStrategy =
  | 'total'
  | 'left_right'
  | 'derived';

export interface QuantityFormula {
  source: 'qty' | 'qtyLeft' | 'qtyRight' | 'qtyPair';
  transform?: 'swap_left_right' | 'sum' | 'identity';
}
```

说明：

- 当前 `lock` 的内开左右互换
- 当前 `lock_fork` 的双头拆分
- 当前 `accessory` 的 total quantity 累加
- 都可以逐步映射到这层

---

## 发布载荷建议

建议未来 published payload 统一成：

```ts
export interface MappingRulePublishedPayload {
  ruleSet: MappingRuleSet;
}
```

兼容期可采用双轨：

```ts
export interface HybridMappingPublishedPayload<TLegacy> {
  legacy: TLegacy;
  ruleSet?: MappingRuleSet;
}
```

说明：

- 迁移初期可同时保留 legacy payload 和新 ruleSet
- 等执行器稳定后，再彻底切到 ruleSet-only

---

## 规则解释 DTO

用于配置页调试器。

```ts
export interface RuleExplainTrace {
  ruleId: string;
  matched: boolean;
  skippedReason?: string;
  priority: number;
  stage: RuleStage;
}

export interface RuleExplainResult {
  profile: RuleProfileCode;
  inputSnapshot: Record<string, unknown>;
  traces: RuleExplainTrace[];
  winningRules: string[];
  output: RuleOutput;
}
```

作用：

- 解释为什么命中
- 解释为什么没命中
- 显示最终输出

---

## 校验 DTO

```ts
export interface RuleValidationIssue {
  code: string;
  path: string;
  message: string;
  severity?: 'error' | 'warning';
}
```

建议新增校验规则：

1. `duplicate-rule-id`
2. `duplicate-priority-scope`
3. `missing-required-output`
4. `unsupported-field`
5. `unsupported-operator`
6. `unreachable-rule`
7. `conflicting-rule`
8. `manual-review-fallback`

---

## 与现有类型的映射建议

### 1. 现有 `LockMappingConfig`

可先映射为：

- `defaults.defaultUnit`
- `defaults.primaryLabel`
- `defaults.secondaryLabel`
- `rules[]` 中每条 `mappings[key]`

### 2. 现有 `CylinderMappingConfig`

可拆为：

- `dimensions` -> `stage=derived_mapping`
- `specialRules` -> `stage=derived_mapping`
- `secondaryDimensions` -> `scope=secondary`
- `secondarySpecialRules` -> `scope=secondary`
- `secondaryAccessoryPackRules` -> `profile=accessory`
- `mappings` -> `stage=base_mapping`

### 3. 现有 `LockForkMappingConfig`

建议拆为：

- 基础尺寸规则
- 高门尺寸规则
- 锁具类型派生规则
- 边型派生规则
- 吊脚规则

不要试图保留为单一大对象。

---

## 最小落地版本

建议先实现最小版本，不要一上来全量迁移：

### V1

只支持：

- `eq`
- `includes`
- `exists`
- `and`
- `priority`
- 基础 `supplier/type/spec/unit/remark`

适用：

- `lock`
- `cylinder secondaryAccessoryPackRules`

### V2

增加：

- `openDirection`
- `thickness`
- `quantityStrategy`
- `quantityFormula`
- `scope`

适用：

- `cylinder`

### V3

增加：

- 更复杂派生条件
- 双头锁叉拆分
- 高度修正规则

适用：

- `lock_fork`

---

## 风险控制

1. 不要直接删除 legacy DTO
2. 先允许 `legacy + ruleSet` 双轨
3. 必须先有规则解释器，再推动复杂规则迁移
4. 必须先有真实合同样本回归，再切执行器

---

## 推荐下一步

1. 在 `src/types/mapping.ts` 旁边新增 `src/types/mappingRules.ts`
2. 先实现 DTO 与 validator，不改业务执行器
3. 先把 `cylinder secondaryAccessoryPackRules` 适配成 ruleSet 样例
4. 再补一个 rule explain playground
