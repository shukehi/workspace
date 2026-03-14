# 新功能落位指南（2026-03-13）

> 用途：给新增需求、重构拆分和 review 一个快速判断依据，减少“文件应该放哪”的重复讨论。

## 1. 前端落位

### 1.1 页面

- 路由级页面放 `src/views/*`
- 页面只保留：
  - 页面装配
  - 顶层事件接线
  - 少量页面级展示计算

不应继续堆进页面的内容：

- 列表/筛选/分页状态
- 弹窗状态机
- 导出/打印流程
- 配置装载顺序
- 复杂 normalize / summary / facet 逻辑

### 1.2 feature 目录

如果某块逻辑明显属于单一业务域，默认放到：

- `src/features/<feature>/composables`
- `src/features/<feature>/model`
- `src/features/<feature>/services`
- `src/features/<feature>/components`

推荐判断：

1. 页面状态放 `composables/use*PageState.ts`
2. 弹窗/动作编排放 `composables/use*Flow.ts`、`use*Actions.ts`、`use*Dialogs.ts`
3. 纯计算、normalize、summary、field mapping 放 `model/*.ts`
4. runtime adapter、浏览器副作用、领域 IO workflow 放 `services/*.ts`

### 1.3 shared

只有满足以下条件，才进入 `src/shared/*` 或仓库级 `shared/*`：

1. 已经被多个域真实复用
2. 不依赖页面、路由、Pinia、浏览器副作用
3. 不携带特定业务流语义

不满足这些条件时，宁可先放在 feature 内部。

### 1.4 store

`src/stores/*` 默认只保留：

- 领域状态
- 少量领域动作
- 对外暴露给多个页面/组件的稳定接口

以下内容优先拆出去：

1. `localStorage`
2. `window.confirm/prompt/open/onbeforeunload`
3. 下载锚点创建
4. 配置真源读取顺序
5. 历史分页与页面交互状态

## 2. 后端落位

### 2.1 route / controller / service / repository

新增后端能力默认按下面顺序落位：

1. `server/routes/*`
2. `server/controllers/*`
3. `server/services/<domain>/*`
4. `server/validators/*`

职责边界：

1. route：只做 URL 绑定
2. controller：请求读取、参数校验接线、响应包装、错误映射
3. service：领域编排和业务规则
4. repository：数据读写、真源选择、事务内查询

### 2.2 service 子模块

当单个 service 过重时，优先拆成：

- `*.policy.js`
- `*.query-policy.js`
- `*.mapper.js`
- `*.repository.js`
- `*.errors.js`
- `*.service.js`

compatibility shell 只允许留在旧入口文件，且只能转发。

### 2.3 validator

新增或改造写接口时：

- 参数/体/query 校验放 `server/validators/*`
- 不在 service 内继续兜底裸 `req.body` / `req.query`

## 3. 配置与 runtime 落位

### 3.1 配置真源

按职责区分：

1. repository：读取顺序、fallback、legacy/workflow 真源判断
2. loader：运行时缓存、刷新、配置快照装配
3. runtime service：装载配置后执行业务分析或 workflow

页面、store、业务组件不应直接决定“先读哪个配置源”。

### 3.2 legacy / compatibility

以下内容必须显式标记为兼容层：

1. 旧 route
2. 旧 service 入口壳
3. workflow-backed legacy endpoint

这类文件必须：

1. 可搜索定位
2. 写清退场条件
3. 不作为新功能主入口

## 4. 测试落位

新增结构边界时，优先补：

1. 纯逻辑测试：`tests/*-model.test.ts`
2. composable 测试：`tests/*-composable.test.ts`
3. route 行为测试：`tests/*-route.test.js`
4. guard 测试：`tests/*-guard.test.js`

如果只是做职责下沉，优先补纯逻辑和 composable 测试。

## 5. 快速判断

如果你在改一个文件前不确定放哪里，按下面顺序判断：

1. 这是页面装配，还是领域逻辑？
2. 这是状态协调，还是纯计算？
3. 这是浏览器副作用，还是业务规则？
4. 这是单域逻辑，还是多域共享规则？
5. 这是正式入口，还是兼容过渡入口？

只要答案里出现“浏览器副作用 / 配置真源 / 兼容入口 / 纯规则复用”，就不应该继续往页面或大 store 里塞。
