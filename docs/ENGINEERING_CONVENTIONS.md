# 工程开发约定

## 1. 目标

统一前后端契约、请求层、Mock 行为和提交流程，降低联调偏差与回归风险。

## 2. API 与路由约定

1. 所有业务 API 以 `/api` 为前缀。
2. 配置读写统一使用 `/api/config/*`。
3. 兼容别名（如 `/api/formulas`）仅用于过渡，不新增新调用方。
4. 配方主数据源为 SQLite（`formula_*` 表），`public/data/color-formulas.json` 仅作为迁移输入与回退导出，不作为运行时真源。
5. 路由变更必须同步更新：
   - 前端调用点
   - README API 列表
   - 回归测试

## 3. 前端请求层约定

1. `src` 内禁止直接使用 `axios`。
2. 统一通过 `src/lib/api.ts` 发起请求。
3. `api.ts` 负责响应标准化：
   - 原始 payload 直接透传
   - `{ success, data }` 自动解包 `data`
4. 新增接口时，优先补充类型定义，再写调用。

## 4. Mock 约定

1. Mock 仅在 `import.meta.env.DEV && VITE_USE_MOCK === 'true'` 时启用。
2. 默认本地联调应以真实后端为准（`VITE_USE_MOCK=false`）。
3. Mock 数据结构必须与后端实体类型一致（特别是 `id` 类型）。

## 5. 数据契约约定

1. `Order.id`、`OrderItem.id`、`InventoryItem.id` 使用 `number`。
2. 后端 Sequelize 模型字段类型变更时，必须同步：
   - `src/types/*`
   - Mock 数据
   - 测试用例
3. 删除订单时必须确保子项一致删除（事务内处理）。

## 6. Legacy 约定

1. 业务层不得直接依赖多个 `src/lib/legacy/*` 文件。
2. 统一通过 `src/lib/legacy/facade.ts` 访问 legacy 能力。
3. `public/js` 仅保留当前运行必需链路（详见 `LEGACY_PUBLIC_JS_CLEANUP_PLAN.md`）。

## 7. 测试与质量门禁

PR 前至少执行：

```bash
npm test
npm run type-check
npm run build
```

最小回归覆盖：

1. 订单 CRUD + 分类筛选
2. 配置接口读写（formulas/materials）
3. 库存查询与更新

## 8. 提交流程约定

1. 功能变更需附带对应测试或说明为什么暂不加测。
2. 文档变更与代码变更尽量同 PR 完成，避免漂移。
3. 涉及 API 契约变更时，必须在 PR 描述中列出影响面与回滚策略。

## 9. 文档优先级

1. `README.md`：项目入口与运行方式（最高优先）
2. `ENGINEERING_CONVENTIONS.md`：开发约定（执行标准）
3. 规划文档：阶段性方案与历史记录
