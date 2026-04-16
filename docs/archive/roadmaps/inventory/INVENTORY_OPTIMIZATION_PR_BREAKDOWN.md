# 库存管理优化实施拆解

> 状态：**历史 PR 拆解文档**。
> 请结合 [INVENTORY_OPTIMIZATION_PROGRESS.md](/Users/aries/Dve/workspace/docs/progress/INVENTORY_OPTIMIZATION_PROGRESS.md) 与当前代码状态阅读。
> 本文档保留为当时的拆分思路记录，不再直接代表当前推荐提交流程。

关联文档：

- [INVENTORY_OPTIMIZATION_PLAN.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/inventory/INVENTORY_OPTIMIZATION_PLAN.md)
- [INVENTORY_OPTIMIZATION_TASKS.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/inventory/INVENTORY_OPTIMIZATION_TASKS.md)

## 目标

将任务清单继续细化为：

- 每个任务对应的代码改动点
- 建议的 PR 切分方案
- 每个 PR 的风险和回归重点

建议控制原则：

- 每个 PR 只解决一类问题
- 每个 PR 都能独立验证
- 先封堵脏数据入口，再做结构重构

## 一、任务到代码改动点映射

## T1. 限制库存编辑接口只能修改安全库存

### 目标

阻止直接修改 `stock_quantity`。

### 主要改动点

服务端：

- [inventory.service.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory.service.ts)
  - 修改 `updateInventoryItem`
  - 删除 `stock_quantity` 的更新逻辑
  - 若请求中包含 `stock_quantity`，返回 4xx 和明确错误码
  - 仅保留 `min_stock` 更新

- [inventory.validators.ts](/Users/aries/Dve/workspace/server/validators/inventory.validators.ts)
  - 修改 `validateInventoryUpdateBody`
  - 将 `stock_quantity` 改为禁止字段
  - 明确 `min_stock` 的合法性校验

- [inventory.controller.ts](/Users/aries/Dve/workspace/server/controllers/inventory.controller.ts)
  - 一般无需大改
  - 如要输出更明确错误，可在 service 层统一返回

前端：

- [useInventoryStore.ts](/Users/aries/Dve/workspace/src/stores/useInventoryStore.ts)
  - 修改 `updateStock` 的调用语义
  - 更名为 `updateMinStock` 更合理

- [Inventory.vue](/Users/aries/Dve/workspace/src/views/Inventory.vue)
  - 检查是否有直接修改库存的交互
  - 如有，替换为“修改安全库存”或移除

### 风险点

- 旧前端若继续传 `stock_quantity`，可能报错
- 需要同步前端 API 调用，否则会出现行为不一致

### 回归重点

- 安全库存仍可更新
- 库存页加载和导出不受影响

## T2. 新增库存调账表

### 目标

给手工库存修正提供正式落库结构。

### 主要改动点

数据库：

- `server/db/migrations/` 下新增迁移文件
  - 创建 `inventory_movements`
  - 增加索引：
    - `material_id`
    - `warehouse_id`
    - `location_id`
    - `source_type`
    - `created_at`
  - 增加幂等唯一约束：
    - `(source_type, source_id, source_line_key)`

模型：

- `server/models/` 下新增模型文件
- `server/models/types.ts`
  - 增补 attributes / creation attributes
- `server/models/index.ts`
  - 注册模型与关联关系

### 风险点

- 模型关联若配置不全，后续查询会报 include 错误
- 字段设计如果过窄，会影响入库/出库/基线修复的统一接入
- 若没有幂等约束，重试和冲突恢复会造成重复流水

### 回归重点

- 数据库迁移可正常执行
- `sequelize.sync` 测试不受影响

幂等键生成规则建议：

- `receipt_in` / `receipt_reversal`
  - `source_id` 取入库或冲销主记录 id
  - `source_line_key` 取订单明细 id 或 receipt item key
- `outbound` / `outbound_reversal`
  - `source_id` 取出库或冲销主记录 id
  - `source_line_key` 取出库明细 id 或稳定物料键
