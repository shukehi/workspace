# Order Lifecycle Pass 6 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-pass6`
> 范围：继续收口 `order.service.ts` 中剩余的核心服务编排，优先处理查询/读取路径，再判断是否继续推进 create/update 的更深层整理。

---

## 1. 背景

订单域已经完成：
- create / update data shaping 收口
- delete lifecycle helper
- arrive / bulk-arrive helper
- stockIn transaction orchestration helper

当前 `server/services/orders/order.service.ts` 仍约 **508 行**。剩余最值得处理的块主要是：

1. `getPaginatedOrders`
2. `createOrder`
3. `updateOrder`

其中：
- `getPaginatedOrders` 相对独立，最适合作为低风险第一刀
- `createOrder` / `updateOrder` 再继续下沉会进入更深层 contract / fallback / error shaping 整理

---

## 2. 本轮目标

优先继续把 `order.service.ts` 收向 orchestration shell，但本轮起手只处理低风险查询路径：

1. `getPaginatedOrders`
2. 如果第一刀顺利，再决定是否继续碰 `createOrder` / `updateOrder`

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改分页返回 shape
3. 不改 facets / summary 业务语义
4. 不引入新依赖
5. 不在第一刀里同时触碰 create/update

---

## 4. 推荐切口

建议新增独立 helper，例如：
- `server/services/orders/order.service.query.ts`

优先承接：
- page/pageSize 归一化
- paged id 查询
- rows 按 id 重建顺序
- `createPaginationResponse` 输入装配

让 `order.service.ts` 中的 `getPaginatedOrders()` 只保留：
- helper 调用
- 少量 orchestration glue

---

## 5. 完成标准

至少满足：

1. `getPaginatedOrders()` 不再直接承载主要组装逻辑
2. 行为不变
3. 定向测试继续通过
4. 全量门禁保持全绿

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
npm test -- tests/order-service.test.ts
npm test -- tests/order-routes.test.ts
npm test -- tests/governance-boundary-guard.test.ts
npm test
npm run build
```
