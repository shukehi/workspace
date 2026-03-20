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

## 1.2 库存域 API

- `GET /api/inventory`
- `PUT /api/inventory/:id`
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
- `GET /api/inventory-receipts` 当前支持 `orderNo / orderId / warehouseId / locationId / keyword / direction / reverseReason / page / pageSize`
- 正式出库通过 `inventory-outbounds` 维护；出库冲销会创建反向出库单回补原库位余额和总库存
- `PUT /api/inventory/:id` 仍保留兼容，但不再是正式仓库流程推荐入口

## 2. 配置域 API

当前配置域已拆成 workflow 主接口与 legacy 兼容接口两类。

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
- `POST /api/config/packaging`
- `GET /api/config/cylinder`
- `POST /api/config/cylinder`
- `GET /api/config/lock`
- `PUT /api/config/lock`
- `GET /api/config/lock-fork`
- `POST /api/config/lock-fork`
- `GET /api/config/handle`
- `POST /api/config/handle`

## 3. 使用约束

1. 订单查询代理和配置域接口都通过本地后端统一暴露
2. 订单查询仍依赖外部 ERP API
3. 本地数据库已启用，默认 SQLite 路径为 `data/runtime/database.sqlite`
4. 数据库配置入口位于 `server/config/database.ts`
5. Mapping 与 materials 的前端主读取链路应优先使用 workflow `published` 接口
6. Legacy `/api/config/*` 接口只用于兼容桥接，不应作为新功能真源
7. 锁具配置页（`/config/lock`）保存时应走 workflow `lock` profile；`/api/config/lock` 仅作为 legacy 兼容桥接
8. 采购管理页前端筛选按归一化类别工作，`配件 / 五金 / hardware` 会统一归类为五金配件；不要求历史订单的 `category` 存储值完全一致
9. 采购管理页风险筛选当前已接入 `GET /api/orders?risk=`：`风险订单` 会命中待人工处理和待确认单据，`待人工处理` 只命中高风险单据
10. 采购管理页摘要卡片里的 `待处理单` 会筛选 `draft / submitted / processing`，`今日新增` 会按 `created_at` 日期筛选
11. `/api/materials` 对应库存/入库实际使用的 `materials` 数据库表；`/api/config/materials` / `material-catalog` 对应材料目录工作流，二者不会自动双向同步
12. 采购入库只按 `order_items.material_id -> materials.code/id` 匹配；仅更新材料目录或 mapping 而未补齐 `materials` 表时，仍会触发 `MATERIAL_NOT_FOUND`
13. 当前采购入库、入库撤销、正式出库、出库冲销都会同时更新 `Material.stock_quantity` 和库位余额；库存页手工改库存仅视为兼容入口

## 4. 关联文档

- `docs/governance/LEGACY_CONFIG_ENDPOINT_RETIREMENT_PLAN_2026-03-10.md`
- `docs/reference/formula-management-refactor.md`
- `docs/reference/MATERIAL_CODE_STANDARDIZATION_CANDIDATES_2026-03-13.csv`
