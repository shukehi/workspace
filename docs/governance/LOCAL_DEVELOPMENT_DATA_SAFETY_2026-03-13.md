# 本地开发数据安全约束（2026-03-13）

> 用途：为“边开发边使用”的本地运行模式提供最小数据保护规则，降低数据库调整、配置调整和迁移试验时的数据丢失风险。

## 1. 当前数据落点

本项目当前不是“所有数据都在 SQLite”。

### 1.1 SQLite 运行库

- 默认运行库：`data/runtime/database.sqlite`
- 配置入口：`server/config/database.js`
- 兼容复制逻辑：
  - 如果未设置 `DB_STORAGE`，且 `data/runtime/database.sqlite` 不存在
  - 系统会尝试从历史路径复制：
    - `database.sqlite`
    - `data/database.sqlite`

### 1.2 JSON 配置数据

以下业务配置当前仍落在 `data/config/*.json`：

- `materials-catalog.json`
- `color-formulas.json`
- `packaging-mapping.json`
- `cylinder-mapping.json`
- `lock-mapping.json`
- `lock-fork-mapping.json`
- `handle-mapping.json`
- `procurement-settings.json`

结论：

1. 备份时不能只备份 SQLite。
2. 任何“配置丢失”都要先检查 `data/config/`，不要误以为是数据库问题。

## 2. 当前数据库初始化策略

项目当前启动数据库时采用偏保守策略：

1. `sequelize.sync()`：用于创建缺失表。
2. `runMigrations()`：用于执行增量 migration。

当前 migration 规则以 additive 为主：

1. 优先 `addColumn`
2. 优先 `CREATE INDEX IF NOT EXISTS`
3. 不在默认启动链路中执行删表、删列、重建表

这意味着：

1. 正常启动项目，不应自动清空现有数据。
2. 风险主要来自后续人工编写的破坏性 schema 变更，而不是当前启动流程本身。

## 3. 改库前必须做的事

任何涉及 schema、migration、模型字段语义调整的改动，在本地验证前必须完成：

1. 备份 `data/runtime/database.sqlite`
2. 备份整个 `data/config/`
3. 记录本次改动影响哪些表、哪些 JSON 配置
4. 明确这次是否只做 additive 变更

推荐最小备份范围：

1. `data/runtime/database.sqlite`
2. `data/config/`

如果本次改动涉及导入导出或公式迁移，也应额外检查：

1. `data/runtime/color-formulas.exported.json`

## 4. 当前阶段允许的安全变更

在“边开发边使用”的阶段，优先采用以下变更方式：

1. 新增表
2. 新增字段
3. 新增索引
4. 为新增字段提供默认值
5. 保留旧字段，并在代码中兼容读取旧数据
6. 通过 migration 回填新字段，而不是直接覆盖旧值

这些做法的目标是：

1. 尽量不破坏已经在本地沉淀的真实使用数据
2. 允许业务逻辑继续试验，而不是要求 schema 一次定型

## 5. 当前阶段禁止直接做的高风险操作

在未做完整备份和回退方案前，不要直接提交或执行以下操作：

1. 删除字段
2. 重命名字段但不保留兼容读取
3. 修改字段语义但不做数据回填
4. 重建表替换旧表
5. 清空 SQLite 文件重新初始化
6. 把 `DB_STORAGE` 切到新路径后继续在旧库上做判断
7. 只备份数据库，不备份 `data/config/`

如果确实要做破坏性改动，应先经过：

1. 双写或兼容读阶段
2. 本地数据备份
3. 最小回归验证

## 6. 每次改库后的最小验证

完成 migration 或模型调整后，至少手工验证以下链路：

1. 订单读取与写入
2. 入库记录读取与写入
3. 配方读取与发布
4. materials / mappings 配置读取
5. 关键页面是否还能正常加载历史数据

如果发现异常，先检查：

1. SQLite 是否切到了意外的新文件
2. `schema_migrations` 是否记录了本次 migration
3. `data/config/*.json` 是否被覆盖或写入了意外结构

## 7. 与 AI / 自动化协作时的默认规则

后续如果由 AI 协助开发，默认遵守以下规则：

1. 未经明确要求，不主动做破坏性 schema 改动
2. 未经明确要求，不删除历史字段和兼容入口
3. 涉及数据库结构调整时，优先 additive migration
4. 涉及配置落点时，同时检查 SQLite 与 `data/config/`
5. 如果改动存在数据风险，先提示风险，再实施改动

本文件的目的不是阻止演进，而是把演进方式控制在“可回退、可验证、可继续使用”的范围内。