- `manual_adjustment`
  - 先创建 adjustment 主记录，再用其 id 作为 `source_id`
  - `source_line_key` 固定为 `line:1`
- `baseline_repair`
  - 先创建 repair / repair batch 主记录，再用其 id 作为 `source_id`
  - `source_line_key` 使用物料 + 仓库 + 库位稳定组合键

## T3. 新增库存调账后端接口

### 目标

建立唯一合法的库存修正入口。

### 主要改动点

路由：

- 新增 [server/routes/inventoryAdjustments.ts](/Users/aries/Dve/workspace/server/routes)
- 修改 [api.ts](/Users/aries/Dve/workspace/server/routes/api.ts)
  - 注册 `/inventory-adjustments`

控制器：

- 新增 `server/controllers/inventory-adjustment.controller.ts`

校验：

- 新增 `server/validators/inventory-adjustment.validators.ts`
  - 校验 `material_id`
  - 校验 `warehouse_id`
  - 校验 `location_id`
  - 校验 `delta_quantity`
  - 校验 `reason`
  - 校验 `operator`

服务：

- 新增 `server/services/inventory/inventory-adjustment.service.ts`
  - 调用库存更新逻辑
  - 写入 `inventory_movements`

仓位相关依赖：

- 复用 [inventory-location.service.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory-location.service.ts)
- 复用 [inventory-balance.repository.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory-balance.repository.ts)

### 风险点

- 调账负数场景如果不校验余额，会制造负库存
- 若仍直接手写库存更新，后续会与统一库存服务冲突

### 回归重点

- 增加库存
- 减少库存
- 非法减库存被拒绝

## T4. 前端库存页接入调账能力

### 目标

把“直接改库存”替换为“发起调账”。

### 主要改动点

页面：

- [Inventory.vue](/Users/aries/Dve/workspace/src/views/Inventory.vue)
  - 增加调账弹窗开关状态
  - 增加提交事件处理
  - 调账成功后刷新库存列表

组件：

- 新增 `src/components/inventory/InventoryAdjustmentDialog.vue`
  - 选择物料
  - 选择仓库/库位
  - 输入调整数量
  - 输入原因/操作人/备注

store：

- [useInventoryStore.ts](/Users/aries/Dve/workspace/src/stores/useInventoryStore.ts)
  - 新增 `createInventoryAdjustment`
  - 调整 `updateStock`

类型：

- [inventory.ts](/Users/aries/Dve/workspace/src/types/inventory.ts)
  - 新增调账 payload / response 类型

### 风险点

- 前端仍可能残留旧按钮或旧文案
- 调账完成后的局部状态刷新要避免只更新单条而未刷新库位汇总

### 回归重点

- 调账成功后库存总数变化正确
- 库位余额展示同步刷新

## T5. P0 测试补齐

### 目标

把“不能直接改库存”和“调账可闭环”固化下来。

### 主要改动点

新增测试：

- `tests/inventory-adjustment-service.test.ts`
- `tests/inventory-api-guard.test.ts`

可复用现有测试结构：

- [inventory-outbound-service.test.ts](/Users/aries/Dve/workspace/tests/inventory-outbound-service.test.ts)
- [order-service.test.ts](/Users/aries/Dve/workspace/tests/order-service.test.ts)

### 推荐测试覆盖

- 调账增加库存
- 调账减少库存
- 减少超出库位余额时报错
- 直接改 `stock_quantity` 被 4xx 显式拒绝

## T5A. 历史库存基线对账与修复

### 目标

在统一库存服务接管核心链路前，先把历史差异收口。

### 主要改动点

服务端：

- 新增基线对账逻辑
- 新增一次性修复脚本或管理命令
- 支持 `dry-run`
- 输出待修复清单供人工确认
- 正式执行前保留修复前快照或导出结果
- 将修复结果写入 `inventory_movements`
- 对无法确认真实库位归属的差异，统一落到 `DEFAULT / UNASSIGNED`

建议新增文件：

- `scripts/repair_inventory_baseline.ts`
- `tests/inventory-baseline-repair.test.ts`

