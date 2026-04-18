# Order Lifecycle Normalization Pass 51 Plan (2026-04-18)

> 状态：当前执行计划。
> 分支：`refactor/order-lifecycle-normalization-pass51`
> 范围：在 normalization 阶段继续收束 update helper 的 helper-local function exports，但不改变 API contract 或业务语义。

---

## 1. 背景

当前 `order.service.update.ts` 仍导出多组仅在文件内部使用的 helper 函数：
- `resolveUpdateOrderContext`
- `assertUpdateOrderInputValid`
- `buildNextOrderValues`

这些函数没有外部消费者，却仍以导出形态暴露，增加了 update helper 模块表面的噪音。

---

## 2. 本轮目标

继续做 helper-surface normalization：
- 取消这些 purely local helper function 的 `export`
- 让 update helper 模块的对外 surface 更接近真正需要复用的函数集合

---

## 3. 本轮不做的事

1. 不改 orders API contract
2. 不改 update runtime 行为
3. 不重写 update helper 算法
4. 不引入新依赖
5. 不处理 Inventory deeper partitioning

---

## 4. 推荐切口

建议在：
- `server/services/orders/order.service.update.ts`

目标：
- 仅保留对外真正需要的函数导出
- 移除没有外部消费价值的 update helper-local function export

---

## 5. 完成标准

至少满足：

1. 上述 update helper-local function 不再导出
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
