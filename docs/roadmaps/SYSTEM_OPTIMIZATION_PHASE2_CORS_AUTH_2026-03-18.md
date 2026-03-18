# 优化阶段二/三：CORS 修复与 API 认证（2026-03-18）

> 关联文档：
> - `docs/roadmaps/SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md`（P1-2、P1-4）
> - `docs/roadmaps/SYSTEM_OPTIMIZATION_TASKS_2026-03-18.md`
> 状态：待执行
> 说明：CORS 修复（阶段二）和 API 认证（阶段三）合并为一个清单，建议先完成 CORS 修复再上认证，共用两个 PR。

---

## 执行面板

```text
Phase 2+3 — CORS Fix & API Auth
- Owner: TBD
- Status: pending
- Start Date:
- Target Date:
- Exit Criteria:
  - CORS 配置不再使用 origin:'*' 与 credentials:true 同时出现
  - 前端携带凭证的跨域请求在开发/局域网环境均正常
  - 所有 /api 端点需要 x-api-key 才能访问
  - 无 token 请求返回 401
  - 前端页面功能不受影响
  - npm run type-check + npm test + npm run build 通过
- Blocking: 建议阶段一完成后再执行
- PR / Issue:
- Notes:
```

---

## 范围限制

本阶段只做：
1. 修复 CORS 配置矛盾
2. 新增 API Key 中间件
3. 前端注入 token

本阶段不做：
- 不引入用户体系或 JWT
- 不做权限分级（所有合法 token 享有相同权限）
- 不改动业务逻辑

---

## 阶段二任务：CORS 修复

### 任务 1：修改 CORS 配置

**文件**：`server/config/env.js`（修改）

- [ ] 将 `origin: process.env.CORS_ORIGIN || '*'` 改为：

```javascript
origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : 'http://localhost:5173',
```

- [ ] 确认 `credentials: true` 仍保留

验收：
- [ ] 开发环境（`http://localhost:5173`）跨域请求正常
- [ ] 不再出现 `CORS header 'Access-Control-Allow-Origin' cannot be the wildcard '*'` 错误

### 任务 2：更新环境变量模板

**文件**：`.env.example`（修改）

- [ ] 将现有 `CORS_ORIGIN=*` 改为：

```
# 允许的前端来源，多个用英文逗号分隔
# 开发环境默认为 http://localhost:5173
# 局域网示例：CORS_ORIGIN=http://192.168.1.100:5173
CORS_ORIGIN=http://localhost:5173
```

验收：
- [ ] `.env.example` 中的注释说明局域网使用方式

**PR**：`fix(cors): replace wildcard origin with explicit host list`

---

## 阶段三任务：API 认证

### 任务 3：实现 API Key 中间件

**文件**：`server/app/middleware/apiKeyAuth.ts`（新增）

- [ ] 实现 `apiKeyAuth(req, res, next)` 中间件
- [ ] 读取 `process.env.API_KEY`
- [ ] 若 `API_KEY` 未配置：
  - `NODE_ENV === 'development'` 时放行（避免本地开发每次都要配 key）
  - 其他环境返回 `500 { success: false, message: 'Server misconfiguration: API_KEY not set' }`
- [ ] 从请求头 `x-api-key` 读取 token
- [ ] token 不匹配返回 `401 { success: false, code: 'UNAUTHORIZED', message: 'Invalid API key' }`
- [ ] token 匹配则 `next()`

验收：
- [ ] 单元测试：无 key 时开发环境放行
- [ ] 单元测试：无 key 时非开发环境返回 500
- [ ] 单元测试：错误 token 返回 401
- [ ] 单元测试：正确 token 调用 next()

### 任务 4：在主路由挂载中间件

**文件**：`server/index.js`（修改）

- [ ] 在 `/api` 路由注册前插入 `apiKeyAuth` 中间件：

```javascript
const { apiKeyAuth } = require('./app/middleware/apiKeyAuth');
app.use('/api', apiKeyAuth);
```

- [ ] 确认健康检查端点（如有）不受影响

验收：
- [ ] `curl /api/orders` 无 token 返回 401
- [ ] `curl /api/orders -H 'x-api-key: xxx'` 携带正确 token 返回正常数据

### 任务 5：前端 Axios 实例注入 token

**文件**：`src/lib/api.ts`（修改）

- [ ] 在 Axios 请求拦截器中，从 `import.meta.env.VITE_API_KEY` 读取 token
- [ ] 若 token 存在，注入请求头 `x-api-key`
- [ ] 若 token 不存在（本地开发未配置），不注入，依赖服务端开发模式放行

```typescript
instance.interceptors.request.use((config) => {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiKey) {
        config.headers['x-api-key'] = apiKey;
    }
    return config;
});
```

验收：
- [ ] 前端请求在 Network 面板中携带 `x-api-key` 请求头
- [ ] 所有页面功能正常

### 任务 6：更新配置模板和类型声明

**文件**：`.env.example`（修改）、`src/vite-env.d.ts`（修改）

- [ ] `.env.example` 添加：

```
# 后端 API 密钥（前后端必须一致）
API_KEY=change-me-before-deploy
VITE_API_KEY=change-me-before-deploy
```

- [ ] `src/vite-env.d.ts` 补充：

```typescript
interface ImportMetaEnv {
    readonly VITE_API_KEY?: string;
    // ...现有声明
}
```

验收：
- [ ] `npm run type-check` 通过，无 `VITE_API_KEY` 相关类型错误

---

## 推荐 PR 拆分

### PR 1：CORS 修复

```
fix(cors): replace wildcard origin with explicit host list

- parse CORS_ORIGIN env as comma-separated list
- default to localhost:5173 in development
- add usage note in .env.example
```

### PR 2：API 认证

```
feat(auth): add api key authentication for all /api routes

- add apiKeyAuth middleware (dev mode bypass when API_KEY unset)
- mount middleware on /api router in server/index.js
- inject x-api-key header in frontend axios instance
- update .env.example and vite-env.d.ts
```

---

## 回滚方案

- CORS 回滚：恢复 `server/config/env.js` 中 origin 配置
- 认证回滚：从 `server/index.js` 移除 `app.use('/api', apiKeyAuth)`，从前端拦截器移除 header 注入

---

## 本阶段验收清单

- [ ] `npm run type-check`
- [ ] `npm run type-check:server`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] 开发环境（未配置 API_KEY）：前端页面功能全部正常
- [ ] 配置 API_KEY 后：无 token 请求 `curl http://localhost:3000/api/orders` 返回 401
- [ ] 配置 API_KEY 后：前端携带 token 的请求正常返回数据
- [ ] 局域网环境 smoke（如适用）：配置 CORS_ORIGIN 后跨设备访问正常
