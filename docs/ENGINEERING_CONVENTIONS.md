# 前后端开发规范（强约束版）

## 1. 目标与适用范围

1. 统一前端、后端、数据库与测试规则，降低回归风险。
2. 本规范适用于 `src/**`、`server/**`、`public/css/**`、`tests/**` 全部改动。
3. 规则默认强制执行，除非在 PR 中明确写出偏离原因和回滚方案。

## 2. 分支与提交规范

1. 新功能/重构分支必须使用 `codex/` 前缀。
2. 禁止直接在 `main` 开发。
3. 每次提交只做一类改动（功能、重构、修复、文档分开）。
4. 提交信息建议使用：`feat|fix|refactor|chore|docs|test(scope): message`。

## 3. 前端规范

1. `src` 内禁止直接使用 `axios`，统一通过 `src/lib/api.ts`。
2. 接口调用前先补类型定义，再写业务逻辑。
3. CSS 优先使用模块拆分与选择器合并，不在同一 PR 同时改“结构 + 视觉值”。
4. 新增 CSS 规则遵循已有分层：
   - `public/css/core/*`
   - `public/css/layout/*`
   - `public/css/components/*`
   - `public/css/pages/*`
5. 禁止跨页面文件覆盖他页组件样式（除非有明确兼容方案）。

## 4. 后端规范

1. 路由层只做参数校验与响应包装，业务逻辑放 service 层。
2. 所有业务 API 使用 `/api/*` 前缀。
3. 破坏性接口变更必须保持向后兼容窗口，或同步迁移前端并在 PR 标注影响面。
4. 删除类操作默认按幂等设计（重复删除不应导致系统异常）。
5. 涉及多表写入必须放事务。

## 5. 数据库与迁移规范

1. 模型字段变更必须提供迁移策略，禁止仅依赖手工改库。
2. 生产/共享环境禁止直接改 SQLite 文件结构。
3. 字段新增优先“可加性迁移”（additive migration），避免破坏已有数据。
4. 模型变更后必须同步：
   - `src/types/**`
   - Mock 数据
   - 对应测试

## 6. 测试与质量门禁

每个 PR 至少满足：

```bash
npm run lint:css
node --test tests/print-style-guard.test.js
npm run type-check
```

涉及后端接口、数据契约或核心流程变更时，额外执行：

```bash
npm test
```

## 7. CI 规范

1. CSS 治理工作流文件：`.github/workflows/css-governance.yml`。
2. CI 必须通过后才能合并。
3. 禁止跳过失败检查直接合并（紧急修复需在事后补齐测试与复盘）。

## 8. PR 规范

1. 必须使用 PR 模板：`.github/pull_request_template.md`。
2. PR 描述必须包含：
   - 变更范围
   - 风险评估
   - 验证步骤
   - 回滚方案
3. API/DB 变更必须列出契约差异与兼容策略。

## 9. 文档同步规范

1. 影响开发流程的改动，必须同步更新本规范文档。
2. 影响运行或排障的改动，必须同步更新 `README.md` 或 `docs/troubleshooting.md`。

## 10. 目录与文件放置规则

1. `data/config/` 是映射、材料目录、采购设置等配置数据的唯一来源，禁止新增 `public/data/` 业务配置依赖。
2. `data/runtime/` 仅允许放运行期数据库、备份和导出文件，禁止入库。
3. 原始导入文件统一放 `data/imports/`，禁止再放到仓库根目录。
4. 手工验证脚本统一放 `tests/manual/` 或 `scripts/experiments/`，禁止散落在根目录。
5. 说明性文档统一放 `docs/` 子目录，截图或示意图统一放 `docs/assets/`。
6. 禁止跟踪 `dist/`、`node_modules/`、`temp/`、`database.sqlite` 及 `data/runtime/**`。

## 11. 关联文档

1. CSS 治理清单：`docs/CSS_GOVERNANCE_CHECKLIST.md`
2. Legacy 清理计划：`docs/LEGACY_PUBLIC_JS_CLEANUP_PLAN.md`
3. 模板迁移计划：`docs/CSS_TEMPLATE_MIGRATION_PLAN.md`
4. 功能开发与配置接入规范：`docs/FEATURE_DEVELOPMENT_GOVERNANCE_2026-03-10.md`
5. Legacy 配置接口退场策略：`docs/LEGACY_CONFIG_ENDPOINT_RETIREMENT_PLAN_2026-03-10.md`
