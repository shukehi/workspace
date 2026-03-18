# 系统优化任务拆解（2026-03-18）

> 对应主文档：`docs/roadmaps/SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md`
> 状态：部分完成（2026-03-18）— 阶段一（索引+DB WHERE）、阶段二/三（CORS+认证）、阶段四（AbortController）、阶段六（pino 日志）、P2-1（兼容壳退场）、P2-2（PlainRecord 替换为具体 DTO 类型）、P2-4（service 层使用 createPaginationResponse）已落地；真正的 DB-level LIMIT/OFFSET 分页（阶段一剩余部分）和相关单元测试推迟。
> 说明：本文档按阶段给出文件级任务拆解、推荐执行顺序和 PR 粒度建议。
> 执行状态以各阶段清单文件为准，本文档不重复维护勾选进度。

---

## 1. 使用方式

1. 总目标、优先级排序、风险说明：以 `SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md` 为准
2. 每阶段的退出标准、回滚方案、smoke 记录：以各 `PHASE*.md` 清单为准
3. 本文档只给出任务拆解、文件级动作和建议 PR 粒度

---

## 2. 通用原则

1. 每个子任务保持可独立提交，避免超大 PR
2. P1 阶段不顺带做结构重构，只修复目标问题
3. 每项改动必须有对应测试验收，不接受无测试的性能或安全修复
4. 数据库迁移必须可回滚，遵循 `docs/governance/DB_CHANGE_CHECKLIST_2026-03-13.md`
5. 与现有 `WEEK*` 重构阶段并行推进时，P1 任务优先级更高，不阻塞但需知会

---

## 3. 阶段一：数据库分页与索引（P1-1、P1-3）

对应清单：`SYSTEM_OPTIMIZATION_PHASE1_DB_PAGINATION_2026-03-18.md`

目标：消除全量加载瓶颈，为高频查询字段建立索引。

### 3.1 新增索引迁移脚本

**新增文件**：`server/db/migrations/add-query-indexes-2026-03-18.js`

```javascript
// 建议内容
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addIndex('orders', ['status'], { name: 'idx_orders_status' });
        await queryInterface.addIndex('orders', ['category'], { name: 'idx_orders_category' });
        await queryInterface.addIndex('orders', ['supplier'], { name: 'idx_orders_supplier' });
        await queryInterface.addIndex('orders', ['source_contract_code'], { name: 'idx_orders_source_contract_code' });
        await queryInterface.addIndex('orders', ['created_at'], { name: 'idx_orders_created_at' });
        await queryInterface.addIndex('order_items', ['order_id'], { name: 'idx_order_items_order_id' });
        await queryInterface.addIndex('order_items', ['material_id'], { name: 'idx_order_items_material_id' });
        await queryInterface.addIndex('inventory_receipts', ['order_id'], { name: 'idx_inventory_receipts_order_id' });
    },
    down: async (queryInterface) => {
        // 对应 removeIndex 回滚
    },
};
```

验收：
- [ ] 迁移脚本可在测试环境执行且无报错
- [ ] `EXPLAIN QUERY PLAN` 验证高频查询使用了索引

### 3.2 新增 repository 分页方法

**修改文件**：`server/services/orders/order.repository.ts`

动作：
- [ ] 新增 `findOrdersPaginated(where, page, pageSize)` 方法，使用 `findAndCountAll + limit/offset`
- [ ] 新增 `buildWhereFromQuery(query)` 纯函数，将筛选条件转换为 Sequelize `where` 对象
- [ ] 保留原有 `findAllOrdersWithItems` 不删除（供存量调用方过渡）

`buildWhereFromQuery` 需要处理的字段：

| 前端参数 | 数据库字段 | 操作符 |
|---------|-----------|-------|
| `status` | `orders.status` | `=`（单值）或 `IN`（数组） |
| `category` | `orders.category` | `=` |
| `supplier` | `orders.supplier` | `LIKE %value%` |
| `search` | `orders.order_no` / `orders.source_contract_code` | `OR LIKE` |
| `startDate` / `endDate` | `orders.created_at` | `BETWEEN` |

验收：
- [ ] 单元测试覆盖 `buildWhereFromQuery` 的各参数组合
- [ ] 分页结果与原 `filterOrders` + `slice` 结果一致（相同数据集对比测试）

### 3.3 修改 service 层使用数据库分页

**修改文件**：`server/services/orders/order.service.ts`

动作：
- [ ] `getPaginatedOrders` 改为调用 `findOrdersPaginated`，删除 `filterOrders` 和 `slice` 调用
- [ ] 同步删除 `order.query-policy.ts` 中已被迁移的内存过滤逻辑（保留状态转换验证部分）
- [ ] 验证 `getAllOrders` 的其余调用方是否也需要迁移（逐一评估）

