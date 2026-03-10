# [Issue] 采购订单业务新增按别类(category)筛选与拆单

> 状态：需求/接口变更记录。
> 本文档属于 issue 级需求说明，不等同于当前实现状态；实际字段落地情况应以模型、接口和测试为准。

## 描述
前端的【一键生成采购订单】准备改版为按“类别（锁芯、锁叉、包装等）”供用户勾选拆单。为了后续支持核心业务数据针对物资类别的筛选和统计查询，需要后端同事在采购订单中新增正规的 `category` 字段，脱离 metadata 黑盒。

## 接口契约
### 1. 数据库改造约束
- 表 `orders` 与模型定义中追加 `category` (DataTypes.STRING) 字段。
- 请随 PR 附带 SQLite 的 Migration 同步或建表更新 Sql 操作（参考项目规范 `GIT_GUIDE.md` 中对于数据库同步的约束）。

### 2. 请求体 Request：创建/更新订单 API
**POST /api/orders** 或 **PUT /api/orders/:id**
- 新增参数: `category`
- 类型: `String` 
- 含义: 订单类别（例如 '锁芯', '锁叉', '包装'等），可非必填以兼容旧数据。

### 3. 返回体 Response：获取订单列表与详情 API
**GET /api/orders** 等
预期在下发给前端的 Order 对象外层补全该字段的 JSON 树结构：
```json
{
  "id": 1,
  "order_no": "PO-JD2023-方亮包装",
  "supplier": "方亮包装",
  "status": "draft",
  "category": "包装",  // <--- 新增返回字段
  "metadata": {},
  "created_at": "2023-...",
  "items": [...]
}
```

## 下一步工作：
后端：按照此契约创建并开发对应分支（如 `feat/01-backend-category-api`）。
前端：由于已具备此契约标准，前端将前往并在 `feat/01-frontend-category-po` 分支上开始利用 Mock 数据开发面板功能。

## 状态更新（2026-03-02）
- 后端状态：✅ 已完成
- 后端提交：`a7f6f74` (`feat(backend): add order category field and migration`)
- 已实现范围：
  - `orders` 模型新增 `category` 字段
  - `POST /api/orders`、`PUT /api/orders/:id` 支持 `category`
  - `GET /api/orders`、`GET /api/orders/:id` 返回 `category`
  - 新增 `GET /api/orders?category=...` 筛选
  - 新增迁移脚本：`npm run db:migrate:add-order-category`
- 待完成：
  - 前端接入与联调验证
  - 前后端验收后再关闭 Issue
