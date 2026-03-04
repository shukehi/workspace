# 配方管理重构说明

## 1. 目标

将配方管理从 JSON 文件读写升级为 SQLite 版本化管理，并提供草稿、发布、归档、回滚能力。

## 2. 数据模型

- `formula_definitions`: 配方主记录（编码、名称、分类、状态、当前生效 revision）
- `formula_revisions`: 每次修改产生一条 revision 快照（payload_json + 状态）
- `formula_audit_logs`: 关键操作审计（create/update_draft/publish/archive/rollback）

## 3. API

主入口：`/api/config/formulas`

- `GET /api/config/formulas`
- `GET /api/config/formulas/:formulaKey`
- `POST /api/config/formulas`
- `PUT /api/config/formulas/:formulaKey/draft`
- `POST /api/config/formulas/:formulaKey/publish`
- `POST /api/config/formulas/:formulaKey/archive`
- `POST /api/config/formulas/:formulaKey/rollback`
- `GET /api/config/formulas/:formulaKey/revisions`

兼容入口：`GET /api/formulas`

- 返回已发布配方映射（legacy shape）
- 响应头包含 `X-API-Deprecated: true`
- `POST /api/formulas` 已禁用（405）

## 4. 生效规则

- 草稿保存不会影响物料计算。
- 物料计算链路读取 `/api/formulas`，只消费已发布版本。

## 5. 迁移与回退

迁移 JSON -> SQLite：

```bash
npm run db:migrate:formulas
```

导出 SQLite -> JSON（应急回退）：

```bash
npm run db:export:formulas
```

## 6. 前端工作台

页面：`/formula`

- 左侧：配方列表（搜索/筛选）
- 中间：配方编辑（BOM 行编辑 + 本地校验 + 草稿保存/发布/归档）
- 右侧：版本历史（支持回滚）

