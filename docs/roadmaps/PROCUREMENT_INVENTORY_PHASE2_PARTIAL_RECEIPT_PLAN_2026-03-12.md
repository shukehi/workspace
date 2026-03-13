# 采购与库存边界改造 Phase 2 方案：部分入库与撤销入库（2026-03-12）

## 1. 目标

Phase 1 已完成：

1. 到货与入库状态拆分
2. 入库流水建模
3. 采购页和库存页的基础入库闭环

Phase 2 的目标不是继续扩状态，而是在现有状态模型之上支持更真实的仓储作业：

1. 支持同一采购单分多次入库
2. 支持同一订单按明细部分入库
3. 支持受控的撤销入库
4. 保持库存数量、订单状态、入库流水三者一致

当前已落地的过渡能力：

1. `OrderItem` 已具备 `ordered_quantity / received_quantity`
2. `POST /api/orders/:id/stock-in` 已支持传 `items[]` 做后端级别的按明细入库
3. 未传 `items[]` 时仍兼容整单按剩余量入库；显式传空数组会直接报错，避免误整单入库
4. 订单级 `stocked_in_*` 仍保留“整单完成入库”语义，部分入库事实只记录在 `InventoryReceipt`
5. 采购页单单入口已切到明细入库弹窗，但批量入库已临时禁用，避免与新语义冲突
6. 库存页已支持对正向入库流水执行撤销，并通过反向流水回退库存与订单累计入库量

## 2. 当前 Phase 1 限制

当前实现的限制：

1. `stock-in` 默认按整单全部明细一次性入库
2. `InventoryReceipt` 只有“正向入库”语义，没有撤销标识
3. `completed` 只能表达“整单已全部入库”
4. 无法回答“某条订单明细还剩多少未入库”
5. 无法安全撤销已经执行的入库流水

这些限制会直接阻碍以下真实场景：

1. 供应商分批送货
2. 到货数量与采购数量不一致
3. 误操作入库后需要撤回
4. 采购单长期处于“部分已收货”状态

## 3. Phase 2 核心原则

1. 不新增比 `arrived / completed` 更复杂的订单主状态
2. “是否已全部入库”由明细层累计结果判定，而不是继续扩主状态数量
3. 入库流水必须支持正负方向，撤销入库不能直接删除历史记录
4. 库存汇总值永远由流水动作驱动，不允许单独改状态来补库存
5. `ordered_quantity / received_quantity` 属于服务端控制字段，普通建单/改单请求不允许直接提交入库进度
6. 单条明细的累计已入库数量不能依赖 `OrderItem.id` 稳定性，必须冗余业务键
7. 在 Phase 2 落地前，必须先冻结“已到货/已入库订单的明细编辑策略”，否则明细级累计入库数据会失真

## 4. 推荐数据模型扩展

### 4.1 OrderItem 增补字段

建议在 `order_items` 上增加：

- `ordered_quantity`
- `received_quantity`

约束：

1. `ordered_quantity` 固定保存采购数量快照
2. `received_quantity` 表示累计已入库数量
3. 创建订单时：
   - `ordered_quantity = quantity`
   - `received_quantity = 0`
4. 普通 `create / update order` 路径必须忽略客户端传入的 `ordered_quantity / received_quantity`
5. 每次正向入库时增加 `received_quantity`
6. 每次撤销入库时减少 `received_quantity`

说明：

当前 `quantity` 字段已经存在，但后续若允许编辑采购数量，建议明确把 `ordered_quantity` 作为状态核对基准，避免语义漂移。

Phase 2 前置约束：

1. `arrived` / `completed` 状态的订单，不允许继续走当前“删明细再重建”的编辑路径
2. 如业务必须允许编辑，则必须先设计：
   - 已入库数量迁移规则
   - 明细业务键稳定策略
   - 历史流水与新明细的重新映射规则

在上述约束未落地前，推荐先冻结：

1. `arrived` 状态订单仅允许改备注、交货日期、操作人类字段
2. `completed` 状态订单禁止编辑明细

### 4.2 InventoryReceipt 增补字段

建议扩展 `inventory_receipts`：

- `direction`
- `source_receipt_id`
- `item_model`
- `item_spec`
- `remaining_after`

含义：

1. `direction`
   - `in`：正向入库
   - `reversal`：撤销入库
2. `source_receipt_id`
   - 撤销记录指向被撤销的原始入库流水
3. `item_model / item_spec`
   - 冗余明细快照，避免后续订单改动后历史无法核对
4. `remaining_after`
   - 本次流水完成后，该明细剩余未入库数量

关键约束：

1. 撤销入库新增反向流水，不删除原流水
2. 同一原始流水最多只允许被完全撤销一次，或需要引入部分撤销规则

## 5. 接口设计建议

### 5.1 部分入库

```http
POST /api/orders/:id/stock-in
```

请求体改为显式明细：