验收：
- [ ] `GET /api/orders?page=1&pageSize=20` 返回结果正确
- [ ] 筛选参数（status/category/search）生效
- [ ] 翻页数据不重复、不遗漏

### 推荐 PR 拆分

**PR 1**：`perf(db): add query indexes for orders and order_items`
- 范围：`server/db/migrations/add-query-indexes-2026-03-18.js`

**PR 2**：`perf(orders): replace in-memory pagination with db-level findAndCountAll`
- 范围：`order.repository.ts`、`order.service.ts`、相关测试

---

## 4. 阶段二：CORS 修复（P1-4）

对应清单：`SYSTEM_OPTIMIZATION_PHASE2_CORS_2026-03-18.md`

目标：修复 `origin: '*'` 与 `credentials: true` 矛盾配置。

### 4.1 修改 env 配置

**修改文件**：`server/config/env.js`

动作：
- [ ] 将 `origin: process.env.CORS_ORIGIN || '*'` 改为解析逗号分隔的域名列表
- [ ] 默认值改为 `http://localhost:5173`（前端开发地址）

```javascript
cors: {
    origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
        : 'http://localhost:5173',
    credentials: true,
}
```

### 4.2 更新环境变量模板

**修改文件**：`.env.example`

动作：
- [ ] 添加 `CORS_ORIGIN` 说明注释，示例格式：`CORS_ORIGIN=http://localhost:5173,http://192.168.1.100:5173`

验收：
- [ ] 前端开发环境跨域请求正常（带 Cookie/凭证）
- [ ] 局域网共享模式下设置正确 IP 后请求正常

**PR**：`fix(cors): resolve origin wildcard and credentials conflict`

---

## 5. 阶段三：API 认证（P1-2）

对应清单：`SYSTEM_OPTIMIZATION_PHASE3_AUTH_2026-03-18.md`

目标：为所有 API 端点添加基础访问控制，防止未授权操作。

### 5.1 实现 API Key 中间件

**新增文件**：`server/app/middleware/apiKeyAuth.ts`

动作：
- [ ] 实现 `apiKeyAuth` 中间件：检查请求头 `x-api-key` 与环境变量 `API_KEY` 是否匹配
- [ ] 未携带或不匹配时返回 `401 { success: false, code: 'UNAUTHORIZED', message: '...' }`
- [ ] 支持 `API_KEY` 未配置时降级（开发环境可跳过，生产环境强制）

```typescript
export function apiKeyAuth(req, res, next) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        // 未配置时根据环境决定是否放行
        if (process.env.NODE_ENV === 'development') return next();
        return res.status(401).json({ success: false, message: 'API key not configured' });
    }
    const token = req.headers['x-api-key'];
    if (token !== apiKey) {
        return res.status(401).json({ success: false, message: 'Invalid API key' });
    }
    next();
}
```

### 5.2 在路由注册处应用中间件

**修改文件**：`server/index.js`

动作：
- [ ] 对 `/api` 前缀的所有路由统一应用 `apiKeyAuth`
- [ ] 健康检查端点（如 `/health`）不纳入保护范围

### 5.3 前端 Axios 实例携带 token

**修改文件**：`src/lib/api.ts`（或 axios 实例初始化处）

动作：
- [ ] 在 Axios 实例的请求拦截器中，从环境变量（`import.meta.env.VITE_API_KEY`）读取并注入 `x-api-key` 请求头

### 5.4 更新配置模板

**修改文件**：`.env.example`、`src/vite-env.d.ts`（补充 `VITE_API_KEY` 类型声明）

动作：
- [ ] 添加 `API_KEY=your-api-key-here`（后端）
- [ ] 添加 `VITE_API_KEY=your-api-key-here`（前端）

验收：
- [ ] 无 token 请求返回 401
- [ ] 携带正确 token 的请求正常通过
- [ ] 前端页面功能不受影响

**PR**：`feat(auth): add api key middleware for all /api routes`

---

## 6. 阶段四：前端请求竞态修复（P2-3）

对应清单：`SYSTEM_OPTIMIZATION_PHASE4_FRONTEND_2026-03-18.md`

目标：修复快速切换筛选时旧请求响应覆盖新数据的问题。

### 6.1 在 store 中使用 AbortController

**修改文件**：`src/stores/useProcurementStore.ts`

