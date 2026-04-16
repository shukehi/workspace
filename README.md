# ERP 订单解析与采购库存管理系统

基于 Vue 3 + Vite + TypeScript + Express + SQLite 的业务系统，覆盖 **ERP 合同查询、来源分析/BOM、采购订单管理、库存管理、配置工作流、打印/PDF 输出**。

---

## 核心能力

- **ERP 合同查询与历史缓存**
- **来源分析 / BOM / 五金提取**
- **采购订单管理**
- **库存管理**
- **配置工作流**
  - 配方
  - 材料目录
  - 包装/锁芯/锁具/拉手/锁叉映射
- **打印 / PDF**
- **报表与统计**

> 详细业务规则、字段契约与历史治理资料请优先查看 `docs/README.md`。

---

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
- Puppeteer（PDF / 截图渲染）

---

## 目录结构

```text
workspace/
├── src/                     # Vue 前端主应用
├── server/                  # Express 后端
├── data/
│   ├── config/              # 业务配置真源
│   ├── imports/             # 原始导入文件
│   └── runtime/             # 运行期数据库、备份、导出结果
├── public/                  # 纯静态资源
├── scripts/                 # 开发/迁移/维护脚本
├── tests/                   # 测试
├── docs/                    # 项目文档
├── package.json
└── README.md
```

---

## 环境要求

- Node.js >= 18
- npm >= 8

---

## 安装

```bash
npm install
```

---

## 环境变量

复制并按需修改：

```bash
cp .env.example .env
```

常用配置：

- `PORT`：后端端口，默认 `3000`
- `ERP_BASE_URL`：ERP 服务地址
- `NODE_ENV`：运行环境
- `PRINT_RENDER_BASE_URL`：生产环境 PDF/打印统一渲染基地址
- `DB_STORAGE`：SQLite 文件路径
- `VITE_USE_MOCK`：是否启用前端 Mock（`true` / `false`）

说明：

- 生产环境下，`PRINT_RENDER_BASE_URL` 为必填
- 默认数据库路径为 `data/runtime/database.sqlite`
- `/data/*` 运行时统一由后端映射到 `data/config/`

---

## 本地开发

### 联调开发（前端 + 后端）
```bash
npm run dev
```

### 只启动前端
```bash
npm run dev:web
```

### 只启动后端
```bash
npm run server:dev
```

### 局域网共享开发
```bash
npm run dev:lan
```

详细说明见：

- `docs/reference/LAN_SHARING.md`

---

## 构建与运行

### 本地构建并启动
```bash
npm run build
npm start
```

### 局域网共享构建版本
```bash
npm run share:prod
```

### 生产环境示例
```bash
NODE_ENV=production PRINT_RENDER_BASE_URL=https://your-frontend-domain.example.com npm run server:prod
```

---

## 常用命令

### 开发
```bash
npm run dev
npm run dev:web
npm run server:dev
```

### 验证
```bash
npm run type-check
npm run type-check:server
npm test
npm run build
```

### 常用维护脚本
```bash
npm run db:backfill:order-item-material-ids
npm run inventory:reconcile:dry-run
npm run inventory:cleanup-zero-stock:dry-run
npm run db:migrate:formulas
npm run db:export:formulas
```

---

## 运行时依赖说明

系统当前主要依赖以下运行时组件：

### 1. ERP 服务
用于合同查询与源订单获取。

- 相关配置：`ERP_BASE_URL`
- 说明：在线查询依赖 ERP，可结合本地缓存读取历史合同

### 2. SQLite 数据库
用于订单、库存、配置工作流等持久化。

- 相关配置：`DB_STORAGE`

### 3. 打印 / PDF 渲染链路
用于打印预览、PDF 导出、截图。

- 相关配置：`PRINT_RENDER_BASE_URL`
- 说明：生产环境必须正确配置

### 4. API 认证
部分环境下依赖 API Key。

- 开发环境通常更宽松
- 生产环境应按部署要求配置

> 更细的运行时依赖说明，建议查看 `docs/README.md` 中的现行文档入口。

---

## API 概览

系统当前 API 主要分为以下几类：

- ERP 合同查询与缓存
- 采购订单（orders）
- 库存（inventory / receipts / outbounds / movements / locations）
- 配置工作流（formulas / mappings / materials）
- 打印 / PDF

完整接口说明请见：

- `docs/reference/api.md`

---

## 文档入口

请优先阅读：

- [文档总索引](./docs/README.md)
- [前后端开发规范](./docs/governance/ENGINEERING_CONVENTIONS.md)
- [功能开发与配置接入规范](./docs/governance/FEATURE_DEVELOPMENT_GOVERNANCE_2026-03-10.md)
- [PR 检查清单](./docs/governance/PR_FEATURE_CHECKLIST_2026-03-10.md)
- [PO 字段契约](./docs/reference/PO_FIELD_CONTRACT.md)

如果你在做当前重构与治理工作，优先看：

- `docs/roadmaps/REFACTOR_EXECUTION_PLAN_V1_2026-04-16.md`
- `docs/roadmaps/WEEK1_HEALTH_BASELINE_EXECUTION_2026-04-16.md`

---

## 说明

- `docs/archive/` 下的内容仅用于追溯历史背景，不作为当前实现依据
- 当前执行、维护与治理请优先以 `docs/README.md` 中的现行入口为准