```json
{
  "stocked_in_at": "2026-03-12T10:00:00.000Z",
  "operator": "仓管A",
  "remark": "首批到货",
  "items": [
    {
      "order_item_id": 11,
      "item_key": "MAT-001|锁体A|主锁",
      "material_id": "MAT-001",
      "quantity": 20
    },
    {
      "order_item_id": 12,
      "item_key": "MAT-002|锁体B|副锁",
      "material_id": "MAT-002",
      "quantity": 5
    }
  ]
}
```

行为：

1. 校验订单状态必须为 `arrived`
2. 校验每条明细入库数量 `> 0`
3. 请求不能只依赖 `order_item_id`，必须同时带稳定业务键，或先为订单明细引入专用稳定键
4. 校验累计入库数量不能超过采购数量，超量请求必须直接拒绝，不能部分写入
5. 写入多条 `InventoryReceipt`
6. 更新每条明细 `received_quantity`
7. 如果所有明细都已收满，则订单置为 `completed`，并回填订单级 `stocked_in_*`
8. 如果仍有未收完明细，则订单保持 `arrived`，订单级 `stocked_in_*` 不提前写入

补充说明：

1. 当前项目中 `OrderItem.id` 会在编辑订单时重建，不能作为 Phase 2 唯一定位键
2. 若不引入新的 `item_key` / `source_item_key`，则部分入库接口会在订单编辑后失效

### 5.2 查询未入库数量

```http
GET /api/orders/:id/receiving-summary
```

返回：

1. 每条明细采购数量
2. 已入库数量
3. 剩余待入库数量
4. 是否可继续入库

### 5.3 撤销入库

```http
POST /api/inventory-receipts/:id/reverse
```

行为：

1. 校验目标流水存在且为 `direction = in`
2. 校验尚未被撤销
3. 回退对应物料库存
4. 新增一条 `direction = reversal` 流水
5. 回退对应 `OrderItem.received_quantity`
6. 如果订单已不再满足全部入库，则订单状态回退到 `arrived`

## 6. 状态判定规则

Phase 2 不建议再引入 `partial` 之类的新主状态，统一按以下规则判定：

1. 订单状态 `arrived`
   - 至少有到货事实
   - 但仍存在任一明细 `received_quantity < ordered_quantity`
2. 订单状态 `completed`
   - 所有明细都满足 `received_quantity >= ordered_quantity`

这样做的好处：

1. 避免状态爆炸
2. 采购页和统计页改动更小
3. 复杂度落在明细和流水，不污染主状态

## 7. 前端改造建议

### 7.1 采购页

`arrived` 状态的“执行入库”按钮应改为打开入库弹窗，而不是直接整单入库。

弹窗必须展示：

1. 明细名称
2. 采购数量
3. 已入库数量
4. 本次入库数量输入框
5. 剩余待入库数量

必须同步改造：

1. 行级“执行入库”成功提示，不再默认等于“订单已完成”
2. 批量入库逻辑，不能再直接假设 `arrived -> completed`；在批量明细选择方案落地前应保持禁用
3. 订单从 `completed` 被撤销回 `arrived` 后，采购页状态文案、筛选和统计必须仍然正确
4. 若撤销入库落在库存页执行，采购页需能在刷新后正确看到状态回退
5. 仅当订单仍存在剩余待入库明细时，才显示“执行入库”入口；否则前端应直接拦截，不打开空弹窗

### 7.2 库存页

入库记录表格建议增加：

1. `direction` 展示
2. 原始流水 / 撤销流水标识
3. 撤销入口
4. 仅对可撤销记录显示按钮

当前进展：

1. `direction / source_receipt_id` 已落地
2. 库存页已接入撤销入口
3. `reverse_reason` 已落地，撤销原因不再只依赖自由备注
4. 采购页已通过跨标签页刷新信号消费撤销后的状态回退
5. 仍缺少更细的审计展示和撤销原因统计口径

## 8. 测试范围

后端至少新增：

1. 单条明细部分入库
2. 多条明细多次入库
3. 超量入库拦截
4. 撤销入库回退库存
5. 撤销入库后订单从 `completed` 回退到 `arrived`

前端至少新增：

1. 入库弹窗明细汇总显示
2. 剩余数量计算
3. 入库记录方向展示
4. 撤销入库按钮显示条件

## 9. 推荐执行顺序

1. 明细层字段扩展：`ordered_quantity / received_quantity`
2. `InventoryReceipt` 扩展：`direction / source_receipt_id / 快照字段`
3. 重写 `stock-in` 服务，支持显式明细数量
4. 采购页入库弹窗
5. 新增撤销入库接口
6. 库存页撤销入口
7. 测试与文档收口

已完成：

1. 第 1 步已完成
2. 第 3 步的后端能力已完成，但前端仍未接入明细入库弹窗

## 10. 明确暂不做

1. 不做批次号管理
2. 不做仓位管理
3. 不做成本核算回滚
4. 不做复杂审批流
