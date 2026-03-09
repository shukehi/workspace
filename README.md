# 订单查询系统

基于 Vue 3 + Vite + TypeScript + Express 的订单查询与采购管理系统。

## 当前状态

- 前端主应用：`src/`（Vue 3 + Pinia + Vue Router + TypeScript）
- 后端服务：`server/`（Express + Sequelize + SQLite）
- 打印预览：已迁移到 `src/views/PrintPreview.vue`（路由 `/print-preview`）
- Mock 模式：仅在 `VITE_USE_MOCK=true` 时启用

## 功能模块

- 订单查询（ERP 代理）
- 来源解析与 BOM 计算
- 采购订单管理（含分类）
- 库存管理与预警
- 统计看板
- 配置管理（配方、材料目录）

## 技术栈

### 前端

- Vue 3
- Vite 7
- TypeScript 5
- Pinia
- Vue Router
- Tailwind CSS 4

### 后端

- Node.js 18+
- Express 4
- Sequelize 6
- SQLite3
- http-proxy-middleware

## 目录结构

```text
workspace/
├── src/                     # Vue 前端主应用
├── server/                  # Express 后端
├── data/
│   ├── config/              # 业务配置唯一来源
│   ├── imports/             # 原始导入文件
│   └── runtime/             # 运行期数据库、备份、导出结果（不入库）
├── public/                  # 纯静态资源与打印模板
├── scripts/                 # 开发/迁移/导入脚本
├── tests/
│   ├── fixtures/            # 测试夹具
│   ├── manual/              # 手工验证脚本
│   └── visual-baseline/     # 视觉基线
├── docs/                    # 项目文档
├── package.json
└── README.md
```

## 环境要求

- Node.js >= 18
- npm >= 8

## 安装

```bash
npm install
```

## 环境变量

复制并按需修改：

```bash
cp .env.example .env
```

常用配置：

- `PORT`：后端端口（默认 `3000`）
- `ERP_BASE_URL`：ERP 服务地址
- `NODE_ENV`：运行环境
- `PRINT_RENDER_BASE_URL`：PDF/打印统一渲染基地址（示例：`https://your-frontend-domain.example.com`）
- `DB_STORAGE`：SQLite 文件路径（测试隔离时可覆盖）
- `VITE_USE_MOCK`：是否启用前端 Mock（`true`/`false`）

说明：

- 生产环境下，`PRINT_RENDER_BASE_URL` 为必填；未配置时 `/api/pdf/generate` 会返回错误。
- 非生产环境会优先使用请求来源（`Origin/Referer`），仅在缺失时回退本地地址。
- 默认数据库路径为 `data/runtime/database.sqlite`；如需复用旧库，请显式设置 `DB_STORAGE`。
- 运行时 `/data/*` 统一由后端映射到 `data/config/`，`public/data/` 不再作为业务配置源。

## 本地开发

前端开发（Vite）：

```bash
npm run dev
```

说明：

- 前端对 `/api/*` 和 `/data/*` 的请求依赖后端服务；本地联调时需要同时启动 `npm run server:dev`。

后端开发（Express）：

```bash
npm run server:dev
```

生产模式启动后端（默认服务 `dist`）：

```bash
npm run build
npm start
```

生产环境示例（推荐）：

```bash
NODE_ENV=production PRINT_RENDER_BASE_URL=https://your-frontend-domain.example.com npm run server:prod
```

## 质量门禁

类型检查：

```bash
npm run type-check
```

回归测试：

```bash
npm test
```

完整构建：

```bash
npm run build
```

仓库结构守护：

```bash
node --test tests/repository-structure-guard.test.js
```

## 核心 API（当前）

- `GET /api/getOutContractDetail`：ERP 订单代理查询
- `GET /api/orders`：采购单列表（支持 `?category=`）
- `POST /api/orders`：创建采购单
- `PUT /api/orders/:id`：更新采购单
- `DELETE /api/orders/:id`：删除采购单
- `POST /api/contracts/cache`：缓存 ERP 原始合同快照
- `GET /api/contracts/:code`：读取缓存合同
- `GET /api/materials`：物料检索
- `POST /api/materials`：新增物料
- `PUT /api/materials/:id`：更新物料
- `GET /api/inventory`：库存列表
- `PUT /api/inventory/:id`：更新库存
- `GET /api/config/materials`：读取材料目录
- `POST /api/config/materials`：保存材料目录
- `GET /api/config/formulas`：配方列表（分页/筛选）
- `GET /api/config/formulas/published-map`：已发布配方映射（物料计算链路）
- `GET /api/config/formulas/:formulaKey`：配方详情（草稿/发布信息）
- `POST /api/config/formulas`：创建配方（初始草稿）
- `PUT /api/config/formulas/:formulaKey/draft`：更新草稿（revision 冲突控制）
- `POST /api/config/formulas/:formulaKey/publish`：发布草稿
- `POST /api/config/formulas/:formulaKey/archive`：归档配方
- `POST /api/config/formulas/:formulaKey/rollback`：回滚到历史版本
- `DELETE /api/config/formulas/:formulaKey`：删除配方
- `GET /api/config/formulas/:formulaKey/revisions`：版本历史

## 配方迁移与回退

JSON 配方迁移到 SQLite：

```bash
npm run db:migrate:formulas
```

从 SQLite 导出兼容 JSON（应急回退）：

```bash
npm run db:export:formulas
```

## 开发约定

请优先阅读：

- [工程开发约定](docs/ENGINEERING_CONVENTIONS.md)
- [目录结构优化计划](docs/PROJECT_STRUCTURE_OPTIMIZATION_PLAN_2026-03-09.md)
- [优化计划（阶段跟踪）](docs/OPTIMIZATION_PLAN_2026-03-03.md)
- [legacy 清理计划](docs/LEGACY_PUBLIC_JS_CLEANUP_PLAN.md)
- [PO 字段契约](docs/PO_FIELD_CONTRACT.md)

## 说明

- `docs/DEVELOPMENT_GUIDE.md` 主要记录历史架构（`public/js` 时代），不再作为主开发入口文档。
