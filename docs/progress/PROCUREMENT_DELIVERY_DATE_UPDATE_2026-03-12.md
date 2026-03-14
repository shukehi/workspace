# 采购管理页交货日期显示与日期口径统一

> 状态：需求/接口变更记录。
> 当前采购字段日期口径请优先结合 `docs/reference/PO_FIELD_CONTRACT.md` 与现行实现阅读。

日期：2026-03-12

## 背景

采购管理页主列表原先没有显示 `交货日期`。补充该列后，发现列表页与预览模式对同一订单的日期展示可能不一致，原因是两处使用了不同的日期格式化方式，浏览器本地时区会导致日期前后偏移一天。

## 本次变更

- 在采购管理页订单列表中新增 `交货日期` 列
- 将采购管理列表与预览模式的日期展示统一为 `YYYY-MM-DD`
- 展示时按业务日期口径输出，不再依赖浏览器本地时区格式化
- 补充采购订单字段契约文档，明确日期展示规则与反模式

## 影响范围

- `/src/components/procurement/ProcurementColumns.ts`
- `/src/components/procurement/OrderSheetView.vue`
- `/src/views/Procurement.vue`
- `/docs/reference/PO_FIELD_CONTRACT.md`

## 验证

- `node --test tests/procurement-columns-guard.test.js`
- `npx tsx --test tests/procurement-preview.test.ts`

## 相关提交

- `8e19408` `Show delivery dates in procurement list`
- `69b1fbf` `Document procurement date display contract`