### 风险点

- 若跳过这一步，统一库存服务会建立在错误基线上
- 若修复不留流水，后续审计无法解释库存突变
- 若没有 `dry-run` 和确认环节，可能把大批差异错误归并到默认库位

### 回归重点

- 差异报告准确
- `dry-run` 不改动数据
- 修复后总库存与库位余额一致
- 修复记录可追溯

## T6. 抽统一库存变更服务

### 目标

把库存增减统一成一个原子入口。

### 主要改动点

新增服务：

- `server/services/inventory/inventory-movement.service.ts`

建议拆分的方法：

- `applyInventoryDelta`
- `loadMaterialAndBalance`
- `assertSufficientBalance`
- `recordInventoryMovement`
- `updateWithVersionGuard`
- `buildMovementIdempotencyKey`

可能需要新增 repository：

- `server/services/inventory/inventory-movement.repository.ts`

复用点：

- [inventory-balance.repository.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory-balance.repository.ts)
- [inventory-location.service.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory-location.service.ts)

### 风险点

- 一次改动触达多个链路，容易造成行为漂移
- 若把“业务流程状态更新”和“库存变更”混在一起，服务边界会继续模糊
- 若并发模型在这里不锁定，后续 PR4/PR5 仍会把竞争条件集中迁移过去
- 若幂等键规则不固定，接入不同来源时会重复记账

### 回归重点

- 统一服务只处理库存，不处理订单状态
- 传入不同 `source_type` 时都能正确落流水
- 乐观锁冲突能返回稳定错误
- 同一来源重试不会重复写流水

## T7. 入库链路接入统一库存变更服务

### 目标

消除采购入库/冲销中的重复库存写入逻辑。

### 主要改动点

核心文件：

- [inventory-receipt.service.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory-receipt.service.ts)
  - 替换 `material.update`
  - 替换 `balance.update`

- [inventory-receipt.repository.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory-receipt.repository.ts)
  - 如需补充事务查询能力可在这里扩展

- [order.stockin.ts](/Users/aries/Dve/workspace/server/services/orders/order.stockin.ts)
  - 一般无需重写
  - 但要验证调用结果是否仍满足订单状态变更要求

### 风险点

- 订单收货数量和库存数量更新的事务边界不能被打散
- 部分入库冲销逻辑依赖现有错误码，不能误改

### 回归重点

- 部分入库
- 全量入库
- 入库冲销
- 冲销后订单状态回退

## T8. 出库链路接入统一库存变更服务

### 目标

消除手工出库/冲销中的重复库存写入逻辑。

### 主要改动点

核心文件：

- [inventory-outbound.service.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory-outbound.service.ts)
  - 替换 `adjustMaterialAndBalance`
  - 将出库和冲销都改为调用统一入口

- [inventory-outbound.repository.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory-outbound.repository.ts)
  - 如需补锁查询、批量读取可在这里补

### 风险点

- 当前出库逻辑对错误码和回滚行为依赖较强
- 一次出库多行明细时事务处理不能被破坏

### 回归重点

- 普通出库
- 出库余额不足
- 出库冲销
- 重复冲销拒绝

## T9. 并发控制

### 目标

让统一库存服务在并发场景下稳定。

### 主要改动点

统一库存服务：

- [inventory-movement.service.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory-movement.service.ts)
  - 增加基于 `version` 的乐观锁

可能需要修改：

- `server/models/Material.ts`
- `server/models/InventoryLocationBalance.ts`
- `server/models/types.ts`

- 增加 migration
- 增加 `version` 字段

### 风险点

- 乐观锁冲突处理不当会导致重试风暴或错误码不稳定
- 测试环境 SQLite 对真实并发有限，需要通过条件更新和冲突模拟覆盖核心路径

### 回归重点

- 同一物料并发扣减
- 同一库位并发调账
- 多明细按固定顺序处理

## T10. 统一库存变更测试

### 目标

给 T6-T9 的结构改造建立回归保护。

### 主要改动点

新增测试：

