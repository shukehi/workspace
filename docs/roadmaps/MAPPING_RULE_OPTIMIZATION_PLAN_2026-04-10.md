# Mapping Rule Optimization Plan

日期：2026-04-10

> 状态：**规则优化计划（核心已落地）**。
> 已完成：DTO、validator、adapter、execute、explain、通用 playground，以及 `lock / cylinder accessory / lock_fork` 的真实业务接入。
> 仍未完成：是否继续把 `lock_fork` 计算拼装层抽象成更正式的 rule output contract。

## 目标

将当前 mapping 配置从“各模块各自定义的 JSON 结构”逐步收敛为统一规则模型，让规则具备以下能力：

- 可读
- 可验证
- 可调试
- 可追踪优先级
- 可在数据库中作为正式 workflow payload 持续演进

本方案不要求立刻重写所有业务逻辑，而是先把当前隐式规则显式化。

## 为什么需要优化

当前 mapping 系统已经不只是简单映射，而是包含大量条件派生逻辑，例如：

- 锁具主锁 / 副锁分流
- 锁芯门厚尺寸规则
- 锁芯特殊护罩规则
- 副锁护罩配件包规则
- 锁叉按门厚 / 吊脚 / 平下档 / 锁具类型派生

这些逻辑目前分散在：

- `data/config/lock-mapping.json`
- `data/config/cylinder-mapping.json`
- `data/config/lock-fork-mapping.json`
- `src/lib/erp-engine/dataExtractors.ts`

问题在于：

1. 规则结构不统一
2. 规则优先级多数由代码顺序隐式决定
3. 配置页能编辑，但不能解释“为什么命中”
4. 保存时缺少统一的冲突检测和死规则检测

## 优化原则

1. 不先推翻已有提取逻辑
2. 先统一规则表达，再逐步迁移执行器
3. 规则要能被数据库 workflow 正式存储
4. 规则必须支持调试解释

## 统一规则模型

建议把规则统一抽象成：

```ts
type MappingRule = {
  id: string
  profile: 'lock' | 'cylinder' | 'lock_fork' | 'handle' | 'packaging' | 'accessory'
  enabled: boolean
  priority: number
  when: RuleCondition[]
  then: RuleOutput
  notes?: string
}
```

### Condition 层

```ts
type RuleCondition =
  | { field: string; op: 'eq'; value: string }
  | { field: string; op: 'includes'; value: string }
  | { field: string; op: 'in'; value: string[] }
  | { field: string; op: 'notEmpty' }
  | { field: string; op: 'isEmpty' }
```

作用：

- 明确规则命中条件
- 不再把条件逻辑埋在执行代码里

示例：

```ts
[
  { field: 'fssj', op: 'eq', value: 'F02-A副锁' },
  { field: 'thickness', op: 'eq', value: '7' },
  { field: 'openDirection', op: 'eq', value: '内开' }
]
```

### Output 层

```ts
type RuleOutput = {
  supplier?: string
  type?: string
  spec?: string
  unit?: string
  remarkTemplate?: string
  eccentricity?: string
  accessoryPack?: string
  quantityStrategy?: 'total' | 'leftRight' | 'derived'
  categoryOverride?: string
}
```

作用：

- 显式表达最终产物
- 减少“字段名称在不同 profile 里语义不一致”的问题

## 三层规则架构

建议把 mapping 规则分成三层，而不是一层混杂：

### 1. 基础映射层

作用：

- 原始输入值 -> 基础供应商 / 型号 / 规格

适用：

- `lock`
- `handle`
- 部分 `packaging`

示例：

`F02-A副锁 -> 汇成 / F02-A副锁 / 副锁体`

### 2. 派生规则层

作用：

- 根据门厚、开向、护罩、副锁标识等条件派生输出

适用：

- `cylinder`
- `accessory`
- `lock_fork`

示例：

- `fshz=一号铝小面板 + thickness=7 -> 7公分配件包`
- `fshz=哑黑护罩 + thickness=9 + 内开 -> 105 锁芯规格`

