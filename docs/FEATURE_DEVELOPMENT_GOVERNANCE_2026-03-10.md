# 功能开发与配置接入规范（2026-03-10）

## 1. 目标

这份规范用于降低以下风险：

1. 单个页面或 store 持续膨胀
2. 新功能重新接回 legacy 配置接口
3. 兼容层被误当成主线能力
4. 业务逻辑散落在页面、组件、store、route 中
5. 每隔一段时间就必须做一次大重构

本规范优先约束“边界”和“接入方式”，而不是格式化细节。

## 2. 页面开发规范

### 2.1 页面只做 feature shell

路由级页面应只负责：

- 页面级装配
- 顶层事件接线
- 少量页面级计算
- 子组件与 composable 组合

页面不应直接承担：

- 大块业务转换逻辑
- 弹窗状态机
- 打印/导出流程
- 配置加载细节
- 历史列表与分页状态

### 2.2 页面拆分阈值

出现以下任一情况，必须评估拆分：

1. 页面文件超过 `300-400` 行
2. 页面同时承担 3 类以上职责
3. 同一个页面同时包含：
   - 筛选状态
   - 弹窗编排
   - 导出/打印流程
   - 复杂数据转换

推荐拆分顺序：

1. 先拆纯展示块
2. 再拆 page state composable
3. 再拆 dialog/action orchestration composable

## 3. Store 规范

### 3.1 Store 只保留领域状态

Store 适合承载：

- 领域状态
- 少量领域动作
- 与该领域强绑定的查询/更新

Store 不应同时承担：

- 远端拉取与缓存桥接
- 分析计算
- 页面交互状态
- 历史分页
- 打印/导出流程

### 3.2 典型拆分方式

如果一个 store 过重，优先按下面方式拆：

1. 主实体状态
2. 历史列表/分页
3. 纯分析或衍生计算

例如：

- 当前合同状态
- 历史合同列表
- 材料/五金分析

应分为独立层，而不是继续堆进同一个 store。

## 4. 组件规范

### 4.1 组件分层

组件优先分成三类：

1. 展示组件
   只接收 props 和 emit，不知道数据来源

2. feature 组件
   承担局部交互，但不直接操作全局配置真源

3. route 页面
   只做装配

### 4.2 重逻辑组件处理方式

如果组件内同时出现以下逻辑，应优先抽成 helper 或 composable：

- 草稿初始化
- 表头/字段同步
- 快照创建
- PDF 导出
- 打印跳转
- 删除确认与批量确认

推荐形式：

- 纯数据初始化逻辑放 `features/.../*.ts`
- 带状态和副作用的逻辑放 `use*.ts`

## 5. 配置域真源规范

### 5.1 配置接口分级

配置接口只允许分成三类：

1. A 类：workflow 主接口
2. B 类：legacy 兼容接口
3. C 类：静态 fallback 资源

只有 A 类可以作为新功能真源。

### 5.2 新功能接入规则

新增功能如果涉及配置读取：

1. 先确认是否已有 workflow `published/detail` 接口
2. 如果有，必须只接 workflow 接口
3. 不允许直接接 legacy `/api/config/*`
4. 不允许页面和业务逻辑直接依赖 `/data/*.json`

### 5.3 配置编辑规则

新增配置编辑能力必须优先具备：

- `detail`
- `draft`
- `publish`
- `revisions`
- `audit-logs`

如果没有这些能力，不应新增“直接写配置文件”的编辑页。

## 6. 兼容层规范

### 6.1 legacy route 的定位

legacy route 只允许承担：

- 迁移兼容
- 旧页面桥接
- workflow 背后的兼容读写入口

legacy route 不允许承担：

- 新功能主接口
- 新语义扩展
- 只存在于兼容层的特殊行为

### 6.2 compatibility only 标识

所有 legacy 配置路由都应在代码中明确标识：

- compatibility only
- workflow-backed
- do not use for new frontend flows

## 7. Repository / Facade 规范

### 7.1 repository 的职责

repository 层负责：

- 真源读取顺序
- fallback 策略
- 兼容接口桥接
- 数据来源追踪

页面、store、业务组件不应自己决定：

- 先读 workflow 还是读 legacy
- 失败后是否回退静态 JSON
- 当前配置来自哪条通道

### 7.2 facade 的职责

facade 层负责：

- 暴露更窄的业务读取接口
- 隐藏 `configLoader` / repository 细节
- 给业务代码提供稳定入口

## 8. 新功能开发流程

新增功能时，按这个顺序做：

### 第一步：先判断功能归属

先判断它属于：

- 页面装配问题
- 领域状态问题
- 配置读取问题
- 打印/导出流程问题
- 纯数据转换问题

不要一开始就直接改最大页面或最大 store。

### 第二步：先确定真源

如果涉及配置或持久化：

1. 先确认唯一真源接口
2. 再写 UI

禁止一边开发一边临时决定：

- 先从 legacy 接口读
- 不行再读静态 JSON

### 第三步：优先落 helper / composable

如果逻辑是可复用或可测试的：

- 先抽 helper
- 再接到页面/组件

### 第四步：最后接页面

页面应始终是最后一层接线，而不是第一层落逻辑。

## 9. 测试规范

### 9.1 新增结构边界时必须补测试

以下情况至少补一条测试：

1. 新增 workflow route
2. 新增兼容桥接
3. 新增 page state composable
4. 新增 dialog/action composable
5. 新增 legacy 退场限制

### 9.2 优先级

优先补：

1. 纯逻辑测试
2. route 行为测试
3. source guard / structure guard

如果一个新边界没有任何测试，后续很容易被悄悄绕开。

## 10. PR / Review 检查清单

提交前至少自检：

1. 新功能是否直接依赖了 legacy `/api/config/*`
2. 页面是否承担了不该属于页面的逻辑
3. store 是否同时承担 3 类以上职责
4. 是否把 fallback 语义暴露到了页面层
5. 是否补了最小测试
6. 是否需要更新配置域/重构文档

review 时应优先拦截：

1. 新的“大页面”
2. 新的“大 store”
3. 页面直接访问 legacy 接口
4. 兼容层新增特殊语义

## 11. 当前默认建议

如果后续继续新增功能，默认按下面方式放置：

- 页面装配：`src/views/*`
- 展示块：`src/components/<feature>/*`
- 页面状态：`src/features/<feature>/use*PageState.ts`
- 弹窗编排：`src/features/<feature>/use*Dialogs.ts`
- 动作流程：`src/features/<feature>/use*Actions.ts`
- 纯数据 helper：`src/features/<feature>/*.ts`
- 配置读取：`src/services/*Repository.ts` 或 facade

## 12. 关联文档

- [前后端开发规范（强约束版）](/Users/aries/Dve/workspace/docs/ENGINEERING_CONVENTIONS.md)
- [Legacy 配置接口退场策略（2026-03-10）](/Users/aries/Dve/workspace/docs/LEGACY_CONFIG_ENDPOINT_RETIREMENT_PLAN_2026-03-10.md)
- [Source/配置重构阶段性总结（2026-03-10）](/Users/aries/Dve/workspace/docs/SOURCE_CONFIG_REFACTOR_PROGRESS_2026-03-10.md)
