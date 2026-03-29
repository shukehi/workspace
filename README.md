# 订单查询系统

基于 Vue 3 + Vite + TypeScript + Express 的订单查询与采购管理系统。

## 当前状态

- 前端主应用：`src/`（Vue 3 + Pinia + Vue Router + TypeScript）
- 后端服务：`server/`（Express + Sequelize + SQLite）
- 当前常用验证命令：`npm run type-check`、`npm run type-check:server`、`npm test`
- 打印预览：当前页面为 `src/views/PrintDocument.vue`（路由 `/print-document`）
- Mock 模式：仅在 `VITE_USE_MOCK=true` 时启用

## 当前结构方向

- `src/views/*` 逐步收敛为页面装配层，复杂业务逻辑优先下沉到 `src/features/*`
- `store` 与领域 manager 以状态协调为主，不继续承载过深的浏览器副作用和配置装载逻辑
- 后端逐步收敛到 `route/controller/service/repository` 边界，关键写接口要求明确请求校验落点
- schema 变更以 migration 为目标方向，启动时 `ensure*Columns()` 仅作为过渡兜底
- 兼容层与 legacy 入口可以暂存，但必须有明确退场路径

## 功能模块

- 订单查询（ERP 代理）
- 来源解析与 BOM 计算
- 采购订单管理（含分类）
- 库存管理（库位、入库、正式出库、冲销）与预警
- 库存页支持查看单物料库存轨迹、对账异常筛选与异常导出
- 统计看板
- 配置管理（配方、材料目录、包装、锁芯、锁具、拉手、锁叉）

说明：

- 锁具采购单支持左右数量拆分
- 锁具 / 拉手 / 包装采购单支持在编辑页切换 `左右数量` / `总数量`，且预览、打印、导出 PDF 会沿用同一显示方式
- 当 `spec` 第 3 段包含 `内开` 时，锁具左右数量会互换
- 锁具单位来自锁具配置中的 `defaultUnit`
- 锁具备注只使用命中映射的 `remark`
- 锁叉支持高门基础尺寸规则：5/7cm 在 `>= 2200`、9cm 在 `>= 2210` 时切换到高门尺寸
- 采购管理页分类统一为 `包装 / 锁芯 / 锁具 / 拉手 / 锁叉 / 五金配件`
- 采购管理页会兼容旧类别值 `配件 / 五金 / hardware` 并统一归到五金配件
- 采购管理页支持 `风险订单 / 待人工处理` 快捷筛选，便于优先处理锁具、拉手、锁芯等异常明细
- 采购订单编辑页支持对 `!` 风险警告执行人工取消/恢复；人工取消后列表标记与风险筛选会同步消失
- 采购管理页摘要卡片中的 `待处理单` 会筛选 `草稿 / 已提交 / 处理中`
- 采购管理页摘要卡片中的 `今日新增` 会按 `created_at` 日期筛选
- 自动生成采购单现在使用数据库级幂等键防重，不只是前端提示
- 自动单会按 `来源合同号 + 类别 + 供应商 + 明细内容` 占用幂等 key
- 历史自动生成单会在后续更新时补建幂等 key，之后同样受数据库级防重约束
- 自动单改为 `cancelled` 时会释放幂等 key，因此允许重新生成
- 若取消单恢复到有效状态时幂等 key 已被别的单占用，恢复会失败
- 手动录入单不参与这条自动防重规则
- 采购单支持单张到货与批量到货；到货后入库需要明确仓库/库位
- 库存页当前分为 `物料库存 / 采购入库记录 / 正式出库记录 / 库位管理` 四个 tab
- 正式出库通过独立出库单与冲销单实现；`Material.stock_quantity` 保留为总库存缓存，库位余额由独立表维护
- 库存导出已按当前 tab 提供不同结果：库位余额、入库记录、正式出库记录
- 物料库存 tab 额外支持“导出对账异常”，用于导出 `总库存 != 库位汇总` 的物料
- 物料库存列表默认隐藏 `当前库存 <= 0` 的物料；如需清理数据库记录，请先跑零库存清理 dry-run

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

本地联调开发（前端 + 后端一起启动）：

```bash
npm run dev
```

只启动前端开发服务器（Vite）：

```bash
npm run dev:web
```

只启动后端开发服务器（Express）：

```bash
npm run server:dev
```

说明：

- `npm run dev` 会同时启动 Vite 和 Express，适合作为默认本地联调入口
- 前端对 `/api/*` 和 `/data/*` 的请求依赖后端服务；如果你只跑了 `npm run dev:web`，新增 API 会在浏览器里表现为 404
- `npm run server:dev` 使用 `tsx watch`，后端模块全部为 `.ts`，热更新即时生效

局域网共享开发（同一 Wi-Fi 给同事访问）：

```bash
npm run dev:lan
```

详细说明见 [docs/reference/LAN_SHARING.md](/Users/aries/Dve/workspace/docs/reference/LAN_SHARING.md)。

说明：

- 同事可通过 `http://你的局域网IP:5173` 访问前端，例如 `http://172.16.0.10:5173`
- `npm run dev:lan` 会同时启动前后端，并将前端监听开放到 `0.0.0.0`
- 前端的 `/api/*`、`/data/*` 请求会继续由 Vite 代理到你本机的 `3000` 端口
- 如无法访问，优先检查操作系统防火墙和公司 Wi-Fi 是否限制终端互访

构建后本地运行后端（默认服务 `dist`）：

```bash
npm run build
npm start
```

