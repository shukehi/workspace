# Runtime Contract (2026-04-16)

> 状态：现行参考文档。
> 用途：说明当前项目在启动、配置加载、ERP 查询、打印/PDF 与 API 认证方面的真实运行时契约。

---

## 1. 启动入口

### 前端启动
- 入口：`src/main.ts`
- 启动顺序：
  1. `initializeConfigRuntime()`
  2. 成功后才挂载 Vue App
  3. 若失败，显示 bootstrap failure 壳页，阻止进入主应用

### 后端启动
- 入口：`server/index.ts`
- 启动顺序：
  1. `initDB()`
  2. 挂载 routes
  3. 暴露 `dist/` 与 `/data/*`
  4. 预热 PDF renderer

---

## 2. Config Runtime Contract

### 2.1 前端启动前必须加载的配置
`src/services/configLoader.ts` 当前遵循：

- **硬门禁**：
  - materials
  - published mappings（packaging / cylinder / lock / lockFork / handle）
- **软门禁**：
  - formulas

也就是说：

#### 启动失败会阻断主应用的情况
- materials 读取失败
- 任一 mapping published payload 无法读取

#### 启动失败不会阻断主应用的情况
- formulas 读取失败
  - 当前会退回内存/空 map，并打印 warning

### 2.2 ConfigRepository 当前读取顺序
`src/services/configRepository.ts`

#### materials
1. `/api/config/profiles/material_catalog/detail`
2. `/data/materials-catalog.json`

#### formulas
- `/api/config/profiles/formulas/detail`
- 当前没有 static fallback

#### mappings
- `/api/config/profiles/:type/detail`
- 当前没有 static fallback
- 属于 fail-closed

### 2.3 运行时结论
- materials 允许 fallback 到 static
- mappings 不允许 fallback，profile published/detail payload 缺失就应视为运行时配置不完整
- formulas 当前允许降级，不阻断 app mount

---

## 3. ERP Contract Contract

### 3.1 Fresh fetch
- 前端入口：`src/features/source-analysis/services/sourceContractService.ts#fetchErpContract`
- 后端代理：`server/routes/api.ts` 下 `/api/getOutContractDetail`
- 依赖：`ERP_BASE_URL`

这是**在线查询链路**，强依赖上游 ERP。

### 3.2 Cached history fetch
- 前端入口：`src/features/source-analysis/services/sourceContractService.ts#fetchHistoryContractByCode`
- 后端入口：`server/routes/contracts.ts`
- 数据来源：本地缓存的 `ErpContract.raw_json`

这是**历史缓存链路**，不依赖 ERP 在线可用。

### 3.3 运行时结论
- “查新合同”依赖 ERP
- “读历史合同”依赖本地 contract cache
- 二者不能混成一个单一依赖语义

---

## 4. Print / PDF Runtime Contract

### 4.1 页面侧
- 页面：`src/views/PrintDocument.vue`
- 支持两种输入：
  - `snapshotId`
  - `orderId`

### 4.2 服务端 render base url 解析优先级
`server/services/renderBaseUrl.ts`

优先级：
1. `PRINT_RENDER_BASE_URL` / `PDF_RENDER_BASE_URL`
2. 非生产环境下的 `Origin` / `Referer`
3. 本地 `http://127.0.0.1:<port>` fallback

### 4.3 生产环境要求
- 当 `NODE_ENV=production` 且未配置 `PRINT_RENDER_BASE_URL` 时：
  - `/api/pdf/generate`
  - `/api/pdf/screenshot`
  会失败

### 4.4 运行时结论
- print/PDF 不是全局启动门禁
- 但它是**生产环境强契约**
- 本地开发环境允许从请求来源推断 base url

---

## 5. API Auth Contract

### 当前实现
`server/app/middleware/apiKeyAuth.ts`

当前行为：
- 若 `API_KEY` 未配置：
  - `production`：返回 `500 SERVER_MISCONFIGURATION`
  - 非 `production`：直接放行
- 若 `API_KEY` 已配置：
  - 所有 `/api` 请求都要求 `x-api-key`

### 运行时结论
- 当前实现并不是“测试/生产都必须配置 API_KEY”
- 实际上只有**生产环境缺失 key 才是硬错误**
- 开发/测试环境默认更宽松

---

## 6. 数据路径 Contract

### 配置真源
- 后端 `/data/*` 映射到：`data/config/`
- `public/data/` 不再是当前业务配置真源

### 默认数据库路径
- `data/runtime/database.sqlite`
- 可通过 `DB_STORAGE` 覆盖

---


### Release configuration verification

See `docs/progress/RELEASE_CONFIGURATION_VERIFICATION_2026-04-30.md` for the current release config checklist. Production-like smoke must align backend `API_KEY` with frontend `VITE_API_KEY`, set explicit `CORS_ORIGIN` values for browser callers, and configure `PRINT_RENDER_BASE_URL` for PDF/print rendering.

---

## 7. 当前最重要的运行时认知

1. **前端并不是直接 mount**，而是先完成 config bootstrap
2. **materials + mappings 是前端启动硬门禁**，formulas 当前可降级
3. **ERP 在线查询** 与 **历史缓存读取** 是两条不同契约链路
4. **print/PDF 在生产环境下强依赖 `PRINT_RENDER_BASE_URL`**
5. **API_KEY 当前只有生产环境缺失时才是硬错误**

---

## 8. 相关文件入口

- `src/main.ts`
- `src/services/configRuntime.ts`
- `src/services/configLoader.ts`
- `src/services/configRepository.ts`
- `src/features/source-analysis/services/sourceContractService.ts`
- `server/routes/api.ts`
- `server/routes/contracts.ts`
- `server/app/middleware/apiKeyAuth.ts`
- `server/services/renderBaseUrl.ts`
- `server/routes/pdf.ts`
- `server/config/env.ts`
