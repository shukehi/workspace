# 采购与库存边界改造 PR 说明（2026-03-13）

## Title

完善采购到货、部分入库、撤销入库与库存审计链路

## Summary

- 打通采购单从到货、按明细入库、库存入库记录查看，到部分撤销入库的完整链路
- 完善库存页筛选、分页、导出与轨迹审计能力
- 修复历史单据与边界场景下多处状态、数量、入口判断问题

## Changes

1. 订单状态扩展为 `draft / submitted / processing / arrived / completed / cancelled`
2. 新增到货与入库相关字段，并支持 `POST /api/orders/:id/arrive`
3. 新增 `InventoryReceipt` 流水模型与 `GET /api/inventory-receipts`
4. `POST /api/orders/:id/stock-in` 支持按明细、按数量入库
5. 采购页新增明细入库弹窗，支持部分入库与“入库完成 / 部分入库成功”提示区分
6. 库存页支持入库记录查看、按订单号定位、服务端筛选、服务端分页、`pageSize`、全量条件导出
7. 库存页支持部分撤销、撤销原因、撤销轨迹抽屉与状态回退联动
8. 修复无剩余待入库明细仍显示“执行入库”入口的问题
9. 修复历史 `ordered_quantity = 0` 单据被误判为不可继续入库的问题，并统一前后端兼容逻辑
10. 采购页改为服务端分页与服务端筛选，页码通过 URL 同步，默认每页 20 条，并支持页大小切换与按查询条件导出全量结果
11. 修复采购页服务端分页翻页后旧页选中态残留的问题，避免批量操作和“导出所选”跨页误作用
12. 修复采购页页大小切回默认 `20` 时会被旧分页状态回写的问题，页大小选择现可稳定在 `20 / 50 / 100` 之间切换

## Docs

- [`/Users/aries/Dve/workspace/docs/progress/PROCUREMENT_INVENTORY_PHASE1_PROGRESS_2026-03-12.md`](/Users/aries/Dve/workspace/docs/progress/PROCUREMENT_INVENTORY_PHASE1_PROGRESS_2026-03-12.md)
- [`/Users/aries/Dve/workspace/docs/progress/PROCUREMENT_INVENTORY_PHASE1_SUMMARY_2026-03-11.md`](/Users/aries/Dve/workspace/docs/progress/PROCUREMENT_INVENTORY_PHASE1_SUMMARY_2026-03-11.md)
- [`/Users/aries/Dve/workspace/docs/progress/PROCUREMENT_INVENTORY_MANUAL_REGRESSION_CHECKLIST_2026-03-13.md`](/Users/aries/Dve/workspace/docs/progress/PROCUREMENT_INVENTORY_MANUAL_REGRESSION_CHECKLIST_2026-03-13.md)
- [`/Users/aries/Dve/workspace/docs/roadmaps/PROCUREMENT_INVENTORY_PHASE2_PARTIAL_RECEIPT_PLAN_2026-03-12.md`](/Users/aries/Dve/workspace/docs/roadmaps/PROCUREMENT_INVENTORY_PHASE2_PARTIAL_RECEIPT_PLAN_2026-03-12.md)
- [`/Users/aries/Dve/workspace/docs/roadmaps/PROCUREMENT_INVENTORY_PHASE2_PARTIAL_REVERSAL_PLAN_2026-03-12.md`](/Users/aries/Dve/workspace/docs/roadmaps/PROCUREMENT_INVENTORY_PHASE2_PARTIAL_REVERSAL_PLAN_2026-03-12.md)

## Verification

- `node --test tests/order-service.test.js`
- `node --test tests/order-routes.test.js`
- `node --test tests/inventory-route.test.js`
- `node --test tests/procurement-columns-guard.test.js`
- `node --test tests/inventory-view-guard.test.js`
- `npx tsx --test tests/procurement-page-state.test.ts`
- `npx tsx --test tests/procurement-preview.test.ts`
- `npx vue-tsc --noEmit`

## Notes

- 当前批量入库已恢复为逐单排队的明细入库流程，后续仍可升级为统一批量明细选择方案
- 当前已支持独立入库详情页，仍可继续增强详情页与导出结构
- 本地数据库已额外回填一批 `ordered_quantity <= 0 && quantity > 0` 的历史明细；这部分属于环境数据修复，不包含在 Git 提交中
