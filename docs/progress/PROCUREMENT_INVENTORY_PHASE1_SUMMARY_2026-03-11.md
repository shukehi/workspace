# 采购与库存边界改造阶段总结（2026-03-13）

## 1. 当前完成度

基于当前分支代码，采购与库存这条主链路已经基本打通：

- Phase 1：约 95% 完成
- Phase 2：约 80% 完成
- 整体采购/库存改造：约 85% 完成

当前状态更接近“可阶段验收”，而不是“功能尚未成型”。

## 2. 已完成能力

### 2.1 采购状态与流转

- 订单状态已扩展为 `draft / submitted / processing / arrived / completed / cancelled`
- 已支持“开始采购”“登记到货”“执行入库”
- `arrived` 订单支持受限编辑，仅允许修改交货日期和整单备注
- `completed` 订单已冻结编辑

### 2.2 入库与库存闭环

- 已完成 `POST /api/orders/:id/arrive`
- 已完成 `POST /api/orders/:id/stock-in`
- 已新增 `InventoryReceipt` 流水模型
- 已支持按明细、按数量入库
- 已支持部分入库、多次入库与全部入库完成判定
- 已支持库存数量随入库流水自动更新

### 2.3 撤销与审计

- 已支持正向入库流水撤销
- 已支持部分撤销
- 已支持 `reverse_reason` 结构化原因
- 已支持库存页查看撤销轨迹与详情抽屉
- 已支持订单状态在撤销后从 `completed` 回退到 `arrived`

### 2.4 页面与联动

- 采购页已支持单单“明细入库弹窗”
- 已支持从采购页跳转库存页查看该订单入库记录
- 已支持独立“入库记录详情页”
- 库存页已支持服务端筛选、服务端分页、`pageSize` 与 URL 同步
- 采购页已支持服务端筛选、服务端分页与页码 URL 同步，默认每页 20 条，并支持页大小切换
- 采购页导出已支持按当前查询条件导出全量结果
- 库存页已支持按当前已生效查询条件导出全量 CSV
- 采购页已能感知库存页撤销后的状态回退刷新

### 2.5 历史兼容修复

- 已修复“无剩余待入库明细仍显示执行入库入口”的问题
- 已兼容历史 `ordered_quantity = 0` 的老单据，前后端统一回退使用 `quantity`
- 已在当前本地数据库中回填一批历史异常明细，避免旧单误判不可入库

## 3. 当前遗留项

当前仍未完成或仍待优化的部分：

1. 批量入库已恢复，但当前采用“逐单排队打开明细入库弹窗”的模式，尚未设计统一的批量明细选择方案
2. CSV 导出仍是平面结构，未表达“原始流水 -> 撤销子流水”层级
3. 采购页与库存页之间的联动刷新仍依赖 `storage` 事件
4. 尚缺一轮完整人工回归，验证真实业务操作链路

## 4. 建议的下一步

建议先不要继续扩新业务规则，而是进入阶段收口：

1. 做一次完整人工回归  
   覆盖 `arrived -> 部分入库 -> completed -> 部分撤销 -> arrived 回退 -> 导出 -> 跳转定位`

2. 完成阶段验收后，再二选一：
   - 将当前逐单排队模式升级为真正的批量明细选择方案
   - 继续增强详情页与导出结构

3. 如果短期不升级批量入库形态，优先补运维体验：
   - 更完整的导出结构
   - 更稳定的跨页面刷新机制
   - 详情页级别的审计查看

## 5. 参考文档

- [`/Users/aries/Dve/workspace/docs/progress/PROCUREMENT_INVENTORY_PHASE1_PROGRESS_2026-03-12.md`](/Users/aries/Dve/workspace/docs/progress/PROCUREMENT_INVENTORY_PHASE1_PROGRESS_2026-03-12.md)
- [`/Users/aries/Dve/workspace/docs/roadmaps/PROCUREMENT_INVENTORY_PHASE2_PARTIAL_RECEIPT_PLAN_2026-03-12.md`](/Users/aries/Dve/workspace/docs/roadmaps/PROCUREMENT_INVENTORY_PHASE2_PARTIAL_RECEIPT_PLAN_2026-03-12.md)
- [`/Users/aries/Dve/workspace/docs/roadmaps/PROCUREMENT_INVENTORY_PHASE2_PARTIAL_REVERSAL_PLAN_2026-03-12.md`](/Users/aries/Dve/workspace/docs/roadmaps/PROCUREMENT_INVENTORY_PHASE2_PARTIAL_REVERSAL_PLAN_2026-03-12.md)
