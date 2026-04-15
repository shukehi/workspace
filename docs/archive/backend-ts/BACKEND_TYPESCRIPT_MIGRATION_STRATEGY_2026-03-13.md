# 后端 TypeScript 渐进迁移策略（2026-03-13）

> 状态：**历史规范（迁移已完成）**。server/ 目录已于 2026-03-19（v1.1.3/v1.1.4）全部迁移为 TypeScript，迁移工作结束。本文档保留作为迁移决策依据的历史参考，不再作为当前约束。

## 1. 当前判断

当前仓库不适合做后端全量 TypeScript 一次性迁移，原因是：

1. 业务仍在持续调整
2. 数据结构仍会局部变化
3. 项目已经承载真实数据和日常使用
4. 当前更需要低风险演进，而不是统一扩展名

因此当前策略不是：

1. 一次性把 `server/` 全改成 TypeScript

而是：

1. 先迁稳定边界
2. 先迁纯逻辑和高复用层
3. 先迁“类型收益高、运行风险低”的模块
4. 保持运行链路稳定

## 2. 迁移目标

后端迁 TypeScript 的目标不是“看起来统一”，而是：

1. 固定核心数据结构边界
2. 降低字段变更和重构风险
3. 让 repository / service 之间的入参出参更清晰
4. 逐步对齐前后端共享契约
5. 降低真实数据链路中的低级错误概率

## 3. 当前默认规则

### 3.1 不做的事

当前阶段默认不做：

1. 不推动后端全量 TypeScript 迁移
2. 不为了迁 TypeScript 顺手重写业务逻辑
3. 不为了迁 TypeScript 顺手修改数据库语义
4. 不为了迁 TypeScript 顺手重构运行入口
5. 不把 migration 脚本和一次性脚本作为第一批迁移目标

### 3.2 优先迁移的区域

优先迁移：

1. models
2. repository
3. shared contract / DTO
4. validator
5. policy / mapper / normalizer

暂不优先迁移：

1. `server/index.js`
2. migration 脚本
3. 一次性修复脚本
4. 高副作用、仍在高频试验的主编排 service

## 4. 第一批迁移范围

第一批以“订单 / 库存 / 物料”主链路为核心。

优先文件：

1. `server/models/Order.js`
2. `server/models/OrderItem.js`
3. `server/models/InventoryReceipt.js`
4. `server/models/OrderIdempotencyKey.js`
5. `server/models/Material.js`
6. `server/models/index.js`
7. `server/services/orders/order.repository.js`
8. `server/services/inventory/inventory-receipt.repository.js`
9. `server/services/inventory/inventory.repository.js`

原因：

1. 这些文件覆盖当前最核心的数据写入和库存联动链路
2. 字段数量多，跨层传播广
3. 前端已有可对齐的类型定义
4. 迁移收益明显高于运行风险

## 5. 推荐迁移顺序

建议按以下顺序进行：

1. 先新增 `server/models/types.ts`
2. 先迁 `Material`
3. 再迁 `OrderIdempotencyKey`
4. 再迁 `InventoryReceipt`
5. 再迁 `OrderItem`
6. 最后迁 `Order`
7. 再迁 `server/models/index.js`
8. 最后迁 repository

原因：

1. `Material` 相对独立，适合先验证迁移模式
2. `Order` 及其关联最复杂，放后面更稳
3. repository 依赖模型类型稳定后再接入，收益最高

## 6. 类型策略

### 6.1 第一版必须有的类型

每个核心模型至少拆成：

1. `Attributes`
2. `CreationAttributes`

必要时再补：

1. `WithRelations`
2. `Serialized`
3. repository 入参 / 出参 DTO

### 6.2 第一版先严格的字段

优先严格约束：

1. 主键 / 外键
2. 状态字段
3. 数量字段
4. 时间字段
5. 关键业务标识字段

例如：

1. `id`
2. `order_id`
3. `status`
4. `direction`
5. `quantity`
6. `ordered_quantity`
7. `received_quantity`
8. `material_id`
9. `source_contract_code`
10. `dedupe_key`

### 6.3 第一版先宽松的字段

先允许宽松处理：

1. `metadata`
2. `payload_json`
3. `raw_json`
4. `meta_json`
5. 历史兼容字段
6. 复杂 include 结果

可接受的第一版策略：

1. `Record<string, unknown>`
2. `unknown`
3. 宽松 DTO 接口

原则：

1. 先固定高风险边界
2. 不要求第一版把所有 JSON 字段建模到极致

## 7. 迁移时禁止顺手做的事

迁 TypeScript 时，不要顺手做以下事情：

1. 顺手改字段语义
2. 顺手删旧字段
3. 顺手改 migration
4. 顺手重构 controller / route
5. 顺手替换整条运行方式
6. 顺手把所有测试都改成 TypeScript

原则：

1. 迁移目标是类型收敛，不是顺带做大规模结构重写

## 8. 每批迁移后的最小验证

每迁完一批，至少执行：

1. `npm test`
2. 与本批相关的定向测试
3. 关键链路手工 smoke

第一批建议至少覆盖：

1. `tests/order-service.test.js`
2. `tests/order-routes.test.js`
3. `tests/inventory-route.test.js`

## 9. 与新增模块规则的关系

后续新增后端模块，遵守当前双轨策略：

1. 新增纯逻辑模块，优先 TypeScript
2. 新增 shared contract / DTO / validator / policy / mapper / normalizer，优先 TypeScript
3. 新增运行入口、migration、一次性脚本，可继续 JavaScript
4. 新增高副作用且仍在高频试验的主编排模块，可先 JavaScript，稳定后再迁

## 10. 后续推进信号

出现以下信号时，可以扩大后端 TypeScript 范围：

1. 第一批模型与 repository 已稳定
2. 核心业务字段连续 1 到 2 个迭代没有结构性变化
3. 当前主要痛点从“快速试验”转为“维护和重构成本过高”
4. 关键测试已经能稳定覆盖主链路

在这些信号出现前，当前默认策略保持为：

1. 小步迁移
2. 模型优先
3. repository 跟进
4. 运行链路保守
