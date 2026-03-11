# API 接口文档

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

说明：

- 自动生成采购单在 `POST /api/orders` 时会做数据库级幂等防重
- 防重依据是 `source_contract_code + category + supplier + normalized items`
- 自动单改为 `cancelled` 时会释放幂等 key，因此允许重新生成
- 若取消单恢复到有效状态时幂等 key 已被其他有效单占用，`PUT /api/orders/:id` 也会返回 `409`
- `409` 响应会包含 `existingOrder`，用于前端提示用户查看已存在采购单
- 手动录入且未携带 `source_contract_code` 的采购单不参与该防重

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
4. 数据库配置入口位于 `server/config/database.js`
5. Mapping 与 materials 的前端主读取链路应优先使用 workflow `published` 接口
6. Legacy `/api/config/*` 接口只用于兼容桥接，不应作为新功能真源
7. 锁具配置页（`/config/lock`）保存时应走 workflow `lock` profile；`/api/config/lock` 仅作为 legacy 兼容桥接
8. 采购管理页前端筛选按归一化类别工作，`配件 / 五金 / hardware` 会统一归类为五金配件；不要求历史订单的 `category` 存储值完全一致
9. 采购管理页还提供纯前端风险筛选：`风险订单` 会命中待人工处理和待确认单据，`待人工处理` 只命中高风险单据；该筛选不依赖后端新增接口

## 4. 关联文档

- `docs/governance/LEGACY_CONFIG_ENDPOINT_RETIREMENT_PLAN_2026-03-10.md`
- `docs/reference/formula-management-refactor.md`
