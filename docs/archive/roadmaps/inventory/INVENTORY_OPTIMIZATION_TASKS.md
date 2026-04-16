# 库存管理优化任务清单

> 状态：**历史任务拆解**。
> 请优先参考 [INVENTORY_OPTIMIZATION_PROGRESS.md](/Users/aries/Dve/workspace/docs/progress/INVENTORY_OPTIMIZATION_PROGRESS.md) 判断当前未完成项。
> 本文档保留为原始任务拆分参考，不再直接代表最新执行状态。

关联方案文档：

- [INVENTORY_OPTIMIZATION_PLAN.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/inventory/INVENTORY_OPTIMIZATION_PLAN.md)

## 使用方式

建议按 `T0 -> T17` 顺序推进，并在 `T5` 后插入执行 `T5A`。

- `P0` 为必须优先完成的闭环任务
- `P1` 为结构性重构任务
- `P2` 为审计、性能和运营增强任务

每个任务都包含：

- 目标
- 具体改动
- 验收标准
- 依赖关系

## P0：账本一致性闭环

### T0. 盘点当前库存变更入口

目标：

梳理所有会修改库存的接口、服务和页面入口，避免后续重构时漏掉链路。

具体改动：

- 盘点服务端库存改动入口
- 盘点前端库存编辑入口
- 输出当前库存写入链路图

建议覆盖范围：

- `server/services/inventory/inventory.service.ts`
- `server/services/inventory/inventory-receipt.service.ts`
- `server/services/inventory/inventory-outbound.service.ts`
- `server/services/orders/order.stockin.ts`
- `src/views/Inventory.vue`
- `src/stores/useInventoryStore.ts`

验收标准：

- 明确所有修改 `stock_quantity` 和 `inventory_location_balances.quantity` 的代码位置
- 明确哪些入口未来要收敛到统一方法

依赖关系：

- 无

### T1. 限制库存编辑接口只能修改安全库存

目标：

阻止系统继续制造“总库存和库位库存不一致”的新数据。

具体改动：

- 修改 `PUT /inventory/:id` 的请求校验
- 服务端只允许修改 `min_stock`
- 只要请求体包含 `stock_quantity`，直接返回 4xx 和明确错误码
- 错误提示统一为“库存数量不可直接修改，请走调账”

涉及文件：

- `server/services/inventory/inventory.service.ts`
- `server/validators/inventory.validators.ts`
- `server/controllers/inventory.controller.ts`

验收标准：

- 调用库存编辑接口不能再直接修改 `stock_quantity`
- `min_stock` 仍可正常更新

依赖关系：

- 依赖 `T0`

### T2. 设计并创建统一库存流水表

目标：

为手工库存调整建立可审计的数据落点。

具体改动：

- 新增迁移文件
- 创建统一流水表 `inventory_movements`
- 建立必要索引

建议字段：

- `id`
- `material_id`
- `warehouse_id`
- `location_id`
- `source_type`
- `source_id`
- `source_line_key`
- `delta_quantity`
- `balance_after`
- `operator`
- `reason`
- `remark`
- `created_at`
- `updated_at`

验收标准：

- 迁移可正常执行
- 表结构直接作为统一库存流水使用，不再引入第二张过渡表
- `(source_type, source_id, source_line_key)` 或等价幂等约束已明确

依赖关系：

- 依赖 `T0`

### T3. 新增库存调账后端接口

目标：

提供唯一合法的手工库存修正入口。

具体改动：

- 新增路由，例如 `POST /inventory-adjustments`
- 新增请求校验
- 新增调账 service
- 调账时同步更新总库存、库位库存，并写入 `inventory_movements`

建议新增文件：

- `server/routes/inventoryAdjustments.ts`
- `server/controllers/inventory-adjustment.controller.ts`
- `server/services/inventory/inventory-adjustment.service.ts`
- `server/validators/inventory-adjustment.validators.ts`

验收标准：

- 调账成功后：
  - `materials.stock_quantity` 正确变化
  - `inventory_location_balances.quantity` 正确变化
  - 调账流水成功落库
- 非法调账会被拒绝：
  - 数量非法
  - 仓库库位非法
  - 导致负库存

依赖关系：

- 依赖 `T1`
- 依赖 `T2`

### T4. 前端库存页接入调账能力

目标：

替换掉直接改库存数的旧交互。

具体改动：

- 在库存页新增“调账”按钮
- 新增调账弹窗
- 弹窗支持填写：
  - 物料
  - 仓库
  - 库位
  - 调整数量
  - 调整原因
  - 操作人
  - 备注
- 提交后刷新库存列表

建议新增文件：

- `src/components/inventory/InventoryAdjustmentDialog.vue`

建议修改文件：

- `src/views/Inventory.vue`
- `src/stores/useInventoryStore.ts`
- `src/types/inventory.ts`

验收标准：