局域网共享已构建版本：

```bash
npm run share:prod
```

说明：

- 同事可通过 `http://你的局域网IP:3000` 访问
- 如需本地预览构建结果并开放局域网访问，也可以执行 `npm run preview:lan`

生产环境示例（推荐）：

```bash
NODE_ENV=production PRINT_RENDER_BASE_URL=https://your-frontend-domain.example.com npm run server:prod
```

## 质量门禁

类型检查：

```bash
npm run type-check
```

后端类型检查：

```bash
npm run type-check:server
```

回归测试：

```bash
npm test
```

完整构建：

```bash
npm run build
```

数据修复：

```bash
npm run db:backfill:order-item-material-ids
```

说明：

- 用于为历史自动生成采购单回填缺失的 `order_items.material_id`
- 回填后会同步改变明细 `item_key`；如果采购页或入库弹窗已打开，需要刷新页面后再继续入库

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
- `POST /api/orders/:id/arrive`：登记单张到货
- `POST /api/orders/bulk-arrive`：批量登记到货
- `POST /api/orders/:id/stock-in`：按明细入库（支持 `warehouse_id` / `location_id`）
- `POST /api/contracts/cache`：缓存 ERP 原始合同快照
- `GET /api/contracts/:code`：读取缓存合同
- `GET /api/materials`：物料检索
- `POST /api/materials`：新增物料
- `PUT /api/materials/:id`：更新物料
- `GET /api/inventory`：库存列表（支持仓库/库位/关键字/低库存筛选）
- `PUT /api/inventory/:id`：仅更新安全库存 `min_stock`；若传入 `stock_quantity` 会返回 `STOCK_QUANTITY_IMMUTABLE`
- `POST /api/inventory-adjustments`：手工调账；需传稳定的 `operation_key`，同步更新总库存、库位余额，并写入 `inventory_movements`
- `GET /api/inventory-movements`：库存流水列表（支持物料/仓库/库位/来源/关键字/日期筛选）
- `GET /api/inventory-receipts`：入库记录列表
- `GET /api/inventory-receipts/:id`：入库记录详情
- `POST /api/inventory-receipts/:id/reverse`：撤销入库
- `GET /api/inventory-locations`：仓库与库位列表
- `POST /api/inventory-locations`：新增库位
- `PUT /api/inventory-locations/:id`：编辑/停用库位
- `GET /api/inventory-outbounds`：正式出库单列表
- `GET /api/inventory-outbounds/:id`：正式出库单详情
- `POST /api/inventory-outbounds`：创建正式出库单
- `POST /api/inventory-outbounds/:id/reverse`：冲销正式出库单
- `GET /api/config/materials`：读取材料目录
- `POST /api/config/materials`：保存材料目录
- `GET /api/config/lock`：读取锁具映射
- `PUT /api/config/lock`：保存锁具映射
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

说明：

- `/api/materials` 维护的是库存/入库实际使用的 `materials` 数据库表；采购入库按 `order_items.material_id -> materials.code/id` 匹配
- `/api/config/materials` 维护的是材料目录工作流，主要服务来源分析、配方和配置读取，不会自动把数据同步到 `materials` 表
- 拉手自动单如需稳定入库，建议在 `handle` 映射里填写 `materialCode`，并确保对应编码已存在于 `materials` 表
- 库存页当前支持按物料查看最近库存轨迹，并可导出对账异常清单
- 本轮编码治理候选表见 [docs/reference/MATERIAL_CODE_STANDARDIZATION_CANDIDATES_2026-03-13.csv](/Users/aries/Dve/workspace/docs/reference/MATERIAL_CODE_STANDARDIZATION_CANDIDATES_2026-03-13.csv)

## 配方迁移与回退

JSON 配方迁移到 SQLite：

常用库存维护脚本：

- `npm run inventory:reconcile:dry-run`：扫描 `materials.stock_quantity` 与 `inventory_location_balances` 的差异，输出 dry-run 对账报告
- `npm run inventory:cleanup-zero-stock:dry-run`：扫描 `stock_quantity <= 0` 且无任何库存/单据引用的物料候选，供人工确认后再清理

```bash
npm run db:migrate:formulas
```

从 SQLite 导出兼容 JSON（应急回退）：

```bash
npm run db:export:formulas
```

## 开发约定

请优先阅读：

- [文档总索引](/Users/aries/Dve/workspace/docs/README.md)
- [前后端开发规范](/Users/aries/Dve/workspace/docs/governance/ENGINEERING_CONVENTIONS.md)
- [功能开发与配置接入规范](/Users/aries/Dve/workspace/docs/governance/FEATURE_DEVELOPMENT_GOVERNANCE_2026-03-10.md)
- [PR 功能开发检查清单](/Users/aries/Dve/workspace/docs/governance/PR_FEATURE_CHECKLIST_2026-03-10.md)
- [本轮重构总索引](/Users/aries/Dve/workspace/docs/roadmaps/REFACTOR_EXECUTION_INDEX_2026-03-13.md)
- [可维护性与可扩展性重构蓝图](/Users/aries/Dve/workspace/docs/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md)
- [PO 字段契约](/Users/aries/Dve/workspace/docs/reference/PO_FIELD_CONTRACT.md)

## 说明

- `docs/archive/` 下的历史方案和旧开发指南不再作为当前实现依据。
- 本轮结构治理请优先以 `docs/roadmaps/REFACTOR_EXECUTION_INDEX_2026-03-13.md` 和 `docs/governance/*` 为准。
