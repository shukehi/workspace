# API 接口文档

> 状态：现行参考文档。
> 若与实现不一致，应以当前 route / controller / validator 代码为准，并及时更新本文档。

本文档记录当前项目内仍在主链中使用的核心接口分组。详细配置工作流语义请结合对应 route 与治理文档阅读。

## 1. 订单查询代理 API

订单查询仍通过本地后端代理外部 ERP 接口。

### 查询订单详情

**接口地址：** `GET /api/getOutContractDetail`

**功能描述：** 查询销售订单的详细信息

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| code   | string | 是 | 订单号，例如：202408120023 |

**请求示例：**
```
GET http://localhost:3000/api/getOutContractDetail?code=202601050004
```

**后端代理目标：**
```
http://47.98.198.45:8802/getOutContractDetail
```

**响应格式：** JSON

**使用说明：**
- 本地服务器作为代理，将请求转发到外部 ERP 系统
- 支持跨域访问（CORS）
- 响应数据包含订单概览、商品明细、包装信息等

## 1.1 采购单 API

- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders`
- `PUT /api/orders/:id`
- `DELETE /api/orders/:id`
- `POST /api/orders/:id/arrive`
- `POST /api/orders/bulk-arrive`
- `POST /api/orders/:id/stock-in`

说明：

- `GET /api/orders` 当前支持 `page / pageSize / status / category / risk / keyword / orderNo / createdDate / startDate / endDate`
- `POST /api/orders/:id/arrive` 用于单张到货，`POST /api/orders/bulk-arrive` 用于批量到货
- `POST /api/orders/:id/stock-in` 支持按明细数量入库，并支持 `warehouse_id / location_id`
- 自动生成采购单在 `POST /api/orders` 时会做数据库级幂等防重
- 防重依据是 `source_contract_code + category + supplier + normalized items`
- 历史自动生成单会在后续 `PUT /api/orders/:id` 更新时回填幂等 key，之后同样受数据库级防重约束
- 自动单改为 `cancelled` 时会释放幂等 key，因此允许重新生成
- 若取消单恢复到有效状态时幂等 key 已被其他有效单占用，`PUT /api/orders/:id` 也会返回 `409`
- `409` 响应会包含 `existingOrder`，用于前端提示用户查看已存在采购单
- 手动录入且未携带 `source_contract_code` 的采购单不参与该防重
- 手动录入单在 `POST /api/orders` 与可编辑状态下的 `PUT /api/orders/:id` 都会执行业务校验：`metadata.customer_name / supplier / delivery_date` 必填，且至少存在 1 条有效明细
- 手动录入单的“有效明细”必须满足：产品名称有效、规格有效、数量大于 0；纯占位空行会在保存前被忽略
- 对 `arrived / completed` 的手动录入单，`PUT /api/orders/:id` 仍受 `ORDER_EDIT_LOCKED` 约束；此时后端只校验当前允许修改的字段（例如 `delivery_date / remark`），不会因为历史脏的客户名或明细而阻断备注/交期更新
- 手动录入单校验失败时返回 `400 VALIDATION_ERROR`，错误详情位于 `issues[]`
- 订单 `metadata` 当前还承载两个前端展示控制字段：`aggregateSideQuantities`（预览/打印/PDF 是否显示总数量）和 `riskWarningDismissed`（是否人工取消 `!` 风险警告）

## 1.2 库存域 API

- `GET /api/inventory`
- `PUT /api/inventory/:id`
- `POST /api/inventory-adjustments`
- `GET /api/inventory-movements`
- `GET /api/inventory-receipts`
- `GET /api/inventory-receipts/:id`
- `POST /api/inventory-receipts/:id/reverse`
- `GET /api/inventory-locations`
- `POST /api/inventory-locations`
- `PUT /api/inventory-locations/:id`
- `GET /api/inventory-outbounds`
- `GET /api/inventory-outbounds/:id`
- `POST /api/inventory-outbounds`
- `POST /api/inventory-outbounds/:id/reverse`

说明：

- `GET /api/inventory` 当前支持 `warehouseId / locationId / keyword / lowStockOnly`
- `GET /api/inventory` 返回总库存，并附带 `locations[]` 库位余额摘要
- `POST /api/inventory-adjustments` 用于单物料单库位手工调账，必填 `material_id / warehouse_id / location_id / operation_key / delta_quantity / reason`
- `GET /api/inventory-movements` 当前支持 `materialId / warehouseId / locationId / sourceType / keyword / startDate / endDate / page / pageSize`
- `GET /api/inventory-receipts` 当前支持 `orderNo / orderId / warehouseId / locationId / keyword / direction / reverseReason / page / pageSize`
- 正式出库通过 `inventory-outbounds` 维护；出库冲销会创建反向出库单回补原库位余额和总库存
- `PUT /api/inventory/:id` 仍保留兼容，但仅允许更新 `min_stock`；若请求体包含 `stock_quantity`，接口返回 `STOCK_QUANTITY_IMMUTABLE`
- 前端库存页已提供库存轨迹侧栏、对账异常筛选以及对账异常 CSV 导出

## 2. 配置域 API

当前配置域已拆成 workflow 主接口与 legacy 兼容接口两类。
当前 mapping 运行时真源已经收口为 workflow `published`，不再依赖 legacy `/api/config/*` 或 `/data/*.json` fallback。

### Workflow 主接口

当前 mapping workflow `:type` 支持：

- `packaging`
- `cylinder`
- `lock`
- `lock_fork`
- `handle`

- `GET /api/config/formulas`
- `GET /api/config/formulas/published-map`
- `GET /api/config/mappings/:type/detail`
- `PUT /api/config/mappings/:type/draft`
- `POST /api/config/mappings/:type/publish`
- `GET /api/config/mappings/:type/published`
- `GET /api/config/mappings/:type/revisions`
- `GET /api/config/mappings/:type/audit-logs`
- `GET /api/config/material-catalog/published`
- `GET /api/config/material-catalog/detail`
- `PUT /api/config/material-catalog/draft`
- `POST /api/config/material-catalog/publish`
- `GET /api/config/material-catalog/revisions`
- `GET /api/config/material-catalog/audit-logs`

### Legacy 兼容接口

以下接口仍保留，但新前端流程不应直接接入：

- `GET /api/config/materials`
- `POST /api/config/materials`
- `GET /api/config/packaging`
- `PUT /api/config/packaging`
- `GET /api/config/cylinder`
- `PUT /api/config/cylinder`
- `GET /api/config/lock`
- `PUT /api/config/lock`
- `GET /api/config/lock-fork`
- `PUT /api/config/lock-fork`
- `GET /api/config/handle`
- `PUT /api/config/handle`
- `GET /api/config/packaging-mapping`

说明：

1. 上述 mapping legacy 接口现在仅作为 workflow 兼容壳
2. 这些接口已不再读写 `data/config/*.json`
3. 若 workflow published 缺失，兼容接口也会显式失败，而不是再从本地 JSON 自动补种

## 3. 使用约束

1. 订单查询代理和配置域接口都通过本地后端统一暴露
2. 订单查询仍依赖外部 ERP API
3. 本地数据库已启用，默认 SQLite 路径为 `data/runtime/database.sqlite`
4. 数据库配置入口位于 `server/config/database.ts`
5. Mapping 与 materials 的前端主读取链路应优先使用 workflow `published` 接口
6. Mapping 运行时当前只读 workflow `published`；published 缺失时前端启动会直接 fail closed
7. Legacy `/api/config/*` 接口只用于兼容桥接，不应作为新功能真源
8. 锁具配置页（`/config/lock`）保存时应走 workflow `lock` profile；`/api/config/lock` 仅作为 legacy 兼容桥接
9. 采购管理页前端筛选按归一化类别工作，`配件 / 五金 / hardware` 会统一归类为五金配件；不要求历史订单的 `category` 存储值完全一致
10. 采购管理页风险筛选当前已接入 `GET /api/orders?risk=`：`风险订单` 会命中待人工处理和待确认单据，`待人工处理` 只命中高风险单据
11. 采购管理页摘要卡片里的 `待处理单` 会筛选 `draft / submitted / processing`，`今日新增` 会按 `created_at` 日期筛选
12. `/api/materials` 对应库存/入库实际使用的 `materials` 数据库表；`/api/config/materials` / `material-catalog` 对应材料目录工作流，二者不会自动双向同步
13. 采购入库只按 `order_items.material_id -> materials.code/id` 匹配；仅更新材料目录或 mapping 而未补齐 `materials` 表时，仍会触发 `MATERIAL_NOT_FOUND`
14. 副锁护罩配件包规则现在要求按门厚提供显式 `materialCode`；若对应编码未落入 `materials` 表，生成出的五金/配件单仍无法完成 stock-in
15. 当前采购入库、入库撤销、正式出库、出库冲销都会同时更新 `Material.stock_quantity` 和库位余额；手工调账请走 `/api/inventory-adjustments`
16. 如需对历史库存做基线扫描，可运行 `npm run inventory:reconcile:dry-run` 输出 dry-run 对账报告
17. 如需清理数据库中无引用的零库存物料，可先运行 `npm run inventory:cleanup-zero-stock:dry-run` 查看候选，再显式执行带确认 token 的清理脚本

## 4. 关联文档

- `docs/governance/LEGACY_CONFIG_ENDPOINT_RETIREMENT_PLAN_2026-03-10.md`
- `docs/reference/formula-management-refactor.md`
- `docs/reference/MATERIAL_CODE_STANDARDIZATION_CANDIDATES_2026-03-13.csv`