- 页面上不再提供直接改库存数能力
- 可以从库存页完成一次合法调账
- 调账成功后库存显示与库位余额同步更新

依赖关系：

- 依赖 `T3`

### T5. 为 P0 增补测试

目标：

确保账本一致性闭环可回归验证。

具体改动：

- 新增调账 service 测试
- 新增库存接口限制测试
- 新增前端调账提交流程测试

建议新增测试：

- `tests/inventory-adjustment-service.test.ts`
- `tests/inventory-api-guard.test.ts`

验收标准：

- 直接改 `stock_quantity` 的旧路径被测试拦住
- 调账后总库存和库位库存保持一致

依赖关系：

- 依赖 `T1`
- 依赖 `T3`
- 依赖 `T4`

### T5A. 历史库存基线对账与修复

目标：

清理现存历史脏数据，避免后续统一库存服务继续建立在错误基线上。

具体改动：

- 新增库存差异报告逻辑
- 输出当前 `materials.stock_quantity` 与 `sum(inventory_location_balances.quantity)` 的差异列表
- 新增一次性基线修复脚本或管理命令
- 修复流程必须分为：
  - `dry-run`
  - 人工确认修复清单
  - 正式执行
- 正式执行前保留修复前快照或导出清单
- 对确认需要修复的差异写入 `inventory_movements`
- 无法确认真实库位归属的差异统一落到 `DEFAULT / UNASSIGNED`

建议新增内容：

- `scripts/repair_inventory_baseline.ts` 或等价命令
- `tests/inventory-baseline-repair.test.ts`

验收标准：

- 可生成完整差异报告
- 可在不改数据的前提下执行 `dry-run`
- 执行修复后，总库存和库位库存重新对齐
- 修复动作具备审计记录

依赖关系：

- 依赖 `T2`
- 建议在 `T6` 前完成

## P1：统一库存变更模型

### T6. 抽统一库存变更服务

目标：

把库存加减规则统一到一个原子服务中。

具体改动：

- 新增统一库存变更服务
- 抽出方法，例如 `applyInventoryDelta(...)`
- 统一处理：
  - 物料读取
  - 仓库库位校验
  - 库位余额读取或创建
  - 负库存校验
- 总库存和库位库存更新
- 流水记录写入
- 基于 `version` 的乐观锁更新
- 基于 `(source_type, source_id, source_line_key)` 的幂等写入

建议新增文件：

- `server/services/inventory/inventory-movement.service.ts`

验收标准：

- 调账能力改为调用统一库存变更服务
- 统一库存变更服务内已确定乐观锁并发模型
- 同一业务来源重复提交不会重复写库存流水
- 后续入库/出库改造时不需要再重复写库存更新逻辑

依赖关系：

- 依赖 `T2`
- 依赖 `T3`
- 建议在 `T5A` 后执行

### T7. 入库链路接入统一库存变更服务

目标：

去掉采购入库和入库冲销中的重复库存写入逻辑。

具体改动：

- 修改 `inventory-receipt.service.ts`
- 入库时调用统一库存变更入口
- 入库冲销时调用统一库存变更入口
- 保留现有订单收货数量联动逻辑

验收标准：

- 入库后库存和库位余额正确增加
- 入库冲销后库存和库位余额正确减少
- 原有业务行为不变

依赖关系：

- 依赖 `T6`

### T8. 出库链路接入统一库存变更服务

目标：

去掉手工出库和出库冲销中的重复库存写入逻辑。

具体改动：

- 修改 `inventory-outbound.service.ts`
- 出库时调用统一库存变更入口
- 出库冲销时调用统一库存变更入口

验收标准：

- 出库后库存和库位余额正确减少
- 出库冲销后库存和库位余额正确恢复
- 原有冲销限制仍然有效

依赖关系：

- 依赖 `T6`

### T9. 补全并发控制

目标：

保证库存变更在并发情况下不会超扣或覆盖写。

具体改动：

- 为统一库存变更服务补全乐观锁冲突处理
- 对 `materials` 和 `inventory_location_balances` 增加 `version` 字段
- 将冲突转换为可识别的业务错误码
- 多物料明细场景按固定顺序锁定资源

验收标准：

- 并发出库不会产生负库存
- 并发调账不会出现最终库存错误
- 并发冲销不会重复恢复

依赖关系：

- 依赖 `T6`
- 在 PR 切分中与 `T6` 一起落地

### T10. 为统一库存变更和并发补测试

目标：

给结构性重构加回归保护。

具体改动：

- 新增统一库存变更测试
- 新增并发测试
- 回归已有入库、出库、冲销测试

建议新增测试：

- `tests/inventory-movement-service.test.ts`
- `tests/inventory-movement-concurrency.test.ts`

验收标准：

- 统一库存变更逻辑有独立测试覆盖
- 并发场景可稳定复现并通过

依赖关系：

