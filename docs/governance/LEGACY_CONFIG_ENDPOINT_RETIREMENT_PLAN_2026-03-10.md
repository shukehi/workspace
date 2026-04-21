# Legacy 配置接口退场策略（2026-03-10）

> 历史治理文档。
> 当前运行时 legacy bridge 已经移除；请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

## 目的

当前配置域已经形成两层接口：

1. workflow 主接口
2. legacy `/api/config/*` 兼容接口

这份文档的目标是明确：

- 哪些接口仍然允许保留
- 哪些接口只允许兼容，不允许前端新接入
- 哪些接口后续应逐步退场

重点不是“立刻删除”，而是避免新代码继续接入 legacy 路径，导致双轨制长期固化。

## 当前分级

### A 类：workflow 主接口

这些接口应视为唯一真源，允许前端继续直接接入。

materials:

- `/api/config/material-catalog/published`
- `/api/config/material-catalog/detail`
- `/api/config/material-catalog/draft`
- `/api/config/material-catalog/publish`
- `/api/config/material-catalog/revisions`
- `/api/config/material-catalog/audit-logs`

mappings:

- `/api/config/mappings/:type/detail`
- `/api/config/mappings/:type/published`
- `/api/config/mappings/:type/draft`
- `/api/config/mappings/:type/publish`
- `/api/config/mappings/:type/rollback`
- `/api/config/mappings/:type/revisions`
- `/api/config/mappings/:type/audit-logs`

formulas:

- `/api/config/formulas`
- `/api/config/formulas/:key`
- `/api/config/formulas/:key/draft`
- `/api/config/formulas/:key/publish`
- `/api/config/formulas/:key/archive`
- `/api/config/formulas/published-map`

结论：

- 新前端代码只能接 A 类接口
- 文档、测试和 review 都应把 A 类当成标准路径

### B 类：兼容接口

这些接口当前可以保留，但只用于：

- 迁移过渡
- 旧页面/旧脚本兼容
- workflow 不可用时的临时桥接

materials:

- `/api/config/materials`

mappings:

- `/api/config/packaging`
- `/api/config/cylinder`
- `/api/config/lock`
- `/api/config/lock-fork`
- `/api/config/handle`
- `/api/config/packaging-mapping`

结论：

- 不允许新增前端功能直接依赖 B 类接口
- B 类接口应在返回日志、代码注释或文档中明确标记为 compatibility only
- B 类接口继续保留的前提是：其底层必须 workflow-backed，不能再回退为纯文件直写
- 当前 mapping B 类接口已经完成这一点：它们不再读写 `data/config/*.json`

### C 类：静态 fallback 资源

这些资源只能作为迁移基线或历史参考，不应被当成正式真源。

- `/data/materials-catalog.json`
- `/data/packaging-mapping.json`
- `/data/cylinder-mapping.json`
- `/data/lock-fork-mapping.json`
- `/data/handle-mapping.json`

结论：

- C 类不是业务真源
- 对 mapping 来说，前端运行时已经不再保留这些 fallback
- materials 当前仍保留文件兜底语义，mapping 不再保留

## 当前状态判断

按现在仓库实现，已经达到的状态：

1. materials 前端读取优先使用 workflow published
2. mappings 前端读取已只使用 workflow published
3. mapping 配置页编辑已走 workflow `detail -> draft -> publish`
4. legacy mapping route 已 workflow-backed，且不再读写本地 JSON
5. legacy materials route 已 workflow-backed
6. 前端启动时若缺 published mapping，会直接 fail closed，而不是继续以空默认值运行

也就是说，legacy route 现在主要不是“真源”，而是“兼容入口”。

## 退场原则

### 原则 1：禁止新接入 legacy route

从现在开始：

- 新功能不得直接调用 `/api/config/materials`
- 新功能不得直接调用 `/api/config/packaging`
- 新功能不得直接调用 `/api/config/cylinder`
- 新功能不得直接调用 `/api/config/lock-fork`
- 新功能不得直接调用 `/api/config/handle`
- 新功能不得直接调用 `/api/config/packaging-mapping`

如果确实需要读取配置，必须先评估是否已有 workflow published/detail 接口。

### 原则 2：legacy route 只做桥接，不做新语义扩展

legacy route 可以保留，但不能继续叠新行为，例如：

- 不新增只存在于 legacy route 的特殊参数
- 不新增只存在于 legacy route 的字段格式
- 不在 legacy route 上继续扩充业务逻辑

否则会再次把兼容层变成主线。

### 原则 3：所有编辑能力最终都应走 workflow

判断标准：

- 有没有 revision
- 有没有 draft/published 状态
- 有没有 audit log
- 有没有 published 读接口

没有这些能力的编辑入口，不应被视为最终形态。

## 推荐实施顺序

### 第一步：文档与 review 约束

- 在工程文档中明确 A/B/C 三类接口
- code review 中将“新增 legacy route 依赖”视为结构性退步

### 第二步：前端进一步缩小 fallback 暴露面

- 已完成：mapping 运行时已不再保留 legacy/static fallback
- 待继续：materials 是否也要完全移除 fallback 需单独决策

### 第三步：给 legacy route 增加显式兼容标识

建议在以下文件中保持简短注释：

- [`server/routes/configData.ts`](/Users/aries/Dve/workspace/server/routes/configData.ts)

标明：

- compatibility only
- backed by workflow
- do not use for new frontend flows

### 第四步：建立退场检查

建议新增一个轻量 guard test，检查：

- `src/` 中是否新增对 B 类接口的直接调用
- 允许的例外是否只剩 repository / 兼容测试

## 建议的接口状态表

### 保持为主接口

- `/api/config/material-catalog/*`
- `/api/config/mappings/*`
- `/api/config/formulas/*`

### 保持兼容，但禁止新接入

- `/api/config/materials`
- `/api/config/packaging`
- `/api/config/cylinder`
- `/api/config/lock-fork`
- `/api/config/handle`
- `/api/config/packaging-mapping`

### 仅作为 fallback 资源，不允许业务直接依赖

- `/data/materials-catalog.json`
- `/data/packaging-mapping.json`
- `/data/cylinder-mapping.json`
- `/data/lock-fork-mapping.json`
- `/data/handle-mapping.json`

## 退出条件

可以正式考虑删除某个 legacy route 的条件：

1. 前端生产代码已无直接依赖
2. workflow published/detail/draft/publish 已完整覆盖
3. 兼容测试已迁移为 workflow 路径测试
4. 运行时文件同步不再被外部流程依赖

## 结论

当前 mapping 域已经进入下一阶段：legacy 接口虽然还在，但数据库 published 已是唯一运行时真源，兼容层也不再做文件同步。接下来最合理的策略是继续通过文档、review 和 guard test 阻止新代码接入 legacy 路径，并在条件成熟后直接删除这些兼容接口。

这样能在不打断现有系统的情况下，逐步结束配置域的双轨制。
