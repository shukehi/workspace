# Lock-Fork Order Sequence Runbook (2026-04-25)

Branch: `integration/config-center-simplification-wave1`
Primary fix commits:
- `48be7cb` — future lock-fork generation sorts by thickness before head rank
- `59cef80` — targeted saved-order repair script
- `b75714f` — read-only saved-order audit script
- `751b63e` — safe arrived-order repair path for no-receipt orders
- `660af7b` — repair safety guard extracted and tested
- `c5c877d` — real historical row-shape regressions added to sorter tests

## Purpose
这份 runbook 用来处理“锁叉采购单顺序错乱”问题，避免以后需要重新翻聊天记录。

目标顺序：
- 同一厚度 / 同一门高组内：`上头 -> 下头`
- 多组时：先按厚度，再按门高
- 中控 / 螺纹中控 这类非上下头行，排在对应 fork pair 后面

---

## 1. 先审计，不要直接改库

只读扫描全部锁叉采购单：

```bash
npx tsx server/scripts/audit_lock_fork_order_sequence.ts
```

如果要给脚本或其他自动化消费，使用干净 JSON：

```bash
npx tsx server/scripts/audit_lock_fork_order_sequence.ts --json-clean
```

输出会标出：
- 哪些单错序
- 当前状态
- 是否仍可安全修复
- before / after 顺序

当前脚本是 **read-only**。

---

## 2. 修单张可编辑订单

适用状态：
- `draft`
- `submitted`
- `processing`

先预览：

```bash
npx tsx server/scripts/reorder_lock_fork_order.ts --order PO-XXXX
```

确认后执行：

```bash
npx tsx server/scripts/reorder_lock_fork_order.ts --order PO-XXXX --apply
```

脚本会通过正常订单更新路径写回，不要手改 sqlite。

---

## 3. 修 arrived 但未入库、无 receipt 的锁定订单

仅在同时满足以下条件时允许：
- `status=arrived`
- `stocked_in_at` 为空
- `inventory_receipts` 为 0
- 显式传入允许标志

先预览：

```bash
npx tsx server/scripts/reorder_lock_fork_order.ts \
  --order PO-XXXX \
  --allow-arrived-without-receipts
```

确认后执行：

```bash
npx tsx server/scripts/reorder_lock_fork_order.ts \
  --order PO-XXXX \
  --allow-arrived-without-receipts \
  --apply
```

内部流程：
1. 校验无 receipt / 无 stock-in
2. 临时切到 `cancelled`
3. 重写 items 顺序
4. 恢复到 `arrived`
5. 保留 arrival metadata

---

## 4. 明确禁止自动修的情况

以下情况不要用当前脚本自动修：
- `completed`
- `arrived` 且已有 `inventory_receipts`
- `arrived` 且已有 `stocked_in_at`
- 任何已经有真实库存/收货关联的历史单

这类单要先做影响评估：
- receipt linkage
- inventory movement linkage
- 对账 / 审计要求

---

## 5. 相关测试

排序与真实事故形状：

```bash
node --require tsx/cjs --test --test-concurrency=1 \
  tests/procurement-item-sort.test.ts \
  tests/po-rule-lockfork.test.ts
```

到货单修复安全边界：

```bash
node --require tsx/cjs --test --test-concurrency=1 \
  tests/lock-fork-order-repair.test.ts
```

最小构建验证：

```bash
npm run type-check:server
npm run build
```

---

## 6. 当前本地库结论

截至 2026-04-25，本地库审计结果：
- 锁叉采购单总数：`26`
- 错序单：`0`

也就是说，本地现存锁叉采购单已经全部对齐到 canonical 顺序。

---

## 7. 后续新增同类问题时怎么处理

如果又发现新的历史错单：
1. 先跑 audit
2. 记录订单号 / 状态 / before-after
3. 判断是否属于可编辑或无-receipt arrived 单
4. 再跑 repair
5. 如果是新的真实排序形状，先把该形状补进：
   - `tests/procurement-item-sort.test.ts`
   - 或 `tests/po-rule-lockfork.test.ts`
6. 最后重跑 audit，确认 `misorderedCount=0`

不要跳过第 5 步。