- `tests/inventory-movement-service.test.ts`
- `tests/inventory-movement-concurrency.test.ts`

可能需要补测试辅助：

- 创建测试用物料
- 创建仓库和库位余额
- 并发提交 helper

### 回归重点

- 不同 source type 的库存增减
- 事务失败后的回滚
- 并发冲突后的最终库存正确性

## T11. 库存总览查询下沉数据库

### 目标

把库存列表从“全量查 + 内存筛选”改为数据库过滤。

### 主要改动点

核心文件：

- [inventory.repository.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory.repository.ts)
  - 新增 query builder
  - 增加带 where 的查询

- [inventory.service.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory.service.ts)
  - 删除内存 filter 逻辑
  - 改为传 query 到 repository

- [inventory.mapper.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory.mapper.ts)
  - 视查询结构调整 mapper

### 风险点

- `locationBalances` include 条件处理不好时，可能把无余额物料直接筛没
- 低库存计算如果完全下沉，可能要明确是按总库存还是库位库存判断

### 回归重点

- 仓库过滤
- 库位过滤
- 关键字过滤
- 低库存过滤

## T12. 出库列表查询下沉数据库

### 目标

把出库页改成真正数据库分页。

### 主要改动点

核心文件：

- [inventory-outbound.repository.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory-outbound.repository.ts)
  - 新增分页查询
  - 新增 count 查询

- [inventory-outbound.service.ts](/Users/aries/Dve/workspace/server/services/inventory/inventory-outbound.service.ts)
  - 删除 `listOutbounds().map().filter().slice()` 逻辑

如果关键字涉及 item 字段：

- 可能需要 `include items/material`
- 可能需要 `distinct: true`

### 风险点

- 带 include 的分页很容易导致 `count` 重复
- 搜索 item/material 字段时要注意 join 后结果去重

### 回归重点

- 总数准确
- 翻页准确
- 关键字仍能搜到明细物料

## T13. 导出与列表解耦

### 目标

避免导出逻辑和列表逻辑互相牵制。

### 主要改动点

前端：

- [useInventoryStore.ts](/Users/aries/Dve/workspace/src/stores/useInventoryStore.ts)
  - 继续保留 `fetchAllInventoryReceipts`
  - 继续保留 `fetchAllInventoryOutbounds`
  - 但后端需走专门查询路径

服务端：

- 增加专用导出接口或导出模式查询

### 风险点

- 导出字段兼容性
- 列表和导出筛选条件不一致

### 回归重点

- 列表分页与导出结果口径一致

## T14-T17. 对账与审计能力

### 目标

让历史问题可见，未来问题可追。

### 主要改动点

服务端：

- 新增 reconciliation service
- 新增差异查询接口
- 新增流水轨迹查询接口
- 轨迹接口按“统一流水 + 历史业务表”混合查询实现

前端：

- [Inventory.vue](/Users/aries/Dve/workspace/src/views/Inventory.vue)
  - 增加差异视图或 Tab
  - 增加轨迹查看入口

组件：

- 新增差异表格
- 新增库存轨迹抽屉或详情弹窗

### 风险点

- 若底层流水模型不稳定，前端轨迹页会反复返工
- 若假设历史数据已全部回填，会导致轨迹页出现大量空白

### 回归重点

- 异常差异能识别
- 轨迹链路完整
- 上线前后的数据都能被解释

## 二、建议 PR 切分方案

## PR1：封堵直接改库存入口

### 包含任务

- T1
- T5 中与接口限制相关的测试

### 改动范围

- `server/services/inventory/inventory.service.ts`
- `server/validators/inventory.validators.ts`
- `src/stores/useInventoryStore.ts`
- 相关测试

### 目标

先阻止新增脏数据。

### 风险

- 低

### 建议验证

- 手动改 `min_stock`
- 尝试改 `stock_quantity`

## PR2：新增库存调账闭环

### 包含任务

- T2
- T3
- T4
- T5 中与调账相关的测试

### 改动范围

- migration
- model
- adjustment route/controller/service
- inventory page / store / dialog
- 相关测试

### 目标