- 依赖 `T7`
- 依赖 `T8`
- 依赖 `T9`

## P1：查询与分页优化

### T11. 重构库存总览查询为数据库过滤

目标：

消除库存列表全量拉取后内存筛选的问题。

具体改动：

- 改造 `inventory.repository.ts`
- 将仓库、库位、关键字、低库存筛选下沉到数据库
- 如有必要，增加查询 DTO 或 query builder

验收标准：

- 列表接口不再依赖全量 `findAll` 再过滤
- 过滤结果与现有行为保持一致

依赖关系：

- 可独立执行

### T12. 重构出库列表为数据库分页

目标：

消除出库列表全量拉取后内存分页的问题。

具体改动：

- 改造 `inventory-outbound.repository.ts`
- 将关键字、仓库、库位、时间区间过滤下沉到数据库
- 使用数据库分页而非数组 `slice`

验收标准：

- 接口返回真正分页后的数据
- `total` 为真实总数
- 页数切换不依赖服务端全量拉取

依赖关系：

- 可独立执行

### T13. 导出与列表查询解耦

目标：

避免导出逻辑拖慢列表接口。

具体改动：

- 为库存导出、入库导出、出库导出建立独立查询路径
- 列表接口只做分页用途
- 导出接口按全量数据场景单独优化

验收标准：

- 列表加载性能不因导出场景退化
- 导出结果与当前字段保持兼容

依赖关系：

- 依赖 `T11`
- 依赖 `T12`

## P2：审计与运营增强

### T14. 新增库存差异校验能力

目标：

识别历史脏数据和未来异常。

具体改动：

- 新增对账逻辑
- 比较：
  - `materials.stock_quantity`
  - `sum(inventory_location_balances.quantity)`
- 输出差异值和异常列表

验收标准：

- 能识别账本不一致的物料
- 差异结果可供页面展示和导出

依赖关系：

- 建议在 `T6` 后执行

### T15. 库存页增加差异视图

目标：

让运营可视化发现账本问题。

具体改动：

- 在库存页增加差异标识或单独 Tab
- 高亮异常物料
- 支持快速跳转查看相关流水

验收标准：

- 异常库存可以被直接发现
- 页面能区分正常库存和差异库存

依赖关系：

- 依赖 `T14`

### T16. 增加库存影响轨迹视图

目标：

让每次库存变化可追溯。

具体改动：

- 在入库、出库、调账详情中增加库存变更轨迹展示
- 轨迹查询拆为两部分：
  - 新版本统一流水：查询 `inventory_movements`
  - 历史数据：回退查询入库/出库等原业务表
- 展示字段：
  - 来源单据
  - 来源类型
  - 物料
  - 仓库
  - 库位
  - 数量变化
  - 操作人
  - 时间
  - 原因

验收标准：

- 上线后的新库存变化可通过统一流水追溯
- 上线前的历史库存变化可通过混合查询查看来源

依赖关系：

- 依赖 `T6`
- 依赖 `T14`

### T17. 异常清单导出

目标：

方便运营线下核对和批量处理差异。

具体改动：

- 为库存差异结果增加导出能力
- 导出字段至少包含：
  - 物料编码
  - 物料名称
  - 总库存
  - 库位库存合计
  - 差异值

验收标准：

- 可导出当前所有库存差异记录

依赖关系：

- 依赖 `T14`

## 建议排期

### 第一批

- `T0`
- `T1`
- `T2`
- `T3`
- `T4`
- `T5`

目标：

先完成账本一致性闭环，阻止新增脏数据。

### 第二批

- `T6`
- `T7`
- `T8`
- `T9`
- `T10`

目标：

完成库存核心逻辑统一和并发安全治理。

### 第三批

- `T11`
- `T12`
- `T13`

目标：

解决查询放大和分页性能问题。

### 第四批

- `T14`
- `T15`
- `T16`
- `T17`

目标：

补齐对账、审计和运营能力。

## 最小可落地版本

如果只做一轮高价值交付，建议以下任务作为最小集：

- `T1. 限制库存编辑接口只能修改安全库存`
- `T2. 设计并创建统一库存流水表`
- `T3. 新增库存调账后端接口`
- `T4. 前端库存页接入调账能力`
- `T5. 为 P0 增补测试`
- `T5A. 历史库存基线对账与修复`

完成这一轮后，库存模块至少能做到：

- 不再新增新的账本不一致
- 手工库存修正有合法入口
- 调整行为可追溯

## 建议后续拆分为 issue 的粒度

适合单独建 issue 的任务：

- `T1`
- `T2 + T3`
- `T4`
- `T5`
- `T6`
- `T6 + T9`
- `T7`
- `T8`
- `T11`
- `T12`
- `T14 + T15`

适合放在同一 PR 的任务：

- `T1 + T5`
- `T2 + T3`
- `T7 + T8`
- `T11 + T12 + T13`