### 3. 输出组装层

作用：

- 决定 remark、左右数量、聚合 key、分类归属

当前这部分主要在：

- `src/lib/erp-engine/dataExtractors.ts`

未来目标：

- 让输出组装规则也具备显式配置语义
- 但第一阶段可以继续保留在代码里

## 各 profile 的优化方向

### lock

现状：

- 更偏基础映射
- 规则复杂度低

建议：

- 先迁成统一基础映射规则
- 保留主锁 / 副锁标签作为显式输出规则

### cylinder

现状：

- 已经包含尺寸规则、特殊规则、副锁规则、护罩规则
- 最像规则系统雏形

建议：

- 作为第一批统一规则模型迁移对象
- 将以下结构统一成 `when/then/priority`
  - `primaryDimensions`
  - `specialRules`
  - `secondaryDimensions`
  - `secondarySpecialRules`
  - `secondaryAccessoryPackRules`

### lock_fork

现状：

- 派生逻辑最复杂
- 高度依赖门厚、门高、吊脚、平下档、锁具类型

建议：

- 第二阶段迁移
- 先抽离“条件判定”与“名称/规格输出”两部分

### handle

现状：

- 主要是基础映射

建议：

- 后期收敛到统一基础映射结构

### packaging

现状：

- 部分是映射，部分还涉及包装 matcher

建议：

- 先不强制完全规则化
- 只先统一对外结构

## 必要能力

### 1. 优先级

每条规则必须有 `priority`。

用途：

- 多条规则同时命中时决定谁生效
- 避免继续依赖代码顺序

### 2. 命中解释

对任意一条输入样本，应能输出：

- 命中了哪些规则
- 哪条规则最终生效
- 哪些规则被覆盖
- 最终输出是什么

这是后续配置页最关键的能力。

### 3. 保存前校验

需要新增统一校验器，至少覆盖：

1. 必填字段缺失
2. 重复条件冲突
3. 永远不会命中的规则
4. 枚举值非法
5. 发布后仍然会落到 `待人工处理` 的风险项

## 推荐迁移顺序

### 阶段 1

先完成 mapping 数据库化收口。

理由：

- 真源未统一时，规则模型改造会重复返工

### 阶段 2

定义统一 DTO：

- `MappingRule`
- `RuleCondition`
- `RuleOutput`

并补 validator。

### 阶段 3

首批迁移：

- `cylinder`
- `secondaryAccessoryPackRules`

理由：

- 这两部分最像规则系统
- 收益最大

### 阶段 4

迁移：

- `lock`

理由：

- 结构简单，适合在统一模型成熟后快速收口

### 阶段 5

迁移：

- `lock_fork`

理由：

- 逻辑最复杂，放在最后更稳

### 阶段 6

增加配置页规则调试器：

- 输入样本
- 查看命中轨迹
- 查看最终输出

## 预估工作量

### 规则模型设计

- DTO 设计
- validator 设计
- priority 设计

预估：

- `0.5 - 1 天`

### 首批规则化迁移

- `cylinder`
- `accessory`

预估：

- `1 - 2 天`

### lock / lock_fork 收口

预估：

- `2 - 4 天`

### 调试器与解释能力

预估：

- `1 - 2 天`

## 风险点

1. 规则统一后，旧配置需要迁移脚本或兼容适配层
2. 如果没有优先级和命中解释，规则统一后只会变成另一种更大的黑盒
3. `lock_fork` 的复杂派生逻辑如果过早硬迁，容易引入回归

## 建议

推荐策略：

1. 先完成 mapping 数据库化收口
2. 再设计统一规则模型
3. 先从 `cylinder + accessory` 开始
4. 最后处理 `lock_fork`

## 完成标准

1. 规则结构统一为 `when / then / priority`
2. 配置保存时具备统一校验
3. 配置页可查看规则命中解释
4. 真实合同样本在迁移前后提取结果一致
5. 新增规则不再依赖修改大量提取代码
