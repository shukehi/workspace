# Order Service Refactor Plan (2026-04-16)

> 状态：当前执行计划。
> 范围：`server/services/orders/order.service.ts` 的第一轮收口，先抽纯 helper 与局部编排噪音，不改变行为语义。

---

## 1. 现状问题

`order.service.ts` 仍然是订单域复杂度中心之一，虽然 policy / mapper / dedupe / stock-in / repository 已经拆出，但当前文件仍承载：

1. 订单编号生成辅助
2. 日期/备注/批量 ID 归一化
3. UNIQUE 冲突识别与 bulk-arrive 错误序列化
4. 应用编排逻辑本身

这导致：
- 文件仍偏大
- “纯 helper” 与 “应用编排” 混在一起
- 下一轮想继续收口时，阅读负担依然高

---

## 2. 第一轮目标

本轮不改业务语义，只做低风险整理：

1. 抽走纯 helper
2. 保持 service public API 不变
3. 不改 repository / policy / stockin 契约
4. 不改变错误码与编号规则

---

## 3. 第一轮建议拆分边界

建议新增：
- `server/services/orders/order.service.helpers.ts`

负责：
- `normalizeOrderRemark`
- `normalizeNullableDate`
- `normalizeBulkOrderIds`
- `formatManualOrderDateToken`
- `isGeneratedManualOrderNo`
- `buildManualOrderNo`
- `buildAutoOrderPrefix`
- `buildAutoOrderNo`
- `isGeneratedAutoOrderNo`
- `parseAutoOrderSequence`
- `isUniqueOrderNoError`
- `serializeBulkArriveError`

`order.service.ts` 保留：
- 应用编排
- 事务控制
- repository 组合
- domain helper 调用

---

## 4. 本轮不做的事

1. 不拆 `updateOrder` / `stockInOrder` 的业务编排
2. 不改 `order.repository.ts` 结构
3. 不改订单状态机规则
4. 不改幂等键语义
5. 不新增行为测试语义，只复用现有回归测试

---

## 5. 回归验证

至少执行：

```bash
npm run type-check
npm run type-check:server
npm test -- tests/order-service.test.ts
npm test -- tests/order-routes.test.ts
npm test
npm run build
```

---

## 6. 完成标准

第一轮完成后至少满足：

1. `order.service.ts` 明显缩小
2. 纯 helper 不再和应用编排混排
3. order 相关测试继续通过
4. 不引入行为变化