动作：
- [ ] 在模块作用域声明 `let fetchController: AbortController | null = null`
- [ ] `fetchOrders` 开始时调用 `fetchController?.abort()` 取消上一次请求
- [ ] 创建新的 `AbortController` 并将 `signal` 传入 axios 请求
- [ ] catch 中过滤 `CanceledError`，只处理真实错误

验收：
- [ ] 快速切换 status 筛选时，最终展示的是最后一次点击对应的数据
- [ ] 取消的请求不触发错误 toast

**PR**：`fix(store): cancel previous fetch on procurement filter change`

---

## 7. 阶段五：API 响应格式统一（P2-4）

对应清单：`SYSTEM_OPTIMIZATION_PHASE5_API_FORMAT_2026-03-18.md`

目标：统一分页接口响应结构，消除前端多格式兼容分支。

> 注意：此阶段需与 `WEEK2` 重构协调，避免同时修改同一文件。

### 7.1 新增统一响应构造函数

**修改文件**：`server/shared/contracts/api.js`（已有，扩充）

动作：
- [ ] 新增 `paginatedResponse(rows, total, page, pageSize)` 辅助函数
- [ ] 新增 `itemResponse(data)` 辅助函数（单条数据）
- [ ] 保持现有 `successResponse` 函数不改动

### 7.2 迁移 orders 端点

**修改文件**：`server/routes/order.js`、`server/services/orders/order.service.ts`

动作：
- [ ] `GET /api/orders` 的分页响应改为 `{ success: true, data: { rows, total, page, pageSize } }`
- [ ] 前端 `src/lib/api.ts` 中对应更新 normalizer 分支

### 7.3 保留 contracts 兼容形态

- [ ] `GET /api/contracts` 继续保留顶层 `rows/total` 格式，不在本阶段改动（已有记录见 WEEK1 文档）

验收：
- [ ] `GET /api/orders` 响应结构符合新格式
- [ ] 前端 Procurement 页面数据加载正常
- [ ] 现有测试 `tests/order-routes.test.js` 更新并通过

**PR**：`refactor(api): unify orders paginated response to data envelope`

---

## 8. 阶段六：日志与可观测性（P3-1）

对应清单：暂不单独建文件，合并到 Phase 3 完成后处理

目标：引入结构化日志，替换 `console.log`。

### 8.1 引入 pino

```
npm install pino pino-pretty
```

**新增文件**：`server/app/logger.ts`

```typescript
import pino from 'pino';
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty' }
        : undefined,
});
```

### 8.2 替换现有日志调用

**修改文件**：`server/index.js`、`server/app/middleware/errorHandler.js`

动作：
- [ ] 将开发环境 `console.log` 请求日志替换为 `logger.info`
- [ ] 错误处理中间件改为 `logger.error({ err }, 'unhandled error')`
- [ ] 仅替换基础日志，不扩展调用范围

验收：
- [ ] 开发环境日志格式易读（pino-pretty）
- [ ] 生产环境输出 JSON 格式
- [ ] 不影响现有功能

**PR**：`feat(logger): replace console.log with structured pino logger`

---

## 9. 推荐执行顺序

```
阶段一（P1-1、P1-3）  →  阶段二（P1-4）  →  阶段三（P1-2）
        ↓
阶段四（P2-3）  →  阶段五（P2-4）  →  阶段六（P3-1）
```

阶段一和阶段二相互独立，可并行开始。阶段三依赖阶段二完成（CORS 修好再上认证，避免调试困难）。

---

## 10. 整体验收清单

完成全部阶段后执行：

- [ ] `npm run type-check`
- [ ] `npm run type-check:server`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Procurement 页面完整链路 smoke（列表/筛选/翻页/详情/打印）
- [ ] 库存页面 smoke
- [ ] 配置管理页面 smoke
- [ ] `EXPLAIN QUERY PLAN` 确认分页查询使用索引
- [ ] 无 token 请求返回 401
- [ ] 局域网环境 CORS 验证

---

## 11. 本计划不覆盖的内容

以下问题已有对应文档，不在本计划中重复：

- 兼容层退场（P2-1）：按 `docs/governance/COMPATIBILITY_SHELL_RETIREMENT_2026-03-13.md` 执行
- TypeScript 迁移（P2-2）：按 `docs/governance/BACKEND_TYPESCRIPT_MIGRATION_STRATEGY_2026-03-13.md` 执行
- OrderItem 字段语义（P2-5）：建议在 WEEK2 后端拆分阶段一并处理

以下问题暂缓处理（当前数据规模不构成紧迫风险）：

- 缓存策略（P3-4）：等 P1 性能问题解决后再评估必要性
- 状态转换 API 统一（P3-2）：下一个版本规划
- 验证逻辑分散（P3-3）：随日常开发逐步收敛
