# Order Lifecycle Normalization Pass 9 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass9`
> 范围：在 normalization 阶段继续统一 read/query 侧的 shared contract typing，但不改变 API contract 或业务语义。

---

## 1. 背景

Order lifecycle normalization 已完成：
- create/update shared lifecycle binding types 归一
- list/single read shared bindings 归一
- paginated query shared bindings 归一

当前最自然的下一刀是：
- read/query 之间仍重复的序列化 contract typing

两条路径都依赖：
- `serializeOrder`

但目前各自维护独立 binding 类型表达，这一层 contract 已经稳定，适合统一。

---

## 2. 本轮目标

继续做真正的 contract / typing normalization：
- 提炼 shared order-service contracts 文件
- 让 read/query 绑定类型复用同一套 serialization contract

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 read/query 运行行为
3. 不重写 create/update/stock-in lifecycle
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议新增：
- `server/services/orders/order.service.contracts.ts`

优先承接：
- shared serialize-order binding contract
- shared query facet bindings contract（如果需要）

目标：
- 把 read/query 之间最小的 shared typing 公因子统一出来
- 保持 runtime helper 行为不变

---

## 5. 完成标准

至少满足：

1. read/query 不再各自维护重复的 shared serialization contract typing
2. 行为不变
3. 定向测试继续通过
4. 全量门禁保持全绿

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/order-service.test.ts tests/order-routes.test.ts tests/governance-boundary-guard.test.ts
npm test
npm run build
```
