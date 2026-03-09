# API 接口文档

## 订单查询系统 API

本系统目前仅提供订单查询功能，通过代理访问外部 ERP 系统。

### 1. 查询订单详情

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

---

## 注意事项

1. 当前系统已移除库存管理功能模块
2. 订单查询仍依赖外部 ERP API
3. 本地数据库已启用，默认 SQLite 路径为 `data/runtime/database.sqlite`
4. 数据库配置入口位于 `server/config/database.js`