提供合法的库存修正入口。

### 风险

- 中

### 建议验证

- 调增库存
- 调减库存
- 调减超额报错
- 前端提交流程

## PR3：历史库存基线修复

### 包含任务

- T5A

### 改动范围

- 对账查询
- 一次性修复脚本
- 基线修复测试

### 目标

先把历史差异收口，再让统一库存服务接管更多链路。

### 风险

- 中

### 建议验证

- 生成差异报告
- 执行修复后重新对账
- 修复流水可追溯

## PR4：抽统一库存变更服务并落并发模型

### 包含任务

- T6
- T9

### 改动范围

- `inventory-movement.service.ts`
- 可能的 movement repository
- 先接入调账链路
- 版本字段 migration / model 适配
- 乐观锁冲突错误码与幂等键规则

### 目标

先建立统一库存变更能力，并在这个 PR 内完整落地乐观锁并发模型，但暂时不一次改完所有业务链路。

### 风险

- 中

### 建议验证

- 调账仍然可用
- 流水正确
- 并发冲突有稳定失败语义

## PR5：入库链路接入统一库存服务

### 包含任务

- T7

### 改动范围

- `inventory-receipt.service.ts`
- 相关测试

### 目标

把入库和入库冲销收进统一逻辑。

### 风险

- 中高

### 建议验证

- 全量入库
- 部分入库
- 入库冲销
- 订单状态变化

## PR6：出库链路接入统一库存服务

### 包含任务

- T8

### 改动范围

- `inventory-outbound.service.ts`
- 相关测试

### 目标

把出库和出库冲销收进统一逻辑。

### 风险

- 中高

### 建议验证

- 普通出库
- 出库不足报错
- 出库冲销
- 重复冲销

## PR7：库存核心回归与并发测试

### 包含任务

- T10

### 改动范围

- `inventory-movement.service.ts`
- 并发测试
- 入库/出库/调账回归测试

### 目标

把已经在 PR4 落地的并发与幂等模型，在所有接入链路上验证稳。

### 风险

- 高

### 建议验证

- 并发扣减
- 并发调账
- 并发冲销

## PR8：库存列表查询优化

### 包含任务

- T11

### 改动范围

- `inventory.repository.ts`
- `inventory.service.ts`

### 目标

消除库存列表内存筛选。

### 风险

- 中

### 建议验证

- 各种筛选组合
- 低库存视图

## PR9：出库列表分页优化

### 包含任务

- T12
- T13

### 改动范围

- `inventory-outbound.repository.ts`
- `inventory-outbound.service.ts`
- 可能的导出接口
- 前端 store 兼容适配

### 目标

把出库列表改成真实分页，并和导出解耦。

### 风险

- 中

### 建议验证

- 翻页
- 搜索
- 导出

## PR10：对账与轨迹能力

### 包含任务

- T14
- T15
- T16
- T17

### 改动范围

- 新增 reconciliation service / API
- `Inventory.vue`
- 新增差异和轨迹组件

### 目标

补齐运营和审计能力。

### 风险

- 中

### 建议验证

- 差异识别
- 轨迹展示
- 异常导出

## 三、推荐实际落地顺序

如果要兼顾风险和推进效率，推荐按下面顺序发 PR：

1. PR1：封堵直接改库存入口
2. PR2：新增库存调账闭环
3. PR3：历史库存基线修复
4. PR4：抽统一库存变更服务并落并发模型
5. PR5：入库链路接入统一库存服务
6. PR6：出库链路接入统一库存服务
7. PR7：库存核心回归与并发测试
8. PR8：库存列表查询优化
9. PR9：出库列表分页优化
10. PR10：对账与轨迹能力

## 四、最小一轮可交付建议

如果只准备做一轮高价值交付，建议只做：

- PR1
- PR2
- PR3

这一轮完成后，系统就能做到：

- 不再允许非法直接改库存
- 有正式调账入口
- 调账影响总库存和库位库存
- 调账行为可追溯
- 历史差异不再继续污染后续重构

这已经能显著降低库存模块继续恶化的风险。
